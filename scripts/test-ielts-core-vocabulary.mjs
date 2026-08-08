import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../public/data/ielts-core-vocabulary.json", import.meta.url), "utf8"));
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

assert.equal(catalog.schemaVersion, "ielts-core-vocabulary.v2");
assert.equal(catalog.itemCount, catalog.items.length);
assert.ok(catalog.items.length >= 300, "The IELTS Core catalog must be a large 300+ item deck");

const ids = new Set();
const typeCounts = {};
for (const item of catalog.items) {
  assert.ok(item.id && !ids.has(item.id), `Vocabulary id must be unique: ${item.id}`);
  ids.add(item.id);
  for (const field of ["subject", "topic", "topicLabel", "type", "word", "meaning", "definition", "cn", "example", "translation", "conceptExplanation", "examFocus", "commonMistake"]) {
    assert.ok(String(item[field] || "").trim(), `${item.id} is missing ${field}`);
  }
  assert.equal(item.subject, "ielts", `${item.id} must stay in the IELTS subject`);
  assert.ok(Array.isArray(item.collocations), `${item.id} collocations must be an array`);
  assert.ok(Array.isArray(item.methodSteps) && item.methodSteps.length >= 3, `${item.id} needs practical usage steps`);
  typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
}

assert.ok(typeCounts.term >= 220, "IELTS Core should still be mostly term-based");
assert.ok(typeCounts.command >= 15, "IELTS Core should include command words");
assert.ok(typeCounts.phrase >= 40, "IELTS Core should include exam phrases");
assert.equal(catalog.items.filter((item) => item.workedExample).length, 0, "Usage examples must not be mislabeled as worked solutions");

for (const expected of [
  "significant",
  "approximately",
  "fluctuate",
  "sustainable",
  "allocate",
  "subsidise",
  "compulsory",
  "interpret",
  "analyse",
  "on the other hand",
  "community",
  "traffic congestion",
  "curriculum",
  "indicate",
]) {
  assert.ok(catalog.items.some((item) => item.word === expected), `Missing representative entry: ${expected}`);
}

assert.match(app, /ensureIeltsCoreVocabularyLoaded/);
assert.match(app, /\/data\/ielts-core-vocabulary\.json/);
assert.match(app, /aria-controls="vocabMeaning"/);
assert.match(app, /meaningFace\.hidden = !state\.vocabularyReview\.revealed/);
assert.match(app, /item\.topic \|\| "ielts-core"/);
assert.match(app, /item\.conceptExplanation/);
assert.match(app, /localVocabularyNotebookStoreKey/);
assert.match(app, /function notebookIdentity/);
assert.match(app, /function saveVocabularyToNotebook/);
assert.match(app, /function removeVocabularyFromNotebook/);
assert.match(app, /function syncLocalVocabularyNotebook/);
assert.match(app, /id=\"vocabNotebook\"/);
assert.match(app, /data-vocab-open-notebook/);
assert.match(app, /data-vocab-review-key/);
assert.match(app, /Opened from Notebook/);
assert.match(app, /searchTimer/);
assert.match(html, /20260807-stem-bridge-v7/);

console.log(`IELTS Core vocabulary checks passed: ${catalog.items.length} items.`);
