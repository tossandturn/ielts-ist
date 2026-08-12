import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const catalog = JSON.parse(await readFile(new URL("../public/data/alevel-stem-vocabulary.json", import.meta.url), "utf8"));
const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");

assert.equal(catalog.schemaVersion, "alevel-stem-vocabulary.v2");
assert.equal(catalog.itemCount, catalog.items.length);
assert.equal(catalog.catalogVersion, "2026-08-12-ig-alevel-knowledge-v5");
assert.ok(catalog.items.length >= 2850, "The IG + A-Level subject catalog must remain a broad 2850+ item deck");

const counts = catalog.items.reduce((result, item) => {
  result[item.subject] = (result[item.subject] || 0) + 1;
  return result;
}, {});
assert.ok(counts.physics >= 300, "Physics must retain at least 300 IG + A-Level entries");
assert.ok(counts.mathematics >= 260, "Mathematics must retain at least 260 IG + A-Level entries");
assert.ok(counts.chemistry >= 220, "Chemistry must include a broad IG + A-Level term deck");
assert.ok(counts.economics >= 180, "Economics must include a broad IG + A-Level term deck");
assert.ok(counts.biology >= 220, "Biology must include a broad IG + A-Level term deck");
assert.ok(counts["computer-science"] >= 120, "Computer Science must include a broad IG + A-Level term deck");
assert.ok(counts.business >= 80, "Business must include a broad IG + A-Level term deck");
assert.ok(counts.geography >= 80, "Geography must include a broad IG + A-Level term deck");
assert.ok(counts.accounting >= 60, "Accounting must include a broad IG + A-Level term deck");
assert.ok(counts.psychology >= 60, "Psychology must include a broad IG + A-Level term deck");
assert.ok(counts.law >= 35, "Law must include a useful IG + A-Level terminology deck");
assert.ok(counts.sociology >= 35, "Sociology must include a useful IG + A-Level terminology deck");
assert.ok(counts.politics >= 30, "Politics must include a useful A-Level terminology deck");
assert.ok(counts.history >= 30, "History must include a useful IG + A-Level terminology deck");
assert.ok(counts["environmental-management"] >= 35, "Environmental Management must include a useful IG + A-Level terminology deck");
assert.ok(counts["design-technology"] >= 35, "Design & Technology must include a useful IG + A-Level terminology deck");
assert.ok(counts["english-language"] >= 30, "English Language must include a useful IG + A-Level terminology deck");
assert.ok(counts["english-literature"] >= 30, "English Literature must include a useful IG + A-Level terminology deck");
assert.ok(counts["media-studies"] >= 30, "Media Studies must include a useful IG + A-Level terminology deck");
assert.ok(counts["physical-education"] >= 30, "Physical Education must include a useful IG + A-Level terminology deck");
assert.ok(counts["art-design"] >= 30, "Art & Design must include a useful IG + A-Level terminology deck");
assert.ok(counts.drama >= 30, "Drama must include a useful IG + A-Level terminology deck");
assert.ok(counts.music >= 30, "Music must include a useful IG + A-Level terminology deck");
assert.ok(counts["religious-studies"] >= 30, "Religious Studies must include a useful IG + A-Level terminology deck");
assert.ok(counts["information-technology"] >= 30, "Information Technology must include a useful IG + A-Level terminology deck");
assert.ok(counts["travel-tourism"] >= 30, "Travel & Tourism must include a useful IG + A-Level terminology deck");
assert.ok(counts["global-perspectives"] >= 30, "Global Perspectives must include a useful IGCSE terminology deck");
assert.ok(counts["marine-science"] >= 30, "Marine Science must include a useful A-Level terminology deck");
assert.ok(counts["food-nutrition"] >= 30, "Food & Nutrition must include a useful IGCSE terminology deck");
assert.ok(counts["modern-languages"] >= 30, "Modern Languages must include a useful IGCSE terminology deck");
assert.ok(counts.enterprise >= 30, "Enterprise must include a useful IGCSE terminology deck");
assert.ok(counts.agriculture >= 30, "Agriculture must include a useful IGCSE terminology deck");
assert.ok(counts["child-development"] >= 30, "Child Development must include a useful IGCSE terminology deck");
assert.ok(counts["english-second-language"] >= 30, "English as a Second Language must include a useful IGCSE terminology deck");
assert.ok(counts["chinese-language"] >= 30, "Chinese Language must include a useful IG + A-Level terminology deck");
assert.ok(counts["islamic-studies"] >= 30, "Islamic Studies must include a useful IGCSE terminology deck");
assert.ok(counts["biblical-studies"] >= 30, "Biblical Studies must include a useful A-Level terminology deck");
assert.ok(counts["thinking-skills"] >= 30, "Thinking Skills must include a useful A-Level terminology deck");
assert.ok(counts["digital-media-design"] >= 30, "Digital Media & Design must include a useful A-Level terminology deck");
assert.ok(counts["world-literature"] >= 30, "World Literature must include a useful IGCSE terminology deck");
assert.ok(counts["exam-language"] >= 100, "Exam language must retain at least 100 entries");

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
  assert.equal(item.termId, item.id, `${item.id} must preserve its canonical stable term id`);
  assert.equal(item.topicId, `${item.subject}:${item.topic}`, `${item.id} has an unstable topic id`);
  assert.match(item.specificationVersion, /IGCSE|A-Level/, `${item.id} needs an IG or A-Level specification version`);
  assert.ok(["IGCSE", "AS", "A2"].includes(item.stage), `${item.id} needs a valid course stage`);
  assert.equal(item.routeId, `${item.stage === "IGCSE" ? "igcse" : "alevel"}-${item.subject}-${item.topic}`, `${item.id} has an unstable route id`);
  assert.equal(item.reviewState, "new", `${item.id} needs an initial review state`);
  assert.ok(Array.isArray(item.relatedQuestionPartIds), `${item.id} question links must be an array`);
  assert.ok(Array.isArray(item.aliases), `${item.id} aliases must be an array`);
  assert.ok(item.examUsage && typeof item.examUsage === "object", `${item.id} needs structured exam usage`);
  assert.ok(String(item.examUsage.focus || "").trim(), `${item.id} needs an exam-usage focus`);
  assert.ok(String(item.examUsage.example || "").trim(), `${item.id} needs an exam-usage example`);
  assert.ok(Array.isArray(item.commonMistakes) && item.commonMistakes.length, `${item.id} needs structured common mistakes`);
}

