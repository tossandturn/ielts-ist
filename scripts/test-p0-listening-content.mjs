import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selectedPort = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(selectedPort));
    });
  });
}

const port = Number(process.env.IELTSIST_P0_TEST_PORT || await findAvailablePort());
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), SESSION_COOKIE_SECURE: "0" },
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
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Server did not start: ${stderr}`);
}

async function waitForExit(processHandle, timeoutMs = 3_000) {
  if (!processHandle || processHandle.exitCode !== null || processHandle.signalCode !== null) return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      processHandle.off("exit", finish);
      processHandle.off("close", finish);
      resolve();
    };
    const timer = setTimeout(() => {
      if (processHandle.exitCode === null && processHandle.signalCode === null) processHandle.kill("SIGKILL");
      finish();
    }, timeoutMs);
    processHandle.once("exit", finish);
    processHandle.once("close", finish);
    if (processHandle.exitCode !== null || processHandle.signalCode !== null) finish();
  });
}

let browser;
try {
  await waitForServer();
  const tasksResponse = await fetch(`${baseUrl}/api/tasks`);
  assert.equal(tasksResponse.ok, true, "tasks endpoint must be available");
  const tasks = await tasksResponse.json();
  const speaking = Array.isArray(tasks.speakingSets) ? tasks.speakingSets : [];
  const listening = Array.isArray(tasks.listeningTests) ? tasks.listeningTests : [];
  assert.equal(
    speaking.some((set) => /Describe an important choice you had to\s*what/i.test(String(set.part2 || ""))),
    false,
    "truncated Speaking cue cards must not be active",
  );
  assert.equal(
    speaking.some((set) => /Describe something you liked very much\s*\nwhich\s*\nYou should say:/i.test(String(set.part2 || ""))),
    false,
    "cue cards with broken bullet structure must not be active",
  );
  const cam11 = listening.find((test) => test.id === "cam11-l-test4");
  assert.ok(cam11, "Cambridge 11 Test 4 listening fixture must remain available");
  const cam11Options = cam11.questions.flatMap((question) => question.options || []).map((option) => String(option.label || ""));
  assert.equal(
    /ltled to a stressful atmosphere|(?:\bCollections\s+82\b)|(?:\bPlays\s+81\s+ee\b)|(?:injury\.\s+85\b)|(?:^|\s)\|(?:\s|$)/i.test(JSON.stringify(cam11)),
    false,
    "known OCR-corrupted Listening text must not be active",
  );
  assert.ok(cam11Options.includes("includes some items given by members of the public"), "lowercase wrapped option continuation must be restored");
  assert.ok(cam11Options.includes("includes the most popular exhibits in the museum"), "lowercase wrapped option continuation must be restored");

  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/?test=p0-listening-content#single`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Array.isArray(state.data?.listeningTests) && Array.isArray(state.data?.readingTests));

  const result = await page.evaluate(() => {
    const item = mergedItems("listening").map(normalizeItem).find((candidate) => candidate.id === "cam11-l-test4");
    if (!item) throw new Error("Cambridge 11 Test 4 is not loaded");
    state.activeModule = "listening";
    state.activeSingle = item;
    state.singlePracticeScopes.listening = "paper";
    state.singlePracticeModes.listening = "exam";
    state.singlePracticeSections.listening = 1;
    state.singleStarted = true;
    state.practiceSessionCompleted = false;
    state.singleAnswers = { q1: "audit-answer" };
    state.singleAnswerItemId = item.id;
    state.singleTotal = 30 * 60;
    state.singleSeconds = 1_487;
    savePracticeSession();
    const first = readPracticeSession("listening", item.id);
    const restoreSnapshots = [];
    for (let index = 0; index < 5; index += 1) {
      if (!restorePracticeSessionAfterData("listening", item.id)) throw new Error("Listening restore failed");
      renderSingle();
      restoreSnapshots.push({
        sessionId: readPracticeSession("listening", item.id)?.sessionId || "",
        startedAt: readPracticeSession("listening", item.id)?.startedAt || "",
        seconds: state.singleSeconds,
        total: state.singleTotal,
        answer: state.singleAnswers.q1 || "",
        section: state.singlePracticeSections.listening,
        answered: Object.values(state.singleAnswers || {}).filter((value) => String(value || "").trim()).length,
        status: document.querySelector("[data-listening-progress]")?.textContent || "",
        timer: document.querySelector("#singleTimer")?.textContent || "",
      });
    }
    return {
      first,
      restoreSnapshots,
      sessions: readPracticeSessions().filter((session) => session.module === "listening" && session.itemId === item.id),
    };
  });

  assert.equal(result.first.durationMs, 30 * 60 * 1000, "Listening duration must be persisted as 30 minutes");
  assert.equal(result.first.remainingMs, 1_487 * 1000, "remainingMs must be persisted");
  assert.equal(result.first.currentSection, 1, "currentSection must be persisted");
  assert.equal(result.first.currentQuestion, "q1", "currentQuestion must be persisted");
  assert.deepEqual(result.first.responseMap, { q1: "audit-answer" }, "responseMap must be canonical");
  assert.equal(result.first.answeredCount, undefined, "answeredCount must be derived, not persisted");
  assert.equal(result.restoreSnapshots.length, 5);
  for (const snapshot of result.restoreSnapshots) {
    assert.equal(snapshot.sessionId, result.first.sessionId, "restore must preserve session id");
    assert.equal(snapshot.startedAt, result.first.startedAt, "restore must preserve startedAt");
    assert.equal(snapshot.seconds, 1_487, "restore must preserve remaining time");
    assert.equal(snapshot.total, 30 * 60, "restore must use Listening duration");
    assert.equal(snapshot.answer, "audit-answer");
    assert.equal(snapshot.section, 1);
    assert.equal(snapshot.answered, 1);
    assert.equal(snapshot.status, "Section 1 · 1/10 answered", "full Listening restore must render the saved current section");
    assert.equal(snapshot.timer, "00:24:47", "restored timer must match the canonical remaining time");
  }
  assert.equal(result.sessions.length, 1, "repeated restore must not duplicate drafts");

  const recovery = await page.evaluate(() => {
    const item = mergedItems("listening").map(normalizeItem).find((candidate) => candidate.id === "cam11-l-test4");
    const baseline = readPracticeSession("listening", item.id);
    const invalid = {
      ...baseline,
      sessionId: "session_invalid_duration_01",
      attemptId: "attempt_invalid_duration_01",
      durationMs: 60 * 60 * 1000,
      remainingMs: 59 * 60 * 1000,
      updatedAt: new Date(Date.now() + 2_000).toISOString(),
    };
    upsertPracticeSession(invalid);
    const restored = restorePracticeSessionAfterData("listening", item.id);
    return {
      restored,
      issue: state.practiceRestoreIssue,
      raw: readPracticeSession("listening", item.id),
    };
  });
  assert.equal(recovery.restored, false, "invalid draft facts must never enter a practice workspace");
  assert.equal(recovery.issue?.reason, "draft_duration_mismatch");
  assert.equal(recovery.raw?.sessionId, "session_invalid_duration_01", "invalid snapshot must remain recoverable");

  await page.evaluate(() => {
    const item = mergedItems("listening").map(normalizeItem).find((candidate) => candidate.id === "cam11-l-test4");
    removePracticeSession("session_invalid_duration_01");
    state.activeModule = "listening";
    state.activeSingle = item;
    state.singleStarted = true;
    state.practiceSessionCompleted = false;
    state.singleAnswers = {};
    state.singleAnswerItemId = item.id;
    state.singleTotal = 30 * 60;
    state.singleSeconds = 1_420;
    state.singlePracticeSections.listening = 1;
    savePracticeSession();
    renderSingle();
    setSingleImmersive("listening");
  });
  const leaveAnswer = page.locator('.objective-answer-control[data-prefix="single"][data-qid="q1"]');
  await leaveAnswer.fill("leave-modal-answer");
  await page.waitForFunction(() => state.singleAnswers?.q1 === "leave-modal-answer");
  await page.locator("#globalSidebarToggle").click();
  await page.locator('[data-module-target="reading"]').click();
  await page.locator("#practiceLeaveDialog").waitFor({ state: "visible" });
  await page.locator("#practiceLeaveSave").click();
  await page.waitForFunction(() => state.activeModule === "reading" && state.singleStarted === false);
  const leaveResult = await page.evaluate(() => {
    const session = readPracticeSession("listening", "cam11-l-test4");
    return {
      answer: session?.responseMap?.q1 || "",
      seconds: session?.seconds,
      section: session?.currentSection,
      state: state.practiceSaveState,
    };
  });
  assert.deepEqual(leaveResult, {
    answer: "leave-modal-answer",
    seconds: 1_420,
    section: 1,
    state: "saved",
  }, "Save and leave must preserve the Listening fact snapshot");

  const coexistence = await page.evaluate(() => {
    const listening = mergedItems("listening").map(normalizeItem).find((candidate) => candidate.id === "cam11-l-test4");
    const reading = mergedItems("reading").map(normalizeItem).find((candidate) => candidate.questions?.length);
    const writing = mergedItems("writing").map(normalizeItem).find((candidate) => candidate.id && (candidate.prompt || candidate.question || candidate.title));
    if (!listening || !reading || !writing) throw new Error("Listening, Reading and Writing fixtures are required");
    const save = ({ module, item, answer, seconds, section = 1, writingDrafts = {} }) => {
      state.activeModule = module;
      state.activeSingle = item;
      state.singleStarted = true;
      state.practiceSessionCompleted = false;
      state.singleAnswers = answer ? { [item.questions?.[0]?.id || "q1"]: answer } : {};
      state.singleAnswerItemId = item.id;
      state.singleTotal = canonicalPracticeDurationMs(module, item) / 1000;
      state.singleSeconds = seconds;
      state.singlePracticeSections[module] = section;
      state.practiceWritingDrafts = writingDrafts;
      savePracticeSession({ scheduleRemote: false });
    };
    save({ module: "listening", item: listening, answer: "listening-coexists", seconds: 1320, section: 1 });
    save({ module: "reading", item: reading, answer: "reading-coexists", seconds: 3220 });
    save({ module: "writing", item: writing, seconds: 3480, writingDrafts: { "single-task1-writing": "Writing draft coexists." } });
    const sessions = readPracticeSessions().filter((session) => ["listening", "reading", "writing"].includes(session.module));
    return sessions.map((session) => ({
      module: session.module,
      itemId: session.itemId,
      answer: Object.values(session.responseMap || {})[0] || "",
      writing: Object.values(session.writingDrafts || {})[0] || "",
      seconds: session.seconds,
    })).sort((left, right) => left.module.localeCompare(right.module));
  });
  assert.deepEqual(coexistence.map((entry) => entry.module), ["listening", "reading", "writing"], "Listening, Reading and Writing drafts must coexist independently");
  assert.equal(coexistence.find((entry) => entry.module === "listening")?.answer, "listening-coexists");
  assert.equal(coexistence.find((entry) => entry.module === "reading")?.answer, "reading-coexists");
  assert.equal(coexistence.find((entry) => entry.module === "writing")?.writing, "Writing draft coexists.");

  const offlineBackup = await page.evaluate(async () => {
    const item = mergedItems("listening").map(normalizeItem).find((candidate) => candidate.id === "cam11-l-test4");
    if (!item) throw new Error("Listening fixture is required");
    const originalToken = state.authToken;
    state.authToken = "expired-local-qa-token";
    state.activeModule = "listening";
    state.activeSingle = item;
    state.singleStarted = true;
    state.practiceSessionCompleted = false;
    state.singleAnswers = { q1: "offline-backup-answer" };
    state.singleAnswerItemId = item.id;
    state.singleTotal = 30 * 60;
    state.singleSeconds = 1_111;
    state.singlePracticeSections.listening = 1;
    renderSingle();
    savePracticeSession();
    await new Promise((resolve) => setTimeout(resolve, 900));
    const session = readPracticeSession("listening", item.id);
    const result = {
      state: state.practiceSaveState,
      label: document.querySelector("[data-practice-save-label]")?.textContent || "",
      retryVisible: !document.querySelector("[data-practice-save-retry]")?.hidden,
      answer: session?.responseMap?.q1 || "",
      seconds: session?.seconds,
    };
    state.authToken = originalToken;
    return result;
  });
  assert.deepEqual(offlineBackup, {
    state: "backup",
    label: "Offline backup pending",
    retryVisible: true,
    answer: "offline-backup-answer",
    seconds: 1_111,
  }, "Failed account sync must retain the local draft and expose a visible Retry action");
  console.log("PASS P0-03 Listening facts/restore and P0-04 active-content quarantine.");
} finally {
  await browser?.close();
  if (child.exitCode === null && child.signalCode === null) child.kill();
  await waitForExit(child);
}
