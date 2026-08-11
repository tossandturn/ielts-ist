import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const start = appSource.indexOf("function objectiveAttemptBinding");
const end = appSource.indexOf("function primeObjectiveAttempt", start);
assert.ok(start >= 0 && end > start, "Objective attempt client helpers must remain available in app.js");

const stores = new Map();
const calls = [];
let responseMode = "network-error";
const context = vm.createContext({
  Uint8Array,
  crypto: webcrypto,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  objectiveAttemptStoreKey: "objective-attempt-test",
  state: {
    localDataOwner: "guest",
    localDataOwnerResolved: true,
    authToken: "",
    objectiveAttemptPromises: {},
  },
  normalizeItem: (item) => item || {},
  practiceUnitBaseId: (item) => String(item?.sourceItemId || item?.baseItemId || item?.id || "").split("::")[0],
  ownerStoredJson: (_key, fallback, owner) => stores.has(owner) ? structuredClone(stores.get(owner)) : fallback,
  writeOwnerStoredJson: (_key, value, owner) => stores.set(owner, structuredClone(value)),
  postJson: async (url, payload, options) => {
    calls.push({ url, payload: structuredClone(payload), options: structuredClone(options) });
    if (responseMode === "network-error") throw new Error("simulated lost response");
    return {
      attemptId: "objective_retry_safe_attempt_1234",
      attemptToken: payload.attemptToken,
      status: "open",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      idempotent: calls.length > 1,
    };
  },
});
vm.runInContext(`${appSource.slice(start, end)}\nthis.objectiveAttemptClientApi = { ensureObjectiveAttempt, objectiveAttemptBinding, readObjectiveAttemptStore };`, context);
const { ensureObjectiveAttempt, objectiveAttemptBinding, readObjectiveAttemptStore } = context.objectiveAttemptClientApi;

const item = {
  id: "cambridge-15-test-1-listening",
  questions: [{ id: "q1" }, { id: "q2" }],
};
const binding = objectiveAttemptBinding(item, "listening", "single");
const lostResponse = ensureObjectiveAttempt(item, "listening", "single");

const persistedBeforeResponse = readObjectiveAttemptStore("guest").attempts[binding.key];
assert.equal(persistedBeforeResponse.status, "starting", "The retry identity must be persisted before the first response");
assert.match(persistedBeforeResponse.clientAttemptKey, /^[A-Za-z0-9_-]{8,120}$/);
assert.match(persistedBeforeResponse.attemptToken, /^[A-Za-z0-9_-]{32,128}$/);
assert.equal(calls.length, 1);
assert.equal(calls[0].payload.clientAttemptKey, persistedBeforeResponse.clientAttemptKey);
assert.equal(calls[0].payload.attemptToken, persistedBeforeResponse.attemptToken);
assert.deepEqual(calls[0].payload.questionIds, ["q1", "q2"]);
await assert.rejects(lostResponse, /simulated lost response/);

const pendingAfterFailure = readObjectiveAttemptStore("guest").attempts[binding.key];
assert.equal(pendingAfterFailure.clientAttemptKey, persistedBeforeResponse.clientAttemptKey, "A network failure must retain the client attempt key");
assert.equal(pendingAfterFailure.attemptToken, persistedBeforeResponse.attemptToken, "A network failure must retain the capability");

responseMode = "success";
const recovered = await ensureObjectiveAttempt(item, "listening", "single");
assert.equal(calls.length, 2);
assert.equal(calls[1].payload.clientAttemptKey, calls[0].payload.clientAttemptKey, "Retry must reuse the original client attempt key");
assert.equal(calls[1].payload.attemptToken, calls[0].payload.attemptToken, "Retry must reuse the original capability");
assert.equal(recovered.attemptId, "objective_retry_safe_attempt_1234");
assert.equal(recovered.attemptToken, persistedBeforeResponse.attemptToken);

const reused = await ensureObjectiveAttempt(item, "listening", "single");
assert.equal(reused.attemptId, recovered.attemptId);
assert.equal(calls.length, 2, "An open recovered attempt must not start a duplicate request");

console.log("Objective attempt client start passed: capability persisted before POST and reused after a lost response.");
