import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import { createRequire } from "node:module";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const {
  membershipFeatureForIeltsRequest,
  requireActiveMembership,
} = require("../server/membership");

const env = { MEMBERSHIP_ENFORCEMENT_ENABLED: "1", MEMBERSHIP_ENFORCEMENT_READY: "1" };
const db = new DatabaseSync(":memory:");
db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
  CREATE TABLE memberships (user_id INTEGER PRIMARY KEY, plan TEXT NOT NULL, starts_at TEXT NOT NULL, expires_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  INSERT INTO users (id,username) VALUES (42,'member');
`);

assert.throws(() => requireActiveMembership(db, 42, env), (error) => error.statusCode === 403 && error.code === "membership_required");
db.prepare("INSERT INTO memberships (user_id,plan,starts_at,expires_at,updated_at) VALUES (42,'all-access-month',?,?,?)")
  .run(new Date(Date.now() - 1_000).toISOString(), new Date(Date.now() + 60_000).toISOString(), new Date().toISOString());
assert.equal(requireActiveMembership(db, 42, env).active, true);
assert.equal(requireActiveMembership(db, 42, {}).enforced, false);
assert.throws(() => requireActiveMembership({ prepare: () => { throw new Error("offline"); } }, 42, env), (error) => (
  error.statusCode === 503 && error.code === "membership_authority_unavailable"
));

for (const [method, path] of [
  ["POST", "/api/objective/exams"],
  ["POST", "/api/objective/attempts"],
  ["POST", "/api/writing/feedback/start"],
  ["POST", "/api/writing/feedback"],
  ["POST", "/api/writing/rewrite/score"],
  ["POST", "/api/speaking/feedback"],
  ["POST", "/api/speaking/turn"],
  ["POST", "/api/speaking/recording"],
  ["POST", "/api/tts"],
  ["POST", "/api/help/explain"],
  ["POST", "/api/help/chat"],
  ["POST", "/api/listening/score"],
  ["POST", "/api/reading/score"],
  ["POST", "/api/exam/report"],
  ["POST", "/api/qwen-session"],
  ["POST", "/api/qwen-webrtc-offer"],
  ["GET", "/api/listening/scripts/test"],
  ["GET", "/api/listening/asr-cache/test"],
  ["GET", "/api/reading/context?id=test"],
  ["GET", "/api/tasks"],
  ["GET", "/generated/listening-pages/cam10/test1/page-3.webp"],
  ["GET", "/GENERATED/listening-pages/cam10/test1/page-3.webp"],
  ["POST", "/api/stem/marking/submissions"],
  ["POST", "/api/stem/marking/submissions/id/retry"],
  ["POST", "/api/ai/mark-handwriting"],
  ["GET", "/qwen-client"],
]) assert.equal(membershipFeatureForIeltsRequest(method, path), "all-access", `${method} ${path}`);

for (const [method, path] of [
  ["GET", "/api/me"],
  ["GET", "/api/membership/status"],
  ["GET", "/api/writing/feedback/job/id"],
  ["GET", "/api/report/pdf/id"],
  ["GET", "/api/speaking/recording-download/id"],
  ["GET", "/api/drafts"],
  ["DELETE", "/api/drafts/id"],
  ["GET", "/api/vocabulary"],
  ["DELETE", "/api/vocabulary/id"],
  ["GET", "/api/learning/attempts"],
  ["GET", "/api/objective/attempts/id/review"],
  ["GET", "/api/stem/marking/availability"],
  ["GET", "/api/stem/marking/submissions/id"],
]) assert.equal(membershipFeatureForIeltsRequest(method, path), null, `${method} ${path}`);

const serverSource = fs.readFileSync(fileURLToPath(new URL("../server.js", import.meta.url)), "utf8");
assert.match(serverSource, /requireIeltsMembershipForRequest\(req, requestPathname\)/);
assert.match(serverSource, /pathname\.startsWith\("\/api\/stem\/marking\/"\)[\s\S]{0,180}requireStemActor\(req\)/, "direct STEM marking must preserve its signed STEM actor identity before checking membership");
assert.ok(
  serverSource.indexOf("requireIeltsMembershipForRequest(req, url.pathname)") < serverSource.indexOf("qwenWss.handleUpgrade"),
  "WebSocket membership enforcement must run before upgrade",
);

db.close();

const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = join(tmpdir(), `ieltsist-membership-enforcement-${process.pid}-${randomUUID()}.sqlite`);
const signingKey = "membership-enforcement-integration-key";
let child;
let output = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = await new Promise((resolve, reject) => {
  const listener = net.createServer();
  listener.once("error", reject);
  listener.listen(0, "127.0.0.1", () => {
    const address = listener.address();
    listener.close(() => resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;

try {
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: "0",
      STEM_INTERNAL_AUTH_KEY: signingKey,
      STEM_IDENTITY_SIGNING_KEY: signingKey,
      MEMBERSHIP_CHECKOUT_ENABLED: "0",
      MEMBERSHIP_ENFORCEMENT_ENABLED: "1",
      MEMBERSHIP_ENFORCEMENT_READY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}).\n${output}`);
    try { if ((await fetch(`${baseUrl}/healthz`)).ok) break; } catch {}
    await sleep(100);
  }
  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "membership_gate_user", password: "testing123" }),
  });
  assert.equal(register.status, 200);
  const account = await register.json();
  const authorization = { authorization: `Bearer ${account.token}` };

  for (const endpoint of [
    "/api/listening/score",
    "/api/help/chat",
    "/api/qwen-session",
    "/api/stem/marking/submissions",
    "/api/ai/mark-handwriting",
  ]) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { ...authorization, "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 403, endpoint);
    assert.equal((await response.json()).code, "membership_required", endpoint);
  }
  const tasks = await fetch(`${baseUrl}/api/tasks`, { headers: authorization });
  assert.equal(tasks.status, 403, "full task/question payload is a paid feature, not a public directory");
  assert.equal((await tasks.json()).code, "membership_required");
  const accountRecovery = await fetch(`${baseUrl}/api/me`, { headers: authorization });
  assert.equal(accountRecovery.status, 200, "account recovery remains available to inactive members");
  const membershipRecovery = await fetch(`${baseUrl}/api/membership/status`, { headers: authorization });
  assert.equal(membershipRecovery.status, 200, "membership status remains available to inactive members");
  const protectedGeneratedInactive = await fetch(`${baseUrl}/generated/listening-pages/cam10/test1/page-3.webp`, { headers: authorization });
  assert.equal(protectedGeneratedInactive.status, 403, "generated IELTS content requires membership when enforcement is enabled");

  await new Promise((resolve, reject) => {
    const nonce = crypto.randomBytes(16).toString("base64");
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
      socket.write([
        "GET /qwen-client HTTP/1.1",
        `Host: 127.0.0.1:${port}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${nonce}`,
        "Sec-WebSocket-Version: 13",
        `Authorization: Bearer ${account.token}`,
        "",
        "",
      ].join("\r\n"));
    });
    let response = "";
    const timeout = setTimeout(() => { socket.destroy(); reject(new Error("WebSocket gate timed out")); }, 5_000);
    socket.on("data", (chunk) => { response += chunk.toString("utf8"); });
    socket.on("end", () => {
      clearTimeout(timeout);
      try { assert.match(response, /^HTTP\/1\.1 403 Forbidden\r\n/); resolve(); } catch (error) { reject(error); }
    });
    socket.on("error", (error) => { clearTimeout(timeout); reject(error); });
  });
  const liveDb = new DatabaseSync(dbPath);
  const activeAt = new Date().toISOString();
  liveDb.prepare("INSERT INTO memberships (user_id,plan,starts_at,expires_at,updated_at) VALUES (?,?,?,?,?)")
    .run(account.user.id, "all-access-month", activeAt, new Date(Date.now() + 60_000).toISOString(), activeAt);
  liveDb.close();
  const protectedGeneratedActive = await fetch(`${baseUrl}/generated/listening-pages/cam10/test1/page-3.webp`, { headers: authorization });
  assert.equal(protectedGeneratedActive.status, 200);
  assert.equal(protectedGeneratedActive.headers.get("cache-control"), "private, no-store");
  assert.match(protectedGeneratedActive.headers.get("vary") || "", /Authorization, Cookie/);
  const protectedTasksActive = await fetch(`${baseUrl}/api/tasks`, { headers: authorization });
  assert.equal(protectedTasksActive.status, 200);
  assert.equal(protectedTasksActive.headers.get("cache-control"), "private, no-store");
  assert.match(protectedTasksActive.headers.get("vary") || "", /Authorization, Cookie/);
} finally {
  if (child) {
    child.kill();
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(2_000)]);
  }
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}

console.log("IELTS membership enforcement matrix and fail-closed checks passed.");
