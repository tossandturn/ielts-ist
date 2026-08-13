import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);

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
  throw new Error(`Vocabulary student workspace server did not start. ${stderr}`);
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `${label} horizontal overflow is ${overflow}px`);
}

await waitForServer();
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  for (const viewport of [
    { width: 1440, height: 900, label: "desktop" },
    { width: 1024, height: 768, label: "iPad landscape" },
    { width: 768, height: 1024, label: "iPad portrait" },
    { width: 390, height: 844, label: "phone" },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.addInitScript(() => {
      for (const key of Object.keys(localStorage)) {
        if (/vocabulary|Vocabulary/i.test(key)) localStorage.removeItem(key);
      }
    });
    await page.goto(`${baseUrl}/?test=vocabulary-student-${viewport.width}#vocabulary`, { waitUntil: "networkidle" });
    await page.locator("#vocabulary.active .vocab-review-card").waitFor();
    await page.waitForFunction(() => document.querySelector(".vocab-review-top strong")?.textContent?.includes("/ 30"));
    assert.equal(await page.locator("#vocabSubjectFilter").inputValue(), "ielts", `${viewport.label} must default to IELTS English`);
    assert.match((await page.locator(".vocab-word-face h3").textContent()) || "", /^[A-Za-z][A-Za-z -]*$/, `${viewport.label} first card must be an IELTS English word`);
    assert.equal(await page.locator(".vocab-mini-list [data-vocab-index]").count(), 0, `${viewport.label} must not render a 3,000-word side list`);
    assert.match(await page.locator(".vocab-review-top strong").innerText(), /1\s*\/\s*30/, `${viewport.label} must present a 30-word study set`);
    assert.equal(await page.locator("#vocabMeaning").isVisible(), true, `${viewport.label} must show the meaning without a blank flashcard state`);
    assert.equal(await page.getByRole("button", { name: /again/i }).isVisible(), true);
    assert.equal(await page.getByRole("button", { name: /know it/i }).isVisible(), true);
    assert.equal(await page.getByRole("button", { name: /^save$/i }).isVisible(), true);
    if (viewport.width === 390) {
      const topicChip = page.locator(".vocab-review-top .eyebrow");
      assert.match(await topicChip.innerText(), /Travel & Transport/, "Phone must retain the complete current-topic label");
      const topicChipGeometry = await topicChip.evaluate((element) => ({
        clipped: element.scrollWidth - element.clientWidth,
        lineCount: Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight || "16")),
      }));
      assert.ok(topicChipGeometry.clipped <= 1 || topicChipGeometry.lineCount >= 2,
        "Phone topic label must wrap rather than silently truncate");
    }
    await assertNoOverflow(page, viewport.label);
    assert.deepEqual(errors, [], `${viewport.label} Vocabulary default must not emit console errors`);
    await page.close();
  }

  const responsive = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await responsive.goto(`${baseUrl}/?test=vocabulary-student-responsive#vocabulary`, { waitUntil: "networkidle" });
  await responsive.locator("#vocabulary.active .vocab-review-card").waitFor();
  await responsive.locator(".vocab-more-filters > summary").click();
  assert.equal(await responsive.locator("#vocabTopicFilter").isVisible(), true, "Phone Refine control must expose Topic");
  assert.equal(await responsive.locator("#vocabTypeFilter").isVisible(), true, "Phone Refine control must expose Content type");
  await responsive.locator(".vocab-more-filters > summary").click();
  await responsive.getByRole("button", { name: /next word/i }).click();
  assert.match(await responsive.locator(".vocab-review-top strong").innerText(), /2\s*\/\s*30/, "Phone Next word must advance the active card");
  await responsive.close();

  const desktopShot = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktopShot.goto(`${baseUrl}/?test=vocabulary-student-screenshot#vocabulary`, { waitUntil: "networkidle" });
  await desktopShot.locator("#vocabulary.active .vocab-review-card").waitFor();
  await desktopShot.waitForFunction(() => document.querySelector(".vocab-review-top strong")?.textContent?.includes("/ 30"));
  await desktopShot.screenshot({ path: "D:/CodexWork/qa-artifacts/vocabulary-default-fix-20260813-r3/desktop.png", fullPage: false });
  await desktopShot.close();

  const subject = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const subjectErrors = [];
  subject.on("console", (message) => {
    if (message.type() === "error") subjectErrors.push(message.text());
  });
  await subject.goto(`${baseUrl}/?test=vocabulary-student-subject#vocabulary`, { waitUntil: "networkidle" });
  await subject.locator(".vocab-review-card").waitFor();
  await subject.getByRole("button", { name: /change word pack/i }).click();
  await subject.locator(".vocab-hub-shell").waitFor();
  await subject.locator("[data-vocab-course='alevel']").click();
  await subject.locator("[data-vocab-subject='physics']").click();
  await subject.locator(".vocab-review-card").waitFor();
  assert.match(await subject.locator(".vocab-review-top .eyebrow").innerText(), /IG \+ A-Level Physics/);
  await subject.locator(".vocab-more-filters > summary").click();
  await subject.locator("#vocabStageFilter").selectOption("AS");
  await subject.locator("#vocabTopicFilter").selectOption({ label: "Astrophysics" });
  await subject.locator(".vocab-word-face h3").waitFor();
  assert.match(await subject.locator(".vocab-review-top .eyebrow").innerText(), /Astrophysics/);
  await subject.getByRole("button", { name: /full knowledge/i }).click();
  assert.match(await subject.locator("#vocabMeaning").innerText(), /Formula & conditions|Exam use|Common mistake/i,
    "A subject term must expose its definition, formula or conditions, exam use and common mistakes");
  await subject.locator("#vocabKnown").click();
  await subject.locator("#vocabNotebook").click();
  await subject.locator("#vocabNotebook").getByText("Saved").waitFor();
  await subject.getByRole("button", { name: /previous/i }).click();
  await subject.getByRole("button", { name: /next word/i }).click();
  await assertNoOverflow(subject, "A-Level Physics filtered workspace");
  assert.deepEqual(subjectErrors, [], "A-Level Physics filtered workspace must not emit console errors");
  await subject.close();

  const stem = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const stemErrors = [];
  stem.on("console", (message) => {
    if (message.type() === "error") stemErrors.push(message.text());
  });
  const stemParams = new URLSearchParams({
    from: "stem",
    contractVersion: "stem-vocabulary-context-v1",
    family: "exam",
    taxonomyId: "physics",
    routeId: "physics",
    subjectCode: "physics",
    stage: "AS",
    topicId: "astrophysics",
    termId: "physics-not-imported-term",
    sourceStatus: "pending",
    termInventoryStatus: "not-imported",
    returnTo: "https://stem.ieltsist.com/practice/physics?attempt=student-workspace",
  });
  await stem.goto(`${baseUrl}/?${stemParams.toString()}`, { waitUntil: "networkidle" });
  await stem.locator("#vocabulary.active .vocab-review-card").waitFor();
  assert.equal(await stem.locator(".vocab-route-context").count(), 1, "STEM deep link must keep route context visible");
  assert.match(await stem.locator(".vocab-route-context").innerText(), /IELTSist glossary sync pending/, "Unmapped STEM terms must not fall back to a fake local count");
  assert.equal(await stem.locator(".vocab-catalog-status").count(), 0, "STEM pending term packs must not claim an unrelated catalog total");
  await assertNoOverflow(stem, "STEM vocabulary deep link");
  assert.deepEqual(stemErrors, [], "STEM vocabulary deep link must not emit console errors");
  await stem.close();

  console.log("Vocabulary student workspace flow passed across desktop, iPad landscape, iPad portrait and phone, including A-Level filtering and the STEM pending-glossary state.");
} finally {
  await browser.close();
  child.kill();
}
