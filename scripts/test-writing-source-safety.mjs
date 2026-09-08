import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import {
  WRITING_SOURCE_REVIEWS,
  assertWritingSourceSubmission,
  writingSourceDescriptor,
  writingSourceRevision,
  writingSourceTask,
} from "../server/writingSourcePolicy.cjs";
import { bindWritingSource, resolveWritingSource } from "../server/nativeWritingSource.cjs";
import { buildNativeCatalog, nativeTaskDetail } from "../server/nativeIeltsCatalog.cjs";

const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");

function functionSource(text, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(text);
  assert.ok(match, `Missing ${name}()`);
  const closeParams = text.indexOf(")", match.index);
  const open = text.indexOf("{", closeParams);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return text.slice(match.index, index + 1);
  }
  throw new Error(`Could not parse ${name}()`);
}

const task = (id, prompt, page = 1) => ({
  id,
  module: "writing",
  type: /task1$/.test(id) ? "Task 1" : "Task 2",
  title: id,
  source: "Cambridge fixture",
  sourceUrl: "/cambridge-local/file/fixture-pdf",
  prompt,
  writingPageImages: [{ page, url: `/generated/writing-pages/${id}/page-${page}.webp` }],
});

const unsafeTask1 = task("cam7-w-test1-task1", "Known unreviewed Cambridge 7 Task 1 source.", 34);
const unsafeTask2 = task("cam7-w-test1-task2", "Known unreviewed Cambridge 7 Task 2 source.", 35);
const readyTask1 = task("cam15-w-test1-task1", "Verified chart question. Write at least 150 words.", 10);
const readyTask2 = task("cam15-w-test1-task2", "Verified discussion question. Write at least 250 words.", 11);
const otherTask2 = task("cam16-w-test2-task2", "Another verified discussion question. Write at least 250 words.", 12);

assert.deepEqual(
  Object.keys(WRITING_SOURCE_REVIEWS).sort(),
  Array.from({ length: 4 }, (_, index) => [
    `cam7-w-test${index + 1}-task1`,
    `cam7-w-test${index + 1}-task2`,
  ]).flat().sort(),
  "The eight Cambridge 7 Writing records must be isolated in the review manifest without deleting them",
);

for (const id of Object.keys(WRITING_SOURCE_REVIEWS)) {
  const descriptor = writingSourceDescriptor(task(id, `Current unsafe fixture for ${id}`));
  assert.equal(descriptor.sourceAvailability, "pending-review", `${id} must fail closed before independent review`);
  assert.match(descriptor.sourceRevision, /^[a-f0-9]{64}$/);
}

const readyDescriptor = writingSourceDescriptor(readyTask1);
assert.equal(readyDescriptor.sourceAvailability, "ready");
assert.match(readyDescriptor.sourceRevision, /^[a-f0-9]{64}$/);
assert.notEqual(writingSourceRevision({ ...readyTask1, prompt: `Corrected source. ${readyTask1.prompt}` }), readyDescriptor.sourceRevision);
assert.notEqual(writingSourceRevision({ ...readyTask1, writingPageImages: [{ page: 10, url: "/generated/writing-pages/revised.webp" }] }), readyDescriptor.sourceRevision);

const reviewedRevisions = { [unsafeTask1.id]: writingSourceRevision(unsafeTask1) };
const reviewedDescriptor = writingSourceDescriptor(unsafeTask1, { reviewedRevisions });
assert.equal(reviewedDescriptor.sourceAvailability, "ready", "A reviewed source becomes ready only at its exact reviewed SHA-256");
assert.equal(reviewedDescriptor.requiresRevision, true, "Previously quarantined sources must never accept revision-less legacy drafts after review");
assert.throws(
  () => assertWritingSourceSubmission(unsafeTask1, "", { reviewedRevisions }),
  (error) => error.statusCode === 409
    && error.code === "writing_source_changed"
    && error.publicDetails?.sourceRevision === reviewedDescriptor.sourceRevision,
);
assert.doesNotThrow(() => assertWritingSourceSubmission(unsafeTask1, reviewedDescriptor.sourceRevision, { reviewedRevisions }));
assert.equal(
  writingSourceDescriptor({ ...unsafeTask1, prompt: `${unsafeTask1.prompt} unexpected drift` }, { reviewedRevisions }).sourceAvailability,
  "pending-review",
  "Any post-review source drift must automatically quarantine the source again",
);

