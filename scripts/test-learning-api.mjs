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
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: databasePath,
    ADMIN_API_SECRET: "learning-api-admin-test-secret",
    STEM_IDENTITY_SIGNING_KEY: "learning-api-stem-test-signing-key",
  },
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

function childHasExited(childProcess) {
  return childProcess.exitCode !== null || childProcess.signalCode !== null;
}

function waitForChildExit(childProcess, timeoutMs = 4_000) {
  if (childHasExited(childProcess)) {
    return Promise.resolve({ exited: true, timedOut: false });
  }
  return new Promise((resolve) => {
    let settled = false;
    let timeoutId = null;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      childProcess.removeListener("exit", onExit);
      childProcess.removeListener("close", onClose);
      resolve(result);
    };
    const onExit = () => finish({ exited: true, timedOut: false });
    const onClose = () => finish({ exited: true, timedOut: false });
    childProcess.once("exit", onExit);
    childProcess.once("close", onClose);
    // The process can exit between the first check and listener installation.
    if (childHasExited(childProcess)) {
      finish({ exited: true, timedOut: false });
      return;
    }
    timeoutId = setTimeout(() => finish({ exited: false, timedOut: true }), timeoutMs);
  });
}

async function stopTestServer(childProcess) {
  if (childHasExited(childProcess)) return { alreadyExited: true, forced: false };
  const gracefulExit = waitForChildExit(childProcess);
  try {
    childProcess.kill();
  } catch {}
  const gracefulResult = await gracefulExit;
  if (!gracefulResult.timedOut || childHasExited(childProcess)) {
    return { alreadyExited: false, forced: false };
  }

  const forcedExit = waitForChildExit(childProcess, 2_000);
  try {
    childProcess.kill("SIGKILL");
  } catch {}
  const forcedResult = await forcedExit;
  if (forcedResult.timedOut && !childHasExited(childProcess)) {
    throw new Error("Learning API test server did not exit after forced cleanup.");
  }
  return { alreadyExited: false, forced: true };
}

