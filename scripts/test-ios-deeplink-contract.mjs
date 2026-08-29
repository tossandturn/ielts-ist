import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const baseUrl = process.env.IELTSIST_URL || "http://127.0.0.1:4321";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

const cases = [
  {
    name: "single-reading",
    url: `${baseUrl}/?module=reading#single`,
    expectedView: "single",
    expectedModule: "reading",
  },
  {
    name: "single-listening",
    url: `${baseUrl}/?module=listening#single`,
    expectedView: "single",
    expectedModule: "listening",
  },
  {
    name: "writing-upload",
    url: `${baseUrl}/?module=writing#writing-upload`,
    expectedView: "writing-upload",
  },
  {
    name: "speaking-bank",
    url: `${baseUrl}/?module=speaking#bank`,
    expectedView: "bank",
  },
  {
    name: "vocabulary-preserved",
    url: `${baseUrl}/?module=reading#vocabulary`,
    expectedView: "vocabulary",
  },
  {
    name: "mine-preserved",
    url: `${baseUrl}/?module=writing#mine`,
    expectedView: "mine",
  },
];

try {
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(testCase.url, { waitUntil: "networkidle" });
    const actual = await page.evaluate(() => {
      const activeTab = document.querySelector(".tab.active");
      const activeView = document.querySelector(".view.active");
      const activeModule = document.querySelector(".module-btn.active");
      return {
        tabView: activeTab?.dataset.view || "",
        viewId: activeView?.id || "",
        module: activeTab?.dataset.moduleTarget || activeModule?.dataset.module || "",
        hash: location.hash,
      };
    });
    assert.equal(actual.tabView || actual.viewId, testCase.expectedView, `${testCase.name}: wrong active view`);
    if (testCase.expectedModule) {
      assert.equal(actual.module, testCase.expectedModule, `${testCase.name}: wrong active module`);
    }
    await page.close();
    console.log(`PASS ${testCase.name}`);
  }
} finally {
  await browser.close();
}