const rawSourceSnapshot = structuredClone(unsafeTask1);
const correctedSource = {
  prompt: "Independently verified Cambridge 7 Task 1 prompt. Write at least 150 words.",
  writingPageImages: [{ page: 34, url: "/generated/writing-pages-reviewed/cam7/test1/task1/page-34.webp" }],
};
const correctedCandidate = { ...unsafeTask1, ...correctedSource };
const reviewedOverlay = {
  [unsafeTask1.id]: {
    source: correctedSource,
    reviewedRevision: writingSourceRevision(correctedCandidate),
  },
};
const publishedCorrection = writingSourceTask(unsafeTask1, { reviewedRevisions: reviewedOverlay });
assert.equal(writingSourceDescriptor(unsafeTask1, { reviewedRevisions: reviewedOverlay }).sourceAvailability, "ready");
assert.equal(publishedCorrection.prompt, correctedSource.prompt);
assert.deepEqual(publishedCorrection.writingPageImages, correctedSource.writingPageImages);
assert.deepEqual(unsafeTask1, rawSourceSnapshot, "A reviewed overlay must not overwrite the imported historical source record");
assert.notStrictEqual(publishedCorrection, unsafeTask1);

let imageCalls = 0;
const sourceOptions = (tasks, extra = {}) => ({
  findTask: (id) => tasks.find((item) => item.id === id) || null,
  loadImage: () => {
    imageCalls += 1;
    return "data:image/webp;base64,fixture";
  },
  ...extra,
});
const preservedDraft = {
  id: unsafeTask1.id,
  sourceRevision: writingSourceRevision(unsafeTask1),
  prompt: "forged prompt",
  essay: "A student's preserved draft.",
};
const preservedSnapshot = structuredClone(preservedDraft);
assert.throws(
  () => bindWritingSource(preservedDraft, sourceOptions([unsafeTask1])),
  (error) => error.statusCode === 409
    && error.code === "writing_source_review_required"
    && error.publicDetails?.sourceTaskId === unsafeTask1.id
    && error.publicDetails?.sourceAvailability === "pending-review"
    && /^[a-f0-9]{64}$/.test(error.publicDetails?.sourceRevision || ""),
);
assert.equal(imageCalls, 0, "A pending source must be rejected before any original question image is loaded");
assert.deepEqual(preservedDraft, preservedSnapshot, "Rejecting a source must not alter or delete the student's draft");

const legacyBound = bindWritingSource({ id: readyTask1.id, prompt: "forged", essay: "Legacy draft" }, sourceOptions([readyTask1]));
assert.equal(legacyBound.prompt, readyTask1.prompt, "Legacy calls for unaffected ready tasks still bind the canonical server prompt");
assert.equal(legacyBound.sourceAvailability, "ready");
assert.equal(legacyBound.sourceRevision, readyDescriptor.sourceRevision);
assert.equal(imageCalls, 1);

const matched = bindWritingSource(
  { id: readyTask1.id, sourceRevision: readyDescriptor.sourceRevision, prompt: "forged", essay: "Versioned draft" },
  sourceOptions([readyTask1]),
);
assert.equal(matched.sourceRevision, readyDescriptor.sourceRevision);
assert.equal(imageCalls, 2);
assert.throws(
  () => bindWritingSource(
    { id: readyTask1.id, sourceRevision: "0".repeat(64), prompt: "forged", essay: "Stale draft" },
    sourceOptions([readyTask1]),
  ),
  (error) => error.statusCode === 409
    && error.code === "writing_source_changed"
    && error.publicDetails?.sourceRevision === readyDescriptor.sourceRevision,
);
assert.equal(imageCalls, 2, "A stale revision must be rejected before any original question image is loaded");

const resolved = resolveWritingSource(
  { id: readyTask1.id, sourceRevision: readyDescriptor.sourceRevision },
  sourceOptions([readyTask1]),
);
assert.equal(resolved.descriptor.sourceRevision, readyDescriptor.sourceRevision);

const catalog = buildNativeCatalog({
  listeningTests: [], readingTests: [], speakingSets: [], writingTasks: [unsafeTask1, readyTask1],
});
const pendingIndex = catalog.writingTasks.find((item) => item.id === unsafeTask1.id);
const readyIndex = catalog.writingTasks.find((item) => item.id === readyTask1.id);
assert.equal(pendingIndex.sourceAvailability, "pending-review");
assert.match(pendingIndex.sourceRevision, /^[a-f0-9]{64}$/);
assert.equal(readyIndex.sourceAvailability, "ready");
const detail = nativeTaskDetail({ writingTasks: [unsafeTask1], listeningTests: [], readingTests: [], speakingSets: [] }, "writing", unsafeTask1.id);
assert.equal(detail.sourceAvailability, "pending-review");
assert.equal(detail.sourceRevision, pendingIndex.sourceRevision);

