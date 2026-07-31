import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

function sourceFor(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function loadFunctions(names) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${names.map(sourceFor).join("\n")}\nthis.exports = { ${names.join(", ")} };`, context);
  return context.exports;
}

const scoring = loadFunctions([
  "normalizeSpeakingBand",
  "spokenBandNumberFromText",
  "extractSpeakingBandFromText",
  "extractSpeakingCriterionScores",
  "speakingOverallFromCriteria",
  "speakingBandFromFeedbackPayload",
]);

const feedback = [
  "Overall Speaking Band: 6.5",
  "Fluency & Coherence: 6.0",
  "Lexical Resource: 5.5",
  "Grammatical Range & Accuracy: 5.5",
  "Pronunciation: 6.0",
].join("\n");

const criteria = scoring.extractSpeakingCriterionScores(feedback);
assert.equal(scoring.speakingOverallFromCriteria(criteria), "6.0");
assert.equal(scoring.speakingBandFromFeedbackPayload(feedback, "6.5"), "6.0");

const reconnect = loadFunctions([
  "compactDialogueText",
  "dialogueFingerprint",
  "qwenExtractQuestion",
  "qwenQuestionIsDuplicate",
]);

const asked = ["What kind of festivals are important in your country?"];
assert.equal(reconnect.qwenQuestionIsDuplicate(asked, "What kind of festivals are important in your country?"), true);
assert.equal(reconnect.qwenQuestionIsDuplicate(asked, "Why do people watch festivals on television?"), false);

console.log("Speaking regressions passed: canonical band and reconnect question de-duplication.");
