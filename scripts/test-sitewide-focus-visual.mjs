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
const outputDir = resolve("artifacts", "sitewide-focus-camp");
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
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Site-wide visual test server did not start. ${serverStderr}`);
}

const routes = [
  { name: "home", view: "home", selector: '[data-view="home"]' },
  { name: "listening", view: "single", selector: '[data-view="single"][data-module-target="listening"]' },
  { name: "reading", view: "single", selector: '[data-view="single"][data-module-target="reading"]' },
  { name: "writing", view: "writing-upload", selector: '[data-view="writing-upload"]' },
  { name: "speaking", view: "bank", selector: '[data-view="bank"]' },
  { name: "vocabulary", view: "vocabulary", selector: '[data-view="vocabulary"]' },
  { name: "account", view: "mine", selector: '#sidebarAccountEntry' },
  { name: "subscription", view: "subscription", selector: '[data-view="subscription"]' },
  { name: "same-test", view: "sequence", selector: '[data-view="sequence"]' },
  { name: "random-exam", view: "exam", selector: '[data-view="exam"]' },
];

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 720 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.addInitScript(() => {
      localStorage.removeItem("ieltsistAuthToken");
      localStorage.removeItem("ieltsistPracticeSessionV1");
    });
    await page.goto(`${baseUrl}/?test=sitewide-${viewport.name}#home`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#dashboardContent")?.children.length);

    assert.equal(await page.locator("body.focus-camp-system").count(), 1, `${viewport.name}: shared system marker is missing`);

    for (const route of routes) {
      await page.locator(route.selector).evaluate((node) => node.click());
      await page.waitForFunction((view) => document.getElementById(view)?.classList.contains("active"), route.view);
      await page.waitForTimeout(80);
      const metrics = await page.evaluate(({ view, isMobile }) => {
        const active = document.getElementById(view);
        const controls = [...active.querySelectorAll("button, select, input, textarea")]
          .filter((node) => {
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          });
        const shortest = controls.sort((a, b) => a.getBoundingClientRect().height - b.getBoundingClientRect().height)[0];
        return {
          activeClasses: active.className,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
          canvas: getComputedStyle(document.body).backgroundColor,
          minInteractiveHeight: controls.length ? Math.min(...controls.map((node) => node.getBoundingClientRect().height)) : Infinity,
          interactiveCount: controls.length,
          shortestControl: shortest ? (() => {
            const style = getComputedStyle(shortest);
            return `${shortest.tagName.toLowerCase()}.${shortest.className || ""}#${shortest.id || ""} height=${style.height} min=${style.minHeight} max=${style.maxHeight}`;
          })() : "none",
          isMobile,
        };
      }, { view: route.view, isMobile: viewport.width <= 600 });
      assert.match(metrics.activeClasses, /focus-page/, `${viewport.name}/${route.name}: page family class is missing`);
      assert.ok(metrics.overflow <= 1, `${viewport.name}/${route.name}: horizontal overflow is ${metrics.overflow}px`);
      assert.equal(metrics.accent.toLowerCase(), "#7357e8", `${viewport.name}/${route.name}: shared brand token is not active`);
      // Shared console canvas follows the verified STEM redesign prototype: #f7f7fb.
      assert.equal(metrics.canvas, "rgb(247, 247, 251)", `${viewport.name}/${route.name}: shared canvas is not active`);
      if (viewport.width <= 600 && metrics.interactiveCount) {
        assert.ok(metrics.minInteractiveHeight >= 43.5, `${viewport.name}/${route.name}: smallest visible control is ${metrics.minInteractiveHeight}px (${metrics.shortestControl})`);
      }
      await page.screenshot({ path: resolve(outputDir, `${viewport.name}-${route.name}.png`), fullPage: true });
      console.log(`PASS ${viewport.name}/${route.name}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  child.kill();
}
