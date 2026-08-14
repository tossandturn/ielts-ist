import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = new URL("../", import.meta.url);
const port = 4720 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve("artifacts", "recommendation-ux");
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
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Recommendation UX test server did not start. ${serverStderr}`);
}

const sizes = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

await waitForServer();

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    await page.addInitScript(() => {
      localStorage.removeItem("ieltsistPracticeSessionV1");
      localStorage.removeItem("ieltsistWritingUploadSessionV1");
      localStorage.removeItem("ieltsistRecommendationHistoryV1");
    });

    await page.goto(`${baseUrl}/?visual=recommendation-ux-${size.name}#single`, { waitUntil: "networkidle" });
    await page.locator("#single .single-launch-card.recommended").waitFor({ state: "visible" });

    const single = await page.evaluate(() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || "";
      const rotation = (() => {
        const options = singleOptions("listening");
        localStorage.removeItem("ieltsistRecommendationHistoryV1");
        const first = singleRecommendedOption("listening", options);
        rememberPracticeRecommendation("listening", first);
        const second = singleRecommendedOption("listening", options);
        return {
          count: options.length,
          first: first?.id || "",
          second: second?.id || "",
          reason: singleRecommendationReason("listening", second, options),
        };
      })();
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        title: text("#singleTitle"),
        navListening: text('[data-module-target="listening"]'),
        navReading: text('[data-module-target="reading"]'),
        navWriting: text('[data-view="writing-upload"]'),
        navSpeaking: text('[data-view="bank"]'),
        reason: text(".single-launch-reason"),
        rotation,
      };
    });

    assert.ok(single.overflow <= 1, `${size.name}: single launch overflows by ${single.overflow}px`);
    assert.equal(single.title, "Listening with AI");
    assert.equal(single.navListening, "Listening with AI");
    assert.equal(single.navReading, "Reading with AI");
    assert.equal(single.navWriting, "Writing with AI");
    assert.equal(single.navSpeaking, "Speaking with AI");
    assert.match(single.reason, /Why this/i, `${size.name}: single recommendation reason is missing`);
    assert.match(single.reason, /rotation|weak area|last|fresh|selected/i, `${size.name}: single recommendation reason is too generic`);
    assert.match(single.rotation.reason, /rotation|weak area|last|fresh|selected/i);
    assert.doesNotMatch(single.reason, /selected by rotation|not because it is the first item/i, `${size.name}: recommendation must not explain internal rotation`);
    assert.doesNotMatch(single.rotation.reason, /selected by rotation|not because it is the first item/i, `${size.name}: recommendation must not explain internal rotation`);
    if (single.rotation.count > 1) {
      assert.notEqual(single.rotation.first, single.rotation.second, `${size.name}: recommendation repeated after recording the first item`);
    }

    await page.goto(`${baseUrl}/?visual=recommendation-writing-${size.name}#writing-upload`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const node = document.querySelector("#writingRecommendedReason");
      return node && node.textContent && !/Loading/i.test(node.textContent);
    });

    assert.equal(await page.locator('[data-writing-scope="full"]').getAttribute("aria-selected"), "true", `${size.name}: Full test must be the default Writing scope`);
    assert.ok(await page.locator('.writing-full-test-card[data-writing-full-test-id]').count() >= 1, `${size.name}: Full test cards are missing`);
    assert.match(await page.locator('.writing-full-test-card').first().innerText(), /Full test[\s\S]*2 tasks[\s\S]*60 min[\s\S]*1:2/i, `${size.name}: Full test must expose the paired 60-minute contract`);
    await page.locator('[data-writing-scope="topics"]').click();

    const writing = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        const box = node?.getBoundingClientRect();
        return box ? { width: box.width, height: box.height, top: box.top, bottom: box.bottom } : null;
      };
      const text = (selector) => document.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || "";
      const rotation = (() => {
        const options = writingSystemOptions();
        localStorage.removeItem("ieltsistRecommendationHistoryV1");
        const first = writingSystemRecommended(options);
        rememberPracticeRecommendation("writing", first);
        const second = writingSystemRecommended(options);
        return { count: options.length, first: first?.id || "", second: second?.id || "" };
      })();
      const publicWriting = typeof builtInPublicWritingTopics === "undefined" ? [] : builtInPublicWritingTopics;
      const publicGroups = buildWritingTopicGroups(
        writingSystemOptions().filter((option) => writingTask2ForOption(option)?.source === "Public topics"),
      );
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        heading: text("#writing-upload .view-head h2"),
        reason: text("#writingRecommendedReason"),
        custom: rect("#openCustomWriting"),
        draft: rect("#continueWritingDraft"),
        topicCount: document.querySelectorAll(".writing-topic-card").length,
        firstTopic: text(".writing-topic-card"),
        entryIsPanel: document.querySelector("#writingEntry")?.classList.contains("panel"),
        legacyHeroCount: document.querySelectorAll("#writingEntry .single-launch-hero, #writingEntry .writing-entry-grid").length,
        categoryCount: document.querySelectorAll("#writingTopicCategoryBar .topic-category-pill").length,
        taskSwitchCount: document.querySelectorAll("[data-writing-library-task]").length,
        readingStyleCards: document.querySelectorAll("#writingTopicList .objective-topic-card.writing-topic-card").length,
        emojiCards: [...document.querySelectorAll("#writingTopicList .objective-topic-card")].filter((card) => card.querySelector(".objective-topic-icon")?.textContent.trim() && !card.querySelector(".objective-topic-icon [data-lucide]")).length,
        progressCards: document.querySelectorAll("#writingTopicList .objective-topic-progress").length,
        keywordCards: document.querySelectorAll("#writingTopicList .objective-topic-keywords").length,
        publicWritingCount: publicWriting.length,
        publicWritingAllTask2: publicWriting.every((item) => item.module === "writing" && writingTaskNumber(item) === 2),
        publicGroupCounts: publicGroups.map((group) => group.items.length),
        rotation,
      };
    });

    assert.ok(writing.overflow <= 1, `${size.name}: writing launch overflows by ${writing.overflow}px`);
    assert.equal(writing.heading, "Writing with AI");
    assert.ok(writing.topicCount >= 1, `${size.name}: writing topic cards are missing`);
    assert.match(writing.firstTopic, /AI pick/i, `${size.name}: AI recommended writing topic must be pinned first`);
    assert.match(writing.firstTopic, /Choose/i, `${size.name}: writing topic card must use the Speaking-style Choose action`);
    assert.match(writing.reason, /Choose a content topic/i, `${size.name}: Writing Topics explanation is missing or generic`);
    assert.equal(writing.entryIsPanel, true, `${size.name}: Writing topics must use the same panel shell as Speaking`);
    assert.equal(writing.legacyHeroCount, 0, `${size.name}: legacy Writing hero and route cards must be removed`);
    assert.ok(writing.categoryCount >= 5, `${size.name}: Writing topic categories are missing`);
    assert.equal(writing.taskSwitchCount, 0, `${size.name}: Writing scopes must not be split by a Task 1 / Task 2 library switch`);
    assert.equal(writing.readingStyleCards, writing.topicCount, `${size.name}: Writing Topics must share Reading's card structure`);
    assert.equal(writing.emojiCards, writing.topicCount, `${size.name}: every Writing Topic needs a semantic emoji instead of a Lucide icon`);
    assert.equal(writing.progressCards, writing.topicCount, `${size.name}: every Writing Topic needs grouped progress`);
    assert.equal(writing.keywordCards, writing.topicCount, `${size.name}: every Writing Topic needs concise directory keywords`);
    assert.ok(writing.publicWritingCount >= 24, `${size.name}: Public Writing needs at least 24 curated Task 2 questions`);
    assert.equal(writing.publicWritingAllTask2, true, `${size.name}: Public Writing topics must contain Task 2 only`);
    assert.ok(writing.publicGroupCounts.length >= 10, `${size.name}: Public Writing needs fine-grained issue categories`);
    assert.equal(writing.publicGroupCounts.every((count) => count > 0), true, `${size.name}: empty Public Writing categories must be hidden`);
    assert.ok(writing.publicGroupCounts.reduce((total, count) => total + count, 0) >= 24, `${size.name}: fine-grained Public Writing groups lost questions`);
    if (writing.rotation.count > 1) {
      assert.notEqual(writing.rotation.first, writing.rotation.second, `${size.name}: Writing recommendation repeated after recording the first set`);
    }

    await page.screenshot({ path: resolve(outputDir, `writing-entry-${size.name}.png`), fullPage: false });
    await page.locator('[data-writing-scope="full"]').click();
    assert.ok(await page.locator(".writing-full-test-card").count() > 1, `${size.name}: paired Full test library is empty`);
    await page.screenshot({ path: resolve(outputDir, `writing-full-${size.name}.png`), fullPage: false });
    await page.locator('[data-writing-scope="topics"]').click();
    await page.locator('[data-writing-topic-category="recommended"]').click();
    assert.equal(
      await page.locator(".writing-topic-card").count(),
      1,
      `${size.name}: AI Pick must filter the Writing topic library to the recommended set`,
    );
    await page.locator('[data-writing-topic-category="all"]').click();
    await page.locator("#writingTopicBook").selectOption("public");
    assert.ok(await page.locator(".writing-topic-card").count() >= 1, `${size.name}: Public Writing filter is empty`);
    assert.match(await page.locator(".writing-topic-card").first().textContent(), /Public topics/i, `${size.name}: Public Writing cards need a source label`);
    await page.screenshot({ path: resolve(outputDir, `writing-public-${size.name}.png`), fullPage: false });
    assert.doesNotMatch(
      await page.locator(".writing-topic-card").first().innerText(),
      /Task\s*1/i,
      `${size.name}: Task 1 must not affect Writing topic cards`,
    );
    await page.locator(".writing-topic-card .practice-writing-topic").first().click();
    assert.match(await page.locator(".writing-set-chooser").innerText(), /Public topics/i, `${size.name}: Public Writing question source is missing`);
    assert.equal(
      await page.locator(".writing-set-chooser .topic-set-row h4").evaluateAll((nodes) => nodes.every((node) => /Task\s*2/i.test(node.textContent || ""))),
      true,
      `${size.name}: Public Writing topic rows must remain Task 2-only`,
    );
    await page.locator(".choose-writing-set").first().click();
    assert.equal(await page.locator(".writing-task1-picker").count(), 0, `${size.name}: Task 2 Setup must not contain Task 1 controls`);
    assert.ok(
      await page.locator(".unified-practice-setup").evaluate((node) => node.scrollWidth - node.clientWidth) <= 1,
      `${size.name}: Writing setup overflows horizontally`,
    );
    if (size.width === 390) {
      const startBox = await page.locator('[data-start-unified-practice="writing"]').boundingBox();
      assert.ok(startBox && startBox.y + startBox.height <= size.height, `${size.name}: Start practice must remain in the first viewport`);
    }
    await page.screenshot({ path: resolve(outputDir, `writing-setup-${size.name}.png`), fullPage: false });
    await page.locator('[data-start-unified-practice="writing"]').click();
    await page.waitForFunction(() => document.querySelector("#writingSystemActions") && !document.querySelector("#writingSystemActions").hidden);
    assert.equal(
      await page.locator("#writingWorkspace").isVisible(),
      true,
      `${size.name}: clicking a writing topic card should open the writing workspace`,
    );

    await page.screenshot({ path: resolve(outputDir, `${size.name}.png`), fullPage: false });
    await page.locator("#changeWritingTask").click();
    await page.locator('[data-writing-scope="topics"]').click();
    await page.locator("#writingTopicBook").selectOption("all");
    await page.locator('[data-writing-topic-category="charts-data"]').click();
    await page.locator('.writing-topic-card[data-writing-topic-group="writing-topic:charts-data"] .practice-writing-topic').click();
    await page.locator(".writing-set-chooser .choose-writing-set").first().click();
    assert.equal(await page.locator(".unified-practice-setup").getAttribute("data-writing-task2-id"), null, `${size.name}: Task 1 Setup leaked Task 2`);
    await page.locator('[data-start-unified-practice="writing"]').click();
    assert.equal(await page.locator('[data-writing-task-tab="1"]').count(), 1, `${size.name}: Task 1 workspace is missing`);
    assert.equal(await page.locator('[data-writing-task-tab="2"]').count(), 0, `${size.name}: Task 1 workspace leaked Task 2`);
    assert.equal(await page.locator("#upload-system-task1-writing").count(), 1, `${size.name}: Task 1 editor is missing`);
    assert.match(await page.locator("[data-writing-timer]").innerText(), /^(?:20:00|19:5\d)$/, `${size.name}: Task 1 timer is not 20 minutes`);
    await page.screenshot({ path: resolve(outputDir, `writing-task1-workspace-${size.name}.png`), fullPage: false });
    console.log(`PASS ${size.name} recommendation UX`);
    await page.close();
  }
  const dashboardPage = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await dashboardPage.addInitScript(() => {
    for (const key of Object.keys(localStorage)) {
      if (/learning|PracticeSession|recommendation/i.test(key)) localStorage.removeItem(key);
    }
  });
  await dashboardPage.goto(`${baseUrl}/?visual=diagnostic-choice#home`, { waitUntil: "networkidle" });
  const diagnosticCta = dashboardPage.locator("#dashboardContent [data-home-action='coach-diagnostic']").first();
  await diagnosticCta.waitFor();
  await diagnosticCta.click();
  await dashboardPage.locator("#diagnosticChoiceDialog[open]").waitFor();
  assert.equal(await dashboardPage.locator("[data-diagnostic-module]").count(), 4, "Diagnostic CTA must expose four skill choices");
  assert.match(await dashboardPage.locator("#diagnosticChoiceDialog").innerText(), /Listening[\s\S]*Section[\s\S]*Reading[\s\S]*Passage[\s\S]*Writing[\s\S]*Task 2[\s\S]*Speaking[\s\S]*Part 2/i);
  await dashboardPage.close();
} finally {
  await browser.close();
  child.kill();
}
