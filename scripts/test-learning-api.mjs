import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = 5100 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(root, "data", `learning-api-test-${process.pid}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: databasePath },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const { response } = await request("/healthz");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Learning API server did not start. ${stderr}`);
}

function jsonOptions(method, body, token = "") {
  return {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

try {
  await waitForServer();
  const readingContext = await request("/api/reading/context?id=cam15-r-test1&question=1");
  assert.equal(readingContext.response.status, 200);
  assert.equal(readingContext.json.passage, 1);
  assert.equal(readingContext.json.passageStartPage, 18);
  assert.equal(readingContext.json.questionPage, 20);
  assert.match(readingContext.json.paperText, /dark\s+green\s+oval\s+leaves/i,
    "Question-specific Reading context must OCR a missing source page instead of returning the answer key");

  const unauthorized = await request("/api/learning/state");
  assert.equal(unauthorized.response.status, 401);

  const usernameA = `learner_a_${process.pid}`.slice(0, 24);
  const registeredA = await request("/api/auth/register", jsonOptions("POST", { username: usernameA, password: "testing123" }));
  assert.equal(registeredA.response.status, 200);
  const tokenA = registeredA.json.token;

  const initialState = await request("/api/learning/state", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(initialState.json.todayPlan.kind, "onboarding");
  assert.equal(initialState.json.activeSession, null);

  const profile = await request("/api/learning/profile", jsonOptions("PATCH", {
    targetBand: 7.5,
    examDate: "2026-12-01",
    dailyMinutes: 45,
    onboardingCompleted: true,
  }, tokenA));
  assert.equal(profile.response.status, 200);
  assert.equal(profile.json.profile.targetBand, 7.5);

  const diagnostic = await request("/api/learning/today-plan", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(diagnostic.json.plan.kind, "diagnostic");
  assert.equal(diagnostic.json.plan.task, null);

  const sessionId = `session_${process.pid}_alpha`;
  const createdSession = await request(`/api/learning/sessions/${sessionId}`, jsonOptions("PUT", {
    revision: 0,
    module: "reading",
    itemId: "cam16-r-test1",
    practiceKind: "single",
    mode: "evidence",
    status: "in_progress",
    state: { answers: { q1: "TRUE" }, seconds: 3200, readingPane: "questions" },
  }, tokenA));
  assert.equal(createdSession.response.status, 200);
  assert.equal(createdSession.json.session.revision, 1);

  const resumePlan = await request("/api/learning/today-plan", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(resumePlan.json.plan.kind, "resume");
  assert.deepEqual(resumePlan.json.plan.reason.sourceIds, [sessionId]);

  const conflict = await request(`/api/learning/sessions/${sessionId}`, jsonOptions("PUT", {
    revision: 0,
    module: "reading",
    itemId: "cam16-r-test1",
    mode: "evidence",
    status: "in_progress",
    state: {},
  }, tokenA));
  assert.equal(conflict.response.status, 409);

  const attemptId = `attempt_${process.pid}_one`;
  const attemptPayload = {
    attemptId,
    sessionId,
    module: "reading",
    itemId: "cam16-r-test1",
    mode: "evidence",
    score: { correct: 8, total: 10, band: 7 },
    result: { wrongQuestionIds: ["q1", "q4"] },
    feedback: { summary: "Evidence location needs work." },
    durationSeconds: 480,
  };
  const attempt = await request("/api/learning/attempts", jsonOptions("POST", attemptPayload, tokenA));
  const repeatedAttempt = await request("/api/learning/attempts", jsonOptions("POST", attemptPayload, tokenA));
  assert.equal(attempt.response.status, 200);
  assert.equal(repeatedAttempt.json.idempotent, true);

  const weakAreaId = `weak_${process.pid}_q1`;
  const weak = await request("/api/learning/weak-areas", jsonOptions("POST", {
    id: weakAreaId,
    module: "reading",
    skillKey: "evidence_location",
    questionId: "q1",
    sourceAttemptId: attemptId,
    summary: "Locate the source sentence before choosing an answer.",
    evidence: { expected: "TRUE", actual: "FALSE" },
  }, tokenA));
  assert.equal(weak.response.status, 200);

  const completedSession = await request(`/api/learning/sessions/${sessionId}`, jsonOptions("PUT", {
    revision: 1,
    module: "reading",
    itemId: "cam16-r-test1",
    practiceKind: "single",
    mode: "evidence",
    status: "completed",
    state: { answers: { q1: "TRUE" }, seconds: 0 },
  }, tokenA));
  assert.equal(completedSession.json.session.revision, 2);

  const retestPlan = await request("/api/learning/today-plan", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(retestPlan.json.plan.kind, "retest");
  assert.ok(retestPlan.json.plan.reason.sourceIds.includes(weakAreaId));
  assert.ok(retestPlan.json.plan.reason.sourceIds.includes(attemptId));

  const resolvedWeak = await request(`/api/learning/weak-areas/${weakAreaId}`, jsonOptions("PATCH", {
    status: "resolved",
    retestAttemptId: attemptId,
  }, tokenA));
  assert.equal(resolvedWeak.response.status, 200);
  const trendPlan = await request("/api/learning/today-plan", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(trendPlan.json.plan.kind, "practice");
  assert.equal(trendPlan.json.plan.task.module, "reading");
  assert.equal(trendPlan.json.plan.task.mode, "evidence");
  assert.equal(trendPlan.json.plan.reason.code, "seven_day_weakest_skill");
  assert.equal(trendPlan.json.plan.algorithmVersion, "rules-v2");

  const usernameB = `learner_b_${process.pid}`.slice(0, 24);
  const registeredB = await request("/api/auth/register", jsonOptions("POST", { username: usernameB, password: "testing123" }));
  const stateB = await request("/api/learning/state", { headers: { authorization: `Bearer ${registeredB.json.token}` } });
  assert.equal(stateB.json.activeSession, null);
  assert.deepEqual(stateB.json.attempts, []);
  assert.deepEqual(stateB.json.weakAreas, []);

  console.log("Learning profile API regression checks passed.");
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}
