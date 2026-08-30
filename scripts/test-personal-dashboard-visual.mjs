import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";
const outputDir = resolve("artifacts", "personal-dashboard");
await mkdir(outputDir, { recursive: true });

const sizes = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

const learningState = {
  profile: {
    currentBand: 6.5,
    targetBand: 7.5,
    examDate: "2026-09-12",
    dailyMinutes: 30,
    onboardingCompleted: true,
  },
  attempts: [
    {
      attemptId: "speaking-visual-1",
      module: "speaking",
      score: { band: 6.5 },
      result: {
        band: 6.5,
        criteria: [
          { key: "flu", short: "Fluency", score: 6 },
          { key: "lex", short: "Vocabulary", score: 6.5 },
          { key: "gra", short: "Grammar", score: 6.5 },
          { key: "pro", short: "Pronunciation", score: 7 },
        ],
      },
      submittedAt: "2026-07-29T08:00:00.000Z",
    },
    {
      attemptId: "reading-visual-1",
      module: "reading",
      score: { correct: 31, total: 40 },
      result: { correct: 31, total: 40 },
      submittedAt: "2026-07-28T08:00:00.000Z",
    },
  ],
  weakAreas: [
    {
      id: "weak-reading-evidence",
      module: "reading",
      title: "Evidence location",
      summary: "You missed two matching-information questions because the paraphrase was not linked back to the evidence sentence.",
      status: "active",
      createdAt: "2026-07-29T08:10:00.000Z",
    },
  ],
  todayPlan: {
    kind: "retest",
    algorithmVersion: "v1",
    task: { module: "reading", mode: "review" },
    reason: {
      text: "Your latest Reading attempt was 31/40 and an evidence-location weak area is still active.",
      sourceIds: ["reading-visual-1", "weak-reading-evidence"],
    },
  },
  activeSession: null,
};

const localHistory = {
  objective: {
    reading: {
      attemptId: "reading-local-visual-1",
      module: "reading",
      correct: 31,
      total: 40,
      updatedAt: "2026-07-28T08:00:00.000Z",
    },
  },
  speaking: {
    module: "speaking",
    band: 6.5,
    criteria: [
      { key: "flu", short: "Fluency", score: 6 },
      { key: "lex", short: "Vocabulary", score: 6.5 },
      { key: "gra", short: "Grammar", score: 6.5 },
      { key: "pro", short: "Pronunciation", score: 7 },
    ],
    updatedAt: "2026-07-29T08:00:00.000Z",
  },
};

