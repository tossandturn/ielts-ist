import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 5180 + (process.pid % 400);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve("artifacts", "homepage-focus-camp");
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
    targetBand: 7,
    examDate: "2026-09-13",
    dailyMinutes: 30,
    onboardingCompleted: true,
  },
  attempts: [
    {
      attemptId: "mock-visual-1",
      module: "exam",
      mode: "same-test",
      title: "Cambridge 18 Test 2",
      score: { band: 6.5 },
      result: { overallBand: 6.5 },
      submittedAt: "2026-08-01T08:00:00.000Z",
    },
    {
      attemptId: "listening-visual-1",
      module: "listening",
      itemId: "c18-t2-listening",
      title: "Cambridge 18 Test 2 Listening",
      score: { correct: 30, total: 40 },
      result: { correct: 30, total: 40 },
      submittedAt: "2026-07-31T08:00:00.000Z",
    },
    {
      attemptId: "reading-visual-1",
      module: "reading",
      itemId: "c18-t2-reading",
      title: "Cambridge 18 Test 2 Reading",
      score: { correct: 34, total: 40 },
      result: { correct: 34, total: 40 },
      submittedAt: "2026-07-30T08:00:00.000Z",
    },
    {
      attemptId: "writing-visual-2",
      module: "writing",
      taskNumber: 2,
      title: "Writing Task 2 · Technology",
      score: { band: 6 },
      result: { band: 6, taskNumber: 2 },
      submittedAt: "2026-07-29T08:00:00.000Z",
    },
    {
      attemptId: "speaking-visual-1",
      module: "speaking",
      title: "Speaking · Hometown and transport",
      score: { band: 6.5 },
      result: { band: 6.5 },
      submittedAt: "2026-07-28T08:00:00.000Z",
    },
  ],
  weakAreas: [{
    id: "weak-listening-plurals",
    module: "listening",
    title: "Number and plural traps",
    summary: "Retest number and plural endings before opening a new Listening paper.",
    status: "active",
    createdAt: "2026-07-31T08:10:00.000Z",
  }],
  todayPlan: {
    kind: "retest",
    algorithmVersion: "v1",
    task: { module: "listening", mode: "review" },
    reason: { text: "Retest number and plural traps.", sourceIds: ["listening-visual-1"] },
  },
  activeSession: null,
};

