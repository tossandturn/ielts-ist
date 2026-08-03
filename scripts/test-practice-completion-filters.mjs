import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = fileURLToPath(new URL("../", import.meta.url));
const appSource = await readFile(path.join(root, "public", "app.js"), "utf8");
const serverSource = await readFile(path.join(root, "server.js"), "utf8");

function functionSource(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Expected function ${name}() to exist`);
  const bodyMarker = source.indexOf(") {", match.index);
  assert.ok(bodyMarker >= 0, `Expected function ${name}() body`);
  const brace = bodyMarker + 2;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(match.index, index + 1);
  }
  throw new Error(`Could not parse function ${name}()`);
}

assert.match(appSource, /const completionStoreKey\s*=\s*["']ieltsistCompletedItemsV1["']/, "Completion truth needs its own durable localStorage index");
assert.match(appSource, /const pendingLearningAttemptsStoreKey\s*=\s*["']ieltsistPendingLearningAttemptsV1["']/, "Failed attempt archival needs a durable outbox");

const completionFunctions = [
  "practiceCompletionIdentityForUser",
  "practiceCompletionIdentityKey",
  "completionSyncOwnerIsCurrent",
  "learningStateForCompletionOwner",
  "canonicalPracticeCompletionId",
  "practiceCompletionKey",
  "readPracticeCompletionStore",
  "writePracticeCompletionStore",
  "practiceCompletionScoreFields",
  "legacyPracticeCompletionEntries",
  "readPracticeCompletionIndex",
  "rememberPracticeCompletion",
  "practiceCompletionStatus",
  "readPendingLearningAttempts",
  "writePendingLearningAttempts",
  "queuePendingLearningAttempt",
  "removePendingLearningAttempt",
  "retryPendingLearningAttempts",
];
const persistenceFunctions = [
  "refreshMineData",
  "updateLearningLoopHistory",
  "compactLearningRecord",
  "archiveLearningAttempt",
  "rememberObjectiveResult",
  "rememberWritingAttempt",
  "rememberSpeakingResult",
];
const runtimeFunctions = [...completionFunctions, ...persistenceFunctions];
const completionRuntime = runtimeFunctions.map((name) => functionSource(appSource, name)).join("\n");

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
}

function completionContext(storage, overrides = {}) {
  const state = {
    currentUser: null,
    learningState: null,
    authToken: "",
    latestObjectiveResults: {},
    latestObjectiveResultsByItem: {},
    latestWritingAttempt: null,
    latestSpeakingResult: null,
    activeSingle: null,
    singleTotal: 1800,
    singleSeconds: 1200,
    ...overrides.state,
  };
  const context = {
    assert,
    console,
    Date,
    JSON,
    Blob,
    localStorage: storage,
    state,
    completionStoreKey: "ieltsistCompletedItemsV1",
    pendingLearningAttemptsStoreKey: "ieltsistPendingLearningAttemptsV1",
    learningHistoryStoreKey: "ieltsistLearningLoopHistory",
    readLearningLoopHistory() {
      try { return JSON.parse(storage.getItem("ieltsistLearningLoopHistory") || "{}"); } catch { return {}; }
    },
    postJson: overrides.postJson || (async () => ({ attempt: null })),
    getJson: overrides.getJson || (async () => ({})),
    activeViewId: () => "single",
    readPracticeSession: () => null,
    currentSinglePracticeMode: () => "practice",
    learningEntityId: (() => { let index = 0; return (prefix) => `${prefix}_behavior_${++index}`; })(),
    moduleDisplayName: (moduleName) => moduleName,
    practiceUnitBaseId: (item) => String(item?.sourceItemId || item?.baseItemId || item?.id || "").split("::")[0],
    resolveRetestedWeakAreas: () => null,
    retryPendingPracticeCompletion: () => Promise.resolve(true),
    readPendingPracticeCompletion: () => null,
    importRemotePracticeSession: () => null,
    updateUserChrome: () => null,
    renderMine: () => null,
    renderDashboard: () => null,
    renderSubscription: () => null,
    renderCoach: () => null,
    authStoreKey: "ieltsistAuthToken",
  };
  runInNewContext(`${completionRuntime}\nthis.api = { ${runtimeFunctions.join(", ")} };`, context);
  return context;
}

const guestStorage = memoryStorage({
  ieltsistPracticeSessionV1: JSON.stringify({ version: 1, started: true, module: "reading", itemId: "cam15-r-test1::section::2" }),
});
let guest = completionContext(guestStorage);
assert.equal(guest.api.practiceCompletionStatus("reading", { id: "cam15-r-test1::section::2" }).completed, false, "Opening or drafting a session must not count as completed");
guest.api.rememberPracticeCompletion("reading", { id: "cam15-r-test1::section::2", practiceScope: "section", practiceSection: 2 }, { attemptId: "attempt_reading_section", completedAt: "2026-08-02T01:00:00.000Z" });
assert.equal(guest.api.practiceCompletionKey("reading", { id: "cam15-r-test1::topic::science", practiceScope: "topic", practiceSection: 2 }), "reading:cam15-r-test1::section::2", "Semantic Topic and Passage views must share one canonical unit key");
assert.equal(guest.api.practiceCompletionKey("reading", { id: "cam15-r-test1", sourceItemId: "cam15-r-test1", practiceScope: "topic", practiceSection: 3 }), "reading:cam15-r-test1::section::3", "Semantic Topic canonicalization must not depend on a virtual ::topic:: ID shape");
assert.equal(guest.api.practiceCompletionStatus("reading", { id: "cam15-r-test1::topic::science", practiceScope: "topic", practiceSection: 2 }).completed, true);

guest = completionContext(guestStorage);
assert.equal(guest.api.practiceCompletionStatus("reading", { id: "cam15-r-test1::section::2" }).completed, true, "Guest completion must survive refresh");
guest.api.rememberPracticeCompletion("writing", { id: "cam15-w-test1-task1" }, { attemptId: "attempt_writing", completedAt: "2026-08-02T02:00:00.000Z" });
guest.api.rememberPracticeCompletion("speaking", { topicId: "cam15-s-test1" }, { attemptId: "attempt_speaking", completedAt: "2026-08-02T03:00:00.000Z" });
assert.equal(guest.api.practiceCompletionStatus("writing", { id: "cam15-w-test1-task1" }).completed, true, "Writing completion must use the exact task ID");
assert.equal(guest.api.practiceCompletionStatus("speaking", { id: "cam15-s-test1" }).completed, true, "Speaking completion must use the exact topicId");

guest.state.currentUser = { id: 73, username: "partition-user" };
assert.equal(guest.api.practiceCompletionStatus("writing", { id: "cam15-w-test1-task1" }).completed, false, "Logged-in completion must not inherit the guest partition");
guest.api.rememberPracticeCompletion("writing", { id: "cam16-w-test1-task2" }, { attemptId: "attempt_user_writing" });
guest.state.currentUser = null;
assert.equal(guest.api.practiceCompletionStatus("writing", { id: "cam16-w-test1-task2" }).completed, false, "A user's completion must not leak back to the guest partition");

const identityStorage = memoryStorage();
const identityPayloads = [];
const identity = completionContext(identityStorage, {
  state: { currentUser: { id: 101, username: "user-a" }, authToken: "token-a" },
  postJson: (_url, payload) => { identityPayloads.push(payload); throw new Error("offline"); },
});
identity.api.rememberWritingAttempt({ itemId: "cam15-w-test1-task1", attemptId: "attempt_user_a", scores: { overall: 7 } });
assert.equal(identity.api.practiceCompletionStatus("writing", { id: "cam15-w-test1-task1" }).completed, true);
assert.equal(JSON.parse(identityStorage.getItem("ieltsistLearningLoopHistory")).writing.completionIdentity, "user:101", "Real persistence paths must stamp the creating identity on global history records");
identity.state.learningState = {
  completionIdentity: "user:101",
  completedItems: [{ module: "speaking", itemId: "cam15-s-test1", attemptId: "remote_user_a" }],
};
assert.equal(identity.api.practiceCompletionStatus("speaking", { id: "cam15-s-test1" }).completed, true);
identity.state.currentUser = { id: 202, username: "user-b" };
identity.state.authToken = "token-b";
assert.equal(identity.api.practiceCompletionStatus("writing", { id: "cam15-w-test1-task1" }).completed, false, "User A's global learning history must not project into user B's completion index");
assert.equal(identity.api.practiceCompletionStatus("speaking", { id: "cam15-s-test1" }).completed, false, "User A's remote state must not project into user B's completion index");
identity.state.currentUser = null;
identity.state.authToken = "";
assert.equal(identity.api.practiceCompletionStatus("writing", { id: "cam15-w-test1-task1" }).completed, false, "A user's global learning history must not project into the guest completion index");

const persistenceStorage = memoryStorage();
const persistencePayloads = [];
const persistence = completionContext(persistenceStorage, {
  state: { currentUser: { id: 303, username: "persistence-user" }, authToken: "token-persistence" },
  postJson: (_url, payload) => { persistencePayloads.push(payload); throw new Error("offline"); },
});
const objectiveResult = persistence.api.rememberObjectiveResult("reading", {
  id: "cam15-r-test1",
  sourceItemId: "cam15-r-test1",
  practiceScope: "topic",
  practiceSection: 2,
  title: "Eucalyptus · Environment",
}, { result: { correct: 11, scoredTotal: 13, details: [] } });
persistence.api.rememberWritingAttempt({ itemId: "cam15-w-test1-task1", attemptId: "attempt_real_writing", scores: { overall: 7 } });
persistence.api.rememberSpeakingResult({ topicId: "cam15-s-test1", attemptId: "attempt_real_speaking", band: 7 });
assert.equal(objectiveResult.itemId, "cam15-r-test1::section::2", "Objective persistence must store the canonical Passage ID, not its semantic Topic virtual/base ID");
assert.deepEqual(
  { ...persistence.api.practiceCompletionStatus("reading", { id: "cam15-r-test1::section::2" }) },
  {
    completed: true,
    completedAt: objectiveResult.createdAt,
    attemptId: objectiveResult.attemptId,
    correct: 11,
    total: 13,
  },
  "Reading Topic completion must retain its real raw score for the Completed badge",
);
assert.deepEqual(
  persistencePayloads.map((payload) => [payload.module, payload.itemId]),
  [
    ["reading", "cam15-r-test1::section::2"],
    ["writing", "cam15-w-test1-task1"],
    ["speaking", "cam15-s-test1"],
  ],
  "Real objective, Writing and Speaking persistence paths must archive exact canonical IDs",
);
const persistedCompletionPartition = JSON.parse(persistenceStorage.getItem("ieltsistCompletedItemsV1")).partitions["user:303"];
for (const completionKey of ["reading:cam15-r-test1::section::2", "writing:cam15-w-test1-task1", "speaking:cam15-s-test1"]) {
  assert.ok(persistedCompletionPartition[completionKey], `Real persistence must write ${completionKey} to the owned local partition`);
}
assert.deepEqual(
  persistence.api.readPendingLearningAttempts().map((payload) => [payload.module, payload.itemId]),
  persistencePayloads.map((payload) => [payload.module, payload.itemId]),
  "Failed real persistence POSTs must retain the same canonical payloads in the durable outbox",
);
for (const [moduleName, itemId] of persistencePayloads.map((payload) => [payload.module, payload.itemId])) {
  assert.equal(persistence.api.practiceCompletionStatus(moduleName, { id: itemId }).completed, true, `${moduleName} real persistence must update the completion store`);
}

const implicationStorage = memoryStorage();
const implication = completionContext(implicationStorage);
implication.api.rememberPracticeCompletion("listening", { id: "cam15-l-test1", practiceScope: "paper" }, { attemptId: "attempt_listening_paper" });
assert.equal(implication.api.practiceCompletionStatus("listening", { id: "cam15-l-test1" }).completed, true);
for (let section = 1; section <= 4; section += 1) {
  assert.equal(implication.api.practiceCompletionStatus("listening", { id: `cam15-l-test1::section::${section}` }).completed, true, `Full Listening paper must imply Section ${section}`);
}
implication.api.rememberPracticeCompletion("reading", { id: "cam15-r-test1", practiceScope: "paper" }, { attemptId: "attempt_reading_paper" });
for (let passage = 1; passage <= 3; passage += 1) {
  assert.equal(implication.api.practiceCompletionStatus("reading", { id: `cam15-r-test1::section::${passage}` }).completed, true, `Full Reading paper must imply Passage ${passage}`);
}
const unitOnly = completionContext(memoryStorage());
unitOnly.api.rememberPracticeCompletion("listening", { id: "cam15-l-test1::section::1", practiceScope: "section", practiceSection: 1 }, { attemptId: "attempt_unit_only" });
assert.equal(unitOnly.api.practiceCompletionStatus("listening", { id: "cam15-l-test1" }).completed, false, "Unit completion must never imply full-paper completion");

const exactScorePriority = completionContext(memoryStorage());
exactScorePriority.api.rememberPracticeCompletion("reading", { id: "cam15-r-test1::section::2", practiceScope: "section", practiceSection: 2 }, {
  attemptId: "attempt_exact_passage",
  completedAt: "2026-08-01T01:00:00.000Z",
  correct: 11,
  total: 13,
});
exactScorePriority.api.rememberPracticeCompletion("reading", { id: "cam15-r-test1", practiceScope: "paper" }, {
  attemptId: "attempt_later_full_paper",
  completedAt: "2026-08-02T01:00:00.000Z",
  correct: 30,
  total: 40,
  band: 7,
});
assert.deepEqual(
  { ...exactScorePriority.api.practiceCompletionStatus("reading", { id: "cam15-r-test1::section::2" }) },
  {
    completed: true,
    completedAt: "2026-08-01T01:00:00.000Z",
    attemptId: "attempt_exact_passage",
    correct: 11,
    total: 13,
  },
  "A later full-paper completion must not replace an exact Passage score with implied completion metadata",
);

const legacyStorage = memoryStorage({
  ieltsistLearningLoopHistory: JSON.stringify({
    writing: { prompt: "A prompt fragment without an item ID", attemptId: "legacy_prompt_only" },
    writingAttempts: [{ completionIdentity: "guest", itemId: "cam15-w-test1-task1", attemptId: "legacy_exact_w", updatedAt: "2026-07-01T00:00:00.000Z" }],
    speaking: { completionIdentity: "guest", topicId: "cam15-s-test1", attemptId: "legacy_exact_s", updatedAt: "2026-07-02T00:00:00.000Z" },
    objective: { listening: { completionIdentity: "guest", module: "listening", itemId: "cam15-l-test1::section::4", attemptId: "legacy_latest_l", createdAt: "2026-07-04T00:00:00.000Z" } },
    objectiveItems: { "cam15-r-test1::section::1": { completionIdentity: "guest", module: "reading", itemId: "cam15-r-test1::section::1", attemptId: "legacy_exact_r", createdAt: "2026-07-03T00:00:00.000Z" } },
  }),
});
const legacy = completionContext(legacyStorage);
const legacyIndex = legacy.api.readPracticeCompletionIndex();
assert.ok(legacyIndex["writing:cam15-w-test1-task1"]);
assert.ok(legacyIndex["speaking:cam15-s-test1"]);
assert.ok(legacyIndex["reading:cam15-r-test1::section::1"]);
assert.ok(legacyIndex["listening:cam15-l-test1::section::4"], "Exact legacy objective summaries must migrate even when objectiveItems is unavailable");
assert.equal(Object.values(legacyIndex).some((entry) => entry.attemptId === "legacy_prompt_only"), false, "Legacy Writing completion must never be guessed from prompt text");

const unstampedLegacyStorage = memoryStorage({
  ieltsistLearningLoopHistory: JSON.stringify({
    objective: { reading: { module: "reading", itemId: "cam16-r-test1::section::3", attemptId: "pre_identity_r", createdAt: "2026-06-01T00:00:00.000Z" } },
    writing: { itemId: "cam16-w-test1-task1", attemptId: "pre_identity_w", updatedAt: "2026-06-02T00:00:00.000Z" },
    writingAttempts: [{ prompt: "Unstamped prompt with no canonical task ID", attemptId: "pre_identity_prompt_only" }],
    speaking: { topicId: "cam16-s-test1", attemptId: "pre_identity_s", updatedAt: "2026-06-03T00:00:00.000Z" },
  }),
});
const unstampedLegacy = completionContext(unstampedLegacyStorage);
for (const completionKey of ["reading:cam16-r-test1::section::3", "writing:cam16-w-test1-task1", "speaking:cam16-s-test1"]) {
  assert.ok(unstampedLegacy.api.readPracticeCompletionIndex()[completionKey], `Guest migration must retain exact unstamped legacy completion ${completionKey}`);
}
assert.equal(Object.values(unstampedLegacy.api.readPracticeCompletionIndex()).some((entry) => entry.attemptId === "pre_identity_prompt_only"), false, "Guest migration must not guess an unstamped Writing prompt ID");
unstampedLegacy.state.currentUser = { id: 404, username: "new-login" };
for (const completionKey of ["reading:cam16-r-test1::section::3", "writing:cam16-w-test1-task1", "speaking:cam16-s-test1"]) {
  assert.equal(unstampedLegacy.api.readPracticeCompletionIndex()[completionKey], undefined, `Unstamped guest migration must not leak into logged-in identity ${completionKey}`);
}

let shouldFail = true;
const outboxStorage = memoryStorage();
const outbox = completionContext(outboxStorage, {
  state: { currentUser: { id: 9, username: "offline-user" } },
  postJson: async (_url, payload) => {
    if (shouldFail) throw new Error("offline");
    return { attempt: { attemptId: payload.attemptId, module: payload.module, itemId: payload.itemId, submittedAt: "2026-08-02T04:00:00.000Z" }, idempotent: true };
  },
});
outbox.api.queuePendingLearningAttempt({ attemptId: "attempt_outbox", module: "writing", itemId: "cam15-w-test1-task1" });
assert.equal(await outbox.api.retryPendingLearningAttempts(), false);
assert.equal(outbox.api.readPendingLearningAttempts().length, 1, "Failed attempt archival must remain queued");
shouldFail = false;
assert.equal(await outbox.api.retryPendingLearningAttempts(), true);
assert.deepEqual(outbox.api.readPendingLearningAttempts(), [], "Successful idempotent retry must clear the outbox entry");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function pendingPartition(storage, identity) {
  return JSON.parse(storage.getItem("ieltsistPendingLearningAttemptsV1") || "{}").partitions?.[identity] || [];
}

const networkCalls = [];
const networkContext = {
  state: { authToken: "token-current-b" },
  fetch: async (url, options) => {
    networkCalls.push({ url, options });
    return { ok: true, status: 200, headers: { get: () => "application/json" }, text: async () => "{}" };
  },
};
runInNewContext(`${functionSource(appSource, "parseJsonResponse")}\n${functionSource(appSource, "getJson")}\n${functionSource(appSource, "postJson")}\nthis.api = { getJson, postJson };`, networkContext);
await networkContext.api.getJson("/api/learning/state", { authToken: "token-owner-a" });
await networkContext.api.postJson("/api/learning/attempts", { attemptId: "attempt_network_owner" }, { authToken: "token-owner-a" });
assert.deepEqual(networkCalls.map((call) => call.options.headers.authorization), ["Bearer token-owner-a", "Bearer token-owner-a"], "Explicit request tokens must override mutable current-account state at the fetch boundary");

const retryRaceStorage = memoryStorage();
const retryRaceRequest = deferred();
const retryRaceCalls = [];
const retryRace = completionContext(retryRaceStorage, {
  state: {
    currentUser: { id: 501, username: "retry-a" },
    authToken: "token-retry-a",
    learningState: { completionIdentity: "user:501", attempts: [] },
  },
  postJson: (_url, payload, options) => {
    retryRaceCalls.push({ payload, options });
    return retryRaceRequest.promise;
  },
});
retryRace.api.queuePendingLearningAttempt({ attemptId: "attempt_retry_race", module: "writing", itemId: "cam15-w-test1-task1" });
const retryRaceRun = retryRace.api.retryPendingLearningAttempts();
retryRace.state.currentUser = { id: 502, username: "retry-b" };
retryRace.state.authToken = "token-retry-b";
retryRace.state.learningState = { completionIdentity: "user:502", attempts: [{ attemptId: "attempt_b_visible" }] };
retryRace.api.queuePendingLearningAttempt({ attemptId: "attempt_retry_race", module: "speaking", itemId: "cam16-s-test1" });
retryRaceRequest.resolve({ attempt: { attemptId: "attempt_retry_race", module: "writing", itemId: "cam15-w-test1-task1" } });
assert.equal(await retryRaceRun, false, "Retry must abort remaining stale work after an account switch");
assert.equal(retryRaceCalls[0].options?.authToken, "token-retry-a", "Retry must send with the snapshotted owner token");
assert.equal(pendingPartition(retryRaceStorage, "user:501").length, 1, "Stale retry completion must leave A's idempotent payload queued");
assert.equal(pendingPartition(retryRaceStorage, "user:502").length, 1, "A retry must never remove B's queue entry");
assert.deepEqual(retryRace.state.learningState.attempts.map((item) => item.attemptId), ["attempt_b_visible"], "A retry response must never enter B's visible learning state");

const archiveRaceStorage = memoryStorage();
const archiveRaceRequest = deferred();
const archiveRaceCalls = [];
const archiveRace = completionContext(archiveRaceStorage, {
  state: {
    currentUser: { id: 601, username: "archive-a" },
    authToken: "token-archive-a",
    learningState: { completionIdentity: "user:601", attempts: [] },
  },
  postJson: (_url, payload, options) => {
    archiveRaceCalls.push({ payload, options });
    return archiveRaceRequest.promise;
  },
});
const archiveRaceRun = archiveRace.api.archiveLearningAttempt("speaking", { attemptId: "attempt_archive_race", itemId: "cam15-s-test1", topicId: "cam15-s-test1", band: 7 });
archiveRace.state.currentUser = { id: 602, username: "archive-b" };
archiveRace.state.authToken = "token-archive-b";
archiveRace.state.learningState = { completionIdentity: "user:602", attempts: [{ attemptId: "attempt_archive_b_visible" }] };
archiveRace.api.queuePendingLearningAttempt({ attemptId: "attempt_archive_race", module: "writing", itemId: "cam16-w-test1-task1" });
archiveRaceRequest.resolve({ attempt: { attemptId: "attempt_archive_race", module: "speaking", itemId: "cam15-s-test1" } });
await archiveRaceRun;
assert.equal(archiveRaceCalls[0].options?.authToken, "token-archive-a", "Direct archival must send with the snapshotted owner token");
assert.equal(pendingPartition(archiveRaceStorage, "user:601").length, 1, "Stale direct archival must leave A's idempotent payload queued");
assert.equal(pendingPartition(archiveRaceStorage, "user:602").length, 1, "A direct archive response must never remove B's queue entry");
assert.deepEqual(archiveRace.state.learningState.attempts.map((item) => item.attemptId), ["attempt_archive_b_visible"], "A direct archive response must never enter B's visible learning state");

const refreshRaceStorage = memoryStorage();
const refreshMeRequest = deferred();
const refreshCalls = [];
const refreshRace = completionContext(refreshRaceStorage, {
  state: {
    currentUser: { id: 701, username: "refresh-a" },
    authToken: "token-refresh-a",
    learningState: { completionIdentity: "user:701", attempts: [] },
  },
  getJson: (url, options) => {
    refreshCalls.push({ url, options });
    if (url === "/api/me") return refreshMeRequest.promise;
    if (url === "/api/drafts") return Promise.resolve({ drafts: [{ key: "draft-a" }] });
    if (url === "/api/vocabulary") return Promise.resolve({ items: [{ id: "vocab-a" }] });
    if (url === "/api/learning/state") return Promise.resolve({ attempts: [{ attemptId: "attempt_refresh_a" }], completedItems: [] });
    throw new Error(`Unexpected refresh URL ${url}`);
  },
});
const refreshRaceRun = refreshRace.api.refreshMineData();
refreshRace.state.currentUser = { id: 702, username: "refresh-b" };
refreshRace.state.authToken = "token-refresh-b";
refreshRace.state.learningState = { completionIdentity: "user:702", attempts: [{ attemptId: "attempt_refresh_b_visible" }] };
refreshMeRequest.resolve({ user: { id: 701, username: "refresh-a" } });
await refreshRaceRun;
assert.equal(refreshCalls[0].options?.authToken, "token-refresh-a", "Refresh must fetch /api/me with the snapshotted token");
assert.equal(refreshCalls.length, 1, "Refresh must abort stale follow-up requests after an account switch");
assert.equal(refreshRace.state.currentUser.id, 702, "A stale refresh response must not replace the current user");
assert.deepEqual(refreshRace.state.learningState.attempts.map((item) => item.attemptId), ["attempt_refresh_b_visible"], "A stale refresh response must not replace B's learning state");

const staleRetryStorage = memoryStorage();
const staleRetry = completionContext(staleRetryStorage, {
  state: {
    currentUser: { id: 802, username: "owner-b" },
    authToken: "token-owner-b",
    learningState: {
      completionIdentity: "user:801",
      attempts: [{ attemptId: "attempt_stale_a" }],
      completedItems: [{ module: "speaking", itemId: "cam15-s-test1", attemptId: "completed_stale_a" }],
    },
  },
  getJson: async () => { throw new Error("refresh offline"); },
  postJson: async (_url, payload) => ({ attempt: { attemptId: payload.attemptId, module: payload.module, itemId: payload.itemId } }),
});
await staleRetry.api.refreshMineData();
assert.equal(staleRetry.state.learningState.completionIdentity, "user:801", "Failed refresh fixture must retain stale A state before B syncs");
staleRetry.api.queuePendingLearningAttempt({ attemptId: "attempt_retry_b", module: "writing", itemId: "cam16-w-test1-task1" });
assert.equal(await staleRetry.api.retryPendingLearningAttempts(), true);
assert.equal(staleRetry.state.learningState.completionIdentity, "user:802");
assert.equal(staleRetry.state.learningState.attempts.map((item) => item.attemptId).join(","), "attempt_retry_b", "B retry must not inherit stale A attempts");
assert.deepEqual(staleRetry.state.learningState.completedItems || [], [], "B retry must not retag stale A completions as B");

const staleArchive = completionContext(memoryStorage(), {
  state: {
    currentUser: { id: 902, username: "archive-owner-b" },
    authToken: "token-archive-owner-b",
    learningState: {
      completionIdentity: "user:901",
      attempts: [{ attemptId: "attempt_archive_stale_a" }],
      completedItems: [{ module: "writing", itemId: "cam15-w-test1-task1", attemptId: "completed_archive_stale_a" }],
    },
  },
  postJson: async (_url, payload) => ({ attempt: { attemptId: payload.attemptId, module: payload.module, itemId: payload.itemId } }),
});
await staleArchive.api.archiveLearningAttempt("speaking", { attemptId: "attempt_archive_b", itemId: "cam16-s-test1", topicId: "cam16-s-test1", band: 7 });
assert.equal(staleArchive.state.learningState.completionIdentity, "user:902");
assert.equal(staleArchive.state.learningState.attempts.map((item) => item.attemptId).join(","), "attempt_archive_b", "B direct archive must not inherit stale A attempts");
assert.deepEqual(staleArchive.state.learningState.completedItems || [], [], "B direct archive must not retag stale A completions as B");

const overflow = completionContext(memoryStorage(), { state: { currentUser: { id: 10, username: "overflow-user" } } });
for (let index = 0; index < 105; index += 1) {
  overflow.api.queuePendingLearningAttempt({ attemptId: `attempt_overflow_${index}`, module: "writing", itemId: `writing-task-${index}` });
}
const overflowPending = overflow.api.readPendingLearningAttempts();
assert.equal(overflowPending.length, 100);
assert.equal(overflowPending[0].attemptId, "attempt_overflow_5", "Outbox overflow must evict the oldest attempt first");
assert.equal(overflowPending.at(-1).attemptId, "attempt_overflow_104", "Outbox overflow must never discard the newest attempt");

assert.match(serverSource, /ROW_NUMBER\s*\(\s*\)\s*OVER\s*\(\s*PARTITION\s+BY\s+module\s*,\s*item_id/i, "Completed-item projection must rank latest distinct rows in one pass");
assert.doesNotMatch(serverSource, /current\.rowid\s*=\s*\(\s*SELECT\s+latest\.rowid/i, "Completed-item projection must not run a correlated latest-row subquery per attempt");

const port = 5400 + (process.pid % 400);
const databasePath = path.join(root, "data", `completion-api-test-${process.pid}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: databasePath },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function request(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const result = await request("/healthz");
      if (result.response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Completion API test server did not start. ${stderr}`);
}

function jsonOptions(method, body, token = "") {
  return {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  };
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const completedAt = "2026-08-02T09:30:00.000Z";
  const completionSeed = {
    version: 1,
    partitions: {
      guest: {
        "writing:cam15-w-test1-task1": { completedAt, attemptId: "ui-writing-task1" },
        "writing:cam15-w-test1-task2": { completedAt, attemptId: "ui-writing-task2" },
        "speaking:cam15-s-test1": { completedAt, attemptId: "ui-speaking" },
      },
    },
  };
  const writingHistorySeed = {
    writing: {
      module: "writing",
      itemId: "cam15-w-test1-task2",
      attemptId: "review-task2",
      title: "Task 2 · Education",
      prompt: "IELTS Writing Task 2: discuss both views.",
      essay: "Task two evidence sentence about practical education and academic study.",
      scores: { overall: "6.5", criteria: [{ label: "Task Response", score: "6.0", feedback: "Develop the central idea." }] },
      analysis: { highestImpact: { criterion: "Task Response", score: "6.0", issue: "The main idea needs development.", evidence: "Task two evidence sentence", rewriteInstruction: "Add one specific supporting example." } },
      updatedAt: "2026-08-03T10:00:00.000Z",
    },
    writingAttempts: [
      {
        module: "writing",
        itemId: "cam15-w-test1-task1",
        attemptId: "review-task1",
        title: "Task 1 · Chart",
        prompt: "IELTS Writing Task 1: Summarise the chart.",
        essay: "Task one evidence sentence describing the chart without a clear overview.",
        scores: { overall: "6.0", criteria: [{ label: "Task Achievement", score: "5.5", feedback: "Add a clear overview." }] },
        analysis: { highestImpact: { criterion: "Task Achievement", score: "5.5", issue: "The overview is missing.", evidence: "Task one evidence sentence", rewriteInstruction: "Write one overview sentence with the two main features." } },
        updatedAt: "2026-08-02T10:00:00.000Z",
      },
    ],
  };
  const writingWeakAreasSeed = [
    {
      id: "old-writing-weak",
      module: "writing",
      sourceAttemptId: "missing-old-attempt",
      title: "Old custom Task 2",
      taskNumber: 2,
      summary: "Saved legacy weak area",
      evidence: {
        criterion: "Task Response",
        taskNumber: 2,
        prompt: "IELTS Writing Task 2: Some people think practical skills matter more than academic study.",
        originalExcerpt: "Legacy essay evidence",
        rewriteInstruction: "Add one specific example.",
      },
    },
  ];
  const uiErrors = [];

  async function openSeededPage(viewport, hash) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (error) => uiErrors.push(error.message));
    await page.addInitScript(({ seed, writingHistory, writingWeakAreas }) => {
      localStorage.clear();
      localStorage.setItem("ieltsistCompletedItemsV1", JSON.stringify(seed));
      localStorage.setItem("ieltsistLearningLoopHistory", JSON.stringify(writingHistory));
      localStorage.setItem("ieltsistWeakAreas", JSON.stringify(writingWeakAreas));
    }, { seed: completionSeed, writingHistory: writingHistorySeed, writingWeakAreas: writingWeakAreasSeed });
    await page.goto(`http://127.0.0.1:${port}/${hash}`, { waitUntil: "networkidle" });
    return page;
  }

  const desktop = await openSeededPage({ width: 1440, height: 900 }, "#writing-upload");
  await desktop.locator("#writingCompletionFilter").waitFor({ state: "visible", timeout: 5_000 });
  assert.deepEqual(
    await desktop.locator("#writingCompletionFilter option").allTextContents(),
    ["All", "Not completed", "Completed"],
    "Writing completion filter must expose the shared three states",
  );
  assert.deepEqual(
    await desktop.locator("#bankCompletionFilter option").allTextContents(),
    ["All", "Not completed", "Completed"],
    "Speaking completion filter must expose the shared three states",
  );

  await desktop.locator('[data-writing-scope="topics"]').click();

  const task2CompletedGroup = desktop.locator('.writing-topic-card[data-writing-completed-count="1"]').first();
  assert.ok(await task2CompletedGroup.count(), "Task 2 needs a grouped x/y completion card");
  assert.match(await task2CompletedGroup.innerText(), /1\/\d+ completed/i);
  await desktop.locator("#writingCompletionFilter").selectOption("completed");
  assert.equal(await desktop.locator(".writing-topic-card[data-writing-topic-group]").count(), 1, "Only the Task 2 group containing the completed question should remain");
  await desktop.locator(".practice-writing-topic").click();
  const completedTask2Rows = desktop.locator('.writing-set-chooser .topic-set-row[data-practice-status="completed"]');
  assert.equal(await completedTask2Rows.count(), 1, "Completed Task 2 chooser must re-filter individual question rows");
  assert.equal(await completedTask2Rows.first().getAttribute("data-writing-task2-id"), "cam15-w-test1-task2", "Task 2 completion must retain the exact independent task ID");
  assert.match(await completedTask2Rows.first().innerText(), /Completed · Band 6\.5 · 2026-08-03/);
  await desktop.locator("[data-writing-set-back]").click();
  await desktop.locator("#writingCompletionFilter").selectOption("not-completed");
  assert.ok(await desktop.locator(".writing-topic-card[data-writing-topic-group]").count() > 0, "Untouched Task 2 groups should remain");
  await desktop.locator(".practice-writing-topic").first().click();
  assert.equal(await desktop.locator('.writing-set-chooser .topic-set-row[data-practice-status="completed"]').count(), 0, "Not-completed Task 2 chooser must remove completed rows");
  assert.ok(await desktop.locator('.writing-set-chooser .topic-set-row[data-practice-status="not-completed"]').count() > 0);
  await desktop.locator("[data-writing-set-back]").click();

  await desktop.locator('[data-writing-library-task="1"]').click();
  await desktop.locator("#writingCompletionFilter").selectOption("completed");
  assert.equal(await desktop.locator(".writing-task1-card").count(), 1, "Task 1 completion filtering must operate on individual visual-task IDs");
  const completedTask1 = desktop.locator('.writing-task1-card[data-writing-task1-id="cam15-w-test1-task1"]');
  assert.equal(await completedTask1.count(), 1);
  assert.match(await completedTask1.innerText(), /Completed · Band 6\.0 · 2026-08-02/);
  assert.equal(await desktop.locator('[data-writing-task1-id="cam15-w-test1-task2"]').count(), 0, "Task 1 status must never couple to Task 2 history");
  await desktop.locator("#writingCompletionFilter").selectOption("not-completed");
  assert.equal(await desktop.locator('.writing-task1-card[data-writing-task1-id="cam15-w-test1-task1"]').count(), 0);
  assert.ok(await desktop.locator(".writing-task1-card").count() > 0, "Untouched Task 1 cards should remain");

  await desktop.locator('[data-writing-scope="review"]').click();
  assert.equal(await desktop.locator(".writing-review-card").count(), 1, "Task 1 Review must show only Task 1 attempts");
  assert.match(await desktop.locator(".writing-review-card").innerText(), /Band 6\.0[\s\S]*Task Achievement[\s\S]*Task one evidence sentence[\s\S]*overview sentence/i);
  assert.doesNotMatch(await desktop.locator(".writing-review-card").innerText(), /Task two evidence sentence/i, "Task 2 evidence leaked into Task 1 Review");
  await desktop.locator('.writing-review-card [data-writing-review-retry="review-task1"]').click();
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id"), "cam15-w-test1-task1", "Task 1 Review retry must open the exact original task");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), null, "Task 1 Review retry leaked Task 2");
  await desktop.locator("[data-setup-back]").click();
  await desktop.locator('[data-writing-library-task="2"]').click();
  assert.equal(await desktop.locator(".writing-review-card").count(), 2, "Task 2 Review must include scored attempts and legacy weak areas");
  const task2AttemptReview = desktop.locator('.writing-review-card [data-writing-review-retry="review-task2"]').locator("xpath=ancestor::article");
  assert.match(await task2AttemptReview.innerText(), /Band 6\.5[\s\S]*Task Response[\s\S]*Task two evidence sentence[\s\S]*supporting example/i);
  assert.doesNotMatch(await desktop.locator(".writing-review-card").allInnerTexts().then((items) => items.join(" ")), /Task one evidence sentence/i, "Task 1 evidence leaked into Task 2 Review");
  await desktop.locator('.writing-review-card [data-writing-review-retry="review-task2"]').click();
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), "cam15-w-test1-task2", "Task 2 Review retry must open the exact original task");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id"), null, "Task 2 Review retry leaked Task 1");
  await desktop.locator("[data-setup-back]").click();

  const legacyReview = desktop.locator('.writing-review-card [data-writing-review-retry="old-writing-weak"]').locator("xpath=ancestor::article");
  assert.match(await legacyReview.innerText(), /Saved legacy weak area[\s\S]*Legacy essay evidence[\s\S]*Targeted practice/i, "Legacy weak areas without item IDs need a targeted-practice fallback");
  await legacyReview.locator('[data-writing-review-retry="old-writing-weak"]').click();
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id"), null, "Legacy Task 2 fallback must not introduce Task 1");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), null, "Legacy custom fallback must not claim an unrelated canonical Task 2 ID");
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  assert.equal(await desktop.locator("#uploadPrompt").inputValue(), writingWeakAreasSeed[0].evidence.prompt, "Legacy fallback must restore the saved Writing prompt");
  const savedTimer = await desktop.evaluate(() => JSON.parse(localStorage.getItem("ieltsistWritingTimerV1") || "{}"));
  assert.equal(savedTimer.duration, 40 * 60, "Legacy Task 2 targeted practice must keep the 40-minute timer");

  await desktop.goto(`http://127.0.0.1:${port}/#bank`, { waitUntil: "networkidle" });
  const speakingCompletedGroup = desktop.locator('.speaking-topic-card[data-speaking-completed-count="1"]').first();
  assert.ok(await speakingCompletedGroup.count(), "Speaking topic cards need grouped x/y completion");
  assert.match(await speakingCompletedGroup.innerText(), /1\/\d+ completed/i);
  await desktop.locator("#bankCompletionFilter").selectOption("completed");
  assert.equal(await desktop.locator(".speaking-topic-card[data-group-id]").count(), 1, "Only the Speaking group containing the completed set should remain");
  await desktop.locator(".practice-speaking-topic").click();
  const completedSpeakingRows = desktop.locator('.topic-set-chooser .topic-set-row[data-practice-status="completed"]');
  assert.equal(await completedSpeakingRows.count(), 1, "Completed Speaking chooser must re-filter individual set rows");
  assert.equal(await completedSpeakingRows.first().getAttribute("data-speaking-topic-id"), "cam15-s-test1", "Speaking completion must use the exact topicId");
  assert.match(await completedSpeakingRows.first().innerText(), /Completed · 2026-08-02/);
  await desktop.locator("#closeBankPractice").click();
  await desktop.locator("#bankCompletionFilter").selectOption("not-completed");
  assert.ok(await desktop.locator(".speaking-topic-card[data-group-id]").count() > 0, "Untouched Speaking groups should remain");
  await desktop.locator(".practice-speaking-topic").first().click();
  assert.equal(await desktop.locator('.topic-set-chooser .topic-set-row[data-practice-status="completed"]').count(), 0, "Not-completed Speaking chooser must remove completed rows");
  assert.ok(await desktop.locator('.topic-set-chooser .topic-set-row[data-practice-status="not-completed"]').count() > 0);
  await desktop.close();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    for (const hash of ["#writing-upload", "#bank"]) {
      const page = await openSeededPage(viewport, hash);
      const filterId = hash === "#bank" ? "#bankCompletionFilter" : "#writingCompletionFilter";
      const filterBox = await page.locator(filterId).boundingBox();
      assert.ok(filterBox && filterBox.height >= 44, `${hash} completion control must remain at least 44px tall at ${viewport.width}px`);
      assert.ok(filterBox.x >= -1 && filterBox.x + filterBox.width <= viewport.width + 1, `${hash} completion control must stay inside the viewport at ${viewport.width}px`);
      const geometry = await page.evaluate(() => {
        const root = document.documentElement;
        const overlaps = [...document.querySelectorAll(".practice-status-badge")].some((badge) => {
          const card = badge.closest(".writing-full-task-card, .writing-topic-card, .speaking-topic-card, .topic-set-row");
          const button = card?.querySelector("button.primary");
          if (!button) return false;
          const a = badge.getBoundingClientRect();
          const b = button.getBoundingClientRect();
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        });
        return { overflow: root.scrollWidth - root.clientWidth, overlaps };
      });
      assert.ok(geometry.overflow <= 1, `${hash} must not overflow horizontally at ${viewport.width}px`);
      assert.equal(geometry.overlaps, false, `${hash} completion badges must not overlap card actions at ${viewport.width}px`);
      await page.close();
    }
  }
  assert.deepEqual(uiErrors, [], "Completion UI must not raise browser page errors");

  const username = `complete_${process.pid}`.slice(0, 24);
  const registered = await request("/api/auth/register", jsonOptions("POST", { username, password: "testing123" }));
  assert.equal(registered.response.status, 200);
  const token = registered.json.token;
  const taskResponse = await request("/api/tasks");
  const canonicalItems = [
    ...taskResponse.json.listeningTests.map((item) => ({ module: "listening", itemId: item.id })),
    ...taskResponse.json.readingTests.map((item) => ({ module: "reading", itemId: item.id })),
  ].slice(0, 25);
  assert.equal(canonicalItems.length, 25, "Completion API fixture needs 25 real canonical paper IDs");
  for (let index = 1; index <= canonicalItems.length; index += 1) {
    const { module: moduleName, itemId } = canonicalItems[index - 1];
    const posted = await request("/api/learning/attempts", jsonOptions("POST", {
      attemptId: `completion_${process.pid}_${index}`,
      module: moduleName,
      itemId,
      mode: "practice",
      score: { correct: 8, total: 10 },
      result: { correct: 8, total: 10 },
    }, token));
    assert.equal(posted.response.status, 200);
  }
  await request("/api/learning/attempts", jsonOptions("POST", {
    attemptId: `completion_${process.pid}_duplicate`,
    module: canonicalItems[0].module,
    itemId: canonicalItems[0].itemId,
    mode: "practice",
    score: { correct: 9, total: 10 },
    result: { correct: 9, total: 10 },
  }, token));
  await request("/api/learning/attempts", jsonOptions("POST", {
    attemptId: `completion_${process.pid}_empty`,
    module: "writing",
    itemId: "",
    mode: "practice",
    score: { overall: 7 },
    result: { prompt: "No exact task ID" },
  }, token));

  const learningState = await request("/api/learning/state", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(learningState.response.status, 200);
  assert.equal(learningState.json.attempts.length, 20, "Recent attempt display remains limited to 20");
  assert.equal(learningState.json.completedItems.length, 25, "Completion projection must include distinct items beyond the latest-20 display history");
  assert.equal(new Set(learningState.json.completedItems.map((item) => `${item.module}:${item.itemId}`)).size, 25);
  assert.equal(learningState.json.completedItems.some((item) => !item.itemId), false, "Empty item IDs are not canonical completion truth");
  const latestDuplicate = learningState.json.completedItems.find((item) => item.module === canonicalItems[0].module && item.itemId === canonicalItems[0].itemId);
  assert.equal(latestDuplicate.attemptId, `completion_${process.pid}_duplicate`, "Distinct completion rows must retain the latest attempt metadata");
  assert.deepEqual(latestDuplicate.score, { correct: 9, total: 10 }, "Distinct completion rows must expose the latest score for cross-device Completed badges");
} finally {
  await browser?.close();
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}

console.log("Canonical practice completion regression checks passed.");
