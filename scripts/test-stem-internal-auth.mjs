import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = 6900 + (process.pid % 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(root, "data", `stem-internal-auth-${process.pid}.sqlite`);
const signingKey = "stem-internal-auth-test-signing-key";
let child = null;
let output = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function startApp() {
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      IELTSIST_DB_PATH: databasePath,
      SESSION_COOKIE_SECURE: "0",
      STEM_INTERNAL_AUTH_KEY: signingKey,
      STEM_IDENTITY_SIGNING_KEY: signingKey,
      STEM_MARKING_AI_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Internal account test server exited early.\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await sleep(75);
  }
  throw new Error(`Internal account test server did not start.\n${output}`);
}

function signedHeaders(body, { timestamp = String(Date.now()), key = signingKey } = {}) {
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const signature = crypto.createHmac("sha256", key).update(`${timestamp}.${digest}`).digest("base64url");
  return {
    "content-type": "application/json",
    "x-stem-auth-timestamp": timestamp,
    "x-stem-auth-signature": signature,
  };
}

async function internalRequest(payload, options = {}) {
  const body = JSON.stringify(payload);
  const response = await fetch(`${baseUrl}/api/stem/internal/authenticate`, {
    method: "POST",
    headers: signedHeaders(body, options),
    body,
  });
  return { response, json: await response.json() };
}

try {
  startApp();
  await waitForServer();
  const username = `stemnative${process.pid}`.slice(0, 24);
  const password = "testing123";
  const registered = await internalRequest({ mode: "register", username, password });
  assert.equal(registered.response.status, 200);
  assert.equal(registered.json.identity.id, "ielts:1");
  assert.equal(registered.json.identity.username, username);
  assert.deepEqual(registered.json.identity.roles, ["student"]);
  assert.doesNotMatch(JSON.stringify(registered.json), /testing123|accessToken|ieltsist_session/i);
  assert.equal(registered.response.headers.get("set-cookie"), null, "Internal account validation must not create an IELTS browser session.");

  const signedIn = await internalRequest({ mode: "login", username, password });
  assert.equal(signedIn.response.status, 200);
  assert.equal(signedIn.json.identity.id, "ielts:1");

  const wrongPassword = await internalRequest({ mode: "login", username, password: "not-the-password" });
  assert.equal(wrongPassword.response.status, 401);
  assert.doesNotMatch(JSON.stringify(wrongPassword.json), /not-the-password|accessToken|ieltsist_session/i);

  const unsigned = await fetch(`${baseUrl}/api/stem/internal/authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "login", username, password }),
  });
  assert.equal(unsigned.status, 403);

  const forged = await internalRequest({ mode: "login", username, password }, { key: "forged-key" });
  assert.equal(forged.response.status, 403);

  const stale = await internalRequest({ mode: "login", username, password }, { timestamp: String(Date.now() - 61_000) });
  assert.equal(stale.response.status, 403);
  console.log("STEM internal account authentication checks passed.");
} finally {
  if (child) {
    child.kill();
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      sleep(2_000),
    ]);
  }
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${databasePath}${suffix}`, { force: true }).catch(() => {})));
}
