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
  wordCount: (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length,
});
for (const name of ["parseWritingPayload", "roundWritingScore", "writingAnalysisScore", "serverWritingEvidence", "composeWeightedWritingScore"]) {
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

const speakingRenderer = functionSource(app, "renderSpeakingResultHtml");
assert.match(speakingRenderer, /audioAiUsed\s*===\s*true/);
assert.match(speakingRenderer, /audioAnalysis\?\.status\s*===\s*"succeeded"/);
assert.match(speakingRenderer, /audioSucceeded\s*&&\s*Array\.isArray/);

const speakingRecord = functionSource(app, "buildSpeakingResultRecord");
assert.ok(
  speakingRecord.indexOf("normalizeSpeakingBand(json.band)") < speakingRecord.indexOf("speakingOverallFromCriteria(criteria)"),
  "Speaking result must prefer the backend canonical band",
);
assert.match(app, /function setUnifiedPracticeStage\(/, "Writing and Speaking need one shared stage model");

console.log("PASS Writing/Speaking scoring and evidence contract");
