import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";
const outputDir = resolve("artifacts", "writing-p2");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const sizes = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    await page.goto(`${baseUrl}/?visual=writing-p2-38#writing-upload`, { waitUntil: "networkidle" });
    await page.locator('[data-writing-scope="topics"]').click();
    await page.locator("#writingTopicBook").selectOption("public");
    await page.locator(".writing-topic-card .practice-writing-topic").first().click();
    await page.locator(".choose-writing-set").first().click();
    await page.locator('[data-start-unified-practice="writing"]').click();
    await page.locator(".writing-practice-shell").waitFor({ state: "visible" });

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const value = node.getBoundingClientRect();
        return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
      };
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        shell: rect(".writing-practice-shell"),
        prompt: rect('[data-writing-task-panel="2"] .writing-task-prompt'),
        editor: rect('[data-writing-task-panel="2"] .writing-answer-pane'),
        textarea: rect("#upload-system-task2-writing"),
        tabs: document.querySelectorAll("[data-writing-task-tab]").length,
        visiblePanels: [...document.querySelectorAll("[data-writing-task-panel]")].filter((node) => !node.hidden).length,
        submitHidden: document.querySelector("#writingSystemActions")?.hidden,
      };
    });

    assert.ok(layout.overflow <= 1, `${size.name}: page overflows horizontally by ${layout.overflow}px`);
    assert.equal(layout.tabs, 1, `${size.name}: Task 2 practice must have one task tab only`);
    assert.equal(layout.visiblePanels, 1, `${size.name}: exactly one task panel should be visible`);
    assert.equal(layout.submitHidden, false, `${size.name}: submit action must be available after starting`);
    assert.ok(layout.shell?.width > 280, `${size.name}: Writing workspace is too narrow`);
    assert.ok(layout.textarea?.height >= 250, `${size.name}: editor is not usable (${layout.textarea?.height || 0}px)`);
    assert.ok(layout.prompt?.width > 0 && layout.editor?.width > 0, `${size.name}: prompt and editor must both render`);

    if (size.width >= 900) {
      assert.ok(layout.prompt.right <= layout.editor.x + 2, `${size.name}: prompt and editor overlap`);
    } else {
      assert.ok(layout.prompt.bottom <= layout.editor.y + 2, `${size.name}: portrait prompt and editor overlap`);
    }

    await page.locator("#upload-system-task2-writing").fill("A saved Task 2 draft should remain in its independent workspace.");
    assert.equal(
      await page.locator("#upload-system-task2-writing").inputValue(),
      "A saved Task 2 draft should remain in its independent workspace.",
      `${size.name}: independent Task 2 workspace lost the draft`,
    );

    await page.evaluate(() => {
      document.activeElement?.blur?.();
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: resolve(outputDir, `${size.name}.png`), fullPage: false });
    console.log(`PASS ${size.name} ${size.width}x${size.height}`);
    await page.close();
  }

  const resultPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await resultPage.route("**/api/help/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mode: "test", answer: "Use the exact sentence as evidence, then rebuild it with a controlled complex clause." }),
    });
  });
  await resultPage.goto(`${baseUrl}/?visual=writing-result-p2-38#writing-upload`, { waitUntil: "networkidle" });
  const fixture = {
    title: "Task 2 city transport",
    prompt: "Many cities are encouraging public transport. To what extent do you agree?",
    essay: "Public transport is good and it is very important for every city. It can reduce traffic, but many people still prefer private cars.\n\nGovernments should improve buses and trains because reliable services can change daily travel habits.",
    feedback: [
      "Overall Band: 6.0",
      "Task Response: 6 - RAW FALLBACK TEXT THAT MUST NOT APPEAR IN THE CRITERION CARDS.",
      "Coherence & Cohesion: 6 - RAW FALLBACK TEXT THAT MUST NOT APPEAR IN THE CRITERION CARDS.",
      "Lexical Resource: 6 - RAW FALLBACK TEXT THAT MUST NOT APPEAR IN THE CRITERION CARDS.",
      "Grammatical Range & Accuracy: 5 - RAW FALLBACK TEXT THAT MUST NOT APPEAR IN THE CRITERION CARDS. | 5 Overall, I would score the essay at Band 6.0.",
    ].join("\n"),
    analysis: {
      overall: 6,
      criteria: [
        { label: "Task Response", score: 6, feedback: "The position is relevant, but the first main idea needs one specific example." },
        { label: "Coherence & Cohesion", score: 6, feedback: "Paragraphing is clear, but progression inside the first paragraph needs a stronger logical link." },
        { label: "Lexical Resource", score: 6, feedback: "Replace vague repeated wording with precise transport vocabulary." },
        { label: "Grammatical Range & Accuracy", score: 5, feedback: "Sentence structures are repetitive and need one controlled complex clause." },
      ],
      highestImpact: {
        criterion: "Grammatical Range & Accuracy",
        score: 5,
        issue: "Sentence structures are repetitive and need one controlled complex clause.",
        evidence: "Public transport is good and it is very important for every city.",
        rewriteInstruction: "Combine the claim and result in one controlled complex sentence.",
      },
      phrases: [
        { from: "good and very important", to: "essential to sustainable urban mobility" },
        { from: "change daily travel habits", to: "reshape commuters' daily travel choices" },
      ],
    },
  };
  await resultPage.evaluate((attempt) => {
    setWritingWorkspaceMode("custom");
    const saved = rememberWritingAttempt({ ...attempt, source: "visual-test", scores: extractWritingScores(attempt.feedback) });
    setFeedbackHtml("uploadWritingFeedback", renderWritingReportHtml(attempt.feedback, { analysis: attempt.analysis }, "writing-test.pdf"), "uploadWritingMode", "test");
    return saved.attemptId;
  }, fixture);
  await resultPage.locator('[data-result-tab="evidence"]').click();
  await resultPage.locator(".writing-impact-panel").waitFor({ state: "visible" });
  const evidenceButton = resultPage.locator("[data-source-highlight]").first();
  const evidenceQuote = (await evidenceButton.innerText()).trim();
  await evidenceButton.click();
  assert.equal((await resultPage.locator("[data-writing-source-item] pre mark").first().innerText()).trim(), evidenceQuote, "Writing evidence must highlight the exact source range");
  const criterionFeedback = await resultPage.locator(".writing-feedback-card article p").allTextContents();
  assert.deepEqual(criterionFeedback, fixture.analysis.criteria.map((item) => item.feedback));
  assert.doesNotMatch(criterionFeedback.join(" "), /RAW FALLBACK|Overall, I would score/);
  const phraseText = await resultPage.locator(".writing-phrase-card").innerText();
  assert.match(phraseText, /good and very important/);
  assert.match(phraseText, /essential to sustainable urban mobility/);
  const impactText = await resultPage.locator(".writing-impact-panel").innerText();
  assert.match(impactText, /Grammatical Range & Accuracy/);
  assert.match(impactText, /Public transport is good and it is very important for every city\./);
  await resultPage.locator(".writing-result-grid").evaluate((node) => node.scrollIntoView({ block: "start" }));
  await resultPage.screenshot({ path: resolve(outputDir, "report-criteria.png"), fullPage: false });
  await resultPage.locator(".writing-focused-feedback").evaluate((node) => node.scrollIntoView({ block: "start" }));
  await resultPage.screenshot({ path: resolve(outputDir, "report.png"), fullPage: false });

  await resultPage.locator('[data-result-tab="improve"]').click();
  await resultPage.locator('[data-writing-result-action="save-weak"]').click();
  assert.ok(await resultPage.evaluate(() => {
    const areas = ownerStoredJson(weakAreaStoreKey, []);
    return Array.isArray(areas) && areas.some((item) => item.module === "writing" && item.sourceAttemptId);
  }), "Writing weak areas must be saved under the active owner namespace");

  const coachRequestPromise = resultPage.waitForRequest((request) => request.url().includes("/api/help/chat"));
  await resultPage.locator('[data-writing-result-action="coach"]').click();
  const coachRequest = await coachRequestPromise;
  const coachPayload = coachRequest.postDataJSON();
  assert.match(coachPayload.message, /Grammatical Range & Accuracy/);
  assert.match(JSON.stringify(coachPayload.helpContext), /Task 2 city transport/);
  await resultPage.locator("#helpChatClose").click();

  await resultPage.locator('[data-writing-result-action="next-task"]').click();
  assert.equal(await resultPage.locator("#writingCustomWorkspace").isVisible(), true);
  assert.match(await resultPage.locator("#uploadPrompt").inputValue(), /working from home/);
  await resultPage.evaluate(() => window.scrollTo(0, 0));
  await resultPage.screenshot({ path: resolve(outputDir, "result-loop.png"), fullPage: false });
  console.log("PASS Writing result learning loop");
  await resultPage.close();
} finally {
  await browser.close();
}
