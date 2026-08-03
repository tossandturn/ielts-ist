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
  assert.match(appSource, /function weightedWritingOverall\(/, "P0: simulation-only weighted Writing score helper is missing");
  assert.equal(
    (appSource.match(/\bscoreSimulationWritingPair\(/g) || []).length,
    1,
    "P0: independent Writing practice must not call the paired simulation scorer",
  );
  assert.match(appSource, /function buildUnifiedAttemptContract\(/, "P2: shared attempt contract is missing");
  assert.match(appSource, /function writingTask1Pool\(/, "Writing needs an independent Task 1 pool");
  assert.match(appSource, /function writingTask2ForOption\(/, "Writing topics must resolve from Task 2 only");
  assert.match(appSource, /function renderWritingTask1Board\(/, "Writing needs a separate Task 1 library");

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await desktop.goto(`${baseUrl}/?unified=desktop#writing-upload`, { waitUntil: "networkidle" });
  await desktop.waitForFunction(() => !/Loading recommendation/i.test(document.querySelector("#writingRecommendedReason")?.textContent || ""));
  assert.ok(await desktop.locator(".writing-full-task-card").count() > 0, "P0: Writing Full task cards must survive refresh");
  await desktop.locator(".writing-full-task-card .practice-writing-task2").first().click();
  assert.ok(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), "Full task must retain one exact Task 2 ID");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id"), null, "Full task must not manufacture Task 1");
  assert.match(await desktop.locator(".unified-practice-setup").innerText(), /Task 2 only[\s\S]*40 minutes[\s\S]*250 words/i, "Full task must preserve the independent Task 2 contract");
  await desktop.locator("[data-setup-back]").click();

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
  assert.doesNotMatch(
    await desktop.locator(".writing-topic-card").first().innerText(),
    /Task\s*1/i,
    "Writing topic cards must be classified and described by Task 2 only",
  );
  await desktop.locator(".writing-topic-card .practice-writing-topic").first().click();
  assert.doesNotMatch(
    await desktop.locator(".writing-set-chooser").innerText(),
    /Task\s*1/i,
    "The topic question chooser must list Task 2 questions only",
  );
  await desktop.locator(".choose-writing-set").first().click();
  assert.equal(await desktop.locator(".writing-task1-picker").count(), 0, "Task 2 Setup must not contain any Task 1 selector");
  const selectedTask2Id = await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id");
  assert.ok(selectedTask2Id, "Setup must retain the selected Task 2 question id");
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  const selectedWritingTasks = await desktop.evaluate(() => ({
    tasks: state.uploadWritingTasks.map((task) => ({ id: task.id, number: writingTaskNumber(task) })),
    selectedTask1Id: state.selectedWritingTask1Id,
    selectedTask2Id: state.selectedWritingTask2Id,
  }));
  assert.deepEqual(selectedWritingTasks.tasks, [{ id: selectedTask2Id, number: 2 }], "Task 2 practice must contain Task 2 only");
  assert.equal(selectedWritingTasks.selectedTask1Id, "", "Task 2 practice must not retain a Task 1 selection");
  assert.equal(selectedWritingTasks.selectedTask2Id, selectedTask2Id, "Task 2 selection state is not canonical");
  const writingContext = await desktop.evaluate(() => buildCoachHelpContext().writing);
  assert.equal(writingContext?.activeTaskNumber, 2, "P0: Coach must bind to active Task 2");
  assert.match(String(writingContext?.activeTaskTitle || ""), /task\s*2/i, "P0: Coach must expose the Task 2 title");
  const timerStart = await desktop.locator("[data-writing-timer]").innerText();
  assert.match(timerStart, /^(?:40:00|39:5\d)$/, "Task 2 needs its own 40-minute timer");
  await desktop.waitForTimeout(1100);
  const timerNext = await desktop.locator("[data-writing-timer]").innerText();
  assert.notEqual(timerStart, timerNext, "P0: Cambridge Writing timer must run");
  await desktop.reload({ waitUntil: "networkidle" });
  await desktop.locator(".writing-practice-shell").waitFor({ state: "visible" });
  const restoredWritingTasks = await desktop.evaluate(() => state.uploadWritingTasks.map((task) => task.id));
  assert.deepEqual(restoredWritingTasks, [selectedTask2Id], "Task 2 practice must restore without injecting Task 1");
  assert.equal(await desktop.locator('[data-writing-task-tab="2"]').getAttribute("aria-selected"), "true", "P0: active Writing task must survive refresh");
  const restoredBinding = await desktop.evaluate(() => currentCoachBinding());
  assert.equal(restoredBinding.questionId, "task2", "P0: refreshed Coach thread must remain bound to Task 2");
  assert.match(await desktop.locator("[data-writing-timer]").innerText(), /^\d{2}:\d{2}$/, "P0: Writing timer must restore after refresh");

  await desktop.locator("#changeWritingTask").click();
  await desktop.locator('[data-writing-library-task="1"]').click();
  assert.ok(await desktop.locator(".writing-task1-card").count() > 1, "Task 1 needs its own visual-task library");
  await desktop.locator(".practice-writing-task1").first().click();
  const selectedTask1Id = await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task1-id");
  assert.ok(selectedTask1Id, "Task 1 Setup must retain the selected visual-task id");
  assert.equal(await desktop.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), null, "Task 1 Setup must not retain Task 2");
  await desktop.locator('[data-start-unified-practice="writing"]').click();
  assert.match(await desktop.locator("[data-writing-timer]").innerText(), /^(?:20:00|19:5\d)$/, "Task 1 needs its own 20-minute timer");
  assert.deepEqual(
    await desktop.evaluate(() => state.uploadWritingTasks.map((task) => ({ id: task.id, number: writingTaskNumber(task) }))),
    [{ id: selectedTask1Id, number: 1 }],
    "Task 1 practice must contain Task 1 only",
  );
  await desktop.reload({ waitUntil: "networkidle" });
  await desktop.locator(".writing-practice-shell").waitFor({ state: "visible" });
  assert.deepEqual(await desktop.evaluate(() => state.uploadWritingTasks.map((task) => task.id)), [selectedTask1Id], "Task 1 must restore independently");
  assert.equal(await desktop.locator('[data-writing-task-tab="1"]').getAttribute("aria-selected"), "true", "Restored Task 1 must remain active");

  const scoreMath = await desktop.evaluate(() => weightedWritingOverall(6, 7));
  assert.equal(scoreMath, "6.5", "P0: full simulations must retain the official Task 1:Task 2 weighting");

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
