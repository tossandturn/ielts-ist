import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = new URL("../", import.meta.url);
const port = 8500 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-objective-guest-limit-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: dbPath,
    SESSION_COOKIE_SECURE: "0",
    OBJECTIVE_GUEST_DAILY_SUBMISSION_LIMIT: "2",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Guest-limit server exited early.\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Guest-limit server did not start.\n${output}`);
}

function cookieFrom(response) {
  return String(response.headers.get("set-cookie") || "").split(";", 1)[0];
}

async function jsonRequest(pathname, body, { cookie = "", address = "203.0.113.40" } = {}) {
  const headers = { "content-type": "application/json", "x-forwarded-for": address };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { response, json: await response.json().catch(() => ({})) };
}

async function startAndSubmit(task, index, address = "203.0.113.40") {
  const question = task.questions[0];
  const start = await jsonRequest("/api/objective/attempts", {
    clientAttemptKey: `guest-limit-${index}-${process.pid}`,
    attemptToken: randomBytes(32).toString("base64url"),
    context: "single",
    module: "listening",
    taskId: task.id,
    questionIds: [question.id],
  }, { address });
  assert.equal(start.response.status, 201);
  const cookie = cookieFrom(start.response);
  assert.match(cookie, /^ieltsist_objective_guest=/);
  const submission = {
    attemptId: start.json.attemptId,
    attemptToken: start.json.attemptToken,
    answers: { [question.id]: "" },
  };
  const score = await jsonRequest("/api/listening/score", submission, { cookie, address });
  return { start, cookie, submission, score };
}

await waitForServer();
try {
  const tasksResponse = await fetch(`${baseUrl}/api/tasks`);
  const tasks = await tasksResponse.json();
  const task = tasks.listeningTests.find((item) => item.questions?.length);
  assert.ok(task, "A Listening fixture is required");

  const first = await startAndSubmit(task, 1);
  assert.equal(first.score.response.status, 200);
  const repeated = await jsonRequest("/api/listening/score", first.submission, { cookie: first.cookie });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.json.idempotent, true, "Idempotent submit must not consume another guest allowance");

  const second = await startAndSubmit(task, 2);
  assert.equal(second.score.response.status, 200, "A new cookie on the same network still uses the shared guest allowance");

  const blocked = await startAndSubmit(task, 3);
  assert.equal(blocked.score.response.status, 429);
  assert.equal(blocked.score.json.code, "objective_guest_limit_reached");
  assert.equal(blocked.score.json.retryable, true);
  assert.equal(blocked.score.json.expected, undefined);

  const otherNetwork = await startAndSubmit(task, 4, "198.51.100.52");
  assert.equal(otherNetwork.score.response.status, 200, "An unrelated network must not inherit another guest's quota");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const counts = db.prepare("SELECT submissions FROM objective_guest_submission_limits ORDER BY submissions DESC").all();
    assert.deepEqual(counts.map((row) => row.submissions), [2, 1]);
    const blockedRow = db.prepare("SELECT status FROM objective_attempts WHERE attempt_id = ?").get(blocked.start.json.attemptId);
    assert.equal(blockedRow.status, "open", "A rate-limited submission must not partially lock the attempt");
  } finally {
    db.close();
  }

  console.log("PASS guest objective submissions are persistently limited across cookies; idempotent retry and transaction rollback remain intact.");
} finally {
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
