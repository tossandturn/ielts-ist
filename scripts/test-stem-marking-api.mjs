import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const appPort = 6200 + (process.pid % 200);
const providerPort = 6500 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${appPort}`;
const databasePath = path.join(root, "data", `stem-marking-test-${process.pid}.sqlite`);
const manifestPath = path.join(root, "data", `stem-marking-manifest-test-${process.pid}.json`);
const providerCalls = new Map();
const providerBodies = [];
const providerQuestionCalls = [];
const failedProviderQuestionIds = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const provider = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  providerBodies.push(body);
  const content = body.messages?.find((message) => message.role === "user")?.content || "";
  const text = Array.isArray(content) ? content.map((item) => item.text || "").join("\n") : String(content);
  const labelledQuestionId = text.match(/\[questionPartId=([^\]]+)\]/)?.[1] || "";
  providerQuestionCalls.push({ questionPartId: labelledQuestionId, content });
  const key = text.includes("force-provider-failure") ? "failure" : "success";
  providerCalls.set(key, (providerCalls.get(key) || 0) + 1);
  await sleep(text.includes("restart-slow") ? 220 : 35);
  res.setHeader("content-type", "application/json");
  if (key === "failure" && !failedProviderQuestionIds.has(labelledQuestionId)) {
    failedProviderQuestionIds.add(labelledQuestionId);
    res.statusCode = 503;
    res.end(JSON.stringify({ code: "UPSTREAM_UNAVAILABLE", message: "private provider detail" }));
    return;
  }
  const questionMatch = text.match(/"questionPartId":"([^"]+)"/);
  const pointMatch = text.match(/"pointId":"([^"]+)"/);
  res.end(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({
      questions: [{
        questionPartId: questionMatch?.[1] || "unknown",
        markPoints: [{
          pointId: pointMatch?.[1] || "unknown",
          awardedMarks: 2,
          reason: "Applies the required relationship.",
          studentEvidence: { quote: "F = ma" },
          confidence: 0.92,
        }],
      }],
    }) } }],
  }));
});

await new Promise((resolve, reject) => {
  provider.once("error", reject);
  provider.listen(providerPort, "127.0.0.1", resolve);
});

let child = null;
let stderr = "";

function startApp() {
  stderr = "";
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(appPort),
      IELTSIST_DB_PATH: databasePath,
      ADMIN_API_SECRET: "stem-marking-test-admin-secret",
      STEM_IDENTITY_SIGNING_KEY: "stem-marking-test-signing-key",
      STEM_MARKING_AI_API_KEY: "stem-marking-test-key",
      STEM_MARKING_AI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
      STEM_MARKING_AI_MODEL: "stem-marking-test-model",
      STEM_MARKING_AI_DISABLED: "0",
      STEM_MARKING_QUEUE_DISABLED: "0",
      STEM_MARKING_TRUSTED_MANIFEST_PATH: manifestPath,
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
    await sleep(100);
  }
  throw new Error(`STEM marking test server did not start. ${stderr}`);
}

function jsonOptions(method, body, token = "", extraHeaders = {}) {
  return {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

async function waitForStatus(submissionId, token, expected) {
  const deadline = Date.now() + 8_000;
  let latest = null;
  while (Date.now() < deadline) {
    latest = await request(`/api/stem/marking/submissions/${submissionId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (latest.json.submission?.status === expected) return latest.json.submission;
    await sleep(70);
  }
  throw new Error(`Submission ${submissionId} did not reach ${expected}: ${JSON.stringify(latest?.json)}`);
}

