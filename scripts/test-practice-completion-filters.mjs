import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const appSource = await readFile(path.join(root, "public", "app.js"), "utf8");

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
  "practiceCompletionIdentityKey",
  "canonicalPracticeCompletionId",
  "practiceCompletionKey",
  "readPracticeCompletionStore",
  "writePracticeCompletionStore",
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
    activeViewId: () => "single",
    readPracticeSession: () => null,
    currentSinglePracticeMode: () => "practice",
    learningEntityId: (() => { let index = 0; return (prefix) => `${prefix}_behavior_${++index}`; })(),
    moduleDisplayName: (moduleName) => moduleName,
    practiceUnitBaseId: (item) => String(item?.sourceItemId || item?.baseItemId || item?.id || "").split("::")[0],
    resolveRetestedWeakAreas: () => null,
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

const legacyStorage = memoryStorage({
  ieltsistLearningLoopHistory: JSON.stringify({
    writing: { prompt: "A prompt fragment without an item ID", attemptId: "legacy_prompt_only" },
    writingAttempts: [
      { completionIdentity: "guest", itemId: "cam15-w-test1-task1", attemptId: "legacy_exact_w", updatedAt: "2026-07-01T00:00:00.000Z" },
      { itemId: "cam16-w-test1-task1", attemptId: "legacy_unowned_exact_w", updatedAt: "2026-06-01T00:00:00.000Z" },
    ],
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
assert.equal(legacyIndex["writing:cam16-w-test1-task1"], undefined, "Unowned global history must not be guessed into the current identity partition");

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

const overflow = completionContext(memoryStorage(), { state: { currentUser: { id: 10, username: "overflow-user" } } });
for (let index = 0; index < 105; index += 1) {
  overflow.api.queuePendingLearningAttempt({ attemptId: `attempt_overflow_${index}`, module: "writing", itemId: `writing-task-${index}` });
}
const overflowPending = overflow.api.readPendingLearningAttempts();
assert.equal(overflowPending.length, 100);
assert.equal(overflowPending[0].attemptId, "attempt_overflow_5", "Outbox overflow must evict the oldest attempt first");
assert.equal(overflowPending.at(-1).attemptId, "attempt_overflow_104", "Outbox overflow must never discard the newest attempt");

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

try {
  await waitForServer();
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
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}

console.log("Canonical practice completion regression checks passed.");
