import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
async function findAvailablePort() {
  const probe = createServer();
  await new Promise((resolveListen, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolveListen);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolveClose, reject) => {
    probe.close((error) => (error ? reject(error) : resolveClose()));
  });
  if (!port) throw new Error("Could not allocate an available test port");
  return port;
}
const port = await findAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve("artifacts", "homepage-goal-radar");
await mkdir(outputDir, { recursive: true });

const learningState = {
  profile: {
    currentBand: 6,
    targetBand: 7,
    examDate: "2026-11-21",
    dailyMinutes: 30,
    onboardingCompleted: true,
  },
  attempts: [
    {
      attemptId: "speaking-recorded",
      module: "speaking",
      title: "Speaking Part 2",
      score: { band: 6.5 },
      result: { band: 6.5 },
      submittedAt: "2026-08-01T08:00:00.000Z",
    },
    {
      attemptId: "reading-estimated",
      module: "reading",
      title: "Cambridge Reading",
      score: { correct: 34, total: 40 },
      result: { correct: 34, total: 40 },
      submittedAt: "2026-07-31T08:00:00.000Z",
    },
  ],
  weakAreas: [],
  todayPlan: {
    kind: "diagnostic",
    task: { module: "listening", mode: "practice" },
    reason: { text: "Build a fresh Listening baseline." },
  },
  activeSession: null,
};

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
  throw new Error(`Goal and radar test server did not start. ${serverStderr}`);
}

