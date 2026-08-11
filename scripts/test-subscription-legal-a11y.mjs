import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 8500 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = join(tmpdir(), `ieltsist-subscription-${process.pid}-${randomUUID()}.sqlite`);
const outputDir = resolve("artifacts", "subscription-legal-a11y");
const adminSecret = "subscription-test-admin-secret";
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: databasePath,
    SESSION_COOKIE_SECURE: "0",
    ADMIN_API_SECRET: adminSecret,
    STEM_MARKING_AI_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function waitForCondition(predicate, message, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(20);
  }
  throw new Error(message);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await request("/healthz")).response.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Subscription test server did not start. ${stderr}`);
}

await mkdir(outputDir, { recursive: true });
await waitForServer();
const createdCodes = await request("/api/admin/redemption-codes", {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-secret": adminSecret },
  body: JSON.stringify({ plan: "month", count: 2, maxUses: 1, prefix: "TEST" }),
});
assert.equal(createdCodes.response.status, 200);
const [redemptionCode, retainedDraftCode] = createdCodes.json.codes || [];
assert.ok(redemptionCode && retainedDraftCode, "Test setup must create two redemption codes.");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const desktopErrors = [];
  desktop.on("pageerror", (error) => desktopErrors.push(error.message));
  let accountRefreshRequests = 0;
  let heldAccountRefreshRequests = 0;
  let releasedAccountRefreshRequests = 0;
  let releaseAccountRefresh = null;
  const delayedAccountRefresh = new Promise((resolveRefresh) => { releaseAccountRefresh = resolveRefresh; });
  let accountRefreshReleased = false;
  await desktop.route(/\/api\/(?:drafts|vocabulary|learning\/state)(?:\?.*)?$/, async (route) => {
    accountRefreshRequests += 1;
    const shouldHold = accountRefreshRequests > 3 && !accountRefreshReleased;
    if (shouldHold) {
      heldAccountRefreshRequests += 1;
      await delayedAccountRefresh;
    }
    await route.continue();
    if (shouldHold) releasedAccountRefreshRequests += 1;
  });
  await desktop.goto(`${baseUrl}/?test=subscription-legal#home`, { waitUntil: "networkidle" });
  await desktop.waitForFunction(() => document.querySelector("#dashboardContent")?.children.length > 0);

  const dashboardA11y = await desktop.evaluate(() => ({
    date: document.querySelector(".dashboard-focus-date")?.textContent || "",
    hiddenPanelMarks: document.querySelectorAll(".dashboard-focus-panel-title > span > span[aria-hidden='true']").length,
    hiddenHistoryMarks: document.querySelectorAll(".dashboard-focus-history header [aria-hidden='true']").length,
  }));
  assert.doesNotMatch(dashboardA11y.date, /training camp/i, "The dashboard must use study-plan language, not decorative camp language.");
  assert.ok(dashboardA11y.hiddenPanelMarks >= 1, "Decorative dashboard marks must be hidden from assistive technology.");
  assert.ok(dashboardA11y.hiddenHistoryMarks >= 1, "Decorative history marks must be hidden from assistive technology.");

  await desktop.locator('[data-view="subscription"]').click();
  await desktop.locator("#subscription.active #subscriptionContent").waitFor({ state: "visible" });
  const subscription = desktop.locator("#subscriptionContent");
  const subscriptionText = await subscription.innerText();
  assert.match(subscriptionText, /CNY \u00a5300 \/ month/);
  assert.match(subscriptionText, /Online checkout is not enabled/i);
  assert.match(subscriptionText, /No automatic renewal/i);
  assert.match(subscriptionText, /Refunds/i);
  const schoolCard = subscription.locator(".subscription-card").filter({ hasText: "School" });
  const schoolButton = schoolCard.getByRole("button", { name: "Contact sales" });
  assert.equal(await schoolButton.isDisabled(), true, "Unconfigured school sales must be visibly disabled.");
  assert.equal(await schoolButton.getAttribute("aria-describedby"), "subscriptionCheckoutStatus");
  assert.ok((await subscription.evaluate((node) => node.scrollWidth - node.clientWidth)) <= 1, "Desktop subscription must not overflow horizontally.");
  await desktop.screenshot({ path: join(outputDir, "subscription-desktop.png"), fullPage: false });

  await subscription.locator(".subscription-card.featured button").click();
  await desktop.waitForFunction(() => document.querySelector("#mine")?.classList.contains("active") && Boolean(document.querySelector("#authForm")));
  const username = `plans${process.pid}`.slice(0, 24);
  await desktop.locator("#authUsername").fill(username);
  await desktop.locator("#authPassword").fill("testing123");
  await desktop.locator("#registerUser").click();
  await desktop.locator("#redeemCode").waitFor({ state: "visible" });
  await desktop.waitForFunction(() => document.querySelector("#redeemCodeButton")?.textContent === "Redeem");
  await desktop.locator("#redeemCode").fill(redemptionCode);
  assert.ok(heldAccountRefreshRequests >= 3, "Post-registration account refresh must be held deterministically before redeeming.");
  await desktop.locator("#redeemCodeButton").click();
  await desktop.waitForFunction(() => document.querySelector("#redeemMessage")?.textContent?.trim() === "Redeemed. Membership updated.");
  accountRefreshReleased = true;
  releaseAccountRefresh();
  await waitForCondition(
    () => releasedAccountRefreshRequests === heldAccountRefreshRequests,
    "Every deliberately delayed post-registration refresh must settle after redemption.",
  );
  await desktop.waitForFunction(() => document.querySelector("#redeemMessage")?.textContent?.trim() === "Redeemed. Membership updated.");
  await desktop.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  const redemptionMessage = await desktop.locator("#redeemMessage").innerText();
  assert.equal(redemptionMessage, "Redeemed. Membership updated.", `Redemption must complete successfully, received: ${redemptionMessage}`);
  assert.match(await desktop.locator("#mineContent").innerText(), /Membership/i);
  assert.doesNotMatch(await desktop.locator("#sidebarAccountPlan").innerText(), /Free account/i, "A redeemed user must leave the Free account state.");
  assert.equal(await desktop.locator("#redeemCode").inputValue(), "", "A successfully redeemed code must clear only after success.");

  // Rapid, ordinary Mine re-renders must keep an unfinished code draft intact.
  await desktop.locator("#redeemCode").fill(retainedDraftCode);
  for (let index = 0; index < 5; index += 1) {
    await desktop.locator('.tab[data-view="home"]').click();
    await desktop.locator('.tab[data-view="mine"]').click();
  }
  assert.equal(await desktop.locator("#redeemCode").inputValue(), retainedDraftCode, "Repeated Mine refreshes must not clear an unfinished code.");

  // Explicit logout and a different account are allowed to clear the private draft.
  await desktop.locator("#logoutUser").click();
  await desktop.locator("#authForm").waitFor({ state: "visible" });
  const secondUsername = `plansb${process.pid}`.slice(0, 24);
  await desktop.locator("#authUsername").fill(secondUsername);
  await desktop.locator("#authPassword").fill("testing123");
  await desktop.locator("#registerUser").click();
  await desktop.locator("#redeemCode").waitFor({ state: "visible" });
  assert.equal(await desktop.locator("#redeemCode").inputValue(), "", "A different account must not inherit another account's unfinished redemption code.");

  for (const [pathname, title] of [["/terms.html", "Terms of use"], ["/privacy.html", "Privacy notice"], ["/cookie-policy.html", "Cookie policy"], ["/content-policy.html", "Content policy"]]) {
    const legalContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const legal = await legalContext.newPage();
    try {
      await legal.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
      await legal.getByRole("heading", { name: title }).waitFor({ state: "visible" });
      assert.equal(await legal.getByRole("link", { name: "Return to IELTSist practice" }).count(), 1);
      assert.equal(await legal.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, `${pathname} must not overflow on desktop.`);
    } finally {
      await legalContext.close();
    }
  }
  assert.deepEqual(desktopErrors, [], `Desktop console errors: ${desktopErrors.join(" | ")}`);
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobileErrors = [];
  mobile.on("pageerror", (error) => mobileErrors.push(error.message));
  await mobile.goto(`${baseUrl}/?test=subscription-legal-mobile#subscription`, { waitUntil: "networkidle" });
  await mobile.locator("#subscription.active #subscriptionContent").waitFor({ state: "visible" });
  const mobileLayout = await mobile.evaluate(() => {
    const policy = document.querySelector(".subscription-policy-note");
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      columns: policy ? getComputedStyle(policy).gridTemplateColumns.split(" ").length : 0,
      legalLinks: document.querySelectorAll(".legal-footer a").length,
    };
  });
  assert.ok(mobileLayout.overflow <= 1, `Mobile subscription overflow: ${mobileLayout.overflow}`);
  assert.equal(mobileLayout.columns, 1, "Mobile membership conditions must stack into one readable column.");
  assert.equal(mobileLayout.legalLinks, 4, "Every legal policy must remain reachable from mobile.");
  assert.equal(await mobile.locator(".subscription-card").filter({ hasText: "School" }).getByRole("button", { name: "Contact sales" }).isDisabled(), true);
  await mobile.screenshot({ path: join(outputDir, "subscription-mobile.png"), fullPage: false });
  assert.deepEqual(mobileErrors, [], `Mobile console errors: ${mobileErrors.join(" | ")}`);
  await mobile.close();

  console.log("Subscription, redemption, legal policy and decorative-a11y browser checks passed.");
} finally {
  await browser.close();
  if (child.exitCode === null) {
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
    child.kill();
    await Promise.race([exited, sleep(2_000)]);
  }
  await Promise.all([databasePath, `${databasePath}-shm`, `${databasePath}-wal`].map((file) => rm(file, { force: true }).catch(() => {})));
}
