import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 6300 + (process.pid % 300);
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
    localStorage.removeItem("ieltsistCoreVocabularyKnown");
  });
  await page.goto(`${baseUrl}/?test=vocabulary-notebook#vocabulary`, { waitUntil: "networkidle" });
  await page.locator(".vocab-hub-shell").waitFor();
  await page.getByRole("button", { name: /Review deck/i }).click();
  await page.locator(".vocab-review-card").waitFor();
  const word = (await page.locator(".vocab-word-face h3").textContent()).trim();
  await page.locator("#vocabReveal").click();
  await page.locator("#vocabNotebook").click();
  await page.locator("#vocabNotebook").getByText("Saved to Notebook").waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ieltsistLocalVocabularyNotebookV1") || "[]"));
  assert.equal(saved.length, 1, "Saving a vocabulary card must create one local Notebook item");
  assert.equal(saved[0].term, word, "Notebook must preserve the saved term identity");

  await page.locator("[data-vocab-open-notebook]").click();
  await page.waitForFunction(() => document.getElementById("mine")?.classList.contains("active"));
  const reviewButton = page.locator("[data-vocab-review-key]");
  await reviewButton.waitFor();
  await reviewButton.click();
  await page.waitForFunction(() => document.getElementById("vocabulary")?.classList.contains("active"));
  assert.equal((await page.locator(".vocab-word-face h3").textContent()).trim(), word, "Notebook Review must reopen the original vocabulary card");
  assert.equal(await page.locator("#vocabMeaning").isVisible(), true, "Notebook Review must reopen the explanation");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${baseUrl}/?test=vocabulary-notebook-mobile#vocabulary`, { waitUntil: "networkidle" });
  await mobile.locator(".vocab-hub-shell").waitFor();
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `Mobile Vocabulary overflow is ${overflow}px`);
  await mobile.close();
  await page.close();
  console.log(`Vocabulary Notebook flow passed for ${word}.`);
} finally {
  await browser.close();
  child.kill();
}
