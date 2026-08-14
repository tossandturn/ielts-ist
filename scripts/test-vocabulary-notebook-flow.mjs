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
  throw new Error(`Vocabulary test server did not start. ${stderr}`);
}

await waitForServer();
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    localStorage.removeItem("ieltsistAuthToken");
    localStorage.removeItem("ieltsistLocalVocabularyNotebookV1");
    localStorage.removeItem("ieltsistLocalVocabularyNotebookV1::guest");
    localStorage.removeItem("ieltsistCoreVocabularyKnown");
  });
  await page.goto(`${baseUrl}/?test=vocabulary-notebook#vocabulary`, { waitUntil: "networkidle" });
  await page.locator(".vocab-review-card").waitFor();
  const word = (await page.locator(".vocab-word-face h3").textContent()).trim();
  await page.locator("#vocabReveal").click();
  await page.locator("#vocabNotebook").click();
  await page.locator("#vocabNotebook").getByText("Saved").waitFor();
  const saved = await page.evaluate(() => ({
    legacy: localStorage.getItem("ieltsistLocalVocabularyNotebookV1"),
    guest: JSON.parse(localStorage.getItem("ieltsistLocalVocabularyNotebookV1::guest") || "[]"),
  }));
  assert.equal(saved.legacy, null, "Notebook data must not fall back to an unscoped localStorage key");
  assert.equal(saved.guest.length, 1, "Saving a vocabulary card must create one owner-scoped local Notebook item");
  assert.equal(saved.guest[0].term, word, "Notebook must preserve the saved term identity");

  const notebookMode = page.locator('[data-vocab-mode="notebook"]');
  await notebookMode.click();
  await page.locator('.vocab-notebook-status').waitFor();
  const reviewButton = page.locator("[data-vocab-review-key]");
  await reviewButton.waitFor();
  const notebookRowText = await page.locator(".vocab-notebook-recent li").first().innerText();
  assert.match(notebookRowText, /Due today|Mastered/, "Notebook row must show a student-facing review state");
  assert.doesNotMatch(notebookRowText, /vocabulary:/i, "Notebook row must not expose internal source keys");
  await reviewButton.click();
  await page.waitForFunction(() => document.getElementById("vocabulary")?.classList.contains("active"));
  assert.equal((await page.locator(".vocab-word-face h3").textContent()).trim(), word, "Notebook Review must reopen the original vocabulary card");
  assert.equal(await page.locator("#vocabMeaning").isVisible(), true, "Notebook Review must reopen the explanation");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${baseUrl}/?test=vocabulary-notebook-mobile#vocabulary`, { waitUntil: "networkidle" });
  await mobile.locator(".vocab-review-card").waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Mobile Vocabulary overflow is ${overflow}px`);
  await mobile.close();
  await page.close();
  console.log(`Vocabulary Notebook flow passed for ${word}.`);
} finally {
  await browser.close();
  child.kill();
}
