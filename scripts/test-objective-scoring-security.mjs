import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = 6400 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(root, "data", `objective-security-${process.pid}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: databasePath, OBJECTIVE_GUEST_DAILY_SUBMISSION_LIMIT: "200" },
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

function cookieFrom(response) {
  return (response.headers.get("set-cookie") || "").split(";", 1)[0];
}

function jsonOptionsWithCookie(body, cookie) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  };
}

async function startObjectiveExam(context, listeningTaskId, readingTaskId, cookie, key, manifestOverrides = {}) {
  const examToken = randomBytes(32).toString("base64url");
  const started = await request("/api/objective/exams", jsonOptionsWithCookie({
    clientExamKey: key,
    examToken,
    context,
    listeningTaskId,
    readingTaskId,
    manifest: {
      examId: key,
      seed: `seed-${key}`,
      bankVersion: "test-bank-v1",
      generatorVersion: "test-generator-v1",
      listeningSourceId: listeningTaskId,
      readingSourceId: readingTaskId,
      ...manifestOverrides,
    },
  }, cookie));
  assert.equal(started.response.status, 201);
  assert.equal(started.json.examToken, examToken);
  return started.json;
}

function assertNoAnswerFields(value, location = "payload") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoAnswerFields(item, `${location}[${index}]`));
    return;
  }
  Object.entries(value).forEach(([key, item]) => {
    assert.ok(!/^(?:answer|answerkey|correctanswer|expected|expectedanswer|canonicalanswer|solution)$/i.test(key), `${location}.${key} must not expose an answer key`);
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
  const localSource = JSON.parse(await readFile(path.join(root, "data", "cambridge-local-bank.json"), "utf8"));
  const sourceListening = source.listeningTests.find((item) => item.id === listening.id) || null;
  const sourceReading = source.readingTests.find((item) => item.id === reading.id) || null;
  assert.ok(sourceListening?.questions?.[0]?.answer, `Private answer fixture missing for ${listening.id}`);
  assert.ok(sourceReading?.questions?.[0]?.answer, `Private answer fixture missing for ${reading.id}`);
  const fullListeningQuestionIds = listening.questions.map((question) => question.id);
  const fullReadingQuestionIds = reading.questions.map((question) => question.id);

  const directScore = await request("/api/listening/score", jsonOptions({
    taskId: listening.id,
    questionIds: [listening.questions[0].id],
    answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
  }));
  assert.equal(directScore.response.status, 409, "Scoring before a server-recorded attempt must be rejected");
  assert.equal(directScore.json.code, "objective_attempt_required");

  const listeningStartCapability = randomBytes(32).toString("base64url");
  const listeningStartPayload = {
    clientAttemptKey: `single-listening-${process.pid}`,
    attemptToken: listeningStartCapability,
    context: "single",
    module: "listening",
    taskId: listening.id,
    questionIds: [listening.questions[0].id],
  };
  const listeningAttempt = await request("/api/objective/attempts", jsonOptions(listeningStartPayload));
  assert.equal(listeningAttempt.response.status, 201);
  assert.match(listeningAttempt.json.attemptId || "", /^objective_[A-Za-z0-9_-]+$/);
  assert.match(listeningAttempt.json.attemptToken || "", /^[A-Za-z0-9_-]{32,}$/);
  assert.equal(listeningAttempt.json.status, "open");
  const guestCookie = cookieFrom(listeningAttempt.response);
  assert.match(guestCookie, /^ieltsist_objective_guest=/, "Guest attempts need an HttpOnly owner cookie");
  const recoveredListeningAttempt = await request(
    "/api/objective/attempts",
    jsonOptionsWithCookie(listeningStartPayload, guestCookie),
  );
  assert.equal(recoveredListeningAttempt.response.status, 200, "A lost start response must be recoverable with the original capability");
  assert.equal(recoveredListeningAttempt.json.idempotent, true);
  assert.equal(recoveredListeningAttempt.json.attemptId, listeningAttempt.json.attemptId);
  assert.equal(recoveredListeningAttempt.json.attemptToken, listeningStartCapability);
  const capabilitylessRetry = await request("/api/objective/attempts", jsonOptionsWithCookie({
    ...listeningStartPayload,
    attemptToken: undefined,
  }, guestCookie));
  assert.equal(capabilitylessRetry.response.status, 409);
  assert.equal(capabilitylessRetry.json.code, "objective_attempt_retry_requires_capability");
  assert.equal(capabilitylessRetry.json.attemptId, undefined, "Capability-less retries must not disclose the existing attempt");
  const wrongCapabilityRetry = await request("/api/objective/attempts", jsonOptionsWithCookie({
    ...listeningStartPayload,
    attemptToken: randomBytes(32).toString("base64url"),
  }, guestCookie));
  assert.equal(wrongCapabilityRetry.response.status, 403);
  assert.equal(wrongCapabilityRetry.json.code, "objective_attempt_forbidden");
  const changedRetry = await request("/api/objective/attempts", jsonOptionsWithCookie({
    ...listeningStartPayload,
    questionIds: [listening.questions[1].id],
  }, guestCookie));
  assert.equal(changedRetry.response.status, 409);
  assert.equal(changedRetry.json.code, "objective_attempt_mismatch");

  const listeningSubmission = {
    attemptId: listeningAttempt.json.attemptId,
    attemptToken: listeningAttempt.json.attemptToken,
    answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
  };
  const listeningScore = await request("/api/listening/score", jsonOptionsWithCookie(listeningSubmission, guestCookie));
  assert.equal(listeningScore.response.status, 200);
  assert.equal(listeningScore.json.result.correct, 1, "Server-side Listening scoring must use the canonical answer key");
  assert.equal(listeningScore.json.idempotent, false);
  assertNoAnswerFields(listeningScore.json);

  const repeatedListening = await request("/api/listening/score", jsonOptionsWithCookie(listeningSubmission, guestCookie));
  assert.equal(repeatedListening.response.status, 200);
  assert.equal(repeatedListening.json.idempotent, true, "An identical submission retry must return the stored result");
  assert.deepEqual(repeatedListening.json.result, listeningScore.json.result);

  const changedListening = await request("/api/listening/score", jsonOptionsWithCookie({
    ...listeningSubmission,
    answers: { [listening.questions[0].id]: "changed after submit" },
  }, guestCookie));
  assert.equal(changedListening.response.status, 409, "A submitted attempt must be immutable");
  assert.equal(changedListening.json.code, "objective_attempt_locked");

  const correctReview = await request(`/api/objective/attempts/${encodeURIComponent(listeningAttempt.json.attemptId)}/review`, {
    headers: { cookie: guestCookie, "x-objective-attempt": listeningAttempt.json.attemptToken },
  });
  assert.equal(correctReview.response.status, 200);
  assert.deepEqual(correctReview.json.wrongAnswers, [], "Review must expose canonical answers only for this attempt's wrong questions");

  const readingAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `single-reading-${process.pid}`,
    context: "single",
    module: "reading",
    taskId: reading.id,
    questionIds: [reading.questions[0].id],
  }, guestCookie));
  assert.equal(readingAttempt.response.status, 201);
  const readingScore = await request("/api/reading/score", jsonOptionsWithCookie({
    attemptId: readingAttempt.json.attemptId,
    attemptToken: readingAttempt.json.attemptToken,
    answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
  }, guestCookie));
  assert.equal(readingScore.response.status, 200);
  assert.equal(readingScore.json.result.correct, 1, "Server-side Reading scoring must use the canonical answer key");
  assertNoAnswerFields(readingScore.json);

  const directExamReport = await request("/api/exam/report", jsonOptionsWithCookie({
    examContext: "random-exam",
    listening: {
      taskId: listening.id,
      questionIds: [listening.questions[0].id],
      answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
    },
    reading: {
      taskId: reading.id,
      questionIds: [reading.questions[0].id],
      answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
    },
  }, guestCookie));
  assert.equal(directExamReport.response.status, 409, "Random Exam report must reject raw public task ids");
  assert.equal(directExamReport.json.code, "objective_attempt_required");

  for (const examContext of ["random-exam", "same-test"]) {
    for (const fixture of [
      { module: "listening", task: listening },
      { module: "reading", task: reading },
    ]) {
      const incompleteAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
        clientAttemptKey: `incomplete-${examContext}-${fixture.module}-${process.pid}`,
        attemptToken: randomBytes(32).toString("base64url"),
        context: examContext,
        module: fixture.module,
        taskId: fixture.task.id,
        questionIds: [fixture.task.questions[0].id],
      }, guestCookie));
      assert.equal(incompleteAttempt.response.status, 409, `${examContext} ${fixture.module} must reject a client-selected subset`);
      assert.equal(incompleteAttempt.json.code, "objective_attempt_incomplete");
      assert.equal(incompleteAttempt.json.restartRequired, true);
    }
  }

  const atomicExam = await startObjectiveExam("random-exam", listening.id, reading.id, guestCookie, `atomic-random-${process.pid}`);
  const mismatchedManifestRetry = await request("/api/objective/exams", jsonOptionsWithCookie({
    clientExamKey: `atomic-random-${process.pid}`,
    examToken: atomicExam.examToken,
    context: "random-exam",
    listeningTaskId: listening.id,
    readingTaskId: reading.id,
    manifest: {
      examId: `atomic-random-${process.pid}`,
      seed: `seed-atomic-random-${process.pid}`,
      bankVersion: "test-bank-v1",
      generatorVersion: "test-generator-v1",
      listeningSourceId: listening.id,
      readingSourceId: reading.id,
      writingSourceIds: ["writing-source-swapped-task1", "writing-source-swapped-task2"],
      speakingSourceId: "speaking-source-swapped",
    },
  }, guestCookie));
  assert.equal(mismatchedManifestRetry.response.status, 409, "A retry must reject a changed full-exam source manifest");
  assert.equal(mismatchedManifestRetry.json.code, "objective_exam_mismatch");
  const atomicListeningAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `atomic-random-listening-${process.pid}`,
    context: "random-exam",
    module: "listening",
    taskId: listening.id,
    questionIds: fullListeningQuestionIds,
    examId: atomicExam.examId,
    examToken: atomicExam.examToken,
  }, guestCookie));
  const atomicReadingAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `atomic-random-reading-${process.pid}`,
    context: "random-exam",
    module: "reading",
    taskId: reading.id,
    questionIds: fullReadingQuestionIds,
    examId: atomicExam.examId,
    examToken: atomicExam.examToken,
  }, guestCookie));
  assert.equal(atomicListeningAttempt.response.status, 201);
  assert.equal(atomicReadingAttempt.response.status, 201);
  const rejectedAtomicReport = await request("/api/exam/report", jsonOptionsWithCookie({
    examContext: "random-exam",
    listening: {
      attemptId: atomicListeningAttempt.json.attemptId,
      attemptToken: atomicListeningAttempt.json.attemptToken,
      answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
    },
    reading: {
      attemptId: atomicReadingAttempt.json.attemptId,
      attemptToken: `${atomicReadingAttempt.json.attemptToken}-invalid`,
      answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
    },
    writing: { tasks: [] },
    speaking: {},
  }, guestCookie));
  assert.equal(rejectedAtomicReport.response.status, 403, "An invalid second capability must reject the full report");
  assert.equal(rejectedAtomicReport.json.code, "objective_attempt_forbidden");
  for (const attempt of [atomicListeningAttempt.json, atomicReadingAttempt.json]) {
    const review = await request(`/api/objective/attempts/${encodeURIComponent(attempt.attemptId)}/review`, {
      headers: { cookie: guestCookie, "x-objective-attempt": attempt.attemptToken },
    });
    assert.equal(review.response.status, 409, "Neither objective attempt may be submitted when the paired validation fails");
    assert.equal(review.json.code, "objective_attempt_not_submitted");
  }

  const manifestBoundExam = await startObjectiveExam(
    "random-exam",
    listening.id,
    reading.id,
    guestCookie,
    `manifest-bound-${process.pid}`,
    {
      writingSourceIds: ["manifest-writing-task1", "manifest-writing-task2"],
      speakingSourceId: "manifest-speaking",
    },
  );
  const manifestBoundListening = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `manifest-bound-listening-${process.pid}`,
    context: "random-exam",
    module: "listening",
    taskId: listening.id,
    questionIds: fullListeningQuestionIds,
    examId: manifestBoundExam.examId,
    examToken: manifestBoundExam.examToken,
  }, guestCookie));
  const manifestBoundReading = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `manifest-bound-reading-${process.pid}`,
    context: "random-exam",
    module: "reading",
    taskId: reading.id,
    questionIds: fullReadingQuestionIds,
    examId: manifestBoundExam.examId,
    examToken: manifestBoundExam.examToken,
  }, guestCookie));
  assert.equal(manifestBoundListening.response.status, 201);
  assert.equal(manifestBoundReading.response.status, 201);
  const swappedManifestReport = await request("/api/exam/report", jsonOptionsWithCookie({
    examContext: "random-exam",
    fullExamManifest: {
      ...manifestBoundExam.manifest,
      writingSourceIds: ["manifest-writing-task1", "swapped-writing-task2"],
    },
    listening: { attemptId: manifestBoundListening.json.attemptId, attemptToken: manifestBoundListening.json.attemptToken, answers: {} },
    reading: { attemptId: manifestBoundReading.json.attemptId, attemptToken: manifestBoundReading.json.attemptToken, answers: {} },
    writing: { tasks: [] },
    speaking: {},
  }, guestCookie));
  assert.equal(swappedManifestReport.response.status, 409, "A full-report submission cannot swap Writing or Speaking source IDs");
  assert.equal(swappedManifestReport.json.code, "objective_exam_mismatch");
  for (const attempt of [manifestBoundListening.json, manifestBoundReading.json]) {
    const review = await request(`/api/objective/attempts/${encodeURIComponent(attempt.attemptId)}/review`, {
      headers: { cookie: guestCookie, "x-objective-attempt": attempt.attemptToken },
    });
    assert.equal(review.response.status, 409, "A source-manifest rejection must leave both objective papers open");
  }

  for (const examContext of ["random-exam", "same-test"]) {
    const parentExam = await startObjectiveExam(examContext, listening.id, reading.id, guestCookie, `${examContext}-parent-${process.pid}`);
    const examListeningAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
      clientAttemptKey: `${examContext}-listening-${process.pid}`,
      context: examContext,
      module: "listening",
      taskId: listening.id,
      questionIds: fullListeningQuestionIds,
      examId: parentExam.examId,
      examToken: parentExam.examToken,
    }, guestCookie));
    const examReadingAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
      clientAttemptKey: `${examContext}-reading-${process.pid}`,
      context: examContext,
      module: "reading",
      taskId: reading.id,
      questionIds: fullReadingQuestionIds,
      examId: parentExam.examId,
      examToken: parentExam.examToken,
    }, guestCookie));
    assert.equal(examListeningAttempt.response.status, 201);
    assert.equal(examReadingAttempt.response.status, 201);
    const examPayload = {
      examContext,
      listening: {
        attemptId: examListeningAttempt.json.attemptId,
        attemptToken: examListeningAttempt.json.attemptToken,
        answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
      },
      reading: {
        attemptId: examReadingAttempt.json.attemptId,
        attemptToken: examReadingAttempt.json.attemptToken,
        answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
      },
      writing: { tasks: [] },
      speaking: {},
    };
    const examReport = await request("/api/exam/report", jsonOptionsWithCookie(examPayload, guestCookie));
    assert.equal(examReport.response.status, 200, `${examContext} must submit through its bound objective attempts`);
    assert.equal(examReport.json.listening.correct, 1);
    assert.equal(examReport.json.reading.correct, 1);
    assertNoAnswerFields(examReport.json);
    const repeatedExamReport = await request("/api/exam/report", jsonOptionsWithCookie(examPayload, guestCookie));
    assert.equal(repeatedExamReport.response.status, 200, `${examContext} report retry must be idempotent`);
    assert.deepEqual(repeatedExamReport.json.listening, examReport.json.listening);
    assert.deepEqual(repeatedExamReport.json.reading, examReport.json.reading);
  }

  const spliceExamA = await startObjectiveExam("random-exam", listening.id, reading.id, guestCookie, `splice-a-${process.pid}`);
  const spliceExamB = await startObjectiveExam("random-exam", listening.id, reading.id, guestCookie, `splice-b-${process.pid}`);
  async function startSplicePaper(module, parent, suffix) {
    const task = module === "listening" ? listening : reading;
    return request("/api/objective/attempts", jsonOptionsWithCookie({
      clientAttemptKey: `splice-${suffix}-${module}-${process.pid}`,
      context: "random-exam",
      module,
      taskId: task.id,
      questionIds: module === "listening" ? fullListeningQuestionIds : fullReadingQuestionIds,
      examId: parent.examId,
      examToken: parent.examToken,
    }, guestCookie));
  }
  const splicedListening = await startSplicePaper("listening", spliceExamA, "a");
  const splicedReading = await startSplicePaper("reading", spliceExamB, "b");
  assert.equal(splicedListening.response.status, 201);
  assert.equal(splicedReading.response.status, 201);
  const splicedReport = await request("/api/exam/report", jsonOptionsWithCookie({
    examContext: "random-exam",
    listening: { attemptId: splicedListening.json.attemptId, attemptToken: splicedListening.json.attemptToken, answers: {} },
    reading: { attemptId: splicedReading.json.attemptId, attemptToken: splicedReading.json.attemptToken, answers: {} },
    writing: { tasks: [] },
    speaking: {},
  }, guestCookie));
  assert.equal(splicedReport.response.status, 409, "Papers from separate Random Exam generations must not be spliced");
  assert.equal(splicedReport.json.code, "objective_exam_mismatch");
  for (const attempt of [splicedListening.json, splicedReading.json]) {
    const review = await request(`/api/objective/attempts/${encodeURIComponent(attempt.attemptId)}/review`, {
      headers: { cookie: guestCookie, "x-objective-attempt": attempt.attemptToken },
    });
    assert.equal(review.response.status, 409, "Cross-generation rejection must leave both papers open");
  }

  const partialQuestion = listening.questions.find((question) => {
    const answer = String(sourceListening.questions.find((item) => item.id === question.id)?.answer || "");
    return answer.replace(/[^A-Za-z]/g, "").length >= 8;
  });
  assert.ok(partialQuestion, "A long canonical Listening answer is required for the strict matcher regression");
  const canonicalPartialAnswer = String(sourceListening.questions.find((item) => item.id === partialQuestion.id).answer);
  const unsafePrefix = canonicalPartialAnswer.replace(/[^\p{L}\p{N}\s]/gu, "").trim().slice(0, 4);
  const partialAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `strict-listening-${process.pid}`,
    context: "single",
    module: "listening",
    taskId: listening.id,
    questionIds: [partialQuestion.id],
  }, guestCookie));
  assert.equal(partialAttempt.response.status, 201);
  const partialScore = await request("/api/listening/score", jsonOptionsWithCookie({
    attemptId: partialAttempt.json.attemptId,
    attemptToken: partialAttempt.json.attemptToken,
    answers: { [partialQuestion.id]: unsafePrefix },
  }, guestCookie));
  assert.equal(partialScore.response.status, 200);
  assert.equal(partialScore.json.result.correct, 0, "A short substring must not match a longer canonical answer");
  assertNoAnswerFields(partialScore.json);

  const partialReview = await request(`/api/objective/attempts/${encodeURIComponent(partialAttempt.json.attemptId)}/review`, {
    headers: { cookie: guestCookie, "x-objective-attempt": partialAttempt.json.attemptToken },
  });
  assert.equal(partialReview.response.status, 200);
  assert.equal(partialReview.json.wrongAnswers.length, 1);
  assert.equal(partialReview.json.wrongAnswers[0].questionId, partialQuestion.id);
  assert.equal(partialReview.json.wrongAnswers[0].canonicalAnswer, canonicalPartialAnswer);

  const officialVariantCases = [
    { taskId: "cam4-l-test1", questionId: "q1", answer: "variety of shopping", label: "slash alternative" },
    { taskId: "cam4-l-test1", questionId: "q17", answer: "Workshop", label: "optional parenthetical token" },
    { taskId: "cam16-l-test1", questionId: "q40", answer: "practise", label: "official spelling variant" },
  ];
  for (const [index, fixture] of officialVariantCases.entries()) {
    const publicTask = tasks.json.listeningTests.find((task) => task.id === fixture.taskId);
    const privateTask = localSource.listeningTests.find((task) => task.id === fixture.taskId);
    const publicQuestion = publicTask?.questions?.find((question) => question.id === fixture.questionId);
    const privateQuestion = privateTask?.questions?.find((question) => question.id === fixture.questionId);
    assert.ok(publicQuestion && privateQuestion?.answer, `Missing ${fixture.label} fixture`);
    const attempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
      clientAttemptKey: `official-variant-${index}-${process.pid}`,
      context: "single",
      module: "listening",
      taskId: fixture.taskId,
      questionIds: [fixture.questionId],
    }, guestCookie));
    assert.equal(attempt.response.status, 201);
    const score = await request("/api/listening/score", jsonOptionsWithCookie({
      attemptId: attempt.json.attemptId,
      attemptToken: attempt.json.attemptToken,
      answers: { [fixture.questionId]: fixture.answer },
    }, guestCookie));
    assert.equal(score.response.status, 200);
    assert.equal(score.json.result.correct, 1, `${fixture.label} must match the supplied canonical alternatives`);
    assertNoAnswerFields(score.json);
  }

  const fractionTask = tasks.json.listeningTests.find((task) => task.id === "cam4-l-test3");
  const fractionQuestion = fractionTask?.questions?.find((question) => question.id === "q1");
  assert.ok(fractionQuestion, "Fraction answer fixture is required");
  const fractionAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `fraction-strict-${process.pid}`,
    context: "single",
    module: "listening",
    taskId: fractionTask.id,
    questionIds: [fractionQuestion.id],
  }, guestCookie));
  const fractionScore = await request("/api/listening/score", jsonOptionsWithCookie({
    attemptId: fractionAttempt.json.attemptId,
    attemptToken: fractionAttempt.json.attemptToken,
    answers: { [fractionQuestion.id]: "1" },
  }, guestCookie));
  assert.equal(fractionScore.response.status, 200);
  assert.equal(fractionScore.json.result.correct, 0, "A fraction slash must not be treated as an answer-alternative delimiter");

  const openAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    clientAttemptKey: `open-review-${process.pid}`,
    context: "single",
    module: "reading",
    taskId: reading.id,
    questionIds: [reading.questions[0].id],
  }, guestCookie));
  const prematureReview = await request(`/api/objective/attempts/${encodeURIComponent(openAttempt.json.attemptId)}/review`, {
    headers: { cookie: guestCookie, "x-objective-attempt": openAttempt.json.attemptToken },
  });
  assert.equal(prematureReview.response.status, 409, "Review must remain locked until submit atomically closes the attempt");
  assert.equal(prematureReview.json.code, "objective_attempt_not_submitted");

  const expiryStartPayload = {
    clientAttemptKey: `expired-reading-${process.pid}`,
    attemptToken: randomBytes(32).toString("base64url"),
    context: "single",
    module: "reading",
    taskId: reading.id,
    questionIds: [reading.questions[0].id],
  };
  const expiringAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie(expiryStartPayload, guestCookie));
  assert.equal(expiringAttempt.response.status, 201);
  const expiryDb = new DatabaseSync(databasePath);
  expiryDb.prepare("UPDATE objective_attempts SET expires_at = ? WHERE attempt_id = ?")
    .run(new Date(Date.now() - 60_000).toISOString(), expiringAttempt.json.attemptId);
  expiryDb.close();
  const expiredRetry = await request("/api/objective/attempts", jsonOptionsWithCookie(expiryStartPayload, guestCookie));
  assert.equal(expiredRetry.response.status, 410);
  assert.equal(expiredRetry.json.code, "objective_attempt_expired");
  assert.equal(expiredRetry.json.restartRequired, true);
  const expiredSubmit = await request("/api/reading/score", jsonOptionsWithCookie({
    attemptId: expiringAttempt.json.attemptId,
    attemptToken: expiringAttempt.json.attemptToken,
    answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
  }, guestCookie));
  assert.equal(expiredSubmit.response.status, 410, "Expired attempts cannot be submitted");
  assert.equal(expiredSubmit.json.restartRequired, true);
  const restartedAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie({
    ...expiryStartPayload,
    clientAttemptKey: `restarted-reading-${process.pid}`,
    attemptToken: randomBytes(32).toString("base64url"),
  }, guestCookie));
  assert.equal(restartedAttempt.response.status, 201, "A new client key must start cleanly after expiry");

  const handoffStartPayload = {
    clientAttemptKey: `guest-login-${process.pid}`,
    attemptToken: randomBytes(32).toString("base64url"),
    context: "single",
    module: "listening",
    taskId: listening.id,
    questionIds: [listening.questions[0].id],
  };
  const handoffAttempt = await request("/api/objective/attempts", jsonOptionsWithCookie(handoffStartPayload, guestCookie));
  assert.equal(handoffAttempt.response.status, 201);

  const username = `objective${process.pid}`.slice(0, 24);
  const registered = await request("/api/auth/register", jsonOptions({ username, password: "testing123" }));
  assert.equal(registered.response.status, 200);
  const userCookie = cookieFrom(registered.response);
  assert.match(userCookie, /^ieltsist_session=/);
  const signedInCookies = `${guestCookie}; ${userCookie}`;
  const handoffRetryAfterLogin = await request(
    "/api/objective/attempts",
    jsonOptionsWithCookie(handoffStartPayload, signedInCookies),
  );
  assert.equal(handoffRetryAfterLogin.response.status, 200, "Guest start retry after login must recover, not duplicate, the attempt");
  assert.equal(handoffRetryAfterLogin.json.attemptId, handoffAttempt.json.attemptId);
  assert.equal(handoffRetryAfterLogin.json.idempotent, true);
  const handoffScore = await request("/api/listening/score", jsonOptionsWithCookie({
    attemptId: handoffAttempt.json.attemptId,
    attemptToken: handoffAttempt.json.attemptToken,
    answers: { [listening.questions[0].id]: sourceListening.questions[0].answer },
  }, signedInCookies));
  assert.equal(handoffScore.response.status, 200, "Guest work must submit after login in the same browser");
  const handoffReview = await request(`/api/objective/attempts/${encodeURIComponent(handoffAttempt.json.attemptId)}/review`, {
    headers: { cookie: signedInCookies, "x-objective-attempt": handoffAttempt.json.attemptToken },
  });
  assert.equal(handoffReview.response.status, 200, "The claimed attempt must remain reviewable by its account");

  const foreignAttempt = await request("/api/objective/attempts", jsonOptions({
    clientAttemptKey: `foreign-guest-${process.pid}`,
    context: "single",
    module: "reading",
    taskId: reading.id,
    questionIds: [reading.questions[0].id],
  }));
  assert.equal(foreignAttempt.response.status, 201);
  const foreignCookie = cookieFrom(foreignAttempt.response);
  assert.notEqual(foreignCookie, guestCookie);
  const foreignTakeover = await request("/api/reading/score", jsonOptionsWithCookie({
    attemptId: foreignAttempt.json.attemptId,
    attemptToken: foreignAttempt.json.attemptToken,
    answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
  }, signedInCookies));
  assert.equal(foreignTakeover.response.status, 403, "A user session without the originating guest cookie cannot take over an attempt");
  assert.equal(foreignTakeover.json.code, "objective_attempt_forbidden");

  const wrongGuestTakeover = await request("/api/reading/score", jsonOptionsWithCookie({
    attemptId: foreignAttempt.json.attemptId,
    attemptToken: foreignAttempt.json.attemptToken,
    answers: { [reading.questions[0].id]: sourceReading.questions[0].answer },
  }, guestCookie));
  assert.equal(wrongGuestTakeover.response.status, 403, "Another guest cookie cannot take over an attempt even with its public id");
  assert.equal(wrongGuestTakeover.json.code, "objective_attempt_forbidden");

  const legacy = await request("/api/listening/score", jsonOptions({
    questions: [{ id: "q1", answer: sourceListening.questions[0].answer }],
    answers: { q1: sourceListening.questions[0].answer },
  }));
  assert.equal(legacy.response.status, 409, "Scoring must reject client-supplied answer keys without an attempt");
  assert.equal(legacy.json.code, "objective_attempt_required");
  const serverSource = await readFile(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(serverSource, /scoreObjectiveSubmission\(/, "No legacy/full-exam call site may retain bare task-id scoring");
  const frontendSource = await readFile(path.join(root, "public", "app.js"), "utf8");
  assert.match(frontendSource, /postJson\("\/api\/objective\/attempts"/, "The browser must start a bound objective attempt before scoring");
  assert.match(frontendSource, /"x-objective-attempt"/, "The browser must use the submitted-attempt capability for answer review");
  assert.doesNotMatch(frontendSource, /\b(?:item|detail)\.expected\b/, "The browser must not expect canonical answers in the score response");
  assert.match(frontendSource, /examContext:\s*prefixRoot === "sequence" \? "same-test" : "random-exam"/, "Full reports must send their bound exam context");
  console.log("Objective scoring security contract passed: attempt-gated submit, immutable idempotency, strict matching, and post-submit review boundaries.");
} finally {
  if (child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
}
