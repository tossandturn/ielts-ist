import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const catalog = JSON.parse(await readFile(new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url), "utf8"));

const sharedFields = [
  "termId", "routeId", "specificationVersion", "stage", "topicId",
  "relatedQuestionPartIds", "aliases", "formula", "examUsage",
  "commonMistakes", "reviewState",
];
for (const item of catalog.items) {
  for (const field of sharedFields) assert.ok(item[field] !== undefined, `${item.id} is missing ${field}`);
  assert.ok(["IGCSE", "AS", "A2"].includes(item.stage), `${item.id} has unsupported stage ${item.stage}`);
  assert.ok(String(item.termId).trim(), `${item.id} needs a stable termId`);
}

assert.match(app, /function vocabularyRouteContextFromLocation\(\)/);
assert.match(app, /stem-vocabulary-context-v1/);
assert.match(app, /from !== "stem"/);
assert.match(app, /contractVersion: String\(value\("contractVersion", "contract_version"\)/);
assert.match(app, /taxonomyId: String\(value\("taxonomyId", "taxonomy_id"\)/);
assert.match(app, /subjectCode: String\(value\("subjectCode", "subject_code"\)/);
assert.match(app, /sourceStatus/);
assert.match(app, /termInventoryStatus/);
assert.match(app, /availableCount: sourceStatus === "source-backed"/);
assert.match(app, /function vocabularyReturnToStemUrl\(\)/);
assert.match(app, /new URL\(canonical\)\.origin === "https:\/\/stem\.ieltsist\.com"/);
assert.match(app, /routeId: state\.vocabularyRouteContext\.routeId \|\| item\.routeId/);
assert.match(app, /specificationVersion: item\.specificationVersion/);
assert.match(app, /topicId: state\.vocabularyRouteContext\.topicId \|\| item\.topicId/);
assert.match(app, /questionPartId/);
assert.match(app, /termId: item\.termId/);
assert.match(app, /termIds: termIds\.join\(","\)/);
assert.match(app, /attemptId:/);
assert.match(app, /const returnTo = vocabularyReturnToStemUrl\(\) \|\| canonicalProductReturnUrl\(window\.location\.href\)/);
for (const [camel, snake] of [
  ["routeId", "route_id"], ["specificationVersion", "specification_version"],
  ["topicId", "topic_id"], ["questionPartId", "question_part_id"],
  ["attemptId", "attempt_id"], ["returnTo", "return_to"],
]) {
  assert.ok(app.includes(`value("${camel}", "${snake}")`), `${camel} must accept legacy ${snake}`);
}
assert.match(app, /params\.getAll\("term_id"\)/);
assert.match(app, /params\.getAll\("termIds\[\]"\)/);
assert.match(app, /value\("termIds", "term_ids"\)/);
assert.match(app, /const hashQueryIndex = rawHash\.indexOf\("\?"\)/);
assert.match(app, /if \(!params\.has\(key\)\) params\.append\(key, value\)/);
assert.match(app, /const hashRoute = hash\.split\("\?", 1\)\[0\]/);
assert.match(app, /if \(vocabularyRouteContextFromLocation\(\)\.from === "stem"\)/);
assert.match(app, /activateView\("vocabulary", true\)/);
assert.match(app, /Vocabulary support only; progress stays on each site/);
assert.match(app, /clearVocabularyRouteTermScope/);
assert.match(app, /function vocabularyRouteContextWarning\(context, allItems\)/);
assert.match(app, /IELTSist glossary sync pending/);
assert.match(app, /older route metadata/);
assert.match(app, /item\.taxonomyId === context\.taxonomyId/);
assert.doesNotMatch(app, /item\.topicId\.endsWith/);
assert.match(app, /function vocabularyStudyDeck\(\)/);
assert.match(app, /return filteredCoreVocabulary\(\);/,
  "Vocabulary study mode must use the complete filtered deck rather than a fixed 30-word slice");
assert.doesNotMatch(app, /vocabularyStudySetSize|30-word study session/,
  "The default full-deck flow must not retain the old 30-word truncation path");
assert.match(app, /const globalSearch = Boolean\(query\) && review\.mode === "all"/);
assert.doesNotMatch(app, /item\.termId, item\.topicId, item\.stage,/);
assert.match(app, /state\.examSubmitted = restoredState\.submitted/,
  "Random Exam must restore its submitted/open state from the owner-scoped saved session");
assert.match(app, /state\.examSubmitted = true/);
assert.match(app, /function ensureAccessibleSelectLabels/);
const speakingBankRenderer = app.slice(app.indexOf("function renderBankList()"), app.indexOf("function uniqueSpeakingTopicCards"));
assert.doesNotMatch(speakingBankRenderer, /speaking-topic-card[^`]*role="button"/);
assert.match(html, /aria-label="Same Test Cambridge book"/);
assert.match(html, /aria-label="Same Test number"/);

console.log(`Vocabulary cross-site contract passed: ${catalog.items.length} terms with stable STEM fields.`);