async function waitForAnyStatus(submissionId, token, expectedStatuses) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const latest = await request(`/api/stem/marking/submissions/${submissionId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (expectedStatuses.includes(latest.json.submission?.status)) return latest.json.submission;
    await sleep(40);
  }
  throw new Error(`Submission ${submissionId} did not reach one of ${expectedStatuses.join(", ")}.`);
}

function submissionPayload(suffix, typedText = "F = ma") {
  const payload = {
    submissionId: `stem-submission-${process.pid}-${suffix}`,
    idempotencyKey: `stem-idempotency-${process.pid}-${suffix}`,
    routeId: "alevel-physics-mechanics",
    qualification: "A-Level",
    specificationVersion: "A-Level STEM 2026",
    paperId: "paper-math-p1-2025",
    attemptId: `attempt-${process.pid}-${suffix}`,
    organizationId: "school-alpha",
    classroomId: "class-11a",
    questions: [{
      questionPartId: "paper-math-p1-2025-q1a",
      prompt: "State the relationship between force, mass and acceleration.",
      availableMarks: 2,
      markSchemePoints: [{ pointId: "q1a-m1", maxMarks: 2, text: "States F = ma", sourceEvidence: { page: 2, quote: "F = ma" } }],
      answer: { typedText, handwritingImageDataUrl: "data:image/png;base64,iVBORw0KGgo=" },
      assets: [{ assetId: "question-page-2", kind: "pdf-page", label: "Question page", checksum: "sha256:test", imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" }],
    }],
  };
  payload.questions.forEach(applyReviewedProvenance);
  return payload;
}

function applyReviewedProvenance(question, options = {}) {
  const asset = question.assets?.[0] || {};
  question.sourceQuestionId = options.sourceQuestionId || question.questionPartId;
  question.reviewSchemaVersion = "stem-source-review.v1";
  question.reviewVersion = options.reviewVersion || "reviewed-fixture-v2";
  question.sourceEvidence = options.sourceEvidence || {
    assetId: asset.assetId || "",
    page: Number(asset.sourceEvidence?.page || 1),
    quote: `Reviewed source for ${question.sourceQuestionId}`,
  };
  return question;
}

function multiQuestionPayload(suffix, count, options = {}) {
  const payload = submissionPayload(suffix);
  payload.questions = Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const blank = Number(options.blankIndex) === index;
    const typedText = options.failureIndex === index
      ? "force-provider-failure"
      : options.restartSlow ? "restart-slow F = ma"
        : `F = ma for question ${number}`;
    return applyReviewedProvenance({
      questionPartId: `batch-${suffix}-q${number}`,
      prompt: `Question ${number}: state the relationship between force, mass and acceleration.`,
      availableMarks: 2,
      markSchemePoints: [{ pointId: `batch-${suffix}-q${number}-m1`, maxMarks: 2, text: "States F = ma" }],
      answer: blank ? {} : { typedText, handwritingImageDataUrl: "data:image/png;base64,iVBORw0KGgo=" },
      assets: [{ assetId: `batch-${suffix}-q${number}-source`, kind: "question_diagram", label: `Question ${number} diagram`, checksum: `sha256:${number}`, imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" }],
    });
  });
  return payload;
}

function igcsePayload(suffix) {
  const payload = submissionPayload(suffix);
  payload.routeId = "cambridge-igcse-mathematics-0580";
  payload.qualification = "IGCSE";
  payload.specificationVersion = "Cambridge IGCSE Mathematics 0580";
  payload.paperId = "0580-23-mj-2025";
  payload.questions = [applyReviewedProvenance({
    questionPartId: "0580-23-mj-2025-q1a",
    prompt: "Calculate the value of 3x when x = 4.",
    availableMarks: 2,
    markSchemePoints: [{ pointId: "0580-23-mj-2025-q1a-m1", maxMarks: 2, text: "Substitutes x = 4 and calculates 12" }],
    answer: { typedText: "12" },
    assets: [],
  })];
  return payload;
}

function sourceReviewPayload(suffix) {
  const payload = submissionPayload(suffix);
  payload.routeId = `alevel-physics-${suffix}`;
  payload.paperId = `paper-${suffix}`;
  const question = payload.questions[0];
  question.questionPartId = `${payload.paperId}-q1a`;
  question.markSchemePoints = [{ pointId: `${question.questionPartId}-m1`, maxMarks: 2, text: "States F = ma" }];
  question.assets = [{ assetId: `${payload.paperId}-page-1`, kind: "pdf-page", label: "Question page", checksum: "sha256:source", imageDataUrl: "data:image/png;base64,iVBORw0KGgo=" }];
  applyReviewedProvenance(question);
  return payload;
}

function manifestEntry(payload, question) {
  return {
    routeId: payload.routeId,
    qualification: payload.qualification,
    specificationVersion: payload.specificationVersion,
    paperId: payload.paperId,
    questionPartId: question.questionPartId,
    sourceQuestionId: question.sourceQuestionId,
    prompt: question.prompt,
    availableMarks: question.availableMarks,
    markSchemePoints: question.markSchemePoints,
    assets: (question.assets || []).map(({ assetId, kind, label, checksum, sourceEvidence }) => ({ assetId, kind, label, checksum, sourceEvidence })),
    sourceEvidence: question.sourceEvidence,
    review: {
      status: question.manifestReviewStatus || "approved",
      schemaVersion: question.reviewSchemaVersion,
      version: question.reviewVersion,
    },
  };
}

async function writeTrustedManifest() {
  const payloads = [
    submissionPayload("success"),
    multiQuestionPayload("eleven", 11),
    multiQuestionPayload("blank", 3),
    multiQuestionPayload("batch-failure", 4),
    submissionPayload("retry"),
    multiQuestionPayload("restart", 4, { restartSlow: true }),
    igcsePayload("igcse"),
    sourceReviewPayload("quarantined"),
    sourceReviewPayload("unreviewed"),
    sourceReviewPayload("stale"),
  ];
  payloads.find((payload) => payload.routeId.endsWith("quarantined"))?.questions.forEach((question) => { question.manifestReviewStatus = "quarantined"; });
  payloads.find((payload) => payload.routeId.endsWith("unreviewed"))?.questions.forEach((question) => { question.manifestReviewStatus = "unreviewed"; });
  payloads.find((payload) => payload.routeId.endsWith("stale"))?.questions.forEach((question) => { question.manifestReviewStatus = "stale"; });
  const entries = new Map();
  payloads.forEach((payload) => payload.questions.forEach((question) => {
    const entry = manifestEntry(payload, question);
    entries.set([entry.routeId, entry.specificationVersion, entry.paperId, entry.questionPartId].join("/"), entry);
  }));
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: "stem-marking-manifest.v2", questions: [...entries.values()] }));
}

try {
  await writeTrustedManifest();
  startApp();
  await waitForServer();

  const preflight = await request("/api/stem/marking/submissions", {
    method: "OPTIONS",
    headers: { origin: "http://localhost:5173", "access-control-request-method": "POST" },
  });
  assert.equal(preflight.response.status, 204);
  assert.equal(preflight.response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.match(preflight.response.headers.get("access-control-allow-methods"), /POST/);
  assert.equal(preflight.response.headers.get("access-control-allow-credentials"), "true");
  const blockedPreflight = await request("/api/stem/marking/submissions", {
    method: "OPTIONS",
    headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
  });
  assert.equal(blockedPreflight.response.status, 403);

  const legacyPreflight = await request("/api/ai/mark-handwriting", {
    method: "OPTIONS",
    headers: { origin: "http://localhost:5173", "access-control-request-method": "POST" },
  });
  assert.equal(legacyPreflight.response.status, 204, "The compatibility handwriting route must use exact STEM CORS.");
  assert.equal(legacyPreflight.response.headers.get("access-control-allow-origin"), "http://localhost:5173");

  const anonymous = await request("/api/stem/marking/submissions", jsonOptions("POST", {
    submissionId: "anonymous-submission",
    idempotencyKey: "anonymous-submission",
    routeId: "alevel-physics-mechanics",
    specificationVersion: "A-Level STEM 2026",
    paperId: "paper-math-p1-2025",
    attemptId: "anonymous-attempt",
    questions: [],
  }));
  assert.equal(anonymous.response.status, 401);

  const student = await request("/api/auth/register", jsonOptions("POST", { username: `stemstudent${process.pid}`.slice(0, 24), password: "testing123" }));
  const teacher = await request("/api/auth/register", jsonOptions("POST", { username: `stemteacher${process.pid}`.slice(0, 24), password: "testing123" }));
  const owner = await request("/api/auth/register", jsonOptions("POST", { username: `stemowner${process.pid}`.slice(0, 24), password: "testing123" }));
  assert.equal(student.response.status, 200);
  assert.equal(teacher.response.status, 200);
  assert.equal(owner.response.status, 200);

  const adminHeaders = { "x-admin-secret": "stem-marking-test-admin-secret", "content-type": "application/json" };
  const ownerRoles = await request(`/api/admin/users/${owner.json.user.id}/roles`, {
    method: "PUT", headers: adminHeaders, body: JSON.stringify({ roles: ["school_owner"] }),
  });
  assert.equal(ownerRoles.response.status, 200);

  for (const [user, role] of [[owner, "school_owner"], [teacher, "teacher"], [student, "student"]]) {
    const membership = await request(`/api/stem/marking/organizations/school-alpha/members/${user.json.user.id}`,
      jsonOptions("PUT", { classroomId: "class-11a", role }, owner.json.token));
    assert.equal(membership.response.status, 200);
  }

  const identity = await request("/api/stem/identity", {
    headers: { authorization: `Bearer ${student.json.token}`, origin: "http://localhost:5173" },
  });
  assert.equal(identity.response.status, 200);
  const sharedHeaders = { "x-stem-identity": identity.json.accessToken, origin: "http://localhost:5173" };

  const availability = await request("/api/stem/marking/availability", { headers: sharedHeaders });
  assert.equal(availability.response.status, 200);
  assert.deepEqual(availability.json, { enabled: true, modelConfigured: true, queueAvailable: true, authenticationRequired: false });
  assert.doesNotMatch(JSON.stringify(availability.json), /key|token|provider|url|error/i);

  const hostileProviderStart = providerQuestionCalls.length;
  for (const [status, code] of [["quarantined", "source_question_quarantined"], ["unreviewed", "source_question_unreviewed"], ["stale", "source_question_stale"]]) {
    const hostile = sourceReviewPayload(status);
    hostile.questions[0].reviewStatus = "approved";
    hostile.questions[0].sourceContentComplete = true;
    hostile.questions[0].aiAssistedMarkingAvailable = true;
    const blocked = await request("/api/ai/mark-handwriting", jsonOptions("POST", hostile, "", sharedHeaders));
    assert.equal(blocked.response.status, 422, `${status} source must fail closed even if client flags claim approval.`);
    assert.equal(blocked.json.code, code);
    assert.equal(blocked.json.submission.status, "missing_metadata");
    assert.ok(blocked.json.metadataIssues.includes(code));
  }
  const forgedUnknown = submissionPayload("forged-unknown");
  forgedUnknown.questions[0].questionPartId = "forged-source-q1";
  forgedUnknown.questions[0].sourceQuestionId = "forged-source-q1";
  forgedUnknown.questions[0].markSchemePoints = [{ pointId: "forged-source-q1-m1", maxMarks: 2, text: "Forged mark point" }];
  forgedUnknown.questions[0].reviewStatus = "approved";
  forgedUnknown.questions[0].sourceContentComplete = true;
  forgedUnknown.questions[0].aiAssistedMarkingAvailable = true;
  const unknownBlocked = await request("/api/stem/marking/submissions", jsonOptions("POST", forgedUnknown, student.json.token));
  assert.equal(unknownBlocked.response.status, 422);
  assert.equal(unknownBlocked.json.code, "source_question_unknown");
  assert.ok(unknownBlocked.json.metadataIssues.includes("source_question_unknown"));
  const forgedMarks = submissionPayload("forged-marks");
  forgedMarks.questions[0].markSchemePoints[0].maxMarks = 99;
  forgedMarks.questions[0].availableMarks = 99;
  forgedMarks.questions[0].reviewStatus = "approved";
  forgedMarks.questions[0].sourceContentComplete = true;
  forgedMarks.questions[0].aiAssistedMarkingAvailable = true;
  const markMismatch = await request("/api/stem/marking/submissions", jsonOptions("POST", forgedMarks, student.json.token));
  assert.equal(markMismatch.response.status, 422);
  assert.ok(markMismatch.json.metadataIssues.includes("trusted_manifest_mismatch"));
  assert.equal(providerQuestionCalls.length, hostileProviderStart, "Rejected source provenance must never reach the provider.");

  const successPayload = submissionPayload("success");
  const accepted = await request("/api/stem/marking/submissions", jsonOptions("POST", successPayload, "", sharedHeaders));
  assert.equal(accepted.response.status, 202);
  assert.equal(accepted.json.submission.status, "queued");
  const duplicate = await request("/api/stem/marking/submissions", jsonOptions("POST", successPayload, "", sharedHeaders));
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.json.idempotent, true);
  const completed = await waitForStatus(successPayload.submissionId, student.json.token, "completed");
  assert.equal(completed.result.awardedMarks, 2);
  assert.equal(completed.result.maxMarks, 2);
  assert.equal(completed.result.questions[0].markPoints[0].pointId, "q1a-m1");
  assert.ok(providerBodies.some((body) => Array.isArray(body.messages?.[1]?.content) && body.messages[1].content.some((item) => item.type === "image_url")),
    "Question/handwriting image evidence must be passed to the structured marking provider.");
  assert.equal(providerCalls.get("success"), 1, "Duplicate submissions must not re-run marking.");
  const aLevelSystemPrompt = providerBodies.find((body) => JSON.stringify(body).includes(successPayload.questions[0].questionPartId))?.messages?.[0]?.content || "";
  assert.match(aLevelSystemPrompt, /Cambridge A-Level examiner/i);
  assert.match(aLevelSystemPrompt, /AI-assisted formative marking, not an official Cambridge result/i);
  assert.doesNotMatch(aLevelSystemPrompt, /IGCSE/i);

  const legacyPayload = submissionPayload("legacy-route");
  const legacyAccepted = await request("/api/ai/mark-handwriting", jsonOptions("POST", legacyPayload, "", sharedHeaders));
  assert.equal(legacyAccepted.response.status, 202, "The legacy handwriting route must use the canonical reviewed submission queue.");
  const legacyCompleted = await waitForStatus(legacyPayload.submissionId, student.json.token, "completed");
  assert.equal(legacyCompleted.result.maxMarks, 2);

  const igcse = igcsePayload("igcse");
  delete igcse.organizationId;
  delete igcse.classroomId;
  const igcseAccepted = await request("/api/stem/marking/submissions", jsonOptions("POST", igcse, student.json.token));
  assert.equal(igcseAccepted.response.status, 202);
  await waitForStatus(igcse.submissionId, student.json.token, "completed");
  const igcseSystemPrompt = providerBodies.find((body) => JSON.stringify(body).includes(igcse.questions[0].questionPartId))?.messages?.[0]?.content || "";
  assert.match(igcseSystemPrompt, /Cambridge IGCSE examiner/i);
  assert.doesNotMatch(igcseSystemPrompt, /A-Level examiner/i);

  const elevenStart = providerQuestionCalls.length;
  const elevenPayload = multiQuestionPayload("eleven", 11);
  const elevenAccepted = await request("/api/stem/marking/submissions", jsonOptions("POST", elevenPayload, student.json.token));
  assert.equal(elevenAccepted.response.status, 202);
  const elevenDuplicate = await request("/api/stem/marking/submissions", jsonOptions("POST", elevenPayload, student.json.token));
  assert.equal(elevenDuplicate.json.idempotent, true);
  const elevenCompleted = await waitForStatus(elevenPayload.submissionId, student.json.token, "completed");
  assert.equal(elevenCompleted.result.questions.length, 11);
  assert.equal(elevenCompleted.result.awardedMarks, 22);
  const elevenCalls = providerQuestionCalls.slice(elevenStart);
  assert.equal(elevenCalls.length, 11, "Eleven answer slots must make eleven question-scoped provider calls, not one truncated image call.");
  for (const question of elevenPayload.questions) {
    const call = elevenCalls.find((item) => item.questionPartId === question.questionPartId);
    assert.ok(call, `Provider did not receive ${question.questionPartId}`);
    assert.ok(Array.isArray(call.content), "Question-scoped multimodal input must use ordered content parts.");
    const textParts = call.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
    assert.match(textParts, new RegExp(`\\[questionPartId=${question.questionPartId}\\]\\[role=question_asset\\]`));
    assert.match(textParts, new RegExp(`\\[questionPartId=${question.questionPartId}\\]\\[role=student_handwriting\\]`));
    assert.equal(call.content.filter((item) => item.type === "image_url").length, 2, "Each question must carry both its source image and its handwriting image.");
    const assetMarker = call.content.findIndex((item) => item.type === "text" && item.text.includes("[role=question_asset]"));
    const handwritingMarker = call.content.findIndex((item) => item.type === "text" && item.text.includes("[role=student_handwriting]"));
    assert.equal(call.content[assetMarker + 1]?.type, "image_url", "Question asset role marker must be immediately adjacent to its image.");
    assert.equal(call.content[handwritingMarker + 1]?.type, "image_url", "Handwriting role marker must be immediately adjacent to its image.");
  }

  const blankStart = providerQuestionCalls.length;
  const blankPayload = multiQuestionPayload("blank", 3, { blankIndex: 1 });
  const blankAccepted = await request("/api/stem/marking/submissions", jsonOptions("POST", blankPayload, student.json.token));
  assert.equal(blankAccepted.response.status, 202, "An empty answer slot must not convert a valid paper into missing metadata.");
  const blankCompleted = await waitForStatus(blankPayload.submissionId, student.json.token, "completed");
  assert.equal(blankCompleted.result.awardedMarks, 4);
  const blankQuestion = blankCompleted.result.questions[1];
  assert.equal(blankQuestion.awardedMarks, 0);
  assert.equal(blankQuestion.batchStatus, "completed");
  assert.equal(blankQuestion.markPoints[0].awardedMarks, 0);
  assert.equal(blankQuestion.reviewRequired, false);
  assert.equal(providerQuestionCalls.slice(blankStart).length, 2, "The empty slot must be deterministic and must not be sent to the provider.");

  const multiFailureStart = providerQuestionCalls.length;
  const multiFailurePayload = multiQuestionPayload("batch-failure", 4, { failureIndex: 2 });
  const multiFailureAccepted = await request("/api/stem/marking/submissions", jsonOptions("POST", multiFailurePayload, student.json.token));
  assert.equal(multiFailureAccepted.response.status, 202);
  const multiFailed = await waitForStatus(multiFailurePayload.submissionId, student.json.token, "failed");
  assert.equal(multiFailed.result.questions[0].batchStatus, "completed");
  assert.equal(multiFailed.result.questions[1].batchStatus, "completed");
  assert.equal(multiFailed.result.questions[2].batchStatus, "failed");
  const multiRetry = await request(`/api/stem/marking/submissions/${multiFailurePayload.submissionId}/retry`, jsonOptions("POST", {}, student.json.token));
  assert.equal(multiRetry.response.status, 202);
  const multiRetried = await waitForStatus(multiFailurePayload.submissionId, student.json.token, "completed");
  assert.equal(multiRetried.result.awardedMarks, 8);
  const multiFailureCalls = providerQuestionCalls.slice(multiFailureStart);
  for (const question of multiFailurePayload.questions.slice(0, 2)) {
    assert.equal(multiFailureCalls.filter((item) => item.questionPartId === question.questionPartId).length, 1, "Retry must not re-mark an already completed question batch.");
  }
  assert.equal(multiFailureCalls.filter((item) => item.questionPartId === multiFailurePayload.questions[2].questionPartId).length, 2);
  assert.equal(multiFailureCalls.filter((item) => item.questionPartId === multiFailurePayload.questions[3].questionPartId).length, 1);

  const missingPayload = submissionPayload("missing");
  missingPayload.questions[0].markSchemePoints = [];
  const missing = await request("/api/stem/marking/submissions", jsonOptions("POST", missingPayload, student.json.token));
  assert.equal(missing.response.status, 422);
  assert.equal(missing.json.submission.status, "missing_metadata");
  assert.ok(missing.json.metadataIssues.includes("mark_scheme_missing"));

  const otherStudent = await request("/api/auth/register", jsonOptions("POST", { username: `stemother${process.pid}`.slice(0, 24), password: "testing123" }));
  const unauthorized = await request(`/api/stem/marking/submissions/${successPayload.submissionId}`, {
    headers: { authorization: `Bearer ${otherStudent.json.token}` },
  });
  assert.equal(unauthorized.response.status, 403);
  const hijackPayload = { ...successPayload, idempotencyKey: `foreign-idempotency-${process.pid}` };
  delete hijackPayload.organizationId;
  delete hijackPayload.classroomId;
  const hijack = await request("/api/stem/marking/submissions", jsonOptions("POST", hijackPayload, otherStudent.json.token));
  assert.equal(hijack.response.status, 409, "A different student cannot reuse another submission id.");
  const staffIndividual = await request(`/api/stem/marking/submissions/${successPayload.submissionId}`, {
    headers: { authorization: `Bearer ${teacher.json.token}` },
  });
  assert.equal(staffIndividual.response.status, 403, "Staff access must stay aggregate-only.");
  const summary = await request("/api/stem/marking/organizations/school-alpha/summary?classroomId=class-11a", {
    headers: { authorization: `Bearer ${teacher.json.token}` },
  });
  assert.equal(summary.response.status, 200);
  assert.equal(summary.json.statuses.completed, 5, "Classroom aggregate must include completed multi-question submissions without exposing their answers.");
  const studentSummary = await request("/api/stem/marking/organizations/school-alpha/summary?classroomId=class-11a", {
    headers: { authorization: `Bearer ${student.json.token}` },
  });
  assert.equal(studentSummary.response.status, 403);

  const failedSingleStart = providerQuestionCalls.length;
  const failedPayload = submissionPayload("retry", "force-provider-failure");
  const failedStart = await request("/api/stem/marking/submissions", jsonOptions("POST", failedPayload, student.json.token));
  assert.equal(failedStart.response.status, 202);
  const failed = await waitForStatus(failedPayload.submissionId, student.json.token, "failed");
  assert.equal(failed.result.failureCode, "provider_unavailable");
  assert.doesNotMatch(JSON.stringify(failed), /private provider detail|UPSTREAM_UNAVAILABLE|stem-marking-test-key/i);
  const retry = await request(`/api/stem/marking/submissions/${failedPayload.submissionId}/retry`, jsonOptions("POST", {}, student.json.token));
  assert.equal(retry.response.status, 202);
  const retried = await waitForStatus(failedPayload.submissionId, student.json.token, "completed");
  assert.equal(retried.result.awardedMarks, 2);
  assert.equal(providerQuestionCalls.slice(failedSingleStart).filter((item) => item.questionPartId === failedPayload.questions[0].questionPartId).length, 2,
    "Retry must issue exactly one additional provider request for its failed question.");

  const restartPayload = multiQuestionPayload("restart", 4, { restartSlow: true });
  const restartAccepted = await request("/api/stem/marking/submissions", jsonOptions("POST", restartPayload, student.json.token));
  assert.equal(restartAccepted.response.status, 202);
  await waitForAnyStatus(restartPayload.submissionId, student.json.token, ["processing"]);
  await stopApp();
  startApp();
  await waitForServer();
  const restartedMulti = await waitForStatus(restartPayload.submissionId, student.json.token, "completed");
  assert.equal(restartedMulti.result.awardedMarks, 8, "A multi-question submission interrupted while processing must resume after restart.");
  assert.ok(restartedMulti.events.some((event) => event.code === "recovered_after_restart"));
  const restored = await request(`/api/stem/marking/submissions/${successPayload.submissionId}`, {
    headers: { authorization: `Bearer ${student.json.token}` },
  });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.json.submission.status, "completed");
  assert.equal(restored.json.submission.result.awardedMarks, 2, "Completed marks must survive a server restart/reload.");

  await stopApp();
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: "stem-marking-manifest.v1", questions: [] }));
  startApp();
  await waitForServer();
  const legacyManifestAvailability = await request("/api/stem/marking/availability", { headers: sharedHeaders });
  assert.equal(legacyManifestAvailability.response.status, 200);
  assert.deepEqual(legacyManifestAvailability.json, { enabled: false, modelConfigured: true, queueAvailable: false, authenticationRequired: false },
    "A stale v1 manifest must fail closed instead of enabling AI marking.");

  console.log("STEM marking API checks passed: reviewed-source allowlist, question-scoped batches, empty answers, permissions, idempotency, retry, and restart recovery.");
} finally {
  await stopApp();
  await new Promise((resolve) => provider.close(resolve));
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
    rm(manifestPath, { force: true }),
  ]);
}