const coachThreads = [{
  key: "view:home||||home",
  binding: { sessionId: "view:home", module: "", paperId: "", questionId: "", view: "home" },
  title: "Reading evidence plan",
  messages: [
    { role: "user", content: "Why do I keep missing matching-information questions?", createdAt: "2026-07-29T08:12:00.000Z" },
    { role: "assistant", content: "You are matching repeated words instead of the paraphrase chain. Retest evidence location next.", createdAt: "2026-07-29T08:12:01.000Z" },
  ],
  updatedAt: "2026-07-29T08:12:01.000Z",
}];

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    let coachRequest = null;

    await page.addInitScript(({ history, threads }) => {
      localStorage.setItem("ieltsistAuthToken", "visual-auth-token");
      localStorage.setItem("ieltsistLocalDataOwnerV1", "user:102");
      localStorage.setItem("ieltsistLearningLoopHistory::user%3A102", JSON.stringify(history));
      localStorage.setItem("ieltsistCoachHistoryV1::user%3A102", JSON.stringify(threads));
      localStorage.removeItem("ieltsistPracticeSessionV1");
    }, { history: localHistory, threads: coachThreads });

    await page.route("**/api/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: 102, username: "Mia", membership: { plan: "month", active: true, expiresAt: "2026-08-29T00:00:00.000Z" } } }),
    }));
    await page.route("**/api/drafts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ drafts: [] }) }));
    await page.route("**/api/vocabulary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{ id: "v1", term: "paraphrase" }] }) }));
    await page.route("**/api/learning/state", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(learningState) }));
    await page.route("**/api/help/chat", async (route) => {
      coachRequest = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ mode: "ai", answer: "Your evidence-location weak area is the highest-priority retest today." }),
      });
    });

    await page.goto(`${baseUrl}/?visual=personal-dashboard-v1#home`, { waitUntil: "domcontentloaded" });
    await page.locator(".dashboard-focus-camp").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector(".dashboard-focus-header h1")?.textContent?.includes("Mia"));
    await page.waitForFunction(() => {
      const hero = document.querySelector(".dashboard-focus-hero");
      const heading = hero?.querySelector("h2")?.textContent || "";
      const kicker = document.querySelector(".dashboard-focus-kicker")?.textContent || "";
      return /Reading(?: with AI)? weak-area retest/i.test(`${heading} ${kicker} ${hero?.textContent || ""}`);
    }, { timeout: 10000 });

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        const box = node?.getBoundingClientRect();
        return box ? { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height } : null;
      };
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageHeight: document.documentElement.scrollHeight,
        heading: document.querySelector(".dashboard-focus-header h1")?.textContent || "",
        summary: document.querySelector(".dashboard-focus-header p")?.textContent || "",
        mission: document.querySelector(".dashboard-focus-hero")?.textContent || "",
        mock: document.querySelector(".dashboard-focus-mock")?.textContent || "",
        skillMap: document.querySelector(".dashboard-focus-skills")?.textContent || "",
        coach: document.querySelector(".dashboard-focus-coach")?.textContent || "",
        skills: document.querySelectorAll(".dashboard-focus-skill").length,
        primaryButtons: document.querySelectorAll(".dashboard-focus-camp .primary").length,
        primary: rect(".dashboard-focus-hero .primary"),
        coachButton: rect('.dashboard-focus-coach [data-home-action="coach"]'),
        skillMapBox: rect(".dashboard-focus-skill-grid"),
      };
    });

    assert.ok(layout.overflow <= 1, `${size.name}: page overflows horizontally by ${layout.overflow}px`);
    assert.match(layout.heading, /Mia/);
    assert.match(layout.summary, /score|practice/i);
    assert.match(layout.mission, /Reading(?: with AI)? weak-area retest/);
    assert.match(layout.mission, /31\/40|evidence-location/i);
    assert.match(layout.mock, /No full mock yet/i, `${size.name}: independent skill scores must not invent an overall Band`);
    assert.match(layout.skillMap, /Reading(?: with AI)?[\s\S]*31\/40/i);
    assert.match(layout.skillMap, /Speaking(?: with AI)?[\s\S]*Band 6\.5/i);
    assert.ok(layout.skillMapBox && layout.skillMapBox.height > 0, `${size.name}: skill scoreboard must stay visible`);
    assert.match(layout.coach, /AI Coach/i);
    assert.equal(layout.skills, 4, `${size.name}: four skill spaces must remain available`);
    assert.equal(layout.primaryButtons, 1, `${size.name}: homepage must expose one primary CTA`);
    assert.ok(layout.primary && layout.primary.top < 700, `${size.name}: primary CTA is below the first 700px`);
    assert.ok(layout.coachButton && layout.coachButton.width >= 100, `${size.name}: Coach entry is too narrow`);

    await page.screenshot({ path: resolve(outputDir, `${size.name}.png`), fullPage: false });

    await page.locator(".dashboard-focus-coach [data-dashboard-coach-prompt]").click();
    await page.waitForFunction(() => document.querySelector("#helpChatPanel") && !document.querySelector("#helpChatPanel").hidden);
    assert.match(coachRequest?.message || "", /Reading with AI weak-area retest/i);
    assert.equal(coachRequest?.context?.module || "", "");

    if (size.name === "desktop") {
      await page.screenshot({ path: resolve(outputDir, `${size.name}-coach-open.png`), fullPage: false });
    }
    console.log(`PASS ${size.name} ${size.width}x${size.height} CTA=${Math.round(layout.primary.top)}px page=${layout.pageHeight}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