const coachThreads = [{
  key: "view:home||||home",
  binding: { sessionId: "view:home", module: "", paperId: "", questionId: "", view: "home" },
  title: "Listening trap review",
  messages: [
    { role: "user", content: "Why do plural endings keep lowering my score?", createdAt: "2026-07-31T08:12:00.000Z" },
    { role: "assistant", content: "Check the required grammar after the number and listen for final consonants.", createdAt: "2026-07-31T08:12:01.000Z" },
  ],
  updatedAt: "2026-07-31T08:12:01.000Z",
}];

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
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Focus Camp test server did not start. ${serverStderr}`);
}

async function installApiFixture(page, fixture = learningState) {
  await page.addInitScript(({ threads }) => {
    localStorage.setItem("ieltsistAuthToken", "focus-camp-visual-token");
    localStorage.setItem("ieltsistCoachHistoryV1", JSON.stringify(threads));
    localStorage.removeItem("ieltsistPracticeSessionV1");
    localStorage.removeItem("ieltsistLearningLoopHistory");
  }, { threads: coachThreads });
  await page.route("**/api/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { id: 101, username: "Amber", membership: { plan: "month", active: true } } }),
  }));
  await page.route("**/api/drafts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ drafts: [] }) }));
  await page.route("**/api/vocabulary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{ id: "v1", term: "paraphrase" }] }) }));
  await page.route("**/api/learning/state", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) }));
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    await installApiFixture(page);
    await page.goto(`${baseUrl}/?visual=focus-camp-${size.name}#home`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (
      state.currentUser?.username === "Amber"
      && state.learningState?.attempts?.length === 5
    ));

    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        const box = node?.getBoundingClientRect();
        return box ? { top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
      };
      return {
        rootCount: document.querySelectorAll(".dashboard-focus-camp").length,
        skillCount: document.querySelectorAll(".dashboard-focus-skill").length,
        primaryCount: document.querySelectorAll(".dashboard-focus-camp .primary").length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        hero: document.querySelector(".dashboard-focus-hero")?.textContent || "",
        mock: document.querySelector(".dashboard-focus-mock")?.textContent || "",
        skills: document.querySelector(".dashboard-focus-skills")?.textContent || "",
        history: document.querySelector(".dashboard-focus-history")?.textContent || "",
        coach: document.querySelector(".dashboard-focus-coach")?.textContent || "",
        primary: rect(".dashboard-focus-hero .primary"),
        skillBox: rect(".dashboard-focus-skills"),
        mockBox: rect(".dashboard-focus-mock"),
      };
    });

    assert.equal(layout.rootCount, 1, `${size.name}: Focus Camp root is missing`);
    assert.equal(layout.skillCount, 4, `${size.name}: four independent skill cards are required`);
    assert.equal(layout.primaryCount, 1, `${size.name}: homepage must expose one primary CTA`);
    assert.ok(layout.overflow <= 1, `${size.name}: page overflows horizontally by ${layout.overflow}px`);
    assert.match(layout.hero, /Listening[\s\S]*plural/i, `${size.name}: current task is not dominant or specific`);
    assert.match(layout.mock, /Latest full mock[\s\S]*6\.5/i, `${size.name}: valid full-mock Band is missing`);
    assert.match(layout.skills, /Listening[\s\S]*30\/40/i);
    assert.match(layout.skills, /Reading[\s\S]*34\/40/i);
    assert.match(layout.skills, /Writing[\s\S]*Task 2[\s\S]*Band 6\.0/i);
    assert.match(layout.skills, /Speaking[\s\S]*Band 6\.5/i);
    assert.match(layout.history, /Cambridge 18 Test 2 Reading[\s\S]*34\/40/i);
    assert.match(layout.coach, /AI Coach[\s\S]*scores and weak areas/i);
    assert.ok(layout.primary && layout.primary.bottom <= size.height, `${size.name}: primary CTA must remain in the first viewport`);
    if (size.width <= 560) {
      assert.ok(layout.skillBox && layout.mockBox && layout.skillBox.top < layout.mockBox.top, `${size.name}: skills must precede the full-mock card`);
    }

    await page.screenshot({ path: resolve(outputDir, `${size.name}.png`), fullPage: true });
    if (size.name === "desktop") {
      const coachButton = page.locator('.dashboard-focus-coach [data-home-action="coach"]');
      assert.equal(await coachButton.count(), 1);
      await coachButton.click();
      await page.locator("#helpChatPanel").waitFor({ state: "visible" });
      await page.screenshot({ path: resolve(outputDir, "desktop-coach-open.png"), fullPage: false });
    }
    console.log(`PASS ${size.name} ${size.width}x${size.height}`);
    await page.close();
  }

  const independentPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const independentWritingState = {
    ...learningState,
    attempts: [
      { attemptId: "task1-only", module: "writing", taskNumber: 1, score: { band: 6 }, result: { band: 6, taskNumber: 1 }, submittedAt: "2026-08-01T08:00:00.000Z" },
      { attemptId: "task2-only", module: "writing", taskNumber: 2, score: { band: 6.5 }, result: { band: 6.5, taskNumber: 2 }, submittedAt: "2026-08-02T08:00:00.000Z" },
    ],
  };
  await installApiFixture(independentPage, independentWritingState);
  await independentPage.goto(`${baseUrl}/?visual=focus-camp-independent-writing#home`, { waitUntil: "domcontentloaded" });
  await independentPage.waitForFunction(() => (
    state.currentUser?.username === "Amber" && state.learningState?.attempts?.length === 2
  ));
  const mockText = await independentPage.locator(".dashboard-focus-mock").innerText();
  assert.match(mockText, /No full mock yet/i);
  assert.doesNotMatch(mockText, /6\.25|Overall Band 6/i, "Independent Task 1 and Task 2 must not create an overall Band");
  assert.match(await independentPage.locator('.dashboard-focus-skill[data-module="writing"]').innerText(), /Task 2[\s\S]*Band 6\.5/i);
  console.log("PASS independent Writing score contract");
  await independentPage.close();

  const onboardingPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installApiFixture(onboardingPage, {
    profile: { onboardingCompleted: false },
    attempts: [],
    weakAreas: [],
    todayPlan: { kind: "onboarding", task: null, reason: { text: "Set a goal before the first diagnostic." } },
    activeSession: null,
  });
  await onboardingPage.goto(`${baseUrl}/?visual=focus-camp-onboarding#home`, { waitUntil: "domcontentloaded" });
  await onboardingPage.waitForFunction(() => state.learningState?.todayPlan?.kind === "onboarding");
  await onboardingPage.locator("#learningProfileForm").waitFor({ state: "visible" });
  const onboarding = await onboardingPage.evaluate(() => {
    const button = document.querySelector('.dashboard-focus-hero .primary')?.getBoundingClientRect();
    return {
      fields: document.querySelectorAll("#learningProfileForm input, #learningProfileForm select").length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      buttonBottom: button?.bottom || Infinity,
    };
  });
  assert.equal(onboarding.fields, 4, "Onboarding must retain all four goal fields");
  assert.ok(onboarding.overflow <= 1, `Onboarding overflows horizontally by ${onboarding.overflow}px`);
  assert.ok(onboarding.buttonBottom <= 844, "Onboarding Save goal CTA must remain in the first mobile viewport");
  console.log("PASS mobile onboarding state");
  await onboardingPage.close();
} finally {
  await browser.close();
  child.kill();
}
