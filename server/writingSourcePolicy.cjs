const crypto = require("node:crypto");

const WRITING_SOURCE_SCHEMA_VERSION = "ielts-writing-source-v1";

// These source records remain in the imported bank for audit/history, but are
// not authoritative enough to grade until an independent review records the
// exact corrected SHA-256 in this manifest. A later source drift automatically
// returns the record to pending-review.
const WRITING_SOURCE_REVIEWS = Object.freeze({
  "cam7-w-test1-task1": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test1-task2": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test2-task1": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test2-task2": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test3-task1": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test3-task2": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test4-task1": Object.freeze({ reviewedRevision: null, source: null }),
  "cam7-w-test4-task2": Object.freeze({ reviewedRevision: null, source: null }),
});

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

function writingPrompt(value, id) {
  const source = String(value || "");
  const task = String(id || "").match(/^cam\d+-w-test\d+-task([12])$/);
  if (!task) return source;
  const end = new RegExp(`Write at least\\s+${task[1] === "1" ? "150" : "250"}\\s+words\\.?`, "i").exec(source);
  return (end ? source.slice(0, end.index + end[0].length) : source)
    .replace(/^\s*\|\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function writingSourceRevision(task = {}) {
  const id = String(task.id || task.sourceTaskId || "");
  const taskNumber = Number(id.match(/-task([12])$/)?.[1] || task.taskNumber || 0);
  const prompt = writingPrompt(
    task.prompt || task.data || (taskNumber ? `IELTS Writing Task ${taskNumber}. Use the attached original question.` : ""),
    id,
  );
  const writingPageImages = (Array.isArray(task.writingPageImages) ? task.writingPageImages : [])
    .map((image) => ({ page: Number(image?.page) || null, url: String(image?.url || "") }))
    .filter((image) => image.url);
  const canonical = {
    schemaVersion: WRITING_SOURCE_SCHEMA_VERSION,
    id,
    taskNumber,
    prompt,
    data: String(task.data || ""),
    visual: task.visual || null,
    sourceUrl: String(task.sourceUrl || ""),
    writingPageImages,
  };
  return crypto.createHash("sha256").update(stableJson(canonical), "utf8").digest("hex");
}

function manifestRevision(entry) {
  const value = entry && typeof entry === "object" ? entry.reviewedRevision : entry;
  return /^[a-f0-9]{64}$/.test(String(value || "")) ? String(value) : "";
}

function writingSourceTask(task, { reviewedRevisions = WRITING_SOURCE_REVIEWS } = {}) {
  const id = String(task?.id || task?.sourceTaskId || "");
  const entry = reviewedRevisions && Object.prototype.hasOwnProperty.call(reviewedRevisions, id)
    ? reviewedRevisions[id]
    : null;
  const source = entry && typeof entry === "object" && entry.source && typeof entry.source === "object"
    ? entry.source
    : null;
  if (!source) return task;
  const { id: _ignoredId, module: _ignoredModule, ...replacement } = source;
  return { ...task, ...replacement, id, module: task?.module || "writing" };
}

function writingSourceDescriptor(task, { reviewedRevisions = WRITING_SOURCE_REVIEWS } = {}) {
  const id = String(task?.id || task?.sourceTaskId || "");
  const sourceRevision = writingSourceRevision(writingSourceTask(task, { reviewedRevisions }));
  const requiresRevision = Object.prototype.hasOwnProperty.call(reviewedRevisions || {}, id);
  const reviewedRevision = requiresRevision ? manifestRevision(reviewedRevisions[id]) : "";
  return {
    sourceAvailability: requiresRevision && reviewedRevision !== sourceRevision ? "pending-review" : "ready",
    sourceRevision,
    requiresRevision,
  };
}

function writingSourcePublicMetadata(task, options) {
  const descriptor = writingSourceDescriptor(task, options);
  return {
    sourceAvailability: descriptor.sourceAvailability,
    sourceRevision: descriptor.sourceRevision,
  };
}

function sourcePolicyError(code, descriptor, sourceTaskId) {
  const reviewRequired = code === "writing_source_review_required";
  const error = new Error(reviewRequired
    ? "The selected Writing source is awaiting independent review. Your essay has been preserved and has not been graded."
    : "The selected Writing source has changed since it was opened. Your essay has been preserved and has not been graded. Reload the task and review your response before submitting again.");
  error.statusCode = 409;
  error.code = code;
  error.publicDetails = {
    sourceTaskId,
    sourceAvailability: descriptor.sourceAvailability,
    sourceRevision: descriptor.sourceRevision,
  };
  return error;
}

function assertWritingSourceSubmission(task, requestedRevision, options) {
  const descriptor = writingSourceDescriptor(task, options);
  const sourceTaskId = String(task?.id || task?.sourceTaskId || "");
  if (descriptor.sourceAvailability !== "ready") {
    throw sourcePolicyError("writing_source_review_required", descriptor, sourceTaskId);
  }
  const suppliedRevision = String(requestedRevision || "").trim();
  if ((descriptor.requiresRevision && !suppliedRevision) || (suppliedRevision && suppliedRevision !== descriptor.sourceRevision)) {
    throw sourcePolicyError("writing_source_changed", descriptor, sourceTaskId);
  }
  return descriptor;
}

const WRITING_SOURCE_POLICY_VERSION = crypto.createHash("sha256")
  .update(`${WRITING_SOURCE_SCHEMA_VERSION}|${stableJson(WRITING_SOURCE_REVIEWS)}`, "utf8")
  .digest("hex");

module.exports = {
  WRITING_SOURCE_POLICY_VERSION,
  WRITING_SOURCE_REVIEWS,
  assertWritingSourceSubmission,
  writingPrompt,
  writingSourceDescriptor,
  writingSourcePublicMetadata,
  writingSourceRevision,
  writingSourceTask,
};