async function routeCommonApis(page, fixture = learningState) {
  await page.route("**/api/drafts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ drafts: [] }) }));
  await page.route("**/api/vocabulary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }));
  await page.route("**/api/learning/state", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) }));
  await page.route("**/api/learning/today-plan", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: fixture?.todayPlan || null }) }));
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const memberPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let patchedProfile = null;
  await memberPage.addInitScript(() => {
    localStorage.setItem("ieltsistAuthToken", "goal-radar-token");
    localStorage.removeItem("ieltsistPracticeSessionV1");
  });
  await memberPage.route("**/api/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { id: 101, username: "Amber", membership: { plan: "month", active: true } } }),
  }));
  await routeCommonApis(memberPage);
  await memberPage.route("**/api/learning/profile", async (route) => {
    patchedProfile = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ profile: { ...learningState.profile, ...patchedProfile, onboardingCompleted: true } }),
    });
  });
  await memberPage.goto(`${baseUrl}/?test=goal-radar-member#home`, { waitUntil: "domcontentloaded" });
  await memberPage.waitForFunction(() => document.querySelector("#dashboardContent")?.textContent?.includes("Amber"));

  assert.equal(await memberPage.locator("[data-dashboard-goal='target']").count(), 1, "Target Band badge must be an editable control");
  assert.equal(await memberPage.locator("[data-dashboard-goal='exam']").count(), 1, "Exam date badge must be an editable control");
  await memberPage.locator("[data-dashboard-goal='target']").click();
  const memberEditor = memberPage.locator("#dashboardGoalDialog");
  await memberEditor.waitFor({ state: "visible" });
  assert.equal(await memberEditor.locator("input, select").count(), 4, "Goal editor must retain all four learning profile fields");
  await memberEditor.locator("[name='currentBand']").selectOption("6.5");
  await memberEditor.locator("[name='targetBand']").selectOption("7.5");
  await memberEditor.locator("[name='examDate']").fill("2026-12-12");
  await memberEditor.locator("[name='dailyMinutes']").fill("45");
  await memberEditor.locator("button[type='submit']").click();
  await memberEditor.waitFor({ state: "hidden" });
  assert.deepEqual(patchedProfile, {
    currentBand: 6.5,
    targetBand: 7.5,
    examDate: "2026-12-12",
    dailyMinutes: 45,
    onboardingCompleted: true,
  }, "Signed-in goal changes must be sent to the learning profile API");

  const radar = memberPage.locator("[data-dashboard-radar]");
  assert.equal(await radar.count(), 1, "Homepage must render one progress radar");
  assert.equal(await radar.locator("canvas").count(), 1, "Progress radar must have a canvas visualization");
  const radarText = await radar.innerText();
  assert.match(radarText, /1 recorded\s*·\s*3 estimated/i, "Radar must distinguish all recorded and estimated axes");
  assert.match(radarText, /Speaking[\s\S]*6\.5[\s\S]*recorded/i, "Recorded Speaking Band must remain canonical");
  assert.match(radarText, /Reading[\s\S]*7\.5[\s\S]*estimated/i, "Reading strength must be visibly labelled as an estimate");
  assert.match(await memberPage.locator(".dashboard-focus-mock").innerText(), /No full mock yet/i, "Radar estimates must never create an overall full-mock Band");
  assert.ok(await memberPage.locator("[data-radar-point='recorded']").count() >= 1, "Recorded radar points need a distinct marker");
  assert.ok(await memberPage.locator("[data-radar-point='estimated']").count() >= 1, "Estimated radar points need a distinct marker");
  await memberPage.screenshot({ path: resolve(outputDir, "member-desktop.png"), fullPage: true });
  console.log("PASS member goal editor and evidence-aware radar");
  await memberPage.close();

  const guestPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await guestPage.addInitScript(() => {
    localStorage.removeItem("ieltsistAuthToken");
    localStorage.setItem("ieltsistPracticeSessionV1", JSON.stringify({
      version: 1,
      sessionId: "guest-resume-test",
      revision: 1,
      view: "single",
      module: "listening",
      itemId: "cam15-l-test1",
      started: true,
      modes: {},
      sections: {},
      answers: {},
      seconds: 1180,
      total: 1200,
      updatedAt: new Date().toISOString(),
    }));
  });
  await guestPage.route("**/api/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }));
  await routeCommonApis(guestPage, null);
  await guestPage.goto(`${baseUrl}/?test=goal-radar-guest#home`, { waitUntil: "domcontentloaded" });
  await guestPage.waitForFunction(() => document.querySelector("#dashboardContent")?.textContent?.includes("Continue practice"));
  assert.equal(await guestPage.locator("[data-dashboard-goal='target']").count(), 1, "A resume task must not suppress guest goal editing");
  await guestPage.locator("[data-dashboard-goal='target']").click();
  const guestEditor = guestPage.locator("#dashboardGoalDialog");
  await guestEditor.locator("[name='currentBand']").selectOption("6");
  await guestEditor.locator("[name='targetBand']").selectOption("7.5");
  await guestEditor.locator("[name='examDate']").fill("2026-12-20");
  await guestEditor.locator("[name='dailyMinutes']").fill("35");
  await guestEditor.locator("button[type='submit']").click();
  await guestEditor.waitFor({ state: "hidden" });
  await guestPage.reload({ waitUntil: "domcontentloaded" });
  await guestPage.waitForFunction(() => document.querySelector("#dashboardContent")?.textContent?.includes("7.5"));
  const guestProfile = await guestPage.evaluate(() => {
    const key = Object.keys(localStorage).find((candidate) => candidate === "ieltsistGuestLearningProfileV1::guest");
    return key ? JSON.parse(localStorage.getItem(key) || "null") : null;
  });
  assert.deepEqual(guestProfile, {
    version: 1,
    currentBand: 6,
    targetBand: 7.5,
    examDate: "2026-12-20",
    dailyMinutes: 35,
  }, "Guest goal changes must persist locally with a versioned schema");
  const guestLayout = await guestPage.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    radarTop: document.querySelector("[data-dashboard-radar]")?.getBoundingClientRect().top,
    skillTop: document.querySelector(".dashboard-focus-skill-grid")?.getBoundingClientRect().top,
  }));
  assert.ok(guestLayout.overflow <= 1, `Guest mobile homepage overflows horizontally by ${guestLayout.overflow}px`);
  assert.ok(guestLayout.radarTop < guestLayout.skillTop, "Mobile radar must stack above the skill cards");
  await guestPage.screenshot({ path: resolve(outputDir, "guest-mobile.png"), fullPage: true });
  console.log("PASS guest goal persistence with resume task and mobile radar layout");
  await guestPage.close();
} finally {
  await browser.close();
  child.kill();
}