const professionalSubjects = ["physics", "mathematics", "chemistry", "economics", "biology", "computer-science", "business", "geography", "accounting", "psychology", "law", "sociology", "politics", "history", "environmental-management", "design-technology", "english-language", "english-literature", "media-studies", "physical-education", "art-design", "drama", "music", "religious-studies", "information-technology", "travel-tourism", "global-perspectives", "marine-science", "food-nutrition", "modern-languages", "enterprise", "agriculture", "child-development", "english-second-language", "chinese-language", "islamic-studies", "biblical-studies", "thinking-skills", "digital-media-design", "world-literature"];
const professionalItems = catalog.items.filter((item) => professionalSubjects.includes(item.subject));
const stages = new Set(professionalItems.map((item) => item.stage));
assert.ok(stages.has("IGCSE"), "Professional deck must include IGCSE terms");
assert.ok(stages.has("AS"), "Professional deck must include AS terms");
assert.ok(stages.has("A2"), "Professional deck must include A2 terms");
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

for (const expected of ["displacement", "Young modulus", "Kirchhoff's second law", "binding energy per nucleon", "derivative", "conditional probability", "mole", "price elasticity of demand", "photosynthesis", "DNA", "homeostasis", "natural selection", "mitosis", "electrolysis", "exchange rate", "histogram", "binary", "market research", "erosion", "trial balance", "hypothesis", "precedent", "social stratification", "separation of powers", "historical interpretation", "biodiversity", "ergonomics", "phonology", "dramatic irony", "media representation", "aerobic endurance", "composition", "blocking", "tonality", "utilitarianism", "database", "sustainable tourism", "global issue", "salinity", "balanced diet", "false friend", "value proposition", "soil pH", "developmental milestone", "register", "语体", "isnad", "parable", "assumption", "design brief", "postcolonial reading", "show that", "not drawn to scale"]) {
  assert.ok(catalog.items.some((item) => item.word === expected), `Missing representative entry: ${expected}`);
}

for (const subject of ["global-perspectives", "marine-science", "food-nutrition", "modern-languages", "enterprise", "agriculture", "child-development"]) {
  const entry = catalog.items.find((item) => item.subject === subject);
  assert.ok(entry, `Missing student-facing representative entry for ${subject}`);
  assert.doesNotMatch(entry.example, /^Use .+ in the context of the question and state the result clearly\.$/, `${subject} needs a subject-specific exam example`);
  assert.ok(/题|情境|材料|案例/.test(entry.translation), `${subject} needs a usable Chinese exam prompt`);
}

const biologyTopics = new Set(catalog.items.filter((item) => item.subject === "biology").map((item) => item.topic));
assert.ok(biologyTopics.size >= 6, "Biology terms must remain separated into real A-Level topics");

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
assert.match(server, /IELTSist and STEM Campus use one IELTSist ID for sign-in/i,
  "Product facts must state that one IELTSist ID signs into both products");
assert.match(server, /IELTS drafts,\s*IELTS scores,\s*reports,\s*and vocabulary stay in IELTSist/i,
  "Product facts must keep IELTS learning data inside IELTSist");
assert.match(server, /STEM subject attempts and marking submissions stay in STEM/i,
  "Product facts must keep STEM learning data inside STEM Campus");
assert.match(server, /Do not claim unrelated results,\s*progress,\s*notebooks,\s*or access tokens sync between products/i,
  "Product facts must not claim unrelated scores, tokens, or notebooks synchronize");
assert.match(app, /vocabularyItemKey\(item\)/, "Known progress must use stable item keys");
assert.match(html, /2,900\+ IG and A-Level terms across STEM, business, humanities, creative and English studies/);

console.log(`IG + A-Level vocabulary checks passed: ${catalog.items.length} items (${counts.physics} Physics, ${counts.mathematics} Mathematics, ${counts.chemistry} Chemistry, ${counts.economics} Economics, ${counts.biology} Biology, ${counts["exam-language"]} exam-language).`);
