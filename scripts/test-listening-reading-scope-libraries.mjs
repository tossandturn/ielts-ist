import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 6400 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve("artifacts", "listening-reading-scope-libraries");
await mkdir(outputDir, { recursive: true });

function resolveRequiredListeningAsrCache() {
  const checked = [];
  if (process.env.LISTENING_ASR_CACHE_PATH) {
    const configured = resolve(process.env.LISTENING_ASR_CACHE_PATH);
    if (!existsSync(configured)) throw new Error(`Configured LISTENING_ASR_CACHE_PATH does not exist: ${configured}`);
    return configured;
  }
  const local = resolve(fileURLToPath(root), "data", "listening-asr-cache.json");
  checked.push(local);
  if (existsSync(local)) return local;
  const commonDirResult = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    cwd: root,
    encoding: "utf8",
  });
  if (commonDirResult.status === 0) {
    const commonDir = resolve(commonDirResult.stdout.trim());
    if (basename(commonDir).toLowerCase() === ".git") {
      const shared = join(dirname(commonDir), "data", "listening-asr-cache.json");
      checked.push(shared);
      if (existsSync(shared)) return shared;
    }
  }
  throw new Error(`Listening ASR cache is required for this suite. Set LISTENING_ASR_CACHE_PATH or provide the shared checkout cache. Checked: ${checked.join(", ")}`);
}

const listeningAsrCachePath = resolveRequiredListeningAsrCache();
console.log(`REQUIRED ASR cache: ${listeningAsrCachePath}`);

