import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
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
  await page.waitForFunction(() => document.querySelectorAll("[data-single-scope]").length === 4);
}

async function renderedQuestionIds(page) {
  return page.locator('.answer-input[data-prefix="single"]').evaluateAll((nodes) => nodes.map((node) => node.dataset.qid));
}

async function installGuestState(page, session = null) {
  await page.addInitScript((savedSession) => {
    localStorage.removeItem("ieltsistAuthToken");
    localStorage.removeItem("ieltsistLearningLoopHistory");
    if (savedSession) localStorage.setItem("ieltsistPracticeSessionV1", JSON.stringify(savedSession));
    else localStorage.removeItem("ieltsistPracticeSessionV1");
  }, session);
}

await waitForServer();
const tasks = await (await fetch(`${baseUrl}/api/tasks?test=lr-scope-contract`)).json();
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
assert.ok(listeningPaper && readingPaper, "Cambridge 15 Test 1 fixtures are required");

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
  const activeAudioSections = await page.locator("[data-listening-section]").evaluateAll((nodes) => nodes.filter((node) => !node.hidden && getComputedStyle(node).display !== "none").length);
  assert.equal(activeAudioSections, 1, "A Listening Section unit must expose one audio section");

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
  console.log("PASS Listening Section identity, timer, media, answers and refresh restoration");

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
  console.log("PASS Reading Passage identity, question range and timer");

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
