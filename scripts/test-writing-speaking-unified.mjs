import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 5200 + (process.pid % 400);
const baseUrl = `http://127.0.0.1:${port}`;
const appSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const outputDir = resolve("artifacts", "unified-writing-speaking-current");
await mkdir(outputDir, { recursive: true });

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return;
    } catch {}
    await new Promise((done) => setTimeout(done, 150));
  }
  throw new Error(`Server failed to start. ${stderr}`);
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});

try {
  assert.match(appSource, /function weightedWritingOverall\(/, "P0: official Writing weighting helper is missing");
  assert.match(appSource, /function writingFullTestOptions\(/, "Writing Full test needs paired Cambridge paper options");
  assert.match(appSource, /function writingTopicOptions\(/, "Writing Topics need independent Task 1 and Task 2 options");
  assert.match(appSource, /function startWritingFullTestPractice\(/, "Writing Full test needs a paired workspace start path");
  assert.match(
    appSource,
    /tasks\.length\s*===\s*2\s*&&\s*state\.pendingWritingKind\s*===\s*["']full-test["']/,
    "P0: paired scoring must be restricted to the explicit Full test path",
  );
  assert.match(appSource, /function buildUnifiedAttemptContract\(/, "P2: shared attempt contract is missing");
  assert.match(appSource, /function writingTask1Pool\(/, "Writing needs an independent Task 1 pool");
  assert.match(appSource, /function writingTaskForOption\(/, "Writing Topics must resolve either task type independently");
  assert.match(appSource, /function renderWritingFullBoard\(/, "Writing needs a Cambridge Full test library");

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await desktop.goto(`${baseUrl}/?unified=desktop#writing-upload`, { waitUntil: "networkidle" });
  await desktop.waitForFunction(() => !/Loading recommendation/i.test(document.querySelector("#writingRecommendedReason")?.textContent || ""));
  assert.equal(await desktop.locator('[data-writing-scope="full"]').getAttribute("aria-selected"), "true", "Full test must be the default Writing scope");
  const fullTestCard = desktop.locator(".writing-full-test-card[data-writing-full-test-id]").first();
  assert.ok(await fullTestCard.count(), "P0: Writing Full test cards must survive refresh");
  assert.match(await fullTestCard.innerText(), /Full test[\s\S]*2 tasks[\s\S]*60 min[\s\S]*1:2 weighting/i, "Full test card must describe the paired exam contract");
  const fullTestId = await fullTestCard.getAttribute("data-writing-full-test-id");
  const expectedFullTest = await desktop.evaluate((id) => {
    const option = writingFullTestOptions().find((item) => item.id === id);
    return option ? { id: option.id, task1Id: option.task1Id, task2Id: option.task2Id } : null;
  }, fullTestId);
  assert.ok(expectedFullTest?.task1Id && expectedFullTest?.task2Id, "Full test card must resolve one exact same-paper Task 1 + Task 2 pair");
  await fullTestCard.locator("button[data-writing-full-test-id]").click();
  const fullTestSetup = desktop.locator(".unified-practice-setup");
  assert.equal(await fullTestSetup.getAttribute("data-writing-task1-id"), expectedFullTest.task1Id, "Full test Setup lost its exact Task 1 ID");
  assert.equal(await fullTestSetup.getAttribute("data-writing-task2-id"), expectedFullTest.task2Id, "Full test Setup lost its exact Task 2 ID");
  assert.match(await fullTestSetup.innerText(), /Task 1 \+ Task 2[\s\S]*60 minutes[\s\S]*400 words[\s\S]*1:2 weighted/i, "Full test Setup must expose the complete Writing contract");
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  assert.equal(await desktop.locator(".writing-practice-shell textarea").count(), 2, "Full test workspace must render exactly two editors");
  assert.deepEqual(
    await desktop.evaluate(() => state.uploadWritingTasks.map((task) => ({ id: task.id, number: writingTaskNumber(task) }))),
    [
      { id: expectedFullTest.task1Id, number: 1 },
      { id: expectedFullTest.task2Id, number: 2 },
    ],
    "Full test workspace must contain the exact Task 1 + Task 2 pair",
  );
  assert.equal(await desktop.locator('[data-writing-task-tab="1"]').getAttribute("aria-selected"), "true", "Full test must start on Task 1");
  const fullTimerStart = await desktop.locator("[data-writing-timer]").innerText();
  assert.match(fullTimerStart, /^(?:60:00|59:5\d)$/, "Full test needs one 60-minute timer");
  const task1Draft = "Task one draft preserved across refresh.";
  const task2Draft = "Task two draft preserved across refresh.";
  await desktop.locator("#upload-system-task1-writing").fill(task1Draft);
  await desktop.locator('[data-writing-task-tab="2"]').click();
  await desktop.locator("#upload-system-task2-writing").fill(task2Draft);
  await desktop.waitForTimeout(900);
  const fullSessionBeforeReload = await desktop.evaluate(() => JSON.parse(localStorage.getItem("ieltsistWritingUploadSessionV1") || "null"));
  assert.deepEqual(
    {
      setId: fullSessionBeforeReload?.setId,
      task1Id: fullSessionBeforeReload?.task1Id,
      task2Id: fullSessionBeforeReload?.task2Id,
      practiceKind: fullSessionBeforeReload?.practiceKind,
      activeTaskNumber: fullSessionBeforeReload?.activeTaskNumber,
    },
    {
      setId: expectedFullTest.id,
      task1Id: expectedFullTest.task1Id,
      task2Id: expectedFullTest.task2Id,
      practiceKind: "full-test",
      activeTaskNumber: 2,
    },
    "Full test session pointer must preserve the pair and active tab",
  );
  await desktop.reload({ waitUntil: "networkidle" });
  await desktop.locator(".writing-practice-shell").waitFor({ state: "visible" });
  assert.deepEqual(
    await desktop.evaluate(() => state.uploadWritingTasks.map((task) => ({ id: task.id, number: writingTaskNumber(task) }))),
    [
      { id: expectedFullTest.task1Id, number: 1 },
      { id: expectedFullTest.task2Id, number: 2 },
    ],
    "Full test refresh must restore both exact tasks",
  );
  assert.equal(await desktop.locator('[data-writing-task-tab="2"]').getAttribute("aria-selected"), "true", "Full test refresh must restore the active Task 2 tab");
  assert.equal(await desktop.locator("#upload-system-task1-writing").inputValue(), task1Draft, "Full test refresh lost the Task 1 draft");
  assert.equal(await desktop.locator("#upload-system-task2-writing").inputValue(), task2Draft, "Full test refresh lost the Task 2 draft");
  assert.match(await desktop.locator("[data-writing-timer]").innerText(), /^(?:60:00|59:5\d|59:4\d)$/, "Full test refresh must restore the running 60-minute timer");

  await desktop.locator("#changeWritingTask").click();
  await desktop.locator("#openCustomWriting").click();
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  assert.equal(await desktop.locator("#submitUploadedWriting").isDisabled(), true, "P0: empty custom essay submit must be disabled");
  await desktop.locator("#uploadPrompt").fill("IELTS Writing Task 1: Summarise the chart below.");
  await desktop.waitForTimeout(50);
  assert.match(await desktop.locator(".writing-custom-editor .word-count").innerText(), /150/, "P0: custom Task 1 target must be 150 words");
  await desktop.locator("#toggleWritingPrompt").click();
  assert.equal(await desktop.locator("#writingCustomWorkspace").isVisible(), true, "P0: Hide task must preserve Custom mode");
  assert.equal(await desktop.locator("#writingSystemWorkspace").isVisible(), false, "P0: Hide task must not switch to Cambridge");

  await desktop.locator("#changeWritingTask").click();
  await desktop.locator('[data-writing-scope="topics"]').click();
  const mixedTopic = await desktop.evaluate(() => {
    return buildWritingTopicGroups(writingTopicOptions())
      .map((group) => ({
        id: group.id,
        accent: group.accent,
        taskNumbers: [...new Set(group.items.map((option) => writingTaskNumber(writingTaskForOption(option))).filter(Boolean))].sort(),
      }))
      .find((group) => group.taskNumbers.includes(1) && group.taskNumbers.includes(2)) || null;
  });
  assert.ok(mixedTopic, "Semantic Writing Topics must contain at least one directory group with both Task 1 and Task 2");
  await desktop.locator(`[data-writing-topic-category="${mixedTopic.accent}"]`).click();
  const mixedTopicCard = desktop.locator(`.writing-topic-card[data-writing-topic-group="${mixedTopic.id}"]`);
  assert.ok(await mixedTopicCard.count(), "The mixed Task 1 + Task 2 semantic topic must render in the directory");
  assert.match(await mixedTopicCard.innerText(), /Task 1 \+ Task 2/i, "Semantic topic card must advertise both task types");
  await mixedTopicCard.locator(".practice-writing-topic").click();
  const topicChooser = desktop.locator(".writing-set-chooser");
  const task1TopicRow = topicChooser.locator(".topic-set-row").filter({ hasText: /Task 1 · 20 min · 150 words/i }).first();
  const task2TopicRow = topicChooser.locator(".topic-set-row").filter({ hasText: /Task 2 · 40 min · 250 words/i }).first();
  assert.ok(await task1TopicRow.count(), "Semantic topic chooser must include Task 1 questions");
  assert.ok(await task2TopicRow.count(), "Semantic topic chooser must include Task 2 questions");

  const selectedTask1Id = await task1TopicRow.getAttribute("data-writing-task-id");
  await task1TopicRow.locator(".choose-writing-set").click();
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id"), selectedTask1Id, "Topic Task 1 Setup lost the selected exact ID");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), null, "Topic Task 1 Setup must not inject Task 2");
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  assert.deepEqual(
    await desktop.evaluate(() => state.uploadWritingTasks.map((task) => ({ id: task.id, number: writingTaskNumber(task) }))),
    [{ id: selectedTask1Id, number: 1 }],
    "Topic Task 1 must open one independent task",
  );
  assert.match(await desktop.locator("[data-writing-timer]").innerText(), /^(?:20:00|19:5\d)$/, "Topic Task 1 needs its own 20-minute timer");

  await desktop.locator("#changeWritingTask").click();
  await desktop.locator(`[data-writing-topic-group="${mixedTopic.id}"] .practice-writing-topic`).click();
  const refreshedTask2Row = desktop.locator(".writing-set-chooser .topic-set-row").filter({ hasText: /Task 2 · 40 min · 250 words/i }).first();
  const selectedTask2Id = await refreshedTask2Row.getAttribute("data-writing-task-id");
  await refreshedTask2Row.locator(".choose-writing-set").click();
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id"), null, "Topic Task 2 Setup must not inject Task 1");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), selectedTask2Id, "Topic Task 2 Setup lost the selected exact ID");
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  assert.deepEqual(
    await desktop.evaluate(() => state.uploadWritingTasks.map((task) => ({ id: task.id, number: writingTaskNumber(task) }))),
    [{ id: selectedTask2Id, number: 2 }],
    "Topic Task 2 must open one independent task",
  );
  assert.match(await desktop.locator("[data-writing-timer]").innerText(), /^(?:40:00|39:5\d)$/, "Topic Task 2 needs its own 40-minute timer");

  const scoreMath = await desktop.evaluate(() => weightedWritingOverall(6, 7));
  assert.equal(scoreMath, "6.5", "P0: Writing Full test must retain the official Task 1:Task 2 weighting");

  await desktop.evaluate(() => {
    const feedback = [
      "Overall Band: 6.5",
      "Fluency and Coherence: 6.0",
      "Lexical Resource: 6.5",
      "Grammatical Range and Accuracy: 6.0",
      "Pronunciation: 6.5",
      "Areas to Improve: Give one more developed example.",
    ].join("\n");
    document.querySelector("#bankFeedback")?.remove();
    const host = document.createElement("div");
    host.id = "unified-speaking-result-fixture";
    host.innerHTML = renderSpeakingResultHtml(feedback, {
      band: 6.5,
      evidence: { transcriptText: "Examiner: Why?\nCandidate: Because public transport reduces congestion." },
    }, "6.5", "bank");
    document.body.append(host);
  });
  assert.equal(await desktop.locator(".speaking-radar").count(), 0, "P3: Speaking radar must be removed");
  assert.equal(await desktop.locator("#unified-speaking-result-fixture [data-result-tab]").count(), 4, "P1: Speaking result needs four shared tabs");
  assert.ok((await desktop.locator("#unified-speaking-result-fixture").evaluate((node) => node.scrollWidth - node.clientWidth)) <= 1, "P0: Speaking result must not overflow desktop");
  await desktop.locator("#unified-speaking-result-fixture").screenshot({ path: resolve(outputDir, "speaking-result-desktop.png") });
  await desktop.close();

  const ipad = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await ipad.goto(`${baseUrl}/?unified=ipad#bank`, { waitUntil: "networkidle" });
  const speakingEmojis = (await ipad.locator(".speaking-topic-card .objective-topic-icon").allTextContents()).map((value) => value.trim()).filter(Boolean);
  assert.equal(speakingEmojis.length, await ipad.locator(".speaking-topic-card").count(), "Every Speaking Topic card must use an emoji icon");
  assert.ok(new Set(speakingEmojis).size >= 6, "Speaking Topic cards need varied semantic emoji, not one generic marker");
  assert.equal(await ipad.locator(".speaking-topic-card .objective-topic-icon svg").count(), 0, "Speaking Topic identity must not fall back to Lucide SVGs");
  const selectedSpeakingEmoji = speakingEmojis[0];
  await ipad.locator(".practice-speaking-topic").first().click();
  assert.equal((await ipad.locator(".topic-set-chooser-head .objective-topic-icon").innerText()).trim(), selectedSpeakingEmoji, "Speaking chooser must preserve the selected Topic emoji");
  await ipad.locator(".choose-speaking-set").first().click();
  assert.equal(await ipad.locator(".unified-practice-setup").isVisible(), true, "P1: Speaking topic must open Setup before connecting");
  assert.equal(await ipad.locator('input[name="speakingPracticeScope"]').count(), 4, "Speaking Setup needs Full, Part 1, Part 2 and Part 3 scopes");
  await ipad.locator('.speaking-part-option').filter({ hasText: "Part 2" }).click();
  assert.equal(await ipad.locator('input[name="speakingPracticeScope"]:checked').getAttribute("value"), "part2", "Part 2 scope must become the canonical selection");
  await ipad.locator('[data-setup-mode="coach"]').click();
  await ipad.locator("[data-run-device-check]").click();
  await ipad.waitForFunction(() => !document.querySelector('[data-start-unified-practice="speaking"]')?.disabled);
  await ipad.locator('[data-start-unified-practice="speaking"]').click();
  assert.equal(await ipad.locator('.qwen-speaking[data-prefix="bank"]').getAttribute("data-speaking-scope"), "part2", "Speaking workspace must retain the selected Part 2 scope");
  assert.equal(await ipad.locator("#bank-speaking-elapsed").innerText(), "03:00", "Part 2 workspace must start with a 3-minute countdown");
  const ipadColumns = await ipad.locator(".speaking-practice-layout").evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
  assert.equal(ipadColumns, 1, "P0: iPad portrait Speaking practice must be single-column");
  await ipad.screenshot({ path: resolve(outputDir, "speaking-workspace-ipad-portrait.png"), fullPage: false });
  await ipad.evaluate(() => {
    const host = document.createElement("div");
    host.id = "unified-speaking-result-ipad-fixture";
    host.innerHTML = renderSpeakingResultHtml([
      "Overall Band: 6.5",
      "Fluency and Coherence: 6.0",
      "Lexical Resource: 6.5",
      "Grammatical Range and Accuracy: 6.0",
      "Pronunciation: 6.5",
    ].join("\n"), { band: 6.5, evidence: { transcriptText: "Examiner: Why?\nCandidate: Because public transport reduces congestion." } }, "6.5", "bank");
    document.body.append(host);
    bindUnifiedResultTabs(host);
    bindSpeakingResultActions(host);
    host.scrollIntoView({ block: "start" });
  });
  const ipadResult = ipad.locator("#unified-speaking-result-ipad-fixture");
  assert.ok((await ipadResult.evaluate((node) => node.scrollWidth - node.clientWidth)) <= 1, "P0: Speaking result must not overflow iPad portrait");
  const ipadAction = await ipadResult.locator(".unified-result-primary").boundingBox();
  assert.ok(ipadAction && ipadAction.y + ipadAction.height <= 1024, "P0: Speaking result action must be visible in the first iPad result viewport");
  await ipadResult.screenshot({ path: resolve(outputDir, "speaking-result-ipad-portrait.png") });
  await ipad.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${baseUrl}/?unified=mobile#bank`, { waitUntil: "networkidle" });
  await mobile.locator(".practice-speaking-topic").first().click();
  await mobile.locator(".choose-speaking-set").first().click();
  const setupStart = mobile.locator('[data-start-unified-practice="speaking"]');
  const setupBox = await setupStart.boundingBox();
  assert.ok(setupBox && setupBox.y + setupBox.height <= 844, "P0: mobile Speaking Start must be visible in the first viewport");
  await mobile.screenshot({ path: resolve(outputDir, "speaking-setup-mobile.png"), fullPage: false });
  await mobile.evaluate(() => {
    const host = document.createElement("div");
    host.id = "unified-speaking-result-mobile-fixture";
    host.innerHTML = renderSpeakingResultHtml([
      "Overall Band: 6.5",
      "Fluency and Coherence: 6.0",
      "Lexical Resource: 6.5",
      "Grammatical Range and Accuracy: 6.0",
      "Pronunciation: 6.5",
    ].join("\n"), { band: 6.5, evidence: { transcriptText: "Examiner: Why?\nCandidate: Because public transport reduces congestion." } }, "6.5", "bank");
    document.body.replaceChildren(host);
    bindUnifiedResultTabs(host);
    bindSpeakingResultActions(host);
    window.scrollTo(0, 0);
  });
  const mobileResult = mobile.locator("#unified-speaking-result-mobile-fixture");
  assert.ok((await mobileResult.evaluate((node) => node.scrollWidth - node.clientWidth)) <= 1, "P0: Speaking result must not overflow mobile");
  const resultAction = await mobile.locator(".unified-result-primary").boundingBox();
  assert.ok(resultAction && resultAction.y + resultAction.height <= 844, "P0: Speaking result action must be visible in the first mobile viewport");
  await mobile.screenshot({ path: resolve(outputDir, "speaking-result-mobile.png"), fullPage: false });
  assert.equal(await mobile.locator(".bank-practice-topic-card").count(), 0, "P1: full Speaking topic card must not push Setup below the fold");
  await mobile.close();

  console.log("PASS unified Writing/Speaking P0-P3 acceptance");
} finally {
  await browser.close();
  child.kill();
}
