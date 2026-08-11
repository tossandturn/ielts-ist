import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 6700 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Session isolation server did not start. ${stderr}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/?test=active-session-isolation#single`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Array.isArray(state.data?.listeningTests) && Array.isArray(state.data?.readingTests));

  const result = await page.evaluate(() => {
    const listening = mergedItems("listening").map(normalizeItem).find((item) => item.questions?.length);
    const reading = mergedItems("reading").map(normalizeItem).find((item) => item.questions?.length);
    if (!listening || !reading) throw new Error("Listening and Reading fixtures are required");

    function save(moduleName, item, answers, seconds) {
      state.activeModule = moduleName;
      state.activeSingle = item;
      state.singleStarted = true;
      state.practiceSessionCompleted = false;
      state.singleAnswers = answers;
      state.singleAnswerItemId = item.id;
      state.singleSeconds = seconds;
      state.singleTotal = moduleName === "listening" ? 1800 : 3600;
      savePracticeSession();
    }

    save("listening", listening, { q1: "listening answer" }, 1531);
    save("reading", reading, { q1: "reading answer" }, 3262);
    const saved = readPracticeSessions();
    const listeningSession = readPracticeSession("listening", listening.id);
    const readingSession = readPracticeSession("reading", reading.id);

    const listeningRestored = restorePracticeSessionAfterData("listening", listening.id);
    const restoredListening = {
      module: state.activeModule,
      itemId: state.activeSingle?.id,
      answers: state.singleAnswers,
      seconds: state.singleSeconds,
    };
    const readingRestored = restorePracticeSessionAfterData("reading", reading.id);
    const restoredReading = {
      module: state.activeModule,
      itemId: state.activeSingle?.id,
      answers: state.singleAnswers,
      seconds: state.singleSeconds,
    };
    return {
      count: saved.length,
      listeningSession,
      readingSession,
      listeningRestored,
      readingRestored,
      restoredListening,
      restoredReading,
    };
  });

  assert.equal(result.count, 2, "Listening and Reading must persist as two local sessions");
  assert.equal(result.listeningSession.answers.q1, "listening answer");
  assert.equal(result.listeningSession.seconds, 1531);
  assert.equal(result.readingSession.answers.q1, "reading answer");
  assert.equal(result.readingSession.seconds, 3262);
  assert.equal(result.listeningRestored, true);
  assert.deepEqual(result.restoredListening, {
    module: "listening",
    itemId: result.listeningSession.itemId,
    answers: { q1: "listening answer" },
    seconds: 1531,
  });
  assert.equal(result.readingRestored, true);
  assert.deepEqual(result.restoredReading, {
    module: "reading",
    itemId: result.readingSession.itemId,
    answers: { q1: "reading answer" },
    seconds: 3262,
  });
  console.log("PASS Listening and Reading active sessions remain isolated locally.");

  await page.evaluate(() => {
    stopSingleTimer();
    activateSingleModule("listening", false);
    setSinglePracticeScope("listening", "section");
    state.activeSingle = null;
    state.singleStarted = false;
    renderSingle();
  });
  const sectionFixture = await page.evaluate(() => {
    const item = singleOptions("listening").find((candidate) => Number(candidate.practiceSection) === 4);
    return item ? {
      id: item.id,
      questionIds: item.questions.map((question) => String(question.id || "")),
      pageImages: (item.questionPageImages || []).map((image) => image.url).filter(Boolean),
      audioUrl: item.audioUrls?.[3] || "",
    } : null;
  });
  assert.ok(sectionFixture?.id, "Listening Section 4 library fixture is required");
  assert.equal(sectionFixture.questionIds.length, 10, "Section 4 fixture must contain exactly Q31-40");
  const sectionId = sectionFixture.id;
  const firstQuestionId = sectionFixture.questionIds[0];
  const sectionCard = page.locator(`[data-start-practice-unit="${sectionId}"]`);
  await sectionCard.click();
  const firstSectionAnswer = page.locator(`.objective-answer-control[data-prefix="single"][data-qid="${firstQuestionId}"]:not([type="hidden"])`);
  await firstSectionAnswer.waitFor({ state: "visible" });
  await page.evaluate(() => startSingleTimer());
  await page.waitForTimeout(1_150);
  await firstSectionAnswer.fill("qa-listening-library-resume");
  await page.evaluate(() => stopSingleTimer());
  const beforeLibraryReturn = await page.evaluate(({ itemId, questionId }) => {
    const session = readPracticeSession("listening", itemId);
    const visibleTimer = [...document.querySelectorAll("#singleTimer")].find((node) => node.getBoundingClientRect().width > 0);
    return {
      sessionId: session?.sessionId || "",
      answer: session?.answers?.[questionId] || "",
      seconds: session?.seconds,
      timer: visibleTimer?.textContent || formatTime(state.singleSeconds),
    };
  }, { itemId: sectionId, questionId: firstQuestionId });
  assert.ok(beforeLibraryReturn.sessionId, "Listening Section draft needs a stable session id before leaving");
  assert.equal(beforeLibraryReturn.answer, "qa-listening-library-resume");
  assert.ok(beforeLibraryReturn.seconds < 600 && beforeLibraryReturn.seconds > 590, `Listening timer did not advance: ${beforeLibraryReturn.seconds}`);

  await page.locator('[data-module-target="reading"]').evaluate((node) => node.click());
  await page.waitForFunction(() => state.activeModule === "reading" && state.singleStarted === false);
  await page.locator('[data-module-target="listening"]').evaluate((node) => node.click());
  await page.waitForFunction(() => state.activeModule === "listening" && state.singleStarted === false);
  await page.locator(`[data-start-practice-unit="${sectionId}"]`).click();
  await page.locator(`.objective-answer-control[data-prefix="single"][data-qid="${firstQuestionId}"]:not([type="hidden"])`).waitFor({ state: "visible" });

  await page.waitForFunction(() => {
    const status = document.querySelector('[data-listening-status][data-prefix="single"] [data-listening-state]')?.textContent || "";
    const button = document.querySelector('[data-listening-start][data-prefix="single"]');
    const audio = document.querySelector('.listening-player[data-prefix="single"][data-section="4"]');
    return status === "Ready to play" && button?.textContent === "Start listening" && !button.disabled
      && audio?.controls && audio.preload === "metadata" && audio.readyState >= 1 && !audio.error;
  }, { timeout: 10_000 });

  const afterLibraryReturn = await page.evaluate(({ itemId, questionId }) => {
    const session = readPracticeSession("listening", itemId);
    const audio = document.querySelector('.listening-player[data-prefix="single"][data-section="4"]');
    const studio = document.querySelector('.listening-study[data-listening-prefix="single"]');
    const visibleTimer = [...document.querySelectorAll("#singleTimer")].find((node) => node.getBoundingClientRect().width > 0);
    return {
      sessionId: session?.sessionId || "",
      answer: session?.answers?.[questionId] || "",
      seconds: session?.seconds,
      timer: visibleTimer?.textContent || formatTime(state.singleSeconds),
      playbackStatus: document.querySelector('[data-listening-status][data-prefix="single"] [data-listening-state]')?.textContent || "",
      startLabel: document.querySelector('[data-listening-start][data-prefix="single"]')?.textContent || "",
      progress: document.querySelector('[data-listening-status][data-prefix="single"] [data-listening-progress]')?.textContent || "",
      currentSection: studio?.dataset.currentSection || "",
      questionIds: JSON.parse(decodeURIComponent(studio?.dataset.questionIds || "%5B%5D")),
      pageImages: JSON.parse(decodeURIComponent(studio?.dataset.pageImages || "%5B%5D")),
      answerGroups: [...document.querySelectorAll('.paper-answer-group[data-listening-section]')].map((group) => group.dataset.listeningSection),
      audio: audio ? { src: audio.currentSrc || audio.src, readyState: audio.readyState, duration: audio.duration, controls: audio.controls, preload: audio.preload, error: audio.error?.code || null } : null,
    };
  }, { itemId: sectionId, questionId: firstQuestionId });
  assert.equal(afterLibraryReturn.sessionId, beforeLibraryReturn.sessionId, "Library resume must preserve the existing session id");
  assert.equal(afterLibraryReturn.answer, beforeLibraryReturn.answer, "Library resume lost the student's Section answer");
  assert.equal(afterLibraryReturn.seconds, beforeLibraryReturn.seconds, "Library resume reset the Section timer");
  assert.equal(afterLibraryReturn.timer, beforeLibraryReturn.timer, "Visible Listening timer changed during library resume");
  assert.equal(afterLibraryReturn.playbackStatus, "Ready to play", "Restored Listening must not stay in Loading state");
  assert.equal(afterLibraryReturn.startLabel, "Start listening");
  assert.match(afterLibraryReturn.progress, /^Section 4 · 1\/10 answered$/);
  assert.equal(afterLibraryReturn.currentSection, "4");
  assert.deepEqual(afterLibraryReturn.questionIds, sectionFixture.questionIds, "Rendered answers must stay scoped to the restored Section 4 source");
  assert.deepEqual(afterLibraryReturn.pageImages, sectionFixture.pageImages, "Rendered PDF pages must stay scoped to the restored Section 4 source");
  assert.deepEqual(afterLibraryReturn.answerGroups, ["4"], "Only the Section 4 answer/audio group may render");
  assert.equal(afterLibraryReturn.audio?.src, new URL(sectionFixture.audioUrl, baseUrl).href, "Restored audio must be the canonical Section 4 source");
  assert.ok(afterLibraryReturn.audio?.readyState >= 1 && Number.isFinite(afterLibraryReturn.audio.duration), "Restored MP3 metadata did not become usable");
  assert.equal(afterLibraryReturn.audio.error, null);
  console.log(`PASS Listening library card restored ${sectionId} with Section 4 status/audio/PDF/questions aligned, session ${afterLibraryReturn.sessionId}, timer ${afterLibraryReturn.timer}, audio readyState ${afterLibraryReturn.audio.readyState}.`);
} finally {
  await browser?.close();
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}
