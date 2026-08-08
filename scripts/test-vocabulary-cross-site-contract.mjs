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
assert.match(app, /from !== "stem"/);
assert.match(app, /function vocabularyReturnToStemUrl\(\)/);
assert.match(app, /url\.origin === "https:\/\/stem\.ieltsist\.com"/);
assert.match(app, /routeId: item\.routeId/);
assert.match(app, /specificationVersion: item\.specificationVersion/);
assert.match(app, /topicId: item\.topicId/);
assert.match(app, /questionPartId/);
assert.match(app, /termId: item\.termId/);
assert.match(app, /attemptId:/);
assert.match(app, /const returnTo = vocabularyReturnToStemUrl\(\) \|\| window\.location\.href/);
assert.match(app, /if \(vocabularyRouteContextFromLocation\(\)\.from === "stem"\)/);
assert.match(app, /activateView\("vocabulary", true\)/);
assert.match(app, /Vocabulary support only; progress stays on each site/);
assert.match(app, /clearVocabularyRouteTermScope/);
assert.match(app, /function vocabularyRouteContextWarning\(context, allItems\)/);
assert.match(app, /older route metadata/);
assert.match(app, /const miniWindowSize = 36/);
assert.doesNotMatch(app, /item\.termId, item\.topicId, item\.stage,/);
assert.match(app, /state\.examSubmitted = false/);
assert.match(app, /state\.examSubmitted = true/);
assert.match(app, /function ensureAccessibleSelectLabels/);
const speakingBankRenderer = app.slice(app.indexOf("function renderBankList()"), app.indexOf("function uniqueSpeakingTopicCards"));
assert.doesNotMatch(speakingBankRenderer, /speaking-topic-card[^`]*role="button"/);
assert.match(html, /aria-label="Same Test Cambridge book"/);
assert.match(html, /aria-label="Same Test number"/);

console.log(`Vocabulary cross-site contract passed: ${catalog.items.length} terms with stable STEM fields.`);
