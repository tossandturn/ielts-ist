import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = 6400 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(root, "data", `objective-security-${process.pid}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: databasePath },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Objective security test server did not start. ${stderr}`);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { response, json: await response.json().catch(() => ({})) };
}

function jsonOptions(body) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function assertNoAnswerFields(value, location = "payload") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAnswerFields(item, `${location}[${index}]`));
    return;
  }
  Object.entries(value).forEach(([key, item]) => {
    assert.ok(!/^(?:answer|answerkey|correctanswer|expectedanswer)$/i.test(key), `${location}.${key} must not expose an answer key`);
    assertNoAnswerFields(item, `${location}.${key}`);
  });
}

try {
  await waitForServer();
  const tasks = await request("/api/tasks");
  assert.equal(tasks.response.status, 200);
  assertNoAnswerFields(tasks.json);
  const listening = tasks.json.listeningTests.find((item) => item.id === "cam15-l-test1")
    || tasks.json.listeningTests.find((item) => item.questions?.length === 40);
  const reading = tasks.json.readingTests.find((item) => item.id === "cam15-r-test1")
    || tasks.json.readingTests.find((item) => item.questions?.length === 40);
  assert.ok(listening, "A complete Listening task must remain available");
  assert.ok(reading, "A complete Reading task must remain available");

  const source = JSON.parse(await readFile(path.join(root, "data", "cambridge15-bank.json"), "utf8"));
  const sourceListening = source.listeningTests.find((item) => item.id === listening.id) || null;
  const sourceReading = source.readingTests.find((item) => item.id === reading.id) || null;
  assert.ok(sourceListening?.questions?.[0]?.answer, `Private answer fixture missing for ${listening.id}`);
  assert.ok(sourceReading?.questions?.[0]?.answer, `Private answer fixture missing for ${reading.id}`);

  const listeningScore = await request("/api/listening/score", jsonOptions({
    taskId: listening.id,
    questionIds: [listening.questions[0].id],
    answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
  }));
  assert.equal(listeningScore.response.status, 200);
  assert.equal(listeningScore.json.result.correct, 1, "Server-side Listening scoring must use the canonical answer key");

  const readingScore = await request("/api/reading/score", jsonOptions({
    taskId: reading.id,
    questionIds: [reading.questions[0].id],
    answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
  }));
  assert.equal(readingScore.response.status, 200);
  assert.equal(readingScore.json.result.correct, 1, "Server-side Reading scoring must use the canonical answer key");

  const legacy = await request("/api/listening/score", jsonOptions({
    questions: [{ id: "q1", answer: sourceListening.questions[0].answer }],
    answers: { q1: sourceListening.questions[0].answer },
  }));
  assert.equal(legacy.response.status, 400, "Scoring must reject client-supplied answer keys without a task id");
  console.log("Objective scoring security contract passed: task payloads omit answer fields and canonical Listening/Reading grading remains correct.");
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await new Promise((resolve) => setTimeout(resolve, 100));
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}
