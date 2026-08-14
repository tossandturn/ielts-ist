import assert from "node:assert/strict";
import crypto from "node:crypto";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

function functionSource(source, name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing ${name}()`);
  const closeParams = source.indexOf(")", match.index);
  const open = source.indexOf("{", closeParams);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
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
    if (char === "}" && --depth === 0) return source.slice(match.index, index + 1);
  }
  throw new Error(`Could not parse ${name}()`);
}

const context = vm.createContext({
  crypto,
  WRITING_AI_MODEL: "contract-test",
  WRITING_SCORING_PROMPT_VERSION: "ielts-writing-rubric.v2",
  SPEAKING_SCORING_PROMPT_VERSION: "ielts-speaking-rubric.v2",
  wordCount: (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length,
});
for (const name of [
  "parseWritingPayload",
  "roundWritingScore",
  "writingAnalysisScore",
  "writingBandNumber",
  "writingEvidenceFromEssay",
  "parseWritingAnalysisJson",
  "normalizeWritingAnalysis",
  "serverWritingEvidence",
  "composeWeightedWritingScore",
  "speakingBandNumber",
  "parseSpeakingAssessmentJson",
  "normalizeSpeakingAssessment",
  "buildSpeakingScoringContract",
]) {
  vm.runInContext(functionSource(server, name), context);
}

assert.throws(
  () => vm.runInContext("parseWritingPayload", context)({ items: [{ prompt: "Task 1", essay: "Only one response" }] }),
  (error) => error?.statusCode === 422,
  "A full Writing attempt missing Task 2 must return 422",
);

const items = [
  { id: "task1", taskNumber: 1, kind: "academic-task-1", prompt: "Describe the chart.", essay: "The chart rose steadily during the period." },
  { id: "task2", taskNumber: 2, kind: "task-2", prompt: "Discuss both views.", essay: "Public transport should improve because it reduces congestion in cities." },
];
const rubricEssay = [
  "Public transport should improve because it reduces congestion in cities.",
  "Clear investment also makes commuting safer and more reliable for workers.",
].join(" ");
const rubricAnalysis = vm.runInContext("normalizeWritingAnalysis", context)(JSON.stringify({
  confidence: "high",
  criteria: [
    { label: "Task Response", score: 7, feedback: "The position is clear.", evidence: "Public transport should improve because it reduces congestion in cities.", bandRationale: "The response directly addresses the task." },
    { label: "Coherence & Cohesion", score: 6, feedback: "The progression is generally clear.", evidence: "Clear investment also makes commuting safer and more reliable for workers.", bandRationale: "The two ideas follow a clear sequence." },
    { label: "Lexical Resource", score: 6, feedback: "Topic vocabulary is relevant.", evidence: "reduces congestion in cities", bandRationale: "Vocabulary is accurate but not yet flexible." },
    { label: "Grammatical Range & Accuracy", score: 6, feedback: "Sentences are controlled.", evidence: "Clear investment also makes commuting safer and more reliable for workers.", bandRationale: "Complex language is limited but accurate." },
  ],
}), "Discuss public transport.", rubricEssay);
assert.equal(rubricAnalysis.confidence, "high", "Writing must expose the scorer confidence");
assert.equal(rubricAnalysis.reviewRequired, false, "High-confidence evidence-backed scoring should not be incorrectly flagged for review");
assert.equal(rubricAnalysis.criteria[0].bandRationale, "The response directly addresses the task.");
const rubricEvidence = vm.runInContext("serverWritingEvidence", context)(
  { id: "task2", essay: rubricEssay },
  rubricAnalysis,
);
assert.equal(rubricEvidence.length, 4, "Each Writing rubric criterion needs an exact student-evidence range");
for (const evidence of rubricEvidence) {
  const source = rubricEssay.slice(evidence.range.start, evidence.range.end);
  assert.equal(source, evidence.quote, `${evidence.id} must point to exact submitted writing`);
  assert.ok(evidence.criterionKey, "Writing evidence must identify its rubric criterion");
}
const criteria = (score) => [
  { label: "Task Response", score, feedback: "criterion feedback" },
  { label: "Coherence & Cohesion", score, feedback: "criterion feedback" },
  { label: "Lexical Resource", score, feedback: "criterion feedback" },
  { label: "Grammatical Range & Accuracy", score, feedback: "criterion feedback" },
];
const results = [
  { analysis: { criteria: criteria(5), highestImpact: { criterion: "Task Achievement", evidence: "rose steadily", issue: "Overview is incomplete." } }, feedback: "Task 1" },
  { analysis: { criteria: criteria(7), highestImpact: { criterion: "Task Response", evidence: "reduces congestion", issue: "Example needs detail." } }, feedback: "Task 2" },
];
const contract = vm.runInContext("composeWeightedWritingScore", context)(items, results);
assert.equal(contract.schemaVersion, "scoring.v2");
assert.equal(contract.score.tasks[0].overall, 5);
assert.equal(contract.score.tasks[1].overall, 7);
assert.equal(contract.score.overall.value, 6.5, "Task 2 must carry double weight");
for (const evidence of contract.evidence) {
  const source = items.find((item) => item.id === evidence.itemId)?.essay || "";
  assert.equal(source.slice(evidence.range.start, evidence.range.end), evidence.quote, `${evidence.id} must point to exact source text`);
}

const rewriteHandler = functionSource(server, "handleWritingRewrite");
assert.match(rewriteHandler, /scope:\s*"paragraph-skill-check"/);
assert.match(rewriteHandler, /updatesIeltsBand:\s*false/);

const singleContract = functionSource(server, "buildSingleWritingContract");
assert.match(singleContract, /scope:\s*"single-task"/);
assert.match(singleContract, /schemaVersion:\s*"scoring\.v2"/);
assert.doesNotMatch(singleContract, /weighting:\s*\{\s*task1/, "A custom single task must not masquerade as a complete weighted Writing test");

const speakingTranscript = "I enjoy visiting local parks because they are quiet and I can meet friends there.";
const speakingAssessment = vm.runInContext("normalizeSpeakingAssessment", context)({
  criteria: [
    { key: "fc", score: 6, evidence: "I enjoy visiting local parks", feedback: "The answer is clear.", bandRationale: "Ideas are extended with a reason." },
    { key: "lr", score: 6, evidence: "quiet and I can meet friends", feedback: "Vocabulary is relevant.", bandRationale: "Vocabulary is appropriate but limited." },
    { key: "gra", score: 6, evidence: "because they are quiet", feedback: "Grammar is controlled.", bandRationale: "There is a clear complex clause." },
    { key: "pronunciation", score: 6, evidence: "The attached audio is generally clear.", feedback: "Speech is understandable.", bandRationale: "Audio evidence supports intelligibility." },
  ],
  confidence: "high",
}, { scope: "full", audioUsed: true });
const speakingContract = vm.runInContext("buildSpeakingScoringContract", context)(
  speakingAssessment,
  speakingTranscript,
  { model: "speaking-contract-test", promptVersion: "ielts-speaking-rubric.v2", audioUsed: true },
);
assert.equal(speakingContract.score.criteria.length, 4, "Speaking must keep all four IELTS criteria");
assert.equal(speakingContract.review.required, false, "A full, high-confidence, audio-backed speaking assessment should not require review");
assert.equal(speakingContract.provenance.promptVersion, "ielts-speaking-rubric.v2");
assert.equal(speakingContract.provenance.model, "speaking-contract-test");
for (const criterion of speakingContract.score.criteria) {
  assert.ok(criterion.bandRationale, `${criterion.label} must retain its IELTS band rationale`);
  assert.ok(criterion.evidenceIds.length === 1, `${criterion.label} must expose one evidence record`);
}
const transcriptEvidence = speakingContract.evidence.filter((item) => item.kind === "transcript-range");
assert.equal(transcriptEvidence.length, 3, "Only exact transcript evidence may claim a text range");
for (const evidence of transcriptEvidence) {
  assert.equal(speakingTranscript.slice(evidence.range.start, evidence.range.end), evidence.quote);
}
assert.equal(
  speakingContract.evidence.find((item) => item.criterionKey === "pronunciation")?.kind,
  "examiner-observation",
  "Audio-only evidence must not be falsely presented as an ASR transcript range",
);

const speakingRenderer = functionSource(app, "renderSpeakingResultHtml");
assert.match(speakingRenderer, /audioAiUsed\s*===\s*true/);
assert.match(speakingRenderer, /audioAnalysis\?\.status\s*===\s*"succeeded"/);
assert.match(speakingRenderer, /audioSucceeded\s*&&\s*Array\.isArray/);
assert.match(speakingRenderer, /serverContract\?\.evidence/);
assert.match(speakingRenderer, /serverContract\?\.review/);

const speakingRecord = functionSource(app, "buildSpeakingResultRecord");
assert.ok(
  speakingRecord.indexOf("normalizeSpeakingBand(json.band)") < speakingRecord.indexOf("speakingOverallFromCriteria(criteria)"),
  "Speaking result must prefer the backend canonical band",
);
assert.match(app, /function setUnifiedPracticeStage\(/, "Writing and Speaking need one shared stage model");

const writingRenderer = functionSource(app, "renderWritingReportHtml");
assert.match(writingRenderer, /json\?\.contract\?\.score\?\.criteria/);
assert.match(writingRenderer, /bandRationale/);
assert.match(writingRenderer, /json\?\.review|json\?\.contract\?\.review/);

console.log("PASS Writing/Speaking scoring and evidence contract");
