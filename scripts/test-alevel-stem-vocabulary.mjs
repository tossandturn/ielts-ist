import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url), "utf8"));
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");

assert.equal(catalog.schemaVersion, "alevel-stem-vocabulary.v2");
assert.equal(catalog.itemCount, catalog.items.length);
assert.ok(catalog.items.length >= 650, "The A-Level STEM catalog must remain a large 650+ item deck");

const counts = catalog.items.reduce((result, item) => {
  result[item.subject] = (result[item.subject] || 0) + 1;
  return result;
}, {});
assert.ok(counts.physics >= 250, "Physics must retain at least 250 entries");
assert.ok(counts.mathematics >= 180, "Mathematics must retain at least 180 entries");
assert.ok(counts.chemistry >= 70, "Chemistry must include a useful A-Level term deck");
assert.ok(counts.economics >= 70, "Economics must include a useful A-Level term deck");
assert.ok(counts["exam-language"] >= 70, "Exam language must retain at least 70 entries");

const ids = new Set();
for (const item of catalog.items) {
  assert.ok(item.id && !ids.has(item.id), `Vocabulary id must be unique: ${item.id}`);
  ids.add(item.id);
  for (const field of ["subject", "topic", "topicLabel", "type", "word", "meaning", "definition", "cn", "example", "translation", "knowledgePoint", "conceptExplanation", "examFocus", "commonMistake"]) {
    assert.ok(String(item[field] || "").trim(), `${item.id} is missing ${field}`);
  }
  assert.ok(String(item.definition).trim().length >= 12, `${item.id} needs a useful English definition`);
  assert.ok(Array.isArray(item.collocations), `${item.id} collocations must be an array`);
  assert.ok(Array.isArray(item.methodSteps) && item.methodSteps.length >= 3, `${item.id} needs actionable study steps`);
  if (item.formula) assert.ok(String(item.formulaExplanation || "").trim().length >= 30, `${item.id} needs formula conditions`);
}

const professionalItems = catalog.items.filter((item) => ["physics", "mathematics", "chemistry", "economics"].includes(item.subject));
assert.ok(professionalItems.some((item) => item.knowledgePoint), "Professional terms should include knowledge-point support");
assert.ok(professionalItems.some((item) => item.formula), "Professional terms should include formula/equation support");
assert.ok(professionalItems.every((item) => !/^Connect /.test(item.knowledgePoint)), "Professional knowledge points must not use the old filler template");
assert.ok(professionalItems.every((item) => !/^Use .+ to (?:explain|analyse|calculate|interpret)/i.test(item.example)), "Professional examples must not use the old topic filler template");
assert.ok(professionalItems.every((item) => !/。。/.test(item.cn)), "Chinese explanations must not contain doubled punctuation");

const commandWords = catalog.items.filter((item) => item.type === "command");
const questionSentences = catalog.items.filter((item) => item.type === "phrase");
assert.ok(commandWords.length >= 25);
assert.ok(questionSentences.length >= 50);
assert.ok(questionSentences.every((item) => /[\u3400-\u9fff]/.test(item.translation)), "Question sentences need Chinese translations");

for (const expected of ["displacement", "Young modulus", "Kirchhoff's second law", "binding energy per nucleon", "derivative", "conditional probability", "mole", "price elasticity of demand", "show that", "not drawn to scale"]) {
  assert.ok(catalog.items.some((item) => item.word === expected), `Missing representative entry: ${expected}`);
}

const mathVector = catalog.items.find((item) => item.id === "mathematics-trigonometry-and-vectors-vector");
assert.ok(mathVector?.knowledgePoint?.includes("magnitude and direction"), "Vector must explain magnitude and direction");
assert.ok(mathVector?.formula, "Vector must include its component magnitude formula");

const physicsVector = catalog.items.find((item) => item.id === "physics-measurement-and-practical-vector");
assert.match(physicsVector?.conceptExplanation || "", /大小.*方向/);
assert.equal(physicsVector?.workedExample?.answer?.includes("5.0 N"), true, "Curated vector example must include a solved answer");
assert.match(physicsVector?.translation || "", /力图.*方向/);

const newton = catalog.items.find((item) => item.id === "physics-mechanics-newton-s-second-law");
assert.ok(newton && !/Calculate the Newton's second law/.test(newton.example), "Newton's second law must not be treated as a calculable quantity");
assert.match(newton?.conceptExplanation || "", /合外力/);

const shm = catalog.items.find((item) => item.id === "physics-oscillations-simple-harmonic-motion");
assert.ok(shm && !/changes the oscillation/.test(shm.example), "SHM example must not use a malformed topic template");

const binomial = catalog.items.find((item) => item.id === "mathematics-statistics-and-probability-binomial-distribution");
assert.ok(binomial && !/calculate the binomial distribution/.test(binomial.example), "A distribution must not be described as directly calculated");

const percentageYieldSentence = catalog.items.find((item) => item.word === "Calculate the percentage yield of the reaction.");
assert.match(percentageYieldSentence?.methodSteps?.join(" ") || "", /物质.*条件/);
assert.doesNotMatch(percentageYieldSentence?.methodSteps?.join(" ") || "", /价电子|键型/);

assert.match(app, /ensureAlevelVocabularyLoaded/);
assert.match(app, /\/data\/alevel-stem-vocabulary\.json/);
assert.match(app, /vocabSubjectFilter/);
assert.match(app, /vocabTopicFilter/);
assert.match(app, /vocabTypeFilter/);
assert.match(app, /vocabSearch/);
assert.match(app, /vocabImportFile/);
assert.match(app, /vocab-hub-shell/);
assert.match(app, /data-vocab-page="import"/);
assert.match(app, /renderVocabularyImportPage/);
assert.match(app, /collocations \| core idea\(optional\) \| method steps\(optional\) \| formula conditions\(optional\)/);
assert.match(app, /Each line must include term, 中文名, definition, knowledge point, exam sentence and 中文翻译/);
assert.match(app, /vector \| 向量 \| a quantity with magnitude and direction/);
assert.match(app, /Understanding check \/ 理解检查/);
assert.match(app, /Core idea \/ 核心理解/);
assert.match(app, /Formula & conditions \/ 公式与条件/);
assert.match(app, /Common mistake \/ 易错点/);
assert.match(app, /https:\/\/stem\.ieltsist\.com\/\?from=ieltsist&focus=/);
assert.match(app, /Continue in STEM Campus/);
assert.match(app, /Need the subject knowledge behind the terms/);
assert.match(html, /class="product-switch-link" href="https:\/\/stem\.ieltsist\.com\/\?from=ieltsist&amp;focus=syllabus"/);
assert.match(server, /complementary but independent products/);
assert.match(server, /Never claim that accounts, tokens, scores or progress sync/);
assert.match(app, /vocabularyItemKey\(item\)/, "Known progress must use stable item keys");
assert.match(html, /700\+ A-Level Mathematics, Physics, Chemistry, Economics and exam-language entries/);

console.log(`A-Level STEM vocabulary checks passed: ${catalog.items.length} items (${counts.physics} Physics, ${counts.mathematics} Mathematics, ${counts.chemistry} Chemistry, ${counts.economics} Economics, ${counts["exam-language"]} exam-language).`);
