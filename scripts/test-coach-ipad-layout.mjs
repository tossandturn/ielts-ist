import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";
const screenshotDir = process.env.QA_SCREENSHOT_DIR || "";
const viewports = [
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-landscape", width: 1024, height: 768 },
];

if (screenshotDir) await mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/?qa=coach-ipad#home`, { waitUntil: "networkidle" });
    const sidebarToggle = page.locator("#globalSidebarToggle");
    if (await sidebarToggle.isVisible()) await sidebarToggle.click();
    await page.locator('[data-module-target="reading"]').click();
    await page.getByRole("button", { name: "Start recommended practice", exact: true }).click();
    await page.locator(".back-submit-button").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Open AI Coach", exact: true }).click();
    await page.locator("#helpChatPanel").waitFor({ state: "visible" });

    const opened = await page.evaluate(() => {
      const panel = document.querySelector("#helpChatPanel");
      const rect = panel?.getBoundingClientRect();
      const controls = ["#helpChatClose"].map((selector) => {
        const node = document.querySelector(selector);
        const box = node?.getBoundingClientRect();
        return { selector, visible: Boolean(box && box.width > 0 && box.height > 0), box };
      });
      const requestControls = ["#helpChatCancel", "#helpChatRetry"].map((selector) => ({
        selector,
        hidden: document.querySelector(selector)?.hidden === true,
      }));
      return {
        bodyClass: document.body.classList.contains("coach-dock-open"),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        panel: rect && { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        mainVisibility: getComputedStyle(document.querySelector(".app-shell main")).visibility,
        controls,
        requestControls,
      };
    });

    assert.equal(opened.bodyClass, true, `${viewport.name}: Coach did not enter its open state`);
    assert.ok(opened.overflow <= 1, `${viewport.name}: Coach causes ${opened.overflow}px horizontal overflow`);
    assert.ok(opened.panel?.left <= 1 && opened.panel?.top <= 1, `${viewport.name}: Coach must begin at the viewport edge`);
    assert.ok(opened.panel?.right >= viewport.width - 1 && opened.panel?.bottom >= viewport.height - 1,
      `${viewport.name}: Coach must be a complete iPad modal, not an overlapping rail`);
    assert.equal(opened.mainVisibility, "hidden", `${viewport.name}: exam workspace remains visibly blocked below Coach`);
    opened.controls.forEach(({ selector, visible, box }) => {
      assert.equal(visible, true, `${viewport.name}: ${selector} is not reachable in Coach`);
      assert.ok(box.left >= 0 && box.right <= viewport.width && box.top >= 0 && box.bottom <= viewport.height,
        `${viewport.name}: ${selector} escapes the Coach viewport`);
    });
    opened.requestControls.forEach(({ selector, hidden }) => {
      assert.equal(hidden, true, `${viewport.name}: ${selector} should stay out of the empty Coach state`);
    });
    assert.equal(await page.locator("#helpAttachImage").count(), 1, `${viewport.name}: Coach needs one Capture entry`);
    assert.equal(await page.locator("[data-global-coach-capture]").count(), 0, `${viewport.name}: Coach action list must not duplicate Capture`);
    if (screenshotDir) {
      const screenshotPath = resolve(screenshotDir, `coach-${viewport.width}x${viewport.height}-open.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`SCREENSHOT ${screenshotPath}`);
    }

    await page.locator("#helpChatClose").click();
    await page.locator("#helpChatPanel").waitFor({ state: "hidden" });
    const questionsTab = page.getByRole("button", { name: "Questions", exact: true });
    if (await questionsTab.isVisible()) await questionsTab.click();
    await page.evaluate(() => {
      const answer = [...document.querySelectorAll('input[placeholder="Answer"]')].find((node) => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== "hidden";
      });
      answer?.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(100);
    const closed = await page.evaluate(() => {
      const visibleNode = (selector) => [...document.querySelectorAll(selector)].find((node) => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(node).visibility !== "hidden";
      });
      const critical = [".back-submit-button", ".single-sticky-timer", 'input[placeholder="Answer"]'];
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        mainVisibility: getComputedStyle(document.querySelector(".app-shell main")).visibility,
        visible: critical.map((selector) => {
          const node = visibleNode(selector);
          const box = node?.getBoundingClientRect();
          return { selector, visible: Boolean(box && box.width > 0 && box.height > 0) };
        }),
      };
    });
    assert.ok(closed.overflow <= 1, `${viewport.name}: closing Coach leaves ${closed.overflow}px horizontal overflow`);
    assert.equal(closed.mainVisibility, "visible", `${viewport.name}: Close does not restore the exam workspace`);
    closed.visible.forEach(({ selector, visible }) => assert.equal(visible, true, `${viewport.name}: ${selector} is not reachable after Close`));
    console.log(`PASS ${viewport.name} Coach modal and restored workspace`);
    await page.close();
  }
} finally {
  await browser.close();
}
