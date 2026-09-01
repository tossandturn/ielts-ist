import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);

const port = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.unref();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    const selectedPort = typeof address === "object" && address ? address.port : 0;
    probe.close((error) => error ? reject(error) : resolve(selectedPort));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = join(tmpdir(), `ieltsist-reading-annotation-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: databasePath,
    SESSION_COOKIE_SECURE: "0",
    STEM_MARKING_AI_DISABLED: "1",
  },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Reading annotation test server did not start. ${stderr}`);
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/?qa=reading-annotation#single`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof activateSingleModule === "function" && state.data?.readingTests?.length > 0);
  await page.evaluate(() => {
    activateSingleModule("reading", false);
    startSinglePractice("recommended");
  });
  await page.waitForFunction(() => [...document.querySelectorAll(".reading-passage-pane img")].length > 0
    && [...document.querySelectorAll(".reading-passage-pane img")].every((image) => image.complete));

  const hiddenPassageStyle = await page.addStyleTag({
    content: "#singleContent .reading-passage-pane { display: none !important; }",
  });
  await page.evaluate(() => beginSinglePracticeUnit(state.activeSingle, { restart: true }));
  await page.waitForTimeout(150);
  await hiddenPassageStyle.evaluate((style) => style.remove());
  await page.waitForFunction(() => [...document.querySelectorAll(".pdf-annotation-canvas")].some((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }));
  await page.waitForFunction(() => {
    const toolbar = document.querySelector("#annotationToolbar");
    const rect = toolbar?.getBoundingClientRect();
    return document.body.classList.contains("annotation-toolbar-available")
      && getComputedStyle(toolbar).display !== "none"
      && Boolean(rect && rect.width > 0 && rect.height > 0);
  }, { timeout: 5_000 });

  const layout = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    drawVisible: document.querySelector("#toggleAnnotation")?.getClientRects().length > 0,
    eraseVisible: document.querySelector("#toggleEraser")?.getClientRects().length > 0,
    clearVisible: document.querySelector("#clearAnnotation")?.getClientRects().length > 0,
  }));
  assert.ok(layout.overflowX <= 1, `Reading annotation tools must not cause horizontal overflow: ${layout.overflowX}px.`);
  assert.equal(layout.drawVisible, true, "Draw must return after a cached Reading PDF becomes visible.");
  assert.equal(layout.eraseVisible, true, "Erase must return after a cached Reading PDF becomes visible.");
  assert.equal(layout.clearVisible, true, "Clear paper must return after a cached Reading PDF becomes visible.");
  assert.deepEqual(errors, [], `Reading annotation tools produced console errors: ${errors.join(" | ")}`);
  await page.close();
  console.log("Reading annotation toolbar recovers after cached portrait PDF layout.");
} finally {
  await browser.close();
  if (child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await Promise.race([exited, sleep(2_000)]);
  }
  await Promise.all([databasePath, `${databasePath}-shm`, `${databasePath}-wal`].map((file) => rm(file, { force: true }).catch(() => {})));
}
