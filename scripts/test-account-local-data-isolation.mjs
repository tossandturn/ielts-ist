import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const port = 7600 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "ieltsist-account-isolation-"));
const databasePath = join(tempDirectory, "account-isolation.sqlite");

const serverEnvironment = {
  ...process.env,
  PORT: String(port),
  IELTSIST_DB_PATH: databasePath,
  SESSION_COOKIE_SECURE: "0",
  OPENAI_API_KEY: "",
  DASHSCOPE_API_KEY: "",
  QWEN_API_KEY: "",
  WRITING_AI_API_KEY: "",
  QWEN_WRITING_API_KEY: "",
  COACH_AI_API_KEY: "",
  QWEN_COACH_API_KEY: "",
  SPEAKING_AUDIO_AI_API_KEY: "",
  QWEN_SPEAKING_AUDIO_API_KEY: "",
  FISH_API_KEY: "",
  FISH_AUDIO_API_KEY: "",
  FISHAUDIO_API_KEY: "",
  STEM_MARKING_AI_DISABLED: "1",
};

const child = spawn(process.execPath, ["server.js"], {
  cwd: rootPath,
  env: serverEnvironment,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
const appendServerOutput = (chunk) => {
  serverOutput = `${serverOutput}${chunk}`.slice(-8_000);
};
child.stdout.on("data", appendServerOutput);
child.stderr.on("data", appendServerOutput);

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Isolation server exited early (${child.exitCode}).\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Isolation server did not start.\n${serverOutput}`);
}

async function stopServer() {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

async function waitForApp(page, username = null) {
  await page.waitForFunction(() => (
    Array.isArray(state.data?.listeningTests)
    && Array.isArray(state.data?.readingTests)
    && Array.isArray(state.data?.writingTasks)
  ));
  assert.equal(
    await page.evaluate(() => state.localDataOwnerResolved),
    true,
    "Local data owner must resolve before the app accepts answers or drafts",
  );
  if (username) {
    await page.waitForFunction((expected) => state.currentUser?.username === expected, username);
  } else {
    await page.waitForFunction(() => !state.authToken && !state.currentUser);
  }
}

async function openMine(page) {
  await page.evaluate(() => activateView("mine", true));
  await page.locator("#mine").waitFor({ state: "visible" });
}

async function registerThroughUi(page, username) {
  await openMine(page);
  await page.locator("#authUsername").fill(username);
  await page.locator("#authPassword").fill("testing123");
  const navigation = page.waitForNavigation({ waitUntil: "networkidle", timeout: 8_000 }).catch(() => null);
  await page.locator("#registerUser").click();
  await navigation;
  await waitForApp(page, username);
  return page.evaluate(() => ({ id: state.currentUser?.id, username: state.currentUser?.username }));
}

async function loginThroughUi(page, username) {
  await openMine(page);
  await page.locator("#authUsername").fill(username);
  await page.locator("#authPassword").fill("testing123");
  const navigation = page.waitForNavigation({ waitUntil: "networkidle", timeout: 8_000 }).catch(() => null);
  await page.locator("#loginUser").click();
  await navigation;
  await waitForApp(page, username);
}

async function logoutThroughUi(page) {
  await openMine(page);
  const navigation = page.waitForNavigation({ waitUntil: "networkidle", timeout: 8_000 }).catch(() => null);
  await page.locator("#logoutUser").click();
  await navigation;
  await waitForApp(page);
}

async function reloadForIdentity(page, hash, username = null) {
  await page.goto(`${baseUrl}/?test=account-local-data-isolation${hash}`, { waitUntil: "networkidle" });
  await waitForApp(page, username);
}

async function seedObjectiveSessions(page, label, listeningSeconds, readingSeconds) {
  return page.evaluate(({ label: ownerLabel, listeningSeconds: listeningTime, readingSeconds: readingTime }) => {
    function seed(moduleName, seconds) {
      stopSingleTimer();
      const item = mergedItems(moduleName).map(normalizeItem).find((candidate) => candidate.questions?.length);
      if (!item) throw new Error(`${moduleName} fixture is required`);
      state.activeModule = moduleName;
      state.activeSingle = item;
      state.singleStarted = true;
      state.practiceSessionCompleted = false;
      state.singleAnswers = {};
      state.singleAnswerItemId = item.id;
      state.singleSeconds = seconds;
      state.singleTotal = singleModuleTotal(moduleName);
      renderSingle();
      const input = document.querySelector('.answer-input[data-prefix="single"][data-qid]');
      if (!input) throw new Error(`${moduleName} answer input is required`);
      const questionId = input.dataset.qid;
      const answer = `${ownerLabel}-${moduleName}-answer`;
      input.value = answer;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      state.singleSeconds = seconds;
      savePracticeSession();
      const session = readPracticeSession(moduleName, item.id);
      if (!session) throw new Error(`${moduleName} session was not persisted`);
      return {
        module: moduleName,
        itemId: item.id,
        questionId,
        answer,
        sessionId: session.sessionId,
        seconds: session.seconds,
        renderedAnswer: input.value,
      };
    }

    return {
      listening: seed("listening", listeningTime),
      reading: seed("reading", readingTime),
    };
  }, { label, listeningSeconds, readingSeconds });
}

async function seedWritingFullTest(page, label, elapsedSeconds) {
  await page.evaluate(() => {
    stopSingleTimer();
    activateView("writing-upload", true);
  });
  const fullTestCard = page.locator(".writing-full-test-card[data-writing-full-test-id]").first();
  await fullTestCard.waitFor({ state: "visible" });
  await fullTestCard.locator("button[data-writing-full-test-id]").click();
  await page.locator('.unified-practice-setup[data-setup-module="writing"]').waitFor({ state: "visible" });
  await page.locator('[data-start-unified-practice="writing"]').click();
  await page.locator("#upload-system-task1-writing").waitFor({ state: "visible" });

  const task1Draft = `${label} Task 1 draft must stay private.`;
  const task2Draft = `${label} Task 2 draft must stay private.`;
  await page.locator("#upload-system-task1-writing").fill(task1Draft);
  await page.locator('[data-writing-task-tab="2"]').click();
  await page.locator("#upload-system-task2-writing").fill(task2Draft);
  await page.evaluate(async (elapsed) => {
    if (state.draftSaveTimer) {
      clearTimeout(state.draftSaveTimer);
      state.draftSaveTimer = null;
    }
    if (state.writingTimerId) clearInterval(state.writingTimerId);
    state.writingTimerId = null;
    state.writingTimerStartedAt = 0;
    state.writingTimerElapsed = elapsed;
    saveWritingUploadSessionPointer();
    saveWritingTimerState(false);
    await syncCurrentDraftNow();
  }, elapsedSeconds);

  return page.evaluate(({ task1Draft: expectedTask1, task2Draft: expectedTask2 }) => {
    const draft = readLocalDrafts().find((entry) => (
      entry?.payload?.values?.["id:upload-system-task1-writing"] === expectedTask1
      && entry?.payload?.values?.["id:upload-system-task2-writing"] === expectedTask2
    ));
    return {
      setId: state.pendingWritingSetId,
      task1Id: state.selectedWritingTask1Id,
      task2Id: state.selectedWritingTask2Id,
      activeTaskNumber: state.writingActiveTaskNumber,
      practiceKind: state.pendingWritingKind,
      elapsed: writingTimerElapsedSeconds(),
      task1Draft: expectedTask1,
      task2Draft: expectedTask2,
      draftKey: draft?.key || "",
    };
  }, { task1Draft, task2Draft });
}

async function localDataSnapshot(page) {
  return page.evaluate(() => ({
    owner: state.currentUser ? `user:${state.currentUser.id}` : "guest",
    sessions: readPracticeSessions().map((session) => ({
      module: session.module,
      itemId: session.itemId,
      sessionId: session.sessionId,
      seconds: session.seconds,
      answers: session.answers,
    })),
    drafts: readLocalDrafts().map((draft) => ({
      key: draft.key,
      values: draft.payload?.values || {},
      writingSetId: draft.payload?.writingSetId || "",
      writingTask1Id: draft.payload?.writingTask1Id || "",
      writingTask2Id: draft.payload?.writingTask2Id || "",
      writingTimer: draft.payload?.writingTimer || null,
    })),
  }));
}

async function seedPrivateOwnerData(page, label) {
  return page.evaluate((ownerLabel) => {
    writeWeakAreas([{ id: `weak-${ownerLabel}`, module: "reading", summary: `${ownerLabel} weak area`, updatedAt: new Date().toISOString() }]);
    updateLearningLoopHistory({
      writing: { attemptId: `writing-${ownerLabel}`, module: "writing", title: `${ownerLabel} learning history`, updatedAt: new Date().toISOString() },
    });
    persistCoachThread(
      { sessionId: `session-${ownerLabel}`, module: "reading", paperId: `paper-${ownerLabel}`, questionId: "q1", view: "single" },
      [{ role: "user", content: `${ownerLabel} private Coach chat`, createdAt: new Date().toISOString() }],
    );
    state.vocabularyReview.known.add(`known-${ownerLabel}`);
    saveCoreVocabularyKnown();
    writeLocalVocabularyNotebook([{
      localKey: `term-${ownerLabel}`,
      termId: `term-${ownerLabel}`,
      word: `term-${ownerLabel}`,
      meaning: `${ownerLabel} private meaning`,
      savedAt: Date.now(),
    }]);
    writeAnnotations({ [`paper-${ownerLabel}`]: { note: `${ownerLabel} private annotation` } });
    state.userBank = [{ id: `bank-${ownerLabel}`, module: "reading", title: `${ownerLabel} private bank`, prompt: "Private prompt" }];
    saveBank();
    writeLikedTopicIds([`liked-${ownerLabel}`]);
    writeRecommendationHistory({ marker: ownerLabel, updatedAt: new Date().toISOString() });
    writeOwnerStoredJson(guestLearningProfileStoreKey, {
      version: 1,
      marker: ownerLabel,
      currentBand: 6,
      targetBand: 7.5,
      dailyMinutes: 30,
      updatedAt: new Date().toISOString(),
    });
    const completion = readPracticeCompletionStore();
    completion.partitions = {
      ...(completion.partitions || {}),
      [practiceCompletionIdentityKey()]: { [`reading:${ownerLabel}`]: { completedAt: new Date().toISOString(), marker: ownerLabel } },
    };
    writePracticeCompletionStore(completion);
    writePendingLearningAttempts([{ attemptId: `pending-${ownerLabel}`, marker: ownerLabel }]);
    qwenRememberRecentQuestion(`What should ${ownerLabel} explain in this answer?`);
    return ownerLabel;
  }, label);
}

async function privateOwnerSnapshot(page) {
  return page.evaluate(() => ({
    owner: state.localDataOwner,
    weakAreas: readWeakAreas(),
    learningHistory: readLearningLoopHistory(),
    coachHistory: readCoachHistoryThreads(),
    knownVocabulary: [...state.vocabularyReview.known],
    notebook: readLocalVocabularyNotebook(),
    annotations: readAnnotations(),
    userBank: state.userBank,
    likedTopics: readLikedTopicIds(),
    recommendations: readRecommendationHistory(),
    profile: ownerStoredJson(guestLearningProfileStoreKey, null),
    completions: readPracticeCompletionStore(),
    pendingLearning: ownerStoredJson(pendingLearningAttemptsStoreKey, null),
    speakingRecent: ownerStoredJson(speakingRecentQuestionsStoreKey, null),
  }));
}

function assertPrivateOwner(snapshot, expectedLabel, forbiddenLabel = "") {
  assert.match(JSON.stringify(snapshot), new RegExp(expectedLabel), `Private owner state lost ${expectedLabel}`);
  if (forbiddenLabel) {
    assert.doesNotMatch(JSON.stringify(snapshot), new RegExp(forbiddenLabel), `Private owner state leaked ${forbiddenLabel}`);
  }
}

function assertObjectiveSnapshot(snapshot, expected, unexpectedLabel = "") {
  for (const expectedSession of Object.values(expected)) {
    const session = snapshot.sessions.find((entry) => entry.module === expectedSession.module && entry.itemId === expectedSession.itemId);
    assert.ok(session, `${expectedSession.module} session was not available to its owner`);
    assert.equal(session.sessionId, expectedSession.sessionId, `${expectedSession.module} session id changed across account switches`);
    assert.equal(session.seconds, expectedSession.seconds, `${expectedSession.module} timer changed across account switches`);
    assert.equal(session.answers?.[expectedSession.questionId], expectedSession.answer, `${expectedSession.module} answer was not restored`);
  }
  if (unexpectedLabel) {
    assert.doesNotMatch(JSON.stringify(snapshot), new RegExp(unexpectedLabel), `Local state leaked ${unexpectedLabel} data`);
  }
}

async function assertRenderedObjectiveRestore(page, expectedSession) {
  const restored = await page.evaluate(({ module, itemId, questionId }) => {
    stopSingleTimer();
    const session = readPracticeSession(module, itemId);
    if (!session) return null;
    restorePracticeSessionAfterData(module, itemId);
    renderSingle();
    const input = document.querySelector(`.answer-input[data-prefix="single"][data-qid="${CSS.escape(questionId)}"]`);
    const result = {
      sessionId: session.sessionId,
      seconds: state.singleSeconds,
      inputValue: input?.value || "",
    };
    stopSingleTimer();
    return result;
  }, expectedSession);
  assert.ok(restored, `${expectedSession.module} could not be restored into the real workspace`);
  assert.equal(restored.sessionId, expectedSession.sessionId);
  assert.equal(restored.seconds, expectedSession.seconds);
  assert.equal(restored.inputValue, expectedSession.answer);
}

async function assertWritingRestore(page, expected, unexpectedLabel = "") {
  const timerBeforeReload = await page.evaluate(() => ownerStoredJson(writingTimerStoreKey, null));
  await reloadForIdentity(page, "#writing-upload", stateUsername(await page.evaluate(() => state.currentUser)));
  try {
    await page.locator(".writing-practice-shell").waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    const diagnostic = await page.evaluate(() => ({
      owner: state.localDataOwner,
      hash: location.hash,
      pointer: ownerStoredJson(writingUploadSessionStoreKey, null),
      draftCount: readLocalDrafts().length,
      workspaceMode: state.writingWorkspaceMode,
      pendingSetId: state.pendingWritingSetId,
      restoreWouldSucceed: restoreWritingUploadSessionAfterData(),
    }));
    assert.fail(`Writing Full Test did not restore for its owner: ${JSON.stringify(diagnostic)}`);
  }
  const restored = await page.evaluate(() => ({
    setId: state.pendingWritingSetId,
    task1Id: state.selectedWritingTask1Id,
    task2Id: state.selectedWritingTask2Id,
    practiceKind: state.pendingWritingKind,
    elapsed: writingTimerElapsedSeconds(),
    task1Draft: document.querySelector("#upload-system-task1-writing")?.value || "",
    task2Draft: document.querySelector("#upload-system-task2-writing")?.value || "",
    storedTimer: ownerStoredJson(writingTimerStoreKey, null),
  }));
  assert.equal(restored.setId, expected.setId, "Writing Full Test pointer changed across account switches");
  assert.equal(restored.task1Id, expected.task1Id);
  assert.equal(restored.task2Id, expected.task2Id);
  assert.equal(restored.practiceKind, "full-test");
  assert.equal(restored.task1Draft, expected.task1Draft, "Writing Task 1 draft was not restored");
  assert.equal(restored.task2Draft, expected.task2Draft, "Writing Task 2 draft was not restored");
  assert.ok(
    restored.elapsed >= expected.elapsed && restored.elapsed <= expected.elapsed + 20,
    `Writing timer was reset (${expected.elapsed} -> ${restored.elapsed}); before reload=${JSON.stringify(timerBeforeReload)} after restore=${JSON.stringify(restored.storedTimer)}`,
  );
  if (unexpectedLabel) assert.doesNotMatch(JSON.stringify(restored), new RegExp(unexpectedLabel), `Writing workspace leaked ${unexpectedLabel} data`);
  await page.evaluate(() => stopWritingTimer({ pause: true }));
}

function stateUsername(user) {
  return user?.username || null;
}

async function assertGuestWorkspaceEmpty(page, forbiddenLabels) {
  const snapshot = await localDataSnapshot(page);
  assert.equal(snapshot.owner, "guest");
  assert.equal(snapshot.sessions.length, 0, "Guest namespace retained a claimed account practice session");
  assert.equal(snapshot.drafts.length, 0, "Guest namespace retained a claimed account Writing draft");
  for (const label of forbiddenLabels) {
    assert.doesNotMatch(JSON.stringify(snapshot), new RegExp(label), `Guest namespace retained ${label} data`);
  }
  const privateSnapshot = await privateOwnerSnapshot(page);
  for (const label of forbiddenLabels) {
    assert.doesNotMatch(JSON.stringify(privateSnapshot), new RegExp(label), `Guest namespace retained ${label} private data`);
  }
  await page.goto(`${baseUrl}/?test=account-local-data-isolation#writing-upload`, { waitUntil: "networkidle" });
  await waitForApp(page);
  assert.equal(await page.locator(".writing-practice-shell").count(), 0, "Guest workspace restored a claimed account Writing Full Test");
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
    console.error(`PAGE ERROR: ${error.message}`);
  });

  await reloadForIdentity(page, "#single");
  const guestObjective = await seedObjectiveSessions(page, "guest-a", 1_427, 3_218);
  assert.equal(guestObjective.listening.renderedAnswer, guestObjective.listening.answer);
  assert.equal(guestObjective.reading.renderedAnswer, guestObjective.reading.answer);
  const guestWriting = await seedWritingFullTest(page, "guest-a", 73);
  assert.ok(guestWriting.draftKey, "Guest Writing Full Test did not create a local draft");
  await seedPrivateOwnerData(page, "guest-a");

  const usernameA = `iso_a_${process.pid}`.slice(0, 24);
  const usernameB = `iso_b_${process.pid}`.slice(0, 24);
  const userA = await registerThroughUi(page, usernameA);
  assert.ok(userA.id, "Account A registration did not return a stable user id");

  await reloadForIdentity(page, "#single", usernameA);
  const claimedByA = await localDataSnapshot(page);
  assertObjectiveSnapshot(claimedByA, guestObjective);
  assertPrivateOwner(await privateOwnerSnapshot(page), "guest-a");
  await assertWritingRestore(page, guestWriting);
  console.log(`PASS guest work was claimed once by account A (${userA.id}).`);

  await logoutThroughUi(page);
  await reloadForIdentity(page, "#mine");
  await assertGuestWorkspaceEmpty(page, ["guest-a"]);
  console.log("PASS logout returned to an empty guest namespace without deleting account A data.");

  const userB = await registerThroughUi(page, usernameB);
  assert.ok(userB.id && userB.id !== userA.id, "Account B registration did not produce a distinct user id");
  await reloadForIdentity(page, "#single", usernameB);
  const initialB = await localDataSnapshot(page);
  assert.equal(initialB.sessions.length, 0, "Account B inherited account A practice sessions");
  assert.equal(initialB.drafts.length, 0, "Account B inherited account A Writing drafts");
  assert.doesNotMatch(JSON.stringify(initialB), /guest-a/, "Account B inherited the guest work already claimed by A");
  assert.equal(await page.locator(".writing-practice-shell").count(), 0, "Account B restored account A Writing workspace");
  assert.doesNotMatch(JSON.stringify(await privateOwnerSnapshot(page)), /guest-a/, "Account B inherited account A private local data");

  const objectiveB = await seedObjectiveSessions(page, "account-b", 1_111, 2_222);
  const writingB = await seedWritingFullTest(page, "account-b", 131);
  await seedPrivateOwnerData(page, "account-b");
  assert.ok(writingB.draftKey);
  console.log(`PASS account B (${userB.id}) started with no A data and saved an independent workspace.`);

  await logoutThroughUi(page);
  await reloadForIdentity(page, "#mine");
  await assertGuestWorkspaceEmpty(page, ["guest-a", "account-b"]);

  await loginThroughUi(page, usernameA);
  await reloadForIdentity(page, "#single", usernameA);
  const restoredA = await localDataSnapshot(page);
  assertObjectiveSnapshot(restoredA, guestObjective, "account-b");
  assertPrivateOwner(await privateOwnerSnapshot(page), "guest-a", "account-b");
  await assertRenderedObjectiveRestore(page, guestObjective.listening);
  await assertRenderedObjectiveRestore(page, guestObjective.reading);
  await assertWritingRestore(page, guestWriting, "account-b");
  const finalA = await localDataSnapshot(page);
  assert.doesNotMatch(JSON.stringify(finalA), /account-b/, "Account A inherited account B local work after relogin");
  assert.notDeepEqual(
    [guestObjective.listening.sessionId, guestObjective.reading.sessionId],
    [objectiveB.listening.sessionId, objectiveB.reading.sessionId],
    "Accounts A and B unexpectedly shared practice session ids",
  );
  assert.equal(pageErrors.length, 0, `Browser page errors: ${pageErrors.join(" | ")}`);
  console.log("PASS Guest -> A -> logout -> B -> logout -> A keeps Listening, Reading and Writing local state isolated and restorable.");
} finally {
  await browser?.close();
  await stopServer();
  await rm(tempDirectory, { recursive: true, force: true });
}
