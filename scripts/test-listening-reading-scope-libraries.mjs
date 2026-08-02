import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 6400 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve("artifacts", "listening-reading-scope-libraries");
await mkdir(outputDir, { recursive: true });

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
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
  await installGuestState(page);
  await page.goto(`${baseUrl}/?test=lr-scope-desktop#home`, { waitUntil: "networkidle" });

  await activateModule(page, "listening");
  assert.deepEqual(await page.locator("[data-single-scope]").evaluateAll((nodes) => nodes.map((node) => node.dataset.singleScope)), ["paper", "section", "topic", "review"]);
  assert.match(await page.locator(".single-launch-shell").innerText(), /Full tests[\s\S]*Sections[\s\S]*Topics[\s\S]*Review mistakes/i);
  assert.ok(await page.locator("#singleLaunchSelect option").count() >= 72, "Full Listening must retain the original paper selector");

  await page.locator('[data-single-scope="section"]').click();
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
  if (existsSync(resolve("data", "listening-asr-cache.json"))) {
    const cached = await (await fetch(`${baseUrl}/api/listening/asr-cache?id=cam15-l-test1&section=1`)).json();
    assert.ok(cached.available && cached.sentences.length && cached.timedWords.length && cached.speakers.length, "Section must reuse the timestamped offline ASR cache");
    await page.locator('.listening-caption-toggle[data-section="1"]').click();
    await page.waitForFunction(() => /ASR cache/i.test(document.querySelector("#singleCaptionKicker")?.textContent || ""));
    console.log(`PASS Listening Section reuses ${cached.timedWords.length} cached timed words without live ASR`);
  }

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
  const listeningTopicCard = page.locator('[data-practice-unit-scope="topic"]').filter({ has: page.locator("[data-start-practice-unit]") }).first();
  const listeningTopicUnitId = await listeningTopicCard.getAttribute("data-practice-unit-id");
  const listeningTopicType = await listeningTopicCard.getAttribute("data-topic-type");
  assert.ok(listeningTopicUnitId?.startsWith("cam") && listeningTopicType && listeningTopicType !== "unknown");
  const listeningTopicBaseId = listeningTopicUnitId.split("::")[0];
  const listeningTopicPaper = tasks.listeningTests.find((item) => item.id === listeningTopicBaseId);
  const listeningTopicExpected = expectedQuestionIds(listeningTopicPaper, (question) => question.type === listeningTopicType);
  await listeningTopicCard.locator("[data-start-practice-unit]").click();
  assert.deepEqual(await renderedQuestionIds(page), listeningTopicExpected);
  assert.equal(await page.locator(`[data-active-topic-type="${listeningTopicType}"]`).count(), 1);
  assert.equal(await page.locator('#single-listening-studio').getAttribute("data-listening-id"), listeningTopicBaseId, "Topic ASR cache lookup must use the source paper id");
  console.log("PASS Listening Topic contains one OCR-derived question type");

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

  await activateModule(page, "reading");
  await page.locator('[data-single-scope="topic"]').click();
  const readingTopicCard = page.locator('[data-practice-unit-scope="topic"]').first();
  const readingTopicUnitId = await readingTopicCard.getAttribute("data-practice-unit-id");
  const readingTopicType = await readingTopicCard.getAttribute("data-topic-type");
  const readingTopicBaseId = readingTopicUnitId.split("::")[0];
  const readingTopicPaper = tasks.readingTests.find((item) => item.id === readingTopicBaseId);
  const readingTopicExpected = expectedQuestionIds(readingTopicPaper, (question) => question.type === readingTopicType);
  await readingTopicCard.locator("[data-start-practice-unit]").click();
  assert.deepEqual(await renderedQuestionIds(page), readingTopicExpected);
  assert.equal(await page.locator(`[data-active-topic-type="${readingTopicType}"]`).count(), 1);
  await page.screenshot({ path: resolve(outputDir, "desktop-reading-topic.png"), fullPage: true });
  console.log("PASS Reading Topic contains one question type");
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

  for (const moduleName of ["listening", "reading"]) {
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await installGuestState(mobilePage);
    await mobilePage.goto(`${baseUrl}/?test=lr-scope-mobile-${moduleName}#home`, { waitUntil: "networkidle" });
    await activateModule(mobilePage, moduleName);
    await mobilePage.locator('[data-single-scope="section"]').click();
    const metrics = await mobilePage.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tabs: document.querySelectorAll("[data-single-scope]").length,
      cards: document.querySelectorAll('[data-practice-unit-scope="section"]').length,
      shortestButton: Math.min(...[...document.querySelectorAll("#single button")]
        .filter((node) => node.getBoundingClientRect().height > 0)
        .map((node) => node.getBoundingClientRect().height)),
    }));
    assert.ok(metrics.overflow <= 1, `${moduleName} mobile overflows by ${metrics.overflow}px`);
    assert.equal(metrics.tabs, 4);
    assert.ok(metrics.cards > 0);
    assert.ok(metrics.shortestButton >= 43.5, `${moduleName} mobile has a ${metrics.shortestButton}px touch control`);
    await mobilePage.screenshot({ path: resolve(outputDir, `mobile-${moduleName}-sections.png`), fullPage: true });
    console.log(`PASS mobile ${moduleName} scope library`);
    await mobilePage.close();
  }
} finally {
  await browser.close();
  child.kill();
}
