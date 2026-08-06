import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url), "utf8"));
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");

assert.equal(catalog.schemaVersion, "alevel-stem-vocabulary.v1");
assert.equal(catalog.itemCount, catalog.items.length);
assert.ok(catalog.items.length >= 500, "The A-Level STEM catalog must remain a large 500+ item deck");

const counts = catalog.items.reduce((result, item) => {
  result[item.subject] = (result[item.subject] || 0) + 1;
  return result;
}, {});
assert.ok(counts.physics >= 250, "Physics must retain at least 250 entries");
assert.ok(counts.mathematics >= 180, "Mathematics must retain at least 180 entries");
assert.ok(counts["exam-language"] >= 70, "Exam language must retain at least 70 entries");

const ids = new Set();
for (const item of catalog.items) {
  assert.ok(item.id && !ids.has(item.id), `Vocabulary id must be unique: ${item.id}`);
  ids.add(item.id);
  for (const field of ["subject", "topic", "topicLabel", "type", "word", "meaning", "definition", "cn", "example", "translation"]) {
    assert.ok(String(item[field] || "").trim(), `${item.id} is missing ${field}`);
  }
  assert.ok(String(item.definition).trim().length >= 12, `${item.id} needs a useful English definition`);
  assert.ok(Array.isArray(item.collocations), `${item.id} collocations must be an array`);
}

const commandWords = catalog.items.filter((item) => item.type === "command");
const questionSentences = catalog.items.filter((item) => item.type === "phrase");
assert.ok(commandWords.length >= 25);
assert.ok(questionSentences.length >= 50);
assert.ok(questionSentences.every((item) => /[\u3400-\u9fff]/.test(item.translation)), "Question sentences need Chinese translations");

for (const expected of ["displacement", "Young modulus", "Kirchhoff's second law", "binding energy per nucleon", "derivative", "conditional probability", "show that", "not drawn to scale"]) {
  assert.ok(catalog.items.some((item) => item.word === expected), `Missing representative entry: ${expected}`);
}

assert.match(app, /ensureAlevelVocabularyLoaded/);
assert.match(app, /\/data\/alevel-stem-vocabulary\.json/);
assert.match(app, /vocabSubjectFilter/);
assert.match(app, /vocabTopicFilter/);
assert.match(app, /vocabTypeFilter/);
assert.match(app, /vocabSearch/);
assert.match(app, /vocabularyItemKey\(item\)/, "Known progress must use stable item keys");
assert.match(html, /550\+ A-Level Mathematics, Physics and exam-language entries/);

console.log(`A-Level STEM vocabulary checks passed: ${catalog.items.length} items (${counts.physics} Physics, ${counts.mathematics} Mathematics, ${counts["exam-language"]} exam-language).`);
