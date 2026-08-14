import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import net from "node:net";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url), "utf8"));
const term = catalog.items.find((item) => item.subject === "physics" && item.stage === "AS");
assert.ok(term, "A representative Physics AS term is required for the cross-site flow");

const port = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.unref();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    const selectedPort = typeof address === "object" && address ? address.port : 0;
    probe.close((error) => error ? reject(error) : resolve(selectedPort));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`Cross-site test server did not start. ${stderr}`);
}

function stemVocabularyUrl(returnTo) {
  const params = new URLSearchParams({
    from: "STEM",
    contractVersion: "stem-vocabulary-context-v1",
    family: "exam",
    taxonomyId: term.topicId,
    routeId: term.routeId,
    specificationVersion: term.specificationVersion,
    subjectCode: term.subject,
    topicId: term.topicId,
    questionPartId: `vocabulary:${term.termId}`,
    termId: term.termId,
    attemptId: "physics-attempt-42",
    returnTo,
    source: "stem-reviewed-glossary",
    sourceStatus: "pending",
    termInventoryStatus: "not-imported",
    stage: term.stage.toLowerCase(),
  });
  return `${baseUrl}/?${params.toString()}`;
}

await waitForServer();
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  const returnTo = "https://stem.ieltsist.com/practice/physics?attempt=physics-attempt-42";
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(stemVocabularyUrl(returnTo), { waitUntil: "networkidle" });
  await page.locator("#vocabulary.active .vocab-review-card").waitFor();

  assert.equal(new URL(page.url()).hash, "#vocabulary", "A hashless STEM link must open Vocabulary directly");
  assert.equal((await page.locator(".vocab-word-face h3").textContent()).trim(), term.word, "The requested STEM term must be focused");
  assert.equal(await page.locator(".vocab-route-context").count(), 1, "STEM context must remain visible");
  assert.match(await page.locator(".vocab-route-context").textContent(), /progress stays on each site/i, "The UI must not claim cross-site score or progress sync");
  assert.match(await page.locator(".vocab-route-context").textContent(), /IELTSist glossary sync pending/i);
  assert.equal(await page.locator(".vocab-route-context a").getAttribute("href"), returnTo, "Return must use the validated STEM attempt URL");

  const hashRouted = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const hashParams = new URLSearchParams({
    from: "stem",
    contractVersion: "stem-vocabulary-context-v1",
    family: "exam",
    taxonomyId: term.taxonomyId || term.topicId,
    routeId: term.routeId,
    subjectCode: term.subject,
    stage: term.stage,
    sourceStatus: "taxonomy-mapped",
    termInventoryStatus: "not-imported",
    returnTo,
  });
  hashParams.append("termIds[]", term.termId);
  await hashRouted.goto(`${baseUrl}/#vocabulary?${hashParams.toString()}`, { waitUntil: "networkidle" });
  await hashRouted.locator("#vocabulary.active .vocab-review-card").waitFor();
  assert.equal((await hashRouted.locator(".vocab-word-face h3").textContent()).trim(), term.word,
    "Hash-routed canonical termIds[] context must focus the requested STEM term");
  assert.match(await hashRouted.locator(".vocab-route-context").textContent(), /IELTSist glossary sync pending/i,
    "Hash-routed pending inventory must not fall back to IELTS Core");
  await hashRouted.close();

  await page.locator("#vocabReveal").click();
  const outbound = new URL(await page.locator(".vocab-cross-link").getAttribute("href"));
  assert.equal(outbound.origin, "https://stem.ieltsist.com");
  assert.equal(outbound.searchParams.get("from"), "ieltsist");
  assert.equal(outbound.searchParams.get("contractVersion"), "stem-vocabulary-context-v1");
  assert.equal(outbound.searchParams.get("family"), "exam");
  assert.equal(outbound.searchParams.get("taxonomyId"), term.topicId);
  assert.equal(outbound.searchParams.get("routeId"), term.routeId);
  assert.equal(outbound.searchParams.get("specificationVersion"), term.specificationVersion);
  assert.equal(outbound.searchParams.get("subjectCode"), term.subject);
  assert.equal(outbound.searchParams.get("topicId"), term.topicId);
  assert.equal(outbound.searchParams.get("questionPartId"), `vocabulary:${term.termId}`);
  assert.equal(outbound.searchParams.get("termId"), term.termId);
  assert.equal(outbound.searchParams.get("attemptId"), "physics-attempt-42");
  assert.equal(outbound.searchParams.get("returnTo"), returnTo, "A continued STEM link must preserve the original return target");
  assert.equal(outbound.searchParams.get("sourceStatus"), "pending");
  assert.equal(outbound.searchParams.get("termInventoryStatus"), "not-imported");
  assert.equal(outbound.searchParams.has("availableCount"), false, "Pending source-backed glossary must not claim a term count");

  const unknownParams = new URL(stemVocabularyUrl(returnTo));
  unknownParams.searchParams.set("termId", "physics-unknown-term");
  const unknown = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await unknown.goto(unknownParams.toString(), { waitUntil: "networkidle" });
  await unknown.getByRole("button", { name: "Browse selected subject" }).click();
  await unknown.locator(".vocab-word-face h3").waitFor();
  assert.equal(new URL(unknown.url()).searchParams.has("termId"), false, "Browsing the subject must remove the stale term constraint");
  await unknown.locator("#vocabReveal").click();
  const browsedReturn = new URL(await unknown.locator(".vocab-cross-link").getAttribute("href"));
  assert.equal(browsedReturn.searchParams.get("routeId"), term.routeId, "Browsing a local term must preserve the original STEM route");
  assert.equal(browsedReturn.searchParams.get("topicId"), term.topicId, "Browsing a local term must preserve the original STEM topic");
  assert.equal(browsedReturn.searchParams.get("stage"), term.stage, "Browsing a local term must preserve the original STEM stage");
  await unknown.close();

  const pendingWithoutLocalPack = new URL(`${baseUrl}/`);
  pendingWithoutLocalPack.search = new URLSearchParams({
    from: "stem",
    contractVersion: "stem-vocabulary-context-v1",
    family: "exam",
    termId: "not-yet-imported-term",
    returnTo,
    sourceStatus: "pending",
    termInventoryStatus: "not-imported",
  }).toString();
  const pendingFallback = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await pendingFallback.goto(pendingWithoutLocalPack.toString(), { waitUntil: "networkidle" });
  await pendingFallback.locator("#vocabulary.active .vocab-review-card").waitFor();
  assert.equal(await pendingFallback.locator(".vocab-empty-state").count(), 0,
    "An unmapped STEM vocabulary link must never leave the student in an empty word pack");
  assert.ok(await pendingFallback.locator(".vocab-word-face h3").count() > 0,
    "An unmapped STEM vocabulary link must offer a usable fallback word");
  assert.match(await pendingFallback.locator(".vocab-review-top .eyebrow").textContent(), /IELTS Core Vocabulary/i,
    "A STEM link without a local subject mapping must fall back to the student-safe IELTS Core pack");
  assert.match(await pendingFallback.locator(".vocab-route-context").textContent(), /IELTSist glossary sync pending/i,
    "The fallback must remain explicit that the STEM glossary pack is still pending");
  await pendingFallback.close();

  const staleParams = new URL(stemVocabularyUrl(returnTo));
  staleParams.searchParams.set("specificationVersion", "A-Level STEM 2024");
  staleParams.searchParams.set("sourceStatus", "source-backed");
  staleParams.searchParams.set("termInventoryStatus", "imported");
  staleParams.searchParams.set("availableCount", "1");
  const stale = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await stale.goto(staleParams.toString(), { waitUntil: "networkidle" });
  await stale.locator(".vocab-route-context [role='alert']").waitFor();
  assert.match(await stale.locator(".vocab-route-context [role='alert']").textContent(), /older route metadata/i);
  await stale.close();

  const hostile = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await hostile.goto(stemVocabularyUrl("https://evil.example/steal").replace("from=STEM", "from=stem"), { waitUntil: "networkidle" });
  await hostile.locator("#vocabulary.active .vocab-review-card").waitFor();
  assert.equal(await hostile.locator(".vocab-route-context a").count(), 0, "Untrusted return URLs must not be rendered");
  await hostile.close();

  const normal = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await normal.goto(`${baseUrl}/#home`, { waitUntil: "networkidle" });
  assert.equal(await normal.locator("#home.active").count(), 1, "Normal homepage navigation must remain unchanged");
  await normal.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(stemVocabularyUrl(returnTo), { waitUntil: "networkidle" });
  await mobile.locator("#vocabulary.active .vocab-review-card").waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Mobile STEM vocabulary route overflow is ${overflow}px`);
  await mobile.close();
  await page.close();
  console.log(`Vocabulary cross-site browser flow passed for ${term.word}.`);
} finally {
  await browser.close();
  child.kill();
}
