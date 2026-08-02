import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");

function functionSource(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing function ${name}`);
  const start = match.index;
  const remaining = source.slice(start + match[0].length);
  const next = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(remaining);
  return source.slice(start, next ? start + match[0].length + next.index : source.length);
}

const requiredAppFunctions = [
  "speakingPracticeScopeConfig",
  "qwenSpeakingScope",
  "qwenSpeakingTargetMs",
  "qwenSpeakingCountdownState",
  "qwenRecentQuestionLedger",
  "qwenRememberRecentQuestion",
];
for (const name of requiredAppFunctions) functionSource(app, name);

const scopeCode = [
  functionSource(app, "speakingPracticeScopeConfig"),
  functionSource(app, "qwenSpeakingCountdownState"),
].join("\n");
const scopeContext = { Math };
vm.createContext(scopeContext);
vm.runInContext(`${scopeCode}\nthis.result = {
  full: speakingPracticeScopeConfig("full"),
  p1: speakingPracticeScopeConfig("part1"),
  p2: speakingPracticeScopeConfig("part2"),
  p3: speakingPracticeScopeConfig("part3"),
  countdown: qwenSpeakingCountdownState(180_000, 61_000),
};`, scopeContext);
assert.equal(scopeContext.result.full.targetMs, 15 * 60 * 1000);
assert.deepEqual([...scopeContext.result.full.parts], ["part1", "part2", "part3"]);
assert.equal(scopeContext.result.p1.targetMs, 5 * 60 * 1000);
assert.deepEqual([...scopeContext.result.p1.parts], ["part1"]);
assert.equal(scopeContext.result.p2.targetMs, 3 * 60 * 1000);
assert.deepEqual([...scopeContext.result.p2.parts], ["part2"]);
assert.equal(scopeContext.result.p3.targetMs, 5 * 60 * 1000);
assert.deepEqual([...scopeContext.result.p3.parts], ["part3"]);
assert.equal(scopeContext.result.countdown.label, "01:59");
assert.equal(scopeContext.result.countdown.expired, false);

const scheduleContext = {};
vm.createContext(scheduleContext);
vm.runInContext(`
  const sessions = new Map();
  function qwenSession(prefix) { return sessions.get(prefix); }
  function qwenBuildSpeakingPlan() { return { title: "Test", part1: ["P1-A", "P1-B"], part2: "P2 card", part3: ["P3-A", "P3-B"] }; }
  function qwenSpeakingScope(prefix) { return qwenSession(prefix).practiceScope; }
  function qwenSpeakingMinimumReached() { return false; }
  function qwenBuildExtensionAction(prefix) {
    const session = qwenSession(prefix);
    const scope = speakingPracticeScopeConfig(session.practiceScope);
    return session.scheduledAction = { part: scope.id === "full" ? "Part 3" : scope.label, kind: "extension-follow-up" };
  }
  ${functionSource(app, "speakingPracticeScopeConfig")}
  ${functionSource(app, "qwenResetExaminerSchedule")}
  ${functionSource(app, "qwenTakeNextScheduledAction")}
  this.runScope = (scope) => {
    sessions.set(scope, { practiceScope: scope });
    qwenResetExaminerSchedule(scope);
    const session = qwenSession(scope);
    return Array.from({ length: 7 }, () => qwenTakeNextScheduledAction(scope, session.speakingPlan).part);
  };
`, scheduleContext);
assert.deepEqual([...scheduleContext.runScope("part1")], Array(7).fill("Part 1"));
assert.deepEqual([...scheduleContext.runScope("part2")], Array(7).fill("Part 2"));
assert.deepEqual([...scheduleContext.runScope("part3")], Array(7).fill("Part 3"));
assert.ok(scheduleContext.runScope("full").every((part) => ["Part 1", "Part 2", "Part 3"].includes(part)));

const panel = functionSource(app, "renderRealtimeSpeakingPanel");
const setup = functionSource(app, "renderBankPracticeTopic");
const start = functionSource(app, "startQwenSpeaking");
const schedule = `${functionSource(app, "qwenPeekNextScheduledAction")}\n${functionSource(app, "qwenTakeNextScheduledAction")}`;
const meta = functionSource(app, "qwenUpdateExamMeta");
const disconnect = functionSource(app, "disconnectQwenSpeaking");
assert.match(setup, /data-speaking-practice-scope/);
for (const scope of ["full", "part1", "part2", "part3"]) assert.match(setup, new RegExp(`["']${scope}["']`));
assert.match(panel, /data-speaking-scope/);
assert.match(start, /session\.practiceScope/);
assert.match(start, /session\.targetMs\s*=\s*scopeConfig\.targetMs/);
assert.match(schedule, /practiceScope|qwenSpeakingScope/);
assert.match(meta, /remainingMs|qwenSpeakingCountdownState/);
assert.match(meta, /finishQwenSpeaking/);
assert.match(disconnect, /uiTimer/);

const prompt = functionSource(app, "buildIeltsSpeakingPrompt");
const turnPrompt = functionSource(app, "qwenTurnControlInstructions");
for (const phrase of [
  /calm/i,
  /neutral/i,
  /one question at a time/i,
  /do not repeat/i,
  /recent questions/i,
  /selected practice scope/i,
]) assert.match(`${prompt}\n${turnPrompt}`, phrase);

const normalizeFunctions = [
  "speakingBandNumber",
  "parseSpeakingAssessmentJson",
  "normalizeSpeakingAssessment",
  "formatSpeakingAssessment",
];
const serverCode = normalizeFunctions.map((name) => functionSource(server, name)).join("\n");
const serverContext = { Math, JSON, String, Number, Array };
vm.createContext(serverContext);
vm.runInContext(`${serverCode}\nthis.assessment = normalizeSpeakingAssessment(JSON.stringify({
  criteria: [
    { key: "fc", score: 6.0, evidence: "sustained answer" },
    { key: "lr", score: 6.5, evidence: "topic vocabulary" },
    { key: "gra", score: 5.5, evidence: "complex clauses" },
    { key: "pronunciation", score: 6.0, evidence: "mostly intelligible" }
  ],
  strengths: ["clear ideas"], priorities: ["reduce repetition"], drills: ["60-second answer"], confidence: "medium"
}), { scope: "part1", audioUsed: false });
this.sparseAssessment = normalizeSpeakingAssessment({
  criteria: [{ key: "lr", score: 7.0, evidence: "precise topic vocabulary" }]
}, { scope: "full", audioUsed: false, fallbackScores: { fc: 5.5, lr: 5.5, gra: 5.5, pronunciation: 5.5 } });`, serverContext);
const assessment = serverContext.assessment;
assert.equal(assessment.overall, 6.0, "Overall must be recalculated from the four normalized criteria");
assert.equal(assessment.criteria.length, 4);
assert.equal(assessment.scope, "part1");
assert.match(assessment.cautions.join(" "), /part-only/i);
assert.match(assessment.cautions.join(" "), /pronunciation|audio/i);
assert.equal(serverContext.sparseAssessment.criteria.find((item) => item.key === "fc").score, 5.5, "A labelled LR score must not leak into a missing FC criterion");
assert.equal(serverContext.sparseAssessment.criteria.find((item) => item.key === "lr").score, 7.0);
assert.match(server, /Return exactly one valid JSON object/i);
assert.match(functionSource(server, "handleSpeaking"), /normalizeSpeakingAssessment/);
assert.match(functionSource(server, "handleSpeaking"), /formatSpeakingAssessment/);

console.log("Speaking part practice, countdown, examiner and stable scoring contracts passed.");
