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
assert.doesNotMatch(meta, /finishQwenSpeaking/, "The countdown updater must not call scoring directly");
assert.match(disconnect, /uiTimer/);

const timerContext = {
  Math,
  Date: { now: () => 181_000 },
  document: { querySelectorAll: () => [] },
  window: { setTimeout: (callback) => callback() },
  nodes: new Map(),
  statuses: [],
  finishCalls: 0,
};
vm.createContext(timerContext);
vm.runInContext(`
  const sessions = new Map();
  function qwenSession(prefix) { return sessions.get(prefix); }
  function qwenSpeakingTargetMs() { return 180_000; }
  function qwenSpeakingScope(prefix) { return qwenSession(prefix).practiceScope; }
  function qwenBuildAutoScoreTranscript(prefix) { return qwenSession(prefix).transcript; }
  function qwenWordCount(value) { return String(value || "").trim().split(/\\s+/).filter(Boolean).length; }
  function qwenSpeakingMinimumReached() { return true; }
  function qwenOutputBusy(prefix) { return Boolean(qwenSession(prefix).outputBusy); }
  function qwenAdvanceScheduledAction() {}
  function qwenSetStatus(prefix, text) { statuses.push(text); }
  function finishQwenSpeaking() { finishCalls += 1; return Promise.resolve(); }
  function $(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: "" });
    return nodes.get(id);
  }
  ${functionSource(app, "speakingPracticeScopeConfig")}
  ${functionSource(app, "qwenSpeakingCountdownState")}
  ${functionSource(app, "qwenUpdateExamMeta")}
  ${functionSource(app, "qwenMaybeAutoFinish")}
  this.runExpiredTimer = (overrides = {}) => {
    finishCalls = 0;
    statuses.length = 0;
    const session = {
      practiceScope: "part2",
      sessionStartedAt: 1_000,
      countdownExpiredHandled: false,
      timeExpiredPending: false,
      finalScoreInFlight: false,
      autoFinishStarted: false,
      awaitingScore: false,
      scheduledAction: { part: "Part 2", kind: "cue-card" },
      lastActionKind: "cue-card",
      voiceStarted: false,
      turnCommitted: false,
      waitingForResponse: false,
      responseActive: false,
      serverTurnCommitted: false,
      webRtcResponseRequested: false,
      currentTurnBytes: 0,
      outputBusy: false,
      transcript: "one two three four five six seven eight nine ten eleven twelve",
      ...overrides,
    };
    sessions.set("bank", session);
    qwenUpdateExamMeta("bank");
    return { finishCalls, statuses: [...statuses], session };
  };
  this.continueExpiredTimer = (overrides = {}) => {
    const session = sessions.get("bank");
    Object.assign(session, overrides);
    qwenUpdateExamMeta("bank");
    return { finishCalls, statuses: [...statuses], session };
  };
`, timerContext);

const activeAnswerExpiry = timerContext.runExpiredTimer({ voiceStarted: true, currentTurnBytes: 32_000 });
assert.equal(activeAnswerExpiry.finishCalls, 0, "Timer expiry must not score while the candidate is speaking");
assert.equal(activeAnswerExpiry.session.timeExpiredPending, true, "Timer expiry should wait for the active answer to finish");
assert.match(activeAnswerExpiry.statuses.join(" "), /finish this answer/i);

const activeAnswerBeforeTranscriptExpiry = timerContext.runExpiredTimer({ voiceStarted: true, currentTurnBytes: 32_000, transcript: "" });
assert.equal(activeAnswerBeforeTranscriptExpiry.finishCalls, 0, "Timer expiry must not score before the active answer transcript settles");
assert.equal(activeAnswerBeforeTranscriptExpiry.session.timeExpiredPending, true, "An in-progress answer must remain pending even before ASR text arrives");

const pendingExaminerExpiry = timerContext.runExpiredTimer({ waitingForResponse: true, serverTurnCommitted: true });
assert.equal(pendingExaminerExpiry.finishCalls, 0, "Timer expiry must not score while a committed answer is being processed");

const playbackExpiry = timerContext.runExpiredTimer({ responseActive: true, outputBusy: true });
assert.equal(playbackExpiry.finishCalls, 0, "Timer expiry must not score over examiner playback");
const playbackFinished = timerContext.continueExpiredTimer({ responseActive: false, outputBusy: false });
assert.equal(playbackFinished.finishCalls, 1, "Pending scoring should start once examiner playback reaches an idle boundary");
assert.equal(playbackFinished.session.timeExpiredPending, false, "The pending expiry flag should clear when scoring starts");

const idleExpiry = timerContext.runExpiredTimer();
assert.equal(idleExpiry.finishCalls, 1, "Timer expiry may score once the completed turn is idle");

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