const parseContext = vm.createContext({
  bindWritingSource,
  resolveWritingSource,
  realWritingTasks: () => [unsafeTask1, unsafeTask2, readyTask1, readyTask2, otherTask2],
  imageEvidence: (value) => value,
  sourceImage: () => {
    imageCalls += 1;
    return "data:image/webp;base64,fixture";
  },
  path: { join: () => "fixture-public" },
  __dirname: "fixture-root",
});
vm.runInContext(`${functionSource(source, "parseWritingPayload")};this.parseWritingPayload=parseWritingPayload;`, parseContext);

const pendingPair = {
  items: [unsafeTask1, unsafeTask2].map((item, index) => ({
    id: item.id,
    taskNumber: index + 1,
    sourceRevision: writingSourceRevision(item),
    prompt: item.prompt,
    essay: `Preserved Task ${index + 1} essay`,
  })),
};
let providerCalls = 0;
assert.throws(
  () => {
    const parsed = parseContext.parseWritingPayload(pendingPair);
    providerCalls += 1;
    return parsed;
  },
  (error) => error.code === "writing_source_review_required",
);
assert.equal(providerCalls, 0, "A pending pair must never reach the scoring provider");
assert.equal(imageCalls, 2, "A pending pair must not add any source-image reads");

const readyPair = [readyTask1, readyTask2].map((item, index) => ({
  id: item.id,
  taskNumber: index + 1,
  sourceRevision: writingSourceRevision(item),
  prompt: item.prompt,
  essay: `Ready Task ${index + 1} essay`,
}));
const parsedPair = parseContext.parseWritingPayload({ items: readyPair });
assert.deepEqual(parsedPair.items.map((item) => item.sourceRevision), readyPair.map((item) => item.sourceRevision));

const beforeMixedImages = imageCalls;
assert.throws(
  () => parseContext.parseWritingPayload({
    items: [readyPair[0], {
      id: otherTask2.id,
      taskNumber: 2,
      sourceRevision: writingSourceRevision(otherTask2),
      prompt: otherTask2.prompt,
      essay: "Wrong-test Task 2 essay",
    }],
  }),
  (error) => error.statusCode === 422,
  "Same-Test source validation must not be bypassed by individually valid revisions",
);
assert.equal(imageCalls, beforeMixedImages, "A mixed-source pair must fail before loading either task image");

const fullExamContext = vm.createContext({
  resolveWritingSource,
  realWritingTasks: () => [unsafeTask1, unsafeTask2, readyTask1, readyTask2, otherTask2],
});
vm.runInContext(`${functionSource(source, "validateFullExamWritingSources")};this.validateFullExamWritingSources=validateFullExamWritingSources;`, fullExamContext);
assert.throws(
  () => fullExamContext.validateFullExamWritingSources({
    examContext: "same-test",
    fullExamManifest: { writingSourceIds: [unsafeTask1.id, unsafeTask2.id] },
    writing: { tasks: [unsafeTask1, unsafeTask2].map((item) => ({ sourceId: item.id, sourceRevision: writingSourceRevision(item) })) },
  }),
  (error) => error.code === "writing_source_review_required",
  "The full-exam report path must not bypass the Cambridge source review gate",
);
assert.doesNotThrow(() => fullExamContext.validateFullExamWritingSources({
  examContext: "same-test",
  fullExamManifest: { writingSourceIds: [readyTask1.id, readyTask2.id] },
  writing: { tasks: [{ sourceId: readyTask1.id }, { sourceId: readyTask2.id }] },
}), "Unaffected legacy same-test reports remain compatible without a revision");
assert.throws(
  () => fullExamContext.validateFullExamWritingSources({
    examContext: "same-test",
    fullExamManifest: { writingSourceIds: [readyTask1.id, otherTask2.id] },
    writing: { tasks: [{ sourceId: readyTask1.id }, { sourceId: otherTask2.id }] },
  }),
  (error) => error.statusCode === 422,
  "Same-Test reports require Task 1 and Task 2 from the same source test",
);
assert.doesNotThrow(() => fullExamContext.validateFullExamWritingSources({
  examContext: "random-exam",
  fullExamManifest: { writingSourceIds: [readyTask1.id, otherTask2.id] },
  writing: { tasks: [{ sourceId: readyTask1.id }, { sourceId: otherTask2.id }] },
}), "Random exams may use reviewed Task 1 and Task 2 from different tests");
assert.throws(
  () => fullExamContext.validateFullExamWritingSources({
    examContext: "same-test",
    fullExamManifest: { writingSourceIds: [readyTask1.id, readyTask2.id] },
    writing: {
      feedbackJobIds: ["job-1", "job-2"],
      tasks: [
        { id: readyTask1.id, sourceRevision: readyDescriptor.sourceRevision },
        { id: readyTask2.id, sourceRevision: writingSourceRevision(readyTask2) },
      ],
    },
  }, {
    native: true,
    getJob: (id) => ({ sourceRevisions: [id === "job-1" ? "0".repeat(64) : writingSourceRevision(readyTask2)] }),
  }),
  (error) => error.code === "writing_source_changed",
  "Native full-exam validation must use the owned grading job revision, not a client-asserted revision",
);