function jsonOptions(method, body, token = "") {
  return {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

let testFailure = null;
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
  assert.match(registeredA.response.headers.get("set-cookie") || "", /; Secure(?:;|$)/i,
    "Session cookies must be restricted to HTTPS by default");

  const adminHeaders = { "x-admin-secret": "learning-api-admin-test-secret" };
  const defaultRoles = await request(`/api/admin/users/${registeredA.json.user.id}/roles`, { headers: adminHeaders });
  assert.equal(defaultRoles.response.status, 200);
  assert.deepEqual(defaultRoles.json.roles, ["student"]);
  assert.deepEqual(defaultRoles.json.workspaceRoles, ["student"]);

  const deniedRoles = await request(`/api/admin/users/${registeredA.json.user.id}/roles`);
  assert.equal(deniedRoles.response.status, 403);

  const invalidRoles = await request(`/api/admin/users/${registeredA.json.user.id}/roles`, {
    method: "PUT",
    headers: { ...adminHeaders, "content-type": "application/json" },
    body: JSON.stringify({ roles: ["teacher", "not-a-role"] }),
  });
  assert.equal(invalidRoles.response.status, 400);

  const updatedRoles = await request(`/api/admin/users/${registeredA.json.user.id}/roles`, {
    method: "PUT",
    headers: { ...adminHeaders, "content-type": "application/json" },
    body: JSON.stringify({ roles: ["school_owner", "teacher", "staff", "school_admin", "teacher"] }),
  });
  assert.equal(updatedRoles.response.status, 200);
  assert.deepEqual(updatedRoles.json.roles, ["teacher", "school_admin", "school_owner", "staff"]);

  const stemIdentity = await request("/api/stem/identity", {
    headers: { authorization: `Bearer ${tokenA}`, origin: "http://localhost:5173" },
  });
  assert.equal(stemIdentity.response.status, 200);
  assert.equal(stemIdentity.response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.deepEqual(stemIdentity.json.identity.roles, ["teacher", "school_admin", "school_owner", "staff"]);
  assert.deepEqual(stemIdentity.json.identity.workspaceRoles, ["teacher", "school_admin", "school_owner", "staff"]);
  const stemClaims = JSON.parse(Buffer.from(stemIdentity.json.accessToken.split(".")[1], "base64url").toString("utf8"));
  assert.deepEqual(stemClaims.roles, ["teacher", "school_admin", "school_owner", "staff"]);
  assert.deepEqual(stemClaims.workspaceRoles, ["teacher", "school_admin", "school_owner", "staff"]);

  const initialState = await request("/api/learning/state", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(initialState.json.todayPlan.kind, "onboarding");
  assert.equal(initialState.json.activeSession, null);
  assert.deepEqual(initialState.json.activeSessions, []);

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

  const listeningSessionId = `session_${process.pid}_listening`;
  const createdListeningSession = await request(`/api/learning/sessions/${listeningSessionId}`, jsonOptions("PUT", {
    revision: 0,
    module: "listening",
    itemId: "cam16-l-test1",
    practiceKind: "single",
    mode: "exam",
    status: "in_progress",
    state: { answers: { q2: "museum" }, seconds: 1540, total: 1800, playback: { section: 1, policy: "paused-on-restore" } },
  }, tokenA));
  assert.equal(createdListeningSession.response.status, 200);

  const isolatedSessions = await request("/api/learning/state", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(isolatedSessions.json.activeSessions.length, 2, "Listening and Reading must remain separate resumable sessions");
  const readingSession = isolatedSessions.json.activeSessions.find((session) => session.sessionId === sessionId);
  const listeningSession = isolatedSessions.json.activeSessions.find((session) => session.sessionId === listeningSessionId);
  assert.deepEqual(readingSession.state.answers, { q1: "TRUE" });
  assert.equal(readingSession.state.seconds, 3200);
  assert.deepEqual(listeningSession.state.answers, { q2: "museum" });
  assert.equal(listeningSession.state.seconds, 1540);

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

  const completedListeningSession = await request(`/api/learning/sessions/${listeningSessionId}`, jsonOptions("PUT", {
    revision: 1,
    module: "listening",
    itemId: "cam16-l-test1",
    practiceKind: "single",
    mode: "exam",
    status: "completed",
    state: { answers: { q2: "museum" }, seconds: 1540, total: 1800, playback: { section: 1, policy: "paused-on-restore" } },
  }, tokenA));
  assert.equal(completedListeningSession.json.session.revision, 2);

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
  assert.equal(registeredB.response.status, 200);
  const tokenB = registeredB.json.token;
  const stateB = await request("/api/learning/state", { headers: { authorization: `Bearer ${registeredB.json.token}` } });
  assert.equal(stateB.json.activeSession, null);
  assert.deepEqual(stateB.json.attempts, []);
  assert.deepEqual(stateB.json.weakAreas, []);

  const sharedSessionId = `session_${process.pid}_owner_race`;
  const ownerPayload = (owner) => ({
    revision: 0,
    module: "reading",
    itemId: `cam16-r-${owner}`,
    practiceKind: "single",
    mode: "evidence",
    status: "in_progress",
    state: { owner, answers: { q1: owner }, seconds: owner === "A" ? 3100 : 3200 },
  });
  const [ownerAWrite, ownerBWrite] = await Promise.all([
    request(`/api/learning/sessions/${sharedSessionId}`, jsonOptions("PUT", ownerPayload("A"), tokenA)),
    request(`/api/learning/sessions/${sharedSessionId}`, jsonOptions("PUT", ownerPayload("B"), tokenB)),
  ]);
  assert.deepEqual(
    [ownerAWrite.response.status, ownerBWrite.response.status].sort((a, b) => a - b),
    [200, 409],
    "A globally colliding session id must have exactly one owner",
  );
  const winningOwner = ownerAWrite.response.status === 200 ? "A" : "B";
  const winnerToken = winningOwner === "A" ? tokenA : tokenB;
  const loserToken = winningOwner === "A" ? tokenB : tokenA;
  const winnerState = await request("/api/learning/state", { headers: { authorization: `Bearer ${winnerToken}` } });
  const loserState = await request("/api/learning/state", { headers: { authorization: `Bearer ${loserToken}` } });
  const winningSession = winnerState.json.activeSessions.find((session) => session.sessionId === sharedSessionId);
  assert.equal(winningSession?.state?.owner, winningOwner, "The winning account must retain its own session payload");
  assert.equal(
    loserState.json.activeSessions.some((session) => session.sessionId === sharedSessionId),
    false,
    "The losing account must not read or overwrite another owner's session",
  );

  const loggedOut = await request("/api/auth/logout", jsonOptions("POST", {}, registeredA.json.token));
  assert.equal(loggedOut.response.status, 200);
  assert.match(loggedOut.response.headers.get("set-cookie") || "", /; Secure(?:;|$)/i,
    "Logout cookie clearing must retain the Secure attribute");
  const expired = await request("/api/me", { headers: { authorization: `Bearer ${registeredA.json.token}` } });
  assert.equal(expired.response.status, 401);

  console.log("Learning profile API regression checks passed.");
} catch (error) {
  testFailure = error;
  throw error;
} finally {
  let cleanupError = null;
  try {
    await stopTestServer(child);
  } catch (error) {
    cleanupError = error;
  }
  try {
    await Promise.all([
      rm(databasePath, { force: true }),
      rm(`${databasePath}-shm`, { force: true }),
      rm(`${databasePath}-wal`, { force: true }),
    ]);
  } catch (error) {
    cleanupError ||= error;
  }
  if (cleanupError) {
    if (testFailure) {
      console.error(`Learning API test cleanup failed after the primary test failure: ${cleanupError.message}`);
    } else {
      throw cleanupError;
    }
  }
}
