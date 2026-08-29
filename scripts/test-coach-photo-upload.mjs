import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Coach photo test server exited with ${child.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Coach photo test server did not start.");
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    child.once("exit", finish);
    child.once("close", finish);
    child.kill();
    setTimeout(() => {
      if (child.exitCode === null) child.kill();
      finish();
    }, 2_000).unref();
  });
}

const appPort = Number(process.env.IELTSIST_COACH_PHOTO_TEST_PORT || await findAvailablePort());
const appBaseUrl = `http://127.0.0.1:${appPort}`;
const testDbPath = path.join(os.tmpdir(), `ieltsist-coach-photo-${process.pid}.sqlite`);
const pngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
let child;
let capturedRequest = null;

child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    SESSION_COOKIE_SECURE: "0",
    IELTSIST_DB_PATH: testDbPath,
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "",
    OPENAI_API_KEY: "",
  },
  stdio: ["ignore", "ignore", "pipe"],
});

try {
  await waitForServer(appBaseUrl, child);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("**/api/help/chat", async (route) => {
      capturedRequest = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mode: "local",
          answer: "Photo received. Type the question if any part is unclear.",
          warning: "",
        }),
      });
    });
    await page.goto(`${appBaseUrl}/?qa=coach-photo#home`, { waitUntil: "domcontentloaded" });
    await page.locator("#globalHelpButton").click();
    await page.locator("#helpChatPanel").waitFor({ state: "visible" });

    const photoInput = page.locator("#helpPhotoInput");
    assert.equal(await photoInput.count(), 1, "Coach must expose one photo input");
    assert.equal(await photoInput.getAttribute("accept"), "image/*");
    assert.equal(await photoInput.getAttribute("capture"), "environment");
    assert.equal(await page.locator("#helpPhotoButton").getAttribute("aria-label"), "Take or upload a photo");

    await photoInput.setInputFiles({
      name: "question.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });
    await page.locator("#helpAttachmentPreview").waitFor({ state: "visible" });
    assert.equal(await page.locator("#helpAttachmentLabel").innerText(), "Photo attached");
    assert.equal(await page.locator("#helpAttachmentThumbnail").isVisible(), true);

    await page.locator("#helpChatInput").fill("Please explain this question.");
    await page.locator("#helpChatForm button[type='submit']").click();
    await page.locator("#helpChatLog").getByText(/Photo received/).waitFor({ state: "visible" });
    assert.ok(capturedRequest, "Photo submission must call the Coach API");
    assert.match(String(capturedRequest.imageDataUrl || ""), /^data:image\/jpeg;base64,/i);
    assert.equal(capturedRequest.message, "Please explain this question.");
    const userMessage = capturedRequest.history?.find((message) => message.role === "user");
    assert.equal(userMessage?.attachments?.[0]?.kind, "image");
    assert.equal(userMessage?.attachments?.[0]?.source, "photo");
    assert.doesNotMatch(JSON.stringify(await page.evaluate(() => localStorage)), /data:image/i,
      "Coach history must not persist the raw photo data URL");
    await page.locator("#helpAttachmentPreview").waitFor({ state: "hidden" });

    await photoInput.setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image", "utf8"),
    });
    await page.locator("#helpChatStatus").filter({ hasText: "Photo not attached" }).waitFor({ state: "visible" });
    assert.equal(await page.locator("#helpAttachmentPreview").isVisible(), false);
    console.log("Coach photo upload browser contract passed.");
    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  await stopChild(child);
  await rm(testDbPath, { force: true }).catch(() => {});
  await rm(`${testDbPath}-wal`, { force: true }).catch(() => {});
  await rm(`${testDbPath}-shm`, { force: true }).catch(() => {});
}

const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");
assert.match(serverSource, /const hasImage = Boolean\(payload\.imageDataUrl\)/);