const validationTempDir = await mkdtemp(join(tmpdir(), "ieltsist-semantic-validation-"));
try {
  const missingAsrPath = join(validationTempDir, "missing-asr-cache.json");
  const explicitMissingAsr = spawnSync(process.execPath, [resolve("scripts", "generate-objective-semantic-topics.mjs"), "--check", "--asr-cache", missingAsrPath], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(explicitMissingAsr.status, 0, "An explicit missing --asr-cache path must not fall back");
  assert.match(explicitMissingAsr.stderr, /explicit ASR cache.*not found/i);

  const envMissingAsr = spawnSync(process.execPath, [resolve("scripts", "generate-objective-semantic-topics.mjs"), "--check"], {
    cwd: root,
    env: { ...process.env, LISTENING_ASR_CACHE_PATH: missingAsrPath },
    encoding: "utf8",
  });
  assert.notEqual(envMissingAsr.status, 0, "A missing LISTENING_ASR_CACHE_PATH must not fall back");
  assert.match(envMissingAsr.stderr, /configured ASR cache.*not found/i);

  for (const option of ["--output", "--asr-cache"]) {
    const missingValue = spawnSync(process.execPath, [resolve("scripts", "generate-objective-semantic-topics.mjs"), option], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(missingValue.status, 0, `${option} without a value must fail`);
    assert.match(missingValue.stderr, new RegExp(`${option} requires a path argument`));
  }

  const missingCatalogPath = join(validationTempDir, "missing-semantic-catalog.json");
  const missingCatalog = spawnSync(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: "0", OBJECTIVE_SEMANTIC_TOPICS_PATH: missingCatalogPath },
    encoding: "utf8",
    timeout: 5_000,
  });
  assert.notEqual(missingCatalog.status, 0, "Server startup must reject a missing semantic catalog");
  assert.match(missingCatalog.stderr, /Semantic topic catalog is missing/i);

  const corruptCatalogPath = join(validationTempDir, "corrupt-semantic-catalog.json");
  await writeFile(corruptCatalogPath, "{not-json", "utf8");
  const corruptCatalog = spawnSync(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: "0", OBJECTIVE_SEMANTIC_TOPICS_PATH: corruptCatalogPath },
    encoding: "utf8",
    timeout: 5_000,
  });
  assert.notEqual(corruptCatalog.status, 0, "Server startup must reject a corrupt semantic catalog");
  assert.match(corruptCatalog.stderr, /Semantic topic catalog is not valid JSON/i);

  const partialCatalogPath = join(validationTempDir, "partial-semantic-catalog.json");
  await writeFile(partialCatalogPath, JSON.stringify({
    "cam4-l-test1::section::1": {
      topicKey: "travel",
      topicLabel: "Travel",
      emoji: "✈️",
      topicTitle: "A school trip",
      source: "test-fixture",
      confidence: 0.9,
      schemaVersion: 1,
    },
  }), "utf8");
  const partialCatalog = spawnSync(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: "0", OBJECTIVE_SEMANTIC_TOPICS_PATH: partialCatalogPath },
    encoding: "utf8",
    timeout: 5_000,
  });
  assert.notEqual(partialCatalog.status, 0, "Server startup must reject a partial semantic catalog");
  assert.match(partialCatalog.stderr, /Semantic topic catalog must contain exactly 504 entries/i);
} finally {
  await rm(validationTempDir, { recursive: true, force: true });
}
console.log("PASS semantic topic generator inputs and server startup catalog validation");

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), LISTENING_ASR_CACHE_PATH: listeningAsrCachePath },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverStderr = "";
child.stderr.on("data", (chunk) => { serverStderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Scope library server did not start. ${serverStderr}`);
}

function questionNumber(question, index = 0) {
  return Number(String(question?.id || question?.text || index + 1).match(/\d{1,2}/)?.[0] || index + 1);
}

function expectedQuestionIds(item, predicate) {
  return item.questions.filter(predicate).map((question) => question.id);
}

async function activateModule(page, moduleName) {
  await page.locator(`[data-view="single"][data-module-target="${moduleName}"]`).evaluate((node) => node.click());
  await page.waitForFunction((module) => document.querySelector("#single")?.classList.contains("active")
    && document.querySelector("#singleTitle")?.textContent?.toLowerCase().includes(module), moduleName);
  assert.equal(await page.locator("[data-single-scope]").count(), 4, `${moduleName} must expose four scope tabs`);
}

async function renderedQuestionIds(page) {
  return page.locator('.answer-input[data-prefix="single"]').evaluateAll((nodes) => nodes.map((node) => node.dataset.qid));
}

async function installGuestState(page, session = null) {
  await page.addInitScript((savedSession) => {
    if (sessionStorage.getItem("lrScopeTestInitialized") === "1") return;
    sessionStorage.setItem("lrScopeTestInitialized", "1");
    localStorage.removeItem("ieltsistAuthToken");
    localStorage.removeItem("ieltsistLearningLoopHistory");
    if (savedSession) localStorage.setItem("ieltsistPracticeSessionV1", JSON.stringify(savedSession));
    else localStorage.removeItem("ieltsistPracticeSessionV1");
  }, session);
}

await waitForServer();
const tasks = await (await fetch(`${baseUrl}/api/tasks?test=lr-scope-contract`)).json();
const cam15Source = JSON.parse(await readFile(resolve("data", "cambridge15-bank.json"), "utf8"));
assert.equal(tasks.listeningTests.length, 72, "The existing Listening paper library must remain intact");
assert.equal(tasks.readingTests.length, 72, "The existing Reading paper library must remain intact");
assert.ok(tasks.listeningTests.every((item) => item.questions.length === 40), "Every Listening source paper must keep all 40 questions");
assert.ok(tasks.readingTests.every((item) => item.questions.length === 40), "Every Reading source paper must keep all 40 questions");
const listeningTypes = new Set(tasks.listeningTests.flatMap((item) => item.questions).map((question) => question.type).filter((type) => type && type !== "unknown"));
const readingTypes = new Set(tasks.readingTests.flatMap((item) => item.questions).map((question) => question.type).filter((type) => type && type !== "unknown"));
assert.ok(listeningTypes.size >= 5, `Listening needs truthful topic metadata; found ${listeningTypes.size} recognized types`);
assert.ok(readingTypes.size >= 8, `Reading topic metadata regressed; found ${readingTypes.size} recognized types`);
console.log(`PASS API preserves 72+72 full papers and exposes ${listeningTypes.size}/${readingTypes.size} recognized types`);

const listeningPaper = tasks.listeningTests.find((item) => item.id === "cam15-l-test1");
const readingPaper = tasks.readingTests.find((item) => item.id === "cam15-r-test1");
const cam15Reading2 = tasks.readingTests.find((item) => item.id === "cam15-r-test2");
const cam15Reading3 = tasks.readingTests.find((item) => item.id === "cam15-r-test3");
assert.ok(listeningPaper && readingPaper, "Cambridge 15 Test 1 fixtures are required");
assert.equal(listeningPaper.contentTopics?.["1"]?.key, "work", "Cambridge 15 Test 1 Section 1 recruitment must be a Work topic");
assert.equal(listeningPaper.contentTopics?.["2"]?.key, "travel", "Cambridge 15 Test 1 Section 2 holidays must be a Travel topic");
assert.ok(
  ["nature", "environment"].includes(listeningPaper.contentTopics?.["4"]?.key),
  "Cambridge 15 Test 1 Section 4 eucalyptus must be a Nature or Environment topic",
);
for (const passage of ["1", "2", "3"]) {
  assert.ok(readingPaper.contentTopics?.[passage]?.key, `Cambridge 15 Test 1 Passage ${passage} needs a semantic topic key`);
  assert.ok(readingPaper.contentTopics?.[passage]?.title, `Cambridge 15 Test 1 Passage ${passage} needs a source-derived topic title`);
}
assert.deepEqual(readingPaper.contentTopics?.["1"], {
  key: "history",
  label: "History & Archaeology",
  emoji: "🏺",
  title: "Nutmeg – a valuable spice",
  source: "readingPaper:curated-title+semantic-override",
  confidence: readingPaper.contentTopics?.["1"]?.confidence,
  schemaVersion: 1,
}, "Cambridge 15 Test 1 Passage 1 must describe the history of nutmeg, not instructions or answer mechanics");
assert.equal(cam15Reading2?.contentTopics?.["1"]?.key, "architecture");
assert.equal(cam15Reading2?.contentTopics?.["1"]?.title, "Could urban engineers learn from dance?");
assert.equal(cam15Reading3?.contentTopics?.["1"]?.key, "culture");
assert.equal(cam15Reading3?.contentTopics?.["1"]?.title, "Henry Moore (1898–1986)");
assert.equal(cam15Reading3?.contentTopics?.["2"]?.key, "science");
assert.equal(cam15Reading3?.contentTopics?.["2"]?.title, "The Desolenator: producing clean water");
const expectedCam15ReadingTopics = {
  "cam15-r-test1": [
    ["history", "Nutmeg – a valuable spice"],
    ["transport", "Driverless cars"],
    ["travel", "What is exploration?"],
  ],
  "cam15-r-test2": [
    ["architecture", "Could urban engineers learn from dance?"],
    ["environment", "Should we try to bring extinct species back to life?"],
    ["psychology", "Having a laugh"],
  ],
  "cam15-r-test3": [
    ["culture", "Henry Moore (1898–1986)"],
    ["science", "The Desolenator: producing clean water"],
    ["culture", "Why fairy tales are really scary tales"],
  ],
  "cam15-r-test4": [
    ["environment", "The return of the huarango"],
    ["culture", "Silbo Gomero – the whistle ‘language’ of the Canary Islands"],
    ["business", "Environmental practices of big businesses"],
  ],
};
for (const [paperId, expectedTopics] of Object.entries(expectedCam15ReadingTopics)) {
  const paper = tasks.readingTests.find((item) => item.id === paperId);
  assert.ok(paper, `${paperId} is required for the Cambridge 15 semantic audit`);
  expectedTopics.forEach(([key, title], index) => {
    assert.equal(paper.contentTopics?.[String(index + 1)]?.key, key, `${paperId} Passage ${index + 1} semantic key`);
    assert.equal(paper.contentTopics?.[String(index + 1)]?.title, title, `${paperId} Passage ${index + 1} source title`);
  });
}
const representativeReadingCategories = {
  "cam6-r-test2::section::1": ["transport", "Advantages of Public Transport"],
  "cam7-r-test1::section::2": ["environment", "Making Every Drop Count"],
  "cam14-r-test1::section::2": ["transport", "The Growth of Bike-sharing Schemes"],
  "cam18-r-test2::section::1": ["history", "Stonehenge"],
  "cam20-r-test2::section::1": ["environment", "Manatees"],
  "cam21-r-test2::section::3": ["science", "Artificial Intelligence"],
};
for (const [canonicalId, [expectedKey, expectedTitle]] of Object.entries(representativeReadingCategories)) {
  const [paperId, , passage] = canonicalId.split("::");
  const topic = tasks.readingTests.find((item) => item.id === paperId)?.contentTopics?.[passage];
  assert.equal(topic?.title, expectedTitle, `${canonicalId} representative source title`);
  assert.equal(topic?.key, expectedKey, `${canonicalId} representative semantic category`);
}
const representativeListeningCategories = {
  "cam4-l-test2::section::4": ["society", "you'll hear the beginning of one lecture in a series of lectures about crime"],
  "cam6-l-test1::section::1": ["health", "telephoning a sports club to ask about membership and facilities"],
  "cam8-l-test2::section::3": ["environment", "part of a seminar in which a researcher called grant Freeman discusses his work on Australian honeybees with a group..."],
  "cam11-l-test4::section::4": ["environment", "part of a lecture about a way of reducing the amount of carbon dioxide in the atmosphere"],
  "cam13-l-test1::section::2": ["transport", "the chairman of the highways committee of Granford speaking to members of the public about proposed changes to..."],
  "cam15-l-test1::section::3": ["psychology", "two psychology students discussing the effects of the order in which the children in a family are born"],
  "cam18-l-test3::section::4": ["science", "part of a lecture for astronomy students about the need for a system to manage satellites and other objects orbiting..."],
  "cam19-l-test1::section::4": ["history", "an archaeology student giving a presentation on an important site in Ireland called the kgey fields"],
  "cam21-l-test3::section::1": ["travel", "Part one, you will hear a woman asking a friend for advice on travelling by ferry to an island in Scotland"],
  "cam21-l-test3::section::3": ["environment", "part of a discussion between two textile students about their research into sustainable fashion"],
  "cam21-l-test4::section::3": ["architecture", "two architecture students called mia and Leo discussing their presentation on houses of the future"],
};
for (const [canonicalId, [expectedKey, expectedTitle]] of Object.entries(representativeListeningCategories)) {
  const [paperId, , section] = canonicalId.split("::");
  const topic = tasks.listeningTests.find((item) => item.id === paperId)?.contentTopics?.[section];
  assert.equal(topic?.title, expectedTitle, `${canonicalId} representative ASR-derived title`);
  assert.equal(topic?.key, expectedKey, `${canonicalId} representative semantic category`);
}
const questionTypeKeys = new Set([...listeningTypes, ...readingTypes]);
for (const paper of [...tasks.listeningTests, ...tasks.readingTests]) {
  for (const topic of Object.values(paper.contentTopics || {})) {
    assert.ok(!questionTypeKeys.has(topic.key), `${paper.id} uses question type ${topic.key} as a semantic topic`);
  }
}
const semanticCatalog = JSON.parse(await readFile(resolve("data", "objective-semantic-topics.json"), "utf8"));
const semanticEntries = Object.entries(semanticCatalog);
assert.equal(semanticEntries.filter(([id]) => /-l-test\d+::section::[1-4]$/.test(id)).length, 288, "Semantic catalog needs all 288 Listening Sections");
assert.equal(semanticEntries.filter(([id]) => /-r-test\d+::section::[1-3]$/.test(id)).length, 216, "Semantic catalog needs all 216 Reading Passages");
const stableReadingTopicKeys = new Set([
  "work", "travel", "education", "environment", "health", "science", "history",
  "culture", "society", "business", "transport", "architecture", "psychology", "food",
]);
const stableListeningTopicKeys = stableReadingTopicKeys;
assert.deepEqual(
  semanticEntries
    .filter(([id, topic]) => /-l-test\d+::section::[1-4]$/.test(id) && !stableListeningTopicKeys.has(topic.topicKey))
    .map(([id, topic]) => [id, topic.topicKey, topic.topicTitle]),
  [],
  "All Listening sections must use the stable 14-category semantic taxonomy",
);
assert.deepEqual(
  semanticEntries
    .filter(([id, topic]) => /-r-test\d+::section::[1-3]$/.test(id) && !stableReadingTopicKeys.has(topic.topicKey))
    .map(([id, topic]) => [id, topic.topicKey, topic.topicTitle]),
  [],
  "All Reading passages must use the stable 14-category semantic taxonomy",
);
for (const [id, topic] of semanticEntries) {
  assert.ok(topic.topicKey && topic.topicLabel && topic.emoji && topic.topicTitle, `${id} needs complete semantic display metadata`);
  assert.ok(topic.source && Number.isFinite(topic.confidence) && topic.schemaVersion, `${id} needs reproducibility metadata`);
  assert.ok(!questionTypeKeys.has(topic.topicKey), `${id} catalog key ${topic.topicKey} is an IELTS question type`);
  if (/-r-test\d+::section::[1-3]$/.test(id)) {
    assert.doesNotMatch(topic.topicTitle, /^(?:complete|choose|write|questions?|in boxes|true|false|not given)\b/i, `${id} title is an IELTS instruction`);
    assert.doesNotMatch(topic.topicTitle, /\.\.\.$/, `${id} title is a truncated paragraph fragment`);
    assert.doesNotMatch(topic.topicTitle, /^Reading Passage \d$/i, `${id} title is a generic passage placeholder`);
    assert.doesNotMatch(
      topic.topicTitle,
      /\b(?:and|or|the|a|an|of|to|with|for|from|in|on|by|as|that|which|who|were|was|is|are)[|. ]*$/i,
      `${id} title ends as an incomplete paragraph fragment`,
    );
  }
}
const unsafeReadingTitles = semanticEntries
  .filter(([id]) => /-r-test\d+::section::[1-3]$/.test(id))
  .map(([id, topic]) => {
    const title = String(topic.topicTitle || "").trim();
    const reasons = [];
    if (/ — Passage \d$/i.test(title)) reasons.push("category placeholder");
    if (/\b(?:below|following pages|answer sheet|write your answers|complete the|choose the|questions? \d|in boxes|list of headings)\b/i.test(title)) reasons.push("IELTS instruction");
    if (/^Reading Passage \d$/i.test(title)) reasons.push("generic passage title");
    if (/\.\.\.$/.test(title) || /\b(?:and|or|the|a|an|of|to|with|for|from|in|on|by|as|that|which|who|were|was|is|are)[|. ]*$/i.test(title)) reasons.push("truncated fragment");
    if (/^[a-z]|^\d+\s|[|~@]{2,}|[•·]{2,}|[^\p{L}\p{N}\s'’“”‘’().:,?!&+\-–—]/u.test(title)) reasons.push("OCR garbage or body fragment");
    if (title.length < 4 || title.length > 100) reasons.push("unsafe length");
    return reasons.length ? { id, title, reasons } : null;
  })
  .filter(Boolean);
assert.deepEqual(unsafeReadingTitles, [], `All 216 Reading passages need safe source-derived human titles:\n${JSON.stringify(unsafeReadingTitles, null, 2)}`);
assert.equal(
  semanticEntries.filter(([id, topic]) => /-r-test\d+::section::[1-3]$/.test(id) && /^readingPaper:curated-title/.test(topic.source)).length,
  216,
  "Every Reading passage title must come from the reviewed source-title catalog",
);
assert.equal(
  semanticEntries.filter(([id, topic]) => /-r-test\d+::section::[1-3]$/.test(id) && topic.source === "readingPaper:curated-title+semantic-override").length,
  216,
  "Every Reading passage category must come from the deterministic audited override table",
);
assert.equal(
  semanticEntries.filter(([id, topic]) => /-l-test\d+::section::[1-4]$/.test(id) && /\+semantic-override$/.test(topic.source)).length,
  288,
  "Every Listening section category must come from the deterministic audited override table",
);
const cam9MismatchSection3 = semanticCatalog["cam9-l-test4::section::3"];
const cam9MismatchSection4 = semanticCatalog["cam9-l-test4::section::4"];
assert.match(cam9MismatchSection3?.source || "", /cache-repair:cam9-l-test4::4/, "Cambridge 9 Test 4 Section 3 must use the explicitly repaired cache entry");
assert.match(cam9MismatchSection4?.source || "", /cache-repair:cam9-l-test4::3/, "Cambridge 9 Test 4 Section 4 must use the explicitly repaired cache entry");
assert.equal(cam9MismatchSection3?.topicKey, "education");
assert.equal(cam9MismatchSection3?.topicTitle, "a conversation between an English teacher called Paul and a former student of his called Kira");
assert.equal(cam9MismatchSection4?.topicKey, "environment");
assert.equal(cam9MismatchSection4?.topicTitle, "a project on the wildlife found in city gardens in Britain");
const reproducibility = spawnSync(process.execPath, [resolve("scripts", "generate-objective-semantic-topics.mjs"), "--check"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(reproducibility.status, 0, `Semantic topic catalog must be reproducible:\n${reproducibility.stdout}\n${reproducibility.stderr}`);
console.log("PASS semantic catalog covers 288 Listening Sections and 216 Reading Passages with the Cambridge 9 cache mismatch repaired");
const preservedQuestionFields = (paper) => paper.questions.map(({ id, text, answer }) => ({ id, text, answer }));
const sourceListeningPaper = cam15Source.listeningTests.find((item) => item.id === listeningPaper.id);
const sourceReadingPaper = cam15Source.readingTests.find((item) => item.id === readingPaper.id);
assert.deepEqual(preservedQuestionFields(listeningPaper), preservedQuestionFields(sourceListeningPaper), "Listening question ids, text and answers must remain unchanged");
assert.deepEqual(preservedQuestionFields(readingPaper), preservedQuestionFields(sourceReadingPaper), "Reading question ids, text and answers must remain unchanged");
assert.deepEqual(listeningPaper.audioUrls, sourceListeningPaper.audioUrls, "All existing Listening audio must remain unchanged");
assert.deepEqual(listeningPaper.questionPageImages, sourceListeningPaper.questionPageImages.map(({ page, url }) => ({ page, url })), "All existing Listening paper images must remain unchanged");
console.log("PASS original Cambridge question text, answers and Listening media are preserved");
const questionType = (paper, id) => paper?.questions.find((question) => question.id === id)?.type;
assert.equal(questionType(listeningPaper, "q21"), "matching", "Cambridge 15 Listening Q21 is matching, not multiple choice");
assert.equal(questionType(listeningPaper, "q29"), "multiple_choice_multiple", "Cambridge 15 Listening Q29 is genuine multiple-answer multiple choice");
const cam12Listening2 = tasks.listeningTests.find((item) => item.id === "cam12-l-test2");
const cam10Listening2 = tasks.listeningTests.find((item) => item.id === "cam10-l-test2");
assert.equal(questionType(cam12Listening2, "q26"), "diagram_completion");
assert.equal(questionType(cam10Listening2, "q1"), "note_completion");
assert.equal(questionType(cam10Listening2, "q15"), "matching");
assert.equal(questionType(cam10Listening2, "q25"), "multiple_choice");
assert.equal(questionType(cam10Listening2, "q31"), "note_completion");
console.log("PASS Listening OCR metadata distinguishes completion, matching and real multiple choice");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (error) => { console.error(`BROWSER ERROR: ${error.stack || error.message}`); });
  await installGuestState(page);
  await page.goto(`${baseUrl}/?test=lr-scope-desktop#home`, { waitUntil: "networkidle" });

  await activateModule(page, "listening");
  assert.deepEqual(await page.locator("[data-single-scope]").evaluateAll((nodes) => nodes.map((node) => node.dataset.singleScope)), ["paper", "section", "topic", "review"]);
  assert.match(await page.locator(".single-launch-shell").innerText(), /Full tests[\s\S]*Sections[\s\S]*Topics[\s\S]*Review mistakes/i);
  assert.ok(await page.locator("#singleLaunchSelect option").count() >= 72, "Full Listening must retain the original paper selector");
  assert.match(await page.locator("#singleLaunchSelect option").first().innerText(), /(?:✓ Completed|○ Not completed)/, "Full-paper selector labels need text completion status");
  assert.match(await page.locator(".single-launch-card.recommended").innerText(), /(?:✓ Completed|○ Not completed)/, "Recommended full-paper card needs text completion status");
  for (const id of ["singleUnitFilter", "singleTopicFilter", "singleCompletionFilter"]) {
    assert.equal(await page.locator(`#${id}`).count(), 1, `${id} control must exist`);
  }
  await page.locator("#singleCompletionFilter").selectOption("completed");
  assert.match(await page.locator(".practice-unit-empty").innerText(), /No full tests match the current filters[\s\S]*adjust or clear/i, "Full-paper filters need a clear empty state");
  await page.locator("#singleCompletionFilter").selectOption("all");

  await page.locator('[data-single-scope="section"]').click();
  await page.locator("#singleBookFilter").selectOption("15");
  await page.locator("#singleTestFilter").selectOption("1");
  await page.locator("#singleUnitFilter").selectOption("3");
  await page.locator("#singleCompletionFilter").selectOption("not-completed");
  assert.deepEqual(
    await page.locator('[data-practice-unit-scope="section"]').evaluateAll((nodes) => nodes.map((node) => node.dataset.practiceUnitId)),
    ["cam15-l-test1::section::3"],
    "Cambridge 15 + Test 1 + Section 3 + Not completed must combine",
  );
  assert.equal(await page.locator('[data-practice-unit-id="cam15-l-test1::section::3"]').getAttribute("data-practice-section"), "3");
  assert.equal(await page.locator('[data-practice-unit-id="cam15-l-test1::section::3"]').getAttribute("data-practice-status"), "not-completed");
  await page.locator("#singleCompletionFilter").selectOption("completed");
  assert.match(await page.locator(".practice-unit-empty").innerText(), /No practice units match the current filters[\s\S]*adjust or clear/i, "Empty filter combinations need a clear recovery message");
  await page.locator("#singleCompletionFilter").selectOption("not-completed");
  await page.locator("#singleUnitFilter").selectOption("1");
  const listeningSectionCard = page.locator('[data-practice-unit-id="cam15-l-test1::section::1"]');
  assert.equal(await listeningSectionCard.count(), 1, "Listening Section 1 must be an independent unit");
  assert.match(await listeningSectionCard.innerText(), /Section 1[\s\S]*10 questions[\s\S]*10 min/i);
  await listeningSectionCard.locator("[data-start-practice-unit]").click();
  await page.waitForFunction(() => document.body.classList.contains("single-immersive-mode"));
  assert.deepEqual(await renderedQuestionIds(page), expectedQuestionIds(listeningPaper, (question, index) => questionNumber(question, index) <= 10));
  assert.equal(await page.locator("#singleTimer").innerText(), "00:10:00");
  assert.equal(await page.locator('[data-active-practice-unit="cam15-l-test1::section::1"]').count(), 1);
  assert.equal(await page.locator('#single-listening-studio').getAttribute("data-listening-id"), "cam15-l-test1", "Section ASR cache lookup must use the source paper id");
  const activeAudioSections = await page.locator("[data-listening-section]").evaluateAll((nodes) => nodes.filter((node) => !node.hidden && getComputedStyle(node).display !== "none").length);
  assert.equal(activeAudioSections, 1, "A Listening Section unit must expose one audio section");
  const cached = await (await fetch(`${baseUrl}/api/listening/asr-cache?id=cam15-l-test1&section=1`)).json();
  assert.ok(cached.available && cached.sentences.length && cached.timedWords.length && cached.speakers.length, "Section must reuse the required timestamped offline ASR cache");
  assert.ok(cached.timedWords.every((word) => Number.isFinite(Number(word.start)) && Number.isFinite(Number(word.end))), "Every cached word must expose real start/end timing");
  await page.locator('.listening-caption-toggle[data-section="1"]').click();
  await page.waitForFunction(() => /ASR cache/i.test(document.querySelector("#singleCaptionKicker")?.textContent || ""));
  const captionSeekTime = Number(cached.timedWords[Math.min(20, cached.timedWords.length - 1)].start) + 0.05;
  await page.locator('.listening-player[data-prefix="single"][data-section="1"]').evaluate((audio, time) => {
    audio.currentTime = time;
    audio.dispatchEvent(new Event("seeked"));
    audio.dispatchEvent(new Event("timeupdate"));
  }, captionSeekTime);
  await page.waitForFunction(() => document.querySelectorAll("#singleCaptionLine .caption-display-line").length > 0);
  assert.ok(await page.locator("#singleCaptionLine .caption-display-line").count() > 0, "Timed cache seek must render caption conversation lines");
  assert.ok(await page.locator('#singleCaptionLine [class*="caption-voice-"]').count() > 0, "Rendered captions must retain speaker voice classes");
  console.log(`PASS REQUIRED ASR assertion executed: ${cached.timedWords.length} timed words, ${cached.speakers.length} speakers, rendered caption bubbles`);

  const q1 = page.locator('.answer-input[data-prefix="single"][data-qid="q1"]');
  await q1.fill("Jamieson");
  await page.waitForTimeout(700);
  let savedSession = await page.evaluate(() => JSON.parse(localStorage.getItem("ieltsistPracticeSessionV1")));
  assert.equal(savedSession.itemId, "cam15-l-test1::section::1");
  assert.equal(savedSession.scopes.listening, "section");
  assert.equal(savedSession.answerItemId, "cam15-l-test1::section::1");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector('[data-active-practice-unit="cam15-l-test1::section::1"]'));
  assert.equal(await q1.inputValue(), "Jamieson", "Scoped answers must restore after refresh");
  await page.locator("#submitSingle").click();
  await page.waitForFunction(() => document.querySelector('[data-objective-module="listening"]'));
  const scopedResult = await page.evaluate(() => JSON.parse(localStorage.getItem("ieltsistLearningLoopHistory")).objectiveItems["cam15-l-test1::section::1"]);
  assert.equal(scopedResult.itemId, "cam15-l-test1::section::1");
  assert.equal(scopedResult.total, 10);
  assert.equal(scopedResult.band, null, "A 10-question Section score must not be presented as an official IELTS Band");
  console.log("PASS Listening Section identity, timer, media, answers, refresh and independent raw score history");

  await activateModule(page, "listening");
  await page.locator('[data-single-scope="topic"]').click();
  await page.locator("#singleBookFilter").selectOption("15");
  await page.locator("#singleTestFilter").selectOption("1");
  await page.locator("#singleCompletionFilter").selectOption("all");
  await page.locator("#singleUnitFilter").selectOption("1");
  await page.locator("#singleTopicFilter").selectOption("work");
  assert.deepEqual(await page.locator('[data-practice-unit-scope="topic"]').evaluateAll((nodes) => nodes.map((node) => node.dataset.practiceUnitId)), ["cam15-l-test1::section::1"], "Semantic Topic must combine with Cambridge and Section filters");
  await page.locator("#singleUnitFilter").selectOption("2");
  assert.equal(await page.locator("#singleTopicFilter").inputValue(), "all", "Changing the unit must safely reset an unavailable dependent Topic");
  await page.locator("#singleUnitFilter").selectOption("all");
  await page.locator("#singleCompletionFilter").selectOption("completed");
  const listeningTopicCard = page.locator('[data-practice-unit-scope="topic"][data-practice-unit-id="cam15-l-test1::section::1"]');
  const listeningTopicUnitId = await listeningTopicCard.getAttribute("data-practice-unit-id");
  const listeningContentTopic = await listeningTopicCard.getAttribute("data-content-topic");
  assert.equal(listeningTopicUnitId, "cam15-l-test1::section::1", "Topic completion must share the Section canonical id immediately after submission");
  assert.equal(listeningContentTopic, "work");
  assert.equal(await listeningTopicCard.getAttribute("data-topic-type"), null, "Semantic Topic cards must never expose question-type data");
  assert.equal(await listeningTopicCard.getAttribute("data-practice-status"), "completed");
  assert.match(
    await listeningTopicCard.innerText(),
    new RegExp(`Work[\\s\\S]*${listeningPaper.contentTopics["1"].title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*✓ Completed`, "i"),
  );
  const listeningTopicBaseId = listeningTopicUnitId.split("::")[0];
  await listeningTopicCard.locator("[data-start-practice-unit]").click();
  assert.deepEqual(await renderedQuestionIds(page), expectedQuestionIds(listeningPaper, (question, index) => questionNumber(question, index) <= 10));
  assert.equal(await page.locator("[data-active-topic-type]").count(), 0);
  assert.equal(await page.locator('#single-listening-studio').getAttribute("data-listening-id"), listeningTopicBaseId, "Topic ASR cache lookup must use the source paper id");
  console.log("PASS Listening Topic uses one complete semantic Section and shares canonical completion");

  await page.evaluate(() => ["singleBookFilter", "singleTestFilter", "singleUnitFilter", "singleTopicFilter", "singleCompletionFilter"]
    .forEach((id) => { const select = document.getElementById(id); if (select) select.value = "all"; }));
  await activateModule(page, "reading");
  assert.ok(await page.locator("#singleLaunchSelect option").count() >= 72, "Full Reading must retain the original paper selector");
  await page.locator('[data-single-scope="section"]').click();
  const readingPassageCard = page.locator('[data-practice-unit-id="cam15-r-test1::section::2"]');
  assert.equal(await readingPassageCard.count(), 1, "Reading Passage 2 must be an independent unit");
  assert.match(await readingPassageCard.innerText(), /Passage 2[\s\S]*13 questions[\s\S]*20 min/i);
  await readingPassageCard.locator("[data-start-practice-unit]").click();
  assert.deepEqual(await renderedQuestionIds(page), expectedQuestionIds(readingPaper, (question, index) => {
    const number = questionNumber(question, index);
    return number >= 14 && number <= 26;
  }));
  assert.equal(await page.locator("#singleTimer").innerText(), "00:20:00");
  assert.equal(await page.locator('[data-active-practice-unit="cam15-r-test1::section::2"]').count(), 1);
  await page.locator("#submitSingle").click();
  await page.waitForFunction(() => document.querySelector('[data-objective-module="reading"]'));
  const passageResult = await page.evaluate(() => JSON.parse(localStorage.getItem("ieltsistLearningLoopHistory")).objectiveItems["cam15-r-test1::section::2"]);
  assert.equal(passageResult.total, 13);
  assert.equal(passageResult.band, null, "A Passage score must remain raw correct/total rather than an official IELTS Band");
  console.log("PASS Reading Passage identity, question range, timer and independent raw score history");

  await page.evaluate(() => ["singleBookFilter", "singleTestFilter", "singleUnitFilter", "singleTopicFilter", "singleCompletionFilter"]
    .forEach((id) => { const select = document.getElementById(id); if (select) select.value = "all"; }));
  await activateModule(page, "reading");
  await page.locator('[data-single-scope="section"]').click();
  await page.locator("#singleBookFilter").selectOption("15");
  await page.locator("#singleTestFilter").selectOption("1");
  await page.locator("#singleUnitFilter").selectOption("2");
  await page.locator("#singleCompletionFilter").selectOption("completed");
  const completedPassageCards = page.locator('[data-practice-unit-scope="section"]');
  assert.equal(await completedPassageCards.count(), 1, "Reading Passage 2 + Completed must isolate the submitted canonical unit");
  assert.equal(await completedPassageCards.first().getAttribute("data-practice-unit-id"), "cam15-r-test1::section::2");
  assert.equal(await completedPassageCards.first().getAttribute("data-practice-status"), "completed");

  await activateModule(page, "reading");
  await page.locator('[data-single-scope="topic"]').click();
  await page.locator("#singleBookFilter").selectOption("15");
  await page.locator("#singleTestFilter").selectOption("1");
  await page.locator("#singleUnitFilter").selectOption("2");
  await page.locator("#singleCompletionFilter").selectOption("completed");
  const readingTopicCard = page.locator('[data-practice-unit-scope="topic"]').first();
  const readingTopicUnitId = await readingTopicCard.getAttribute("data-practice-unit-id");
  assert.equal(readingTopicUnitId, "cam15-r-test1::section::2");
  assert.equal(await readingTopicCard.getAttribute("data-content-topic"), readingPaper.contentTopics["2"].key);
  assert.equal(await readingTopicCard.getAttribute("data-topic-type"), null);
  assert.match(await readingTopicCard.innerText(), new RegExp(readingPaper.contentTopics["2"].title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  await readingTopicCard.locator("[data-start-practice-unit]").click();
  assert.deepEqual(await renderedQuestionIds(page), expectedQuestionIds(readingPaper, (question, index) => {
    const number = questionNumber(question, index);
    return number >= 14 && number <= 26;
  }));
  assert.equal(await page.locator("[data-active-topic-type]").count(), 0);
  await page.screenshot({ path: resolve(outputDir, "desktop-reading-topic.png"), fullPage: true });
  console.log("PASS Reading Topic uses semantic Passage content rather than question type");
  await page.close();

  const legacyPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await installGuestState(legacyPage, {
    version: 1,
    sessionId: "legacy-listening-section",
    revision: 0,
    view: "single",
    module: "listening",
    itemId: "cam15-l-test1",
    started: true,
    modes: { listening: "training", reading: "full" },
    sections: { listening: 2, reading: 1 },
    answers: { q11: "B" },
    answerItemId: "cam15-l-test1",
    seconds: 550,
    total: 600,
    updatedAt: new Date().toISOString(),
  });
  await legacyPage.goto(`${baseUrl}/?test=lr-scope-legacy#single`, { waitUntil: "networkidle" });
  await legacyPage.waitForFunction(() => document.querySelector('[data-active-practice-unit="cam15-l-test1::section::2"]'));
  assert.equal(await legacyPage.locator('.answer-input[data-qid="q11"]').inputValue(), "B");
  assert.equal(await legacyPage.evaluate(() => JSON.parse(localStorage.getItem("ieltsistPracticeSessionV1")).itemId), "cam15-l-test1", "Legacy storage must not be destructively rewritten during restore");
  console.log("PASS legacy Listening Training session maps to the Section library");
  await legacyPage.close();

  const legacyTopicType = readingPaper.questions.find((question) => question.type && question.type !== "unknown")?.type;
  const legacyTopicPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await installGuestState(legacyTopicPage, {
    version: 1,
    sessionId: "legacy-reading-question-type-topic",
    revision: 0,
    view: "single",
    module: "reading",
    itemId: `cam15-r-test1::topic::${legacyTopicType}`,
    started: true,
    modes: { listening: "exam", reading: "type" },
    scopes: { listening: "paper", reading: "topic" },
    sections: { listening: 1, reading: 1 },
    readingQuestionType: legacyTopicType,
    answers: {},
    answerItemId: `cam15-r-test1::topic::${legacyTopicType}`,
    seconds: 900,
    total: 1200,
    updatedAt: new Date().toISOString(),
  });
  await legacyTopicPage.goto(`${baseUrl}/?test=lr-scope-legacy-topic#single`, { waitUntil: "networkidle" });
  await legacyTopicPage.waitForFunction((id) => document.querySelector(`[data-active-practice-unit="${id}"]`), `cam15-r-test1::topic::${legacyTopicType}`);
  assert.deepEqual(await renderedQuestionIds(legacyTopicPage), expectedQuestionIds(readingPaper, (question) => question.type === legacyTopicType));
  console.log("PASS old question-type Topic session remains restorable without new UI generation");
  await legacyTopicPage.close();

  for (const viewport of [{ name: "desktop", width: 1280, height: 800 }, { name: "ipad", width: 768, height: 1024 }, { name: "mobile", width: 390, height: 844 }]) {
    for (const moduleName of ["listening", "reading"]) {
      const responsivePage = await browser.newPage({ viewport });
      await installGuestState(responsivePage);
      await responsivePage.goto(`${baseUrl}/?test=lr-scope-${viewport.name}-${moduleName}#home`, { waitUntil: "networkidle" });
      await activateModule(responsivePage, moduleName);
      await responsivePage.locator('[data-single-scope="topic"]').click();
      const metrics = await responsivePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tabs: document.querySelectorAll("[data-single-scope]").length,
      cards: document.querySelectorAll('[data-practice-unit-scope="topic"]').length,
      shortestControl: Math.min(...[...document.querySelectorAll("#single button, #single select")]
        .filter((node) => node.getBoundingClientRect().height > 0)
        .map((node) => node.getBoundingClientRect().height)),
      libraryBounded: (() => {
        const grid = document.querySelector(".practice-unit-grid");
        return !grid || grid.getBoundingClientRect().height <= innerHeight * .75;
      })(),
    }));
      assert.ok(metrics.overflow <= 1, `${moduleName} ${viewport.name} overflows by ${metrics.overflow}px`);
      assert.equal(metrics.tabs, 4);
      assert.ok(metrics.cards > 0);
      assert.ok(metrics.shortestControl >= 43.5, `${moduleName} ${viewport.name} has a ${metrics.shortestControl}px touch control`);
      assert.ok(metrics.libraryBounded, `${moduleName} ${viewport.name} library must remain bounded and scrollable`);
      await responsivePage.screenshot({ path: resolve(outputDir, `${viewport.name}-${moduleName}-topics.png`), fullPage: true });
      console.log(`PASS ${viewport.name} ${moduleName} semantic Topic library`);
      await responsivePage.close();
    }
  }
} finally {
  await browser.close();
  child.kill();
}
