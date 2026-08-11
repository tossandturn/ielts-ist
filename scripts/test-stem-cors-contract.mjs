import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = 6700 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(root, "data", `stem-cors-test-${process.pid}.sqlite`);
const stemOrigin = "https://stem.ieltsist.com";
let child = null;
let stderr = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startApp() {
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      IELTSIST_DB_PATH: databasePath,
      STEM_IDENTITY_SIGNING_KEY: "cors-contract-test-signing-key",
      STEM_MARKING_AI_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
}

async function stopApp() {
  if (!child) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  child = null;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await request("/healthz")).response.ok) return;
    } catch {}
    await sleep(80);
  }
  throw new Error(`CORS contract test server did not start. ${stderr}`);
}

function assertAllowedCors(response, expectedMethods) {
  assert.equal(response.headers.get("access-control-allow-origin"), stemOrigin);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  assert.match(response.headers.get("access-control-allow-headers") || "", /x-stem-identity/i);
  assert.match(response.headers.get("access-control-allow-methods") || "", expectedMethods);
  assert.match(response.headers.get("vary") || "", /origin/i);
}

function validSubmission(suffix) {
  return {
    submissionId: `cors-contract-${process.pid}-${suffix}`,
    idempotencyKey: `cors-contract-key-${process.pid}-${suffix}`,
    routeId: "alevel-physics-mechanics",
    specificationVersion: "A-Level STEM 2026",
    paperId: "physics-paper-1",
    attemptId: `attempt-${process.pid}-${suffix}`,
    questions: [{
      questionPartId: "physics-paper-1-q1a",
      prompt: "State Newton's second law.",
      availableMarks: 2,
      markSchemePoints: [{ pointId: "q1a-m1", maxMarks: 2, text: "States F = ma" }],
      answer: { typedText: "F = ma" },
    }],
  };
}

try {
  startApp();
  await waitForServer();

  const identityPreflight = await request("/api/stem/identity?handoff=1", {
    method: "OPTIONS",
    headers: {
      origin: stemOrigin,
      "access-control-request-method": "GET",
      "access-control-request-headers": "content-type, x-stem-identity",
    },
  });
  assert.equal(identityPreflight.response.status, 204);
  assertAllowedCors(identityPreflight.response, /GET/);

  const identityBlocked = await request("/api/stem/identity", {
    method: "OPTIONS",
    headers: { origin: "https://evil.example", "access-control-request-method": "GET" },
  });
  assert.equal(identityBlocked.response.status, 403);
  assert.notEqual(identityBlocked.response.headers.get("access-control-allow-origin"), "*");

  const markingPreflight = await request("/api/stem/marking/submissions?source=stem", {
    method: "OPTIONS",
    headers: {
      origin: stemOrigin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type, x-stem-identity",
    },
  });
  assert.equal(markingPreflight.response.status, 204);
  assertAllowedCors(markingPreflight.response, /POST/);

  const handwritingPreflight = await request("/api/ai/mark-handwriting", {
    method: "OPTIONS",
    headers: {
      origin: stemOrigin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type, x-stem-identity",
    },
  });
  assert.equal(handwritingPreflight.response.status, 204);
  assertAllowedCors(handwritingPreflight.response, /POST/);

  const availabilityPreflight = await request("/api/stem/marking/availability", {
    method: "OPTIONS",
    headers: {
      origin: stemOrigin,
      "access-control-request-method": "GET",
      "access-control-request-headers": "content-type, x-stem-identity",
    },
  });
  assert.equal(availabilityPreflight.response.status, 204);
  assertAllowedCors(availabilityPreflight.response, /GET/);

  const markingBlocked = await request("/api/stem/marking/submissions", {
    method: "OPTIONS",
    headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
  });
  assert.equal(markingBlocked.response.status, 403);
  assert.notEqual(markingBlocked.response.headers.get("access-control-allow-origin"), "*");

  const anonymousAvailability = await request("/api/stem/marking/availability", { headers: { origin: stemOrigin } });
  assert.equal(anonymousAvailability.response.status, 200);
  assertAllowedCors(anonymousAvailability.response, /GET/);
  assert.deepEqual(anonymousAvailability.json, { enabled: false, modelConfigured: false, queueAvailable: false, authenticationRequired: true });
  assert.doesNotMatch(JSON.stringify(anonymousAvailability.json), /key|token|provider|url|error/i);

  const username = `corsstudent${process.pid}`.slice(0, 24);
  const registered = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: "testing123" }),
  });
  assert.equal(registered.response.status, 200);
  const sessionCookie = (registered.response.headers.get("set-cookie") || "").split(";", 1)[0];
  assert.match(sessionCookie, /^ieltsist_session=/);

  const identity = await request("/api/stem/identity?handoff=1", {
    headers: { origin: stemOrigin, cookie: sessionCookie },
  });
  assert.equal(identity.response.status, 200);
  assertAllowedCors(identity.response, /GET/);
  assert.match(identity.json.accessToken || "", /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

  const signedInAvailability = await request("/api/stem/marking/availability", {
    headers: { origin: stemOrigin, "x-stem-identity": identity.json.accessToken },
  });
  assert.equal(signedInAvailability.response.status, 200);
  assertAllowedCors(signedInAvailability.response, /GET/);
  assert.deepEqual(signedInAvailability.json, { enabled: false, modelConfigured: false, queueAvailable: false, authenticationRequired: false });

  const unavailablePayload = validSubmission("unavailable");
  const unavailable = await request("/api/stem/marking/submissions", {
    method: "POST",
    headers: {
      origin: stemOrigin,
      "content-type": "application/json",
      "x-stem-identity": identity.json.accessToken,
    },
    body: JSON.stringify(unavailablePayload),
  });
  assert.equal(unavailable.response.status, 503);
  assertAllowedCors(unavailable.response, /POST/);
  assert.equal(unavailable.json.code, "marking_unavailable");
  assert.doesNotMatch(JSON.stringify(unavailable.json), /key|token|provider|queued|processing/i);

  const legacyUnavailable = await request("/api/ai/mark-handwriting", {
    method: "POST",
    headers: {
      origin: stemOrigin,
      "content-type": "application/json",
      "x-stem-identity": identity.json.accessToken,
    },
    body: JSON.stringify(unavailablePayload),
  });
  assert.equal(legacyUnavailable.response.status, 503);
  assertAllowedCors(legacyUnavailable.response, /POST/);
  assert.equal(legacyUnavailable.json.code, "marking_unavailable");

  const notPersisted = await request(`/api/stem/marking/submissions/${unavailablePayload.submissionId}`, {
    headers: { origin: stemOrigin, "x-stem-identity": identity.json.accessToken },
  });
  assert.equal(notPersisted.response.status, 404);
  assertAllowedCors(notPersisted.response, /GET/);

  console.log("STEM CORS contract checks passed: exact origin, credentialed cookie identity handoff, identity token marking, blocked origins, and safe unavailable state.");
} finally {
  await stopApp();
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}
