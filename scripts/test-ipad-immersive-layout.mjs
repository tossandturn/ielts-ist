import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";
const outputDir = resolve("artifacts", "ipad-immersive-layout");
await mkdir(outputDir, { recursive: true });

const sizes = [
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-portrait", width: 768, height: 1024 },
];
const modules = ["listening", "reading", "writing", "speaking"];

function overlaps(a, b, tolerance = 2) {
  if (!a || !b) return false;
  return a.left < b.right - tolerance
    && a.right > b.left + tolerance
    && a.top < b.bottom - tolerance
    && a.bottom > b.top + tolerance;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
    await page.goto(`${baseUrl}/?visual=ipad-immersive-layout#single`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof state !== "undefined" && state.data?.readingTests?.length > 0);

    for (const moduleName of modules) {
      await page.evaluate((moduleName) => {
        closeHelpPanel();
        activateSingleModule(moduleName, false);
        startSinglePractice("recommended");
        window.scrollTo({ top: 0, behavior: "auto" });
      }, moduleName);
      await page.locator("#single.single-started").waitFor({ state: "visible" });
      if (moduleName === "speaking") {
        await page.locator("#annotationToolbar").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
      } else {
        await page.locator("#annotationToolbar").waitFor({ state: "visible", timeout: 5_000 });
      }
      await page.waitForTimeout(150);

      const layout = await page.evaluate((moduleName) => {
        const rect = (node) => {
          const value = node?.getBoundingClientRect();
          return value && value.width > 0 && value.height > 0
            ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height }
            : null;
        };
        const visibleHeaderChildren = [...document.querySelectorAll("#single > .view-head > *")]
          .filter((node) => node.getClientRects().length)
          .map((node) => ({ id: node.id || node.className, rect: rect(node) }));
        const mainSelectors = {
          listening: [".listening-study .pdf-study-layout", ".listening-study .pdf-scroll-box", ".listening-study .paper-answer-scroll"],
          reading: [".reading-question-nav", ".reading-passage-pane"],
          writing: [".writing-two-column", ".writing-two-column .exam-left-pane", ".writing-two-column .exam-right-pane"],
          speaking: [".speaking-exam-shell", ".speaking-main-stage", ".qwen-speaking"],
        };
        return {
          bodyModule: document.body.dataset.immersiveModule,
          immersive: document.body.classList.contains("single-immersive-mode"),
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          accountVisible: Boolean(document.querySelector("#sidebarAccountEntry")?.getClientRects().length),
          header: rect(document.querySelector("#single > .view-head")),
          headerChildren: visibleHeaderChildren,
          toolbar: rect(document.querySelector("#annotationToolbar")),
          main: mainSelectors[moduleName].map((selector) => ({ selector, rect: rect(document.querySelector(selector)) })),
          pageScrollY: window.scrollY,
        };
      }, moduleName);

      assert.equal(layout.immersive, true, `${size.name} ${moduleName}: immersive mode is missing`);
      assert.equal(layout.bodyModule, moduleName, `${size.name} ${moduleName}: immersive module is incorrect`);
      assert.equal(layout.accountVisible, false, `${size.name} ${moduleName}: Account is visible during practice`);
      assert.ok(layout.overflowX <= 1, `${size.name} ${moduleName}: page overflows horizontally by ${layout.overflowX}px`);
      assert.ok(layout.header && layout.header.top >= -1 && layout.header.bottom <= size.height, `${size.name} ${moduleName}: fixed header is outside the viewport`);
      for (let i = 0; i < layout.headerChildren.length; i += 1) {
        for (let j = i + 1; j < layout.headerChildren.length; j += 1) {
          assert.equal(
            overlaps(layout.headerChildren[i].rect, layout.headerChildren[j].rect),
            false,
            `${size.name} ${moduleName}: header controls overlap (${layout.headerChildren[i].id} / ${layout.headerChildren[j].id})`,
          );
        }
      }
      if (moduleName === "speaking") {
        assert.equal(layout.toolbar, null, `${size.name} speaking: PDF annotation toolbar should be hidden`);
      } else {
        assert.ok(layout.toolbar, `${size.name} ${moduleName}: PDF annotation toolbar is missing`);
        assert.ok(layout.toolbar.left <= layout.header.left + 16, `${size.name} ${moduleName}: annotation toolbar is not top-left`);
      }
      layout.main.forEach(({ selector, rect }) => {
        assert.ok(rect, `${size.name} ${moduleName}: ${selector} is missing or collapsed`);
        const minimumHeight = selector === ".reading-question-nav" ? 40 : 80;
        assert.ok(rect.width >= 120 && rect.height >= minimumHeight, `${size.name} ${moduleName}: ${selector} has no usable practice area`);
        assert.ok(rect.left >= -1 && rect.right <= size.width + 1, `${size.name} ${moduleName}: ${selector} exceeds viewport width`);
      });

      if (moduleName === "reading" && size.name === "ipad-portrait") {
        await page.locator('[data-reading-pane-target="questions"]').click();
        await page.locator(".reading-question-pane").waitFor({ state: "visible" });
        const questionPane = await page.locator(".reading-question-pane").evaluate((node) => {
          const value = node.getBoundingClientRect();
          return { width: value.width, height: value.height, left: value.left, right: value.right };
        });
        assert.ok(
          questionPane.width >= 120 && questionPane.height >= 120,
          `${size.name} reading: Questions pane is not usable after switching tabs`,
        );
        assert.ok(
          questionPane.left >= -1 && questionPane.right <= size.width + 1,
          `${size.name} reading: Questions pane exceeds viewport width`,
        );
      }

      const scrollBeforeCoach = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => openGlobalCoachPanel());
      await page.locator("#helpChatPanel").waitFor({ state: "visible" });
      await page.waitForTimeout(100);
      const coach = await page.evaluate(() => {
        const panel = document.querySelector("#helpChatPanel");
        const log = document.querySelector("#helpChatLog");
        const rect = panel?.getBoundingClientRect();
        return {
          rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
          scrollY: window.scrollY,
          bodyOverflow: getComputedStyle(document.body).overflow,
          logOverflow: log ? getComputedStyle(log).overflowY : "",
        };
      });
      assert.ok(coach.rect, `${size.name} ${moduleName}: Coach panel is missing`);
      assert.ok(coach.rect.left >= 0 && coach.rect.top >= 0, `${size.name} ${moduleName}: Coach starts outside viewport`);
      assert.ok(coach.rect.right <= size.width + 1 && coach.rect.bottom <= size.height + 1, `${size.name} ${moduleName}: Coach exceeds viewport`);
      assert.equal(coach.scrollY, scrollBeforeCoach, `${size.name} ${moduleName}: opening Coach moved the practice page`);
      assert.equal(coach.bodyOverflow, "hidden", `${size.name} ${moduleName}: background page is not scroll-locked`);
      assert.match(coach.logOverflow, /auto|scroll/, `${size.name} ${moduleName}: Coach conversation is not independently scrollable`);
      await page.screenshot({ path: resolve(outputDir, `${size.name}-${moduleName}-coach.png`), fullPage: false });
      await page.locator("#helpChatClose").click();
      await page.locator("#helpChatPanel").waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => window.scrollY), scrollBeforeCoach, `${size.name} ${moduleName}: closing Coach moved the practice page`);
      await page.screenshot({ path: resolve(outputDir, `${size.name}-${moduleName}.png`), fullPage: false });
      console.log(`PASS ${size.name} ${moduleName}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
