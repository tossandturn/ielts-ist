import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";
const outputDir = resolve("artifacts", "dashboard-history-reading-writing");
await mkdir(outputDir, { recursive: true });

const sizes = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const historyFixture = {
  learning: {
    objective: {
      reading: {
        attemptId: "visual-reading-attempt",
        module: "reading",
        itemId: "visual-reading-paper",
        title: "Cambridge Reading",
        correct: 31,
        total: 40,
        wrongQuestionIds: ["q5", "q12", "q18"],
        updatedAt: "2026-07-29T08:00:00.000Z",
      },
    },
  },
  coach: [{
    key: "view:home||||home",
    binding: { sessionId: "view:home", module: "", paperId: "", questionId: "", view: "home" },
    title: "AI Coach",
    messages: [
      { role: "user", content: "How should I review my Reading evidence mistakes?", createdAt: "2026-07-29T08:01:00.000Z" },
      { role: "assistant", content: "Review the question wording, locate the evidence sentence, then compare the paraphrase.", createdAt: "2026-07-29T08:01:01.000Z" },
    ],
    updatedAt: "2026-07-29T08:01:01.000Z",
  }],
};

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    await page.addInitScript((fixture) => {
      if (!localStorage.getItem("ieltsistLearningLoopHistory")) {
        localStorage.setItem("ieltsistLearningLoopHistory", JSON.stringify(fixture.learning));
      }
      if (!localStorage.getItem("ieltsistCoachHistoryV1")) {
        localStorage.setItem("ieltsistCoachHistoryV1", JSON.stringify(fixture.coach));
      }
    }, historyFixture);
    await page.route("**/api/help/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "ai", answer: "Use the question keywords, locate the evidence sentence, and compare the paraphrase." }),
      });
    });

    await page.goto(`${baseUrl}/?visual=dashboard-history-1#home`, { waitUntil: "networkidle" });
    await page.locator(".dashboard-history").waitFor({ state: "visible" });
    const home = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scores: document.querySelectorAll(".dashboard-history-grid > section:first-child .dashboard-history-row").length,
      chats: document.querySelectorAll("[data-dashboard-coach-thread]").length,
      text: document.querySelector(".dashboard-history")?.textContent || "",
    }));
    assert.ok(home.overflow <= 1, `${size.name}: Dashboard overflows by ${home.overflow}px`);
    assert.ok(home.scores >= 1, `${size.name}: historical score is missing`);
    assert.ok(home.chats >= 1, `${size.name}: Coach history is missing`);
    assert.match(home.text, /31\/40/);
    assert.match(home.text, /Reading evidence mistakes/);
    await page.screenshot({ path: resolve(outputDir, `${size.name}-dashboard.png`), fullPage: false });

    if (size.name === "desktop") {
      await page.locator("[data-dashboard-coach-thread]").first().click();
      await page.locator("#helpChatPanel").waitFor({ state: "visible" });
      assert.match(await page.locator("#helpChatLog").innerText(), /How should I review my Reading evidence mistakes/);
      await page.locator("#helpChatClose").click();
    }

    await page.goto(`${baseUrl}/?visual=writing-launch-1#writing-upload`, { waitUntil: "networkidle" });
    await page.locator("#writingEntry").waitFor({ state: "visible" });
    const writing = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("#writingEntry .writing-topic-card")].map((node) => {
        const rect = node.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
      });
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cards,
        shell: document.querySelector("#writingEntry")?.className || "",
        custom: Boolean(document.querySelector("#openCustomWriting")),
        recommended: document.querySelector(".writing-topic-card")?.textContent || "",
      };
    });
    assert.ok(writing.overflow <= 1, `${size.name}: Writing launch overflows by ${writing.overflow}px`);
    assert.ok(writing.cards.length >= 1, `${size.name}: Writing topic library is missing`);
    assert.match(writing.shell, /writing-topic-panel/);
    assert.equal(writing.custom, true, `${size.name}: Custom essay route is missing`);
    assert.match(writing.recommended, /AI pick/i, `${size.name}: AI recommendation must be pinned first`);
    assert.ok(writing.cards.every((card) => card.width >= 240 || size.width < 600), `${size.name}: Writing topic card is too narrow`);
    await page.screenshot({ path: resolve(outputDir, `${size.name}-writing.png`), fullPage: false });

    await page.evaluate(() => activateSingleModule("reading", true));
    await page.locator('[data-single-start="recommended"]').click();
    await page.locator(".reading-question-rail-layout").waitFor({ state: "visible" });
    const reading = await page.evaluate(() => {
      const nav = document.querySelector(".reading-question-nav");
      const first = nav?.querySelector("button");
      const second = first?.nextElementSibling;
      const navRect = nav?.getBoundingClientRect();
      const firstRect = first?.getBoundingClientRect();
      const secondRect = second?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        nav: navRect ? { width: navRect.width, height: navRect.height } : null,
        first: firstRect ? { x: firstRect.x, y: firstRect.y } : null,
        second: secondRect ? { x: secondRect.x, y: secondRect.y } : null,
      };
    });
    assert.ok(reading.overflow <= 1, `${size.name}: Reading overflows by ${reading.overflow}px`);
    assert.ok(Math.abs(reading.first.y - reading.second.y) <= 2, `${size.name}: question navigation should be horizontal`);
    assert.ok(reading.second.x > reading.first.x, `${size.name}: horizontal question order is incorrect`);
    await page.screenshot({ path: resolve(outputDir, `${size.name}-reading.png`), fullPage: false });

    if (size.name === "desktop") {
      await page.goto(`${baseUrl}/?visual=coach-persist-1#home`, { waitUntil: "networkidle" });
      await page.evaluate(() => sendHelpChatMessage("Keep this Coach message after refresh."));
      await page.waitForFunction(() => JSON.parse(localStorage.getItem("ieltsistCoachHistoryV1") || "[]").some((thread) => thread.messages?.some((message) => message.content.includes("Keep this Coach message"))));
      await page.reload({ waitUntil: "networkidle" });
      assert.match(await page.locator(".dashboard-history").innerText(), /Keep this Coach message after refresh/);
    }

    console.log(`PASS ${size.name} ${size.width}x${size.height}`);
    await page.close();
  }
} finally {
  await browser.close();
}