const fullExamHandler = functionSource(source, "handleFullExam");
assert.ok(fullExamHandler.indexOf("requireUser(req)") < fullExamHandler.indexOf("validateFullExamWritingSources"), "Native authentication must precede source-revision checks");
assert.ok(fullExamHandler.indexOf("validateFullExamWritingSources") < fullExamHandler.indexOf("submitObjectiveAttemptPair"), "Source rejection must precede objective-attempt mutations");
assert.ok(fullExamHandler.indexOf("validateFullExamWritingSources") < fullExamHandler.indexOf("callOpenAI"), "Source rejection must precede the full-exam provider");
let objectiveSubmissions = 0;
let fullExamProviderCalls = 0;
const fullExamRuntime = vm.createContext({
  readBody: async () => JSON.stringify({
    examContext: "same-test",
    fullExamManifest: { writingSourceIds: [unsafeTask1.id, unsafeTask2.id] },
    writing: { tasks: [unsafeTask1, unsafeTask2].map((item) => ({ sourceId: item.id, sourceRevision: writingSourceRevision(item) })) },
  }),
  objectiveAttemptError: (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code }),
  requireUser: () => ({ id: 1 }),
  validateFullExamWritingSources: fullExamContext.validateFullExamWritingSources,
  writingFeedbackJobs: new Map(),
  nativeExamWriting: () => { throw new Error("must not prepare unsafe Writing"); },
  submitObjectiveAttemptPair: () => { objectiveSubmissions += 1; },
  callOpenAI: async () => { fullExamProviderCalls += 1; },
});
vm.runInContext(`${fullExamHandler};this.handleFullExam=handleFullExam;`, fullExamRuntime);
await assert.rejects(
  () => fullExamRuntime.handleFullExam({ headers: {} }, {}),
  (error) => error.code === "writing_source_review_required",
);
assert.equal(objectiveSubmissions, 0, "A full-exam source rejection must happen before objective attempts are submitted");
assert.equal(fullExamProviderCalls, 0, "A full-exam source rejection must happen before the provider is called");

let jobSets = 0;
let buildCalls = 0;
const startContext = vm.createContext({
  cleanupWritingFeedbackJobs: () => {},
  optionalUser: () => null,
  requireUser: () => ({ id: 1 }),
  readBody: async () => JSON.stringify(pendingPair),
  parseWritingPayload: parseContext.parseWritingPayload,
  writingFeedbackJobs: {
    values: () => [][Symbol.iterator](),
    set: () => { jobSets += 1; },
  },
  buildWritingPayloadResult: async () => { buildCalls += 1; },
  crypto: { randomUUID: () => "should-not-be-created" },
  sendJson: () => {},
});
vm.runInContext(`${functionSource(source, "handleWritingJobStart")};this.handleWritingJobStart=handleWritingJobStart;`, startContext);
await assert.rejects(
  () => startContext.handleWritingJobStart({ headers: {} }, {}),
  (error) => error.code === "writing_source_review_required",
);
assert.equal(jobSets, 0, "A rejected source must not create a Writing feedback job");
assert.equal(buildCalls, 0, "A rejected source must not call the scoring pipeline/provider");

console.log("PASS Writing source safety: review quarantine, 64-hex revision binding, legacy compatibility, no pre-rejection image/provider/job calls, and Same-Test isolation.");
