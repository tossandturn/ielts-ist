import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 7900 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "ieltsist-same-test-direct-"));
const databasePath = join(tempDirectory, "same-test-direct.sqlite");
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: databasePath, SESSION_COOKIE_SECURE: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
child.stdout.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-4_000); });
child.stderr.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-4_000); });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Same Test server exited early.\n${serverOutput}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Same Test server did not start.\n${serverOutput}`);
}

async function stopServer() {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/?test=same-test-direct-entry#sequence`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(state.data?.listeningTests?.length && state.data?.readingTests?.length));
  await page.waitForFunction(() => document.querySelector("#sequenceBookFilter")?.options.length > 1);

  const initial = await page.evaluate(() => ({
    bookOptions: [...document.querySelector("#sequenceBookFilter").options].map((option) => ({ value: option.value, text: option.textContent })),
    testOptions: [...document.querySelector("#sequenceTestFilter").options].map((option) => ({ value: option.value, text: option.textContent })),
    status: document.querySelector("#sequenceSelectionStatus")?.textContent || "",
    hasSequence: Boolean(state.sequence),
  }));
  assert.equal(initial.bookOptions[0]?.value, "all");
  assert.equal(initial.testOptions[0]?.value, "all");
  assert.match(initial.status, /Choose one Cambridge book and one test/i);
  assert.equal(initial.hasSequence, false, "Direct Same Test entry must not silently choose a paper");

  await page.locator("#buildSequence").click();
  assert.equal(await page.evaluate(() => Boolean(state.sequence)), false, "All/All must remain an explicit waiting state");
  const selectedSet = await page.evaluate(() => {
    const first = sequenceSets()[0];
    if (!first) throw new Error("No complete Same Test set is available");
    return {
      book: String(itemBook(first.listening)),
      test: String(itemTest(first.listening)),
      sourceIds: [
        first.listening?.id,
        first.reading?.id,
        first.task1?.id,
        first.task2?.id,
        first.speaking?.id,
      ],
    };
  });
  await page.locator("#sequenceBookFilter").selectOption(selectedSet.book);
  await page.waitForFunction((testValue) =>
    [...document.querySelector("#sequenceTestFilter")?.options || []].some((option) => option.value === testValue),
    selectedSet.test,
  );
  await page.locator("#sequenceTestFilter").selectOption(selectedSet.test);
  await page.waitForFunction(() => Boolean(state.sequence?.examMetadata?.examId));
  const beforeReload = await page.evaluate(() => {
    const input = [...document.querySelectorAll(".objective-answer-control[data-prefix='sequence-listening']")]
      .find((node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
    if (!input) throw new Error("Same Test needs a visible Listening answer control");
    input.value = "same-test-direct-entry-answer";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    startSequenceTimer();
    persistExamSession("sequence");
    return {
      examId: state.sequence.examMetadata.examId,
      sourceIds: [
        state.sequence.listening?.id,
        state.sequence.reading?.id,
        ...(state.sequence.writingTasks || []).map((task) => task.id),
        state.sequence.speaking?.id,
      ],
      seconds: state.sequenceSeconds,
      answer: input.value,
    };
  });
  assert.deepEqual(beforeReload.sourceIds, selectedSet.sourceIds);
  await page.waitForTimeout(1_100);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(state.sequence?.examMetadata?.examId));
  const restored = await page.evaluate(() => {
    const input = [...document.querySelectorAll(".objective-answer-control[data-prefix='sequence-listening']")]
      .find((node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
    return {
      examId: state.sequence?.examMetadata?.examId || "",
      seconds: state.sequenceSeconds,
      answer: input?.value || "",
      timerRunning: Boolean(state.sequenceTimerId),
    };
  });
  assert.equal(restored.examId, beforeReload.examId);
  assert.equal(restored.answer, beforeReload.answer);
  assert.equal(restored.timerRunning, true, "Same Test timer must resume after direct-entry reload");
  assert.ok(restored.seconds <= beforeReload.seconds && restored.seconds >= beforeReload.seconds - 8);
  assert.deepEqual(pageErrors, [], `Browser errors: ${pageErrors.join(" | ")}`);
  console.log(`PASS direct Same Test route: explicit filters, Cambridge ${selectedSet.book} Test ${selectedSet.test} sources, answer and timer restored (${restored.examId}).`);
} finally {
  await browser?.close();
  await stopServer();
  await rm(tempDirectory, { recursive: true, force: true });
}
