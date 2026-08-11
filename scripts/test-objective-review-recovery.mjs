import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 8300 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-objective-review-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: dbPath,
    SESSION_COOKIE_SECURE: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
child.stdout.on("data", (chunk) => { serverOutput += chunk; });
child.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Objective review server exited early (${child.exitCode}).\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Objective review server did not start.\n${serverOutput}`);
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/#single`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && state.data?.readingTests?.length > 0);

  const submitted = await page.evaluate(async () => {
    stopSingleTimer();
    const base = mergedItems("reading").map(normalizeItem).find((item) => item.questions?.length);
    if (!base) throw new Error("A Reading fixture is required");
    const item = scopedPracticeUnit("reading", base, "section", 1);
    state.activeModule = "reading";
    state.singlePracticeScopes.reading = "section";
    state.singlePracticeSections.reading = 1;
    state.activeSingle = item;
    state.singleStarted = true;
    state.practiceSessionCompleted = false;
    state.singleAnswers = {};
    state.singleAnswerItemId = item.id;
    state.singleTotal = 20 * 60;
    state.singleSeconds = 777;
    renderSingle();
    const input = document.querySelector('.answer-input[data-prefix="single"][data-qid]');
    if (!input) throw new Error("A Reading answer input is required");
    input.value = "student-wrong-answer";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    state.singleSeconds = 777;
    savePracticeSession();
    await submitSingle();
    const result = latestObjectiveResult("reading");
    const wrong = result?.details?.find((detail) => detail.correct === false && detail.actual === "student-wrong-answer")
      || result?.details?.find((detail) => detail.correct === false);
    return {
      attemptId: result?.attemptId || "",
      itemId: result?.itemId || "",
      sourceItemId: result?.sourceItemId || "",
      practiceScope: result?.practiceScope || "",
      practiceSection: result?.practiceSection || 0,
      remainingSeconds: result?.remainingSeconds,
      totalSeconds: result?.totalSeconds,
      wrongQuestionId: wrong?.id || "",
      actual: wrong?.actual || "",
      canonicalAnswer: wrong?.canonicalAnswer || "",
    };
  });

  assert.match(submitted.attemptId, /^objective_/);
  assert.equal(submitted.practiceScope, "section");
  assert.equal(submitted.practiceSection, 1);
  assert.equal(submitted.remainingSeconds, 777);
  assert.equal(submitted.totalSeconds, 1_200);
  assert.equal(submitted.actual, "student-wrong-answer");
  assert.ok(submitted.canonicalAnswer, "Post-submit review must persist the canonical answer for this attempt");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && state.data?.readingTests?.length > 0);
  await page.evaluate(() => runHomeAction("review:reading"));
  await page.locator("#singleFeedback .objective-review").waitFor({ state: "visible", timeout: 10_000 });

  const restored = await page.evaluate((questionId) => {
    const result = latestObjectiveResult("reading");
    const input = document.querySelector(`.answer-input[data-prefix="single"][data-qid="${CSS.escape(questionId)}"]`);
    return {
      attemptId: result?.attemptId || "",
      activeItemId: state.activeSingle?.id || "",
      practiceScope: state.activeSingle?.practiceScope || "",
      practiceSection: Number(state.activeSingle?.practiceSection || 0),
      remainingSeconds: state.singleSeconds,
      totalSeconds: state.singleTotal,
      answer: input?.value || "",
      timerRunning: Boolean(state.singleTimerId),
      reviewText: document.querySelector("#singleFeedback")?.innerText || "",
    };
  }, submitted.wrongQuestionId);

  assert.equal(restored.attemptId, submitted.attemptId, "Refresh must restore the same submitted attempt review");
  assert.equal(restored.practiceScope, "section");
  assert.equal(restored.practiceSection, 1);
  assert.equal(restored.remainingSeconds, 777);
  assert.equal(restored.totalSeconds, 1_200);
  assert.equal(restored.answer, "student-wrong-answer");
  assert.equal(restored.timerRunning, false, "Opening a submitted review must not restart the exam timer");
  assert.match(restored.reviewText, /Correct answer/i);
  assert.match(restored.reviewText, new RegExp(submitted.canonicalAnswer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.equal(pageErrors.length, 0, `Browser page errors: ${pageErrors.join(" | ")}`);

  console.log(`PASS submitted Reading review ${submitted.attemptId} restored answers, timer and canonical feedback after reload.`);
} finally {
  await browser.close();
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
