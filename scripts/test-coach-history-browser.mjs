import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selectedPort = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(selectedPort));
    });
  });
}

const appPort = Number(process.env.IELTSIST_COACH_BROWSER_PORT || await findAvailablePort());
const gatewayPort = Number(process.env.IELTSIST_COACH_BROWSER_GATEWAY_PORT || await findAvailablePort());
const appBaseUrl = `http://127.0.0.1:${appPort}`;
const databasePath = path.join(os.tmpdir(), `ieltsist-coach-browser-${process.pid}.sqlite`);
let appOutput = "";
let abortGatewayRequest = true;

const gateway = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  const message = body.messages?.find((item) => item.role === "user")?.content || "";
  res.setHeader("content-type", "application/json");
  if (abortGatewayRequest) {
    req.socket.destroy();
    return;
  }
  res.end(JSON.stringify({ choices: [{ message: { content: `Recovered Coach answer for ${message}` } }] }));
});
await new Promise((resolve, reject) => {
  gateway.once("error", reject);
  gateway.listen(gatewayPort, "127.0.0.1", resolve);
});

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    IELTSIST_DB_PATH: databasePath,
    SESSION_COOKIE_SECURE: "0",
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "browser-coach-key",
    COACH_AI_BASE_URL: `http://127.0.0.1:${gatewayPort}/v1`,
    COACH_AI_MODEL: "browser-coach-test",
    COACH_AI_TIMEOUT_MS: "3000",
    STEM_MARKING_AI_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (chunk) => { appOutput += chunk; });
child.stderr.on("data", (chunk) => { appOutput += chunk; });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Coach browser server exited early.\n${appOutput}`);
    try {
      if ((await fetch(`${appBaseUrl}/healthz`)).ok) return;
    } catch {}
    await sleep(75);
  }
  throw new Error(`Coach browser server did not start.\n${appOutput}`);
}

async function api(pathname, options = {}) {
  const response = await fetch(`${appBaseUrl}${pathname}`, options);
  return { response, json: await response.json() };
}

async function pollConversation(token, predicate, conversationId = "") {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await api("/api/coach/conversations", { headers: { authorization: `Bearer ${token}` } });
    const conversation = conversationId
      ? result.json.conversations?.find((item) => item.conversationId === conversationId)
      : result.json.conversations?.[0];
    if (conversation && predicate(conversation)) return conversation;
    await sleep(100);
  }
  throw new Error("Coach conversation was not synchronized in time.");
}

async function pollConversations(token, predicate) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await api("/api/coach/conversations?limit=80", { headers: { authorization: `Bearer ${token}` } });
    if (predicate(result.json.conversations || [])) return result.json.conversations || [];
    await sleep(100);
  }
  throw new Error("Coach conversation collection was not synchronized in time.");
}

try {
  await waitForServer();
  const username = `coachbrowser${process.pid}`.slice(0, 24);
  const registered = await api("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: "testing123" }),
  });
  assert.equal(registered.response.status, 200);
  const token = registered.json.token;
  const userId = registered.json.user.id;

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    const firstContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
      const page = await firstContext.newPage();
      let abortBrowserRequest = true;
      await page.route(`${appBaseUrl}/api/help/chat`, async (route) => {
        if (abortBrowserRequest) {
          abortBrowserRequest = false;
          await route.abort();
          return;
        }
        await route.continue();
      });
      await page.goto(appBaseUrl, { waitUntil: "networkidle" });
      await page.evaluate((value) => localStorage.setItem("ieltsistAuthToken", value), token);
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("#globalHelpButton").click();
      await page.locator("#helpChatInput").fill("Please recover this Coach conversation after a disconnect.");
      await page.locator("#helpChatForm button[type='submit']").click();
      await page.locator("#helpChatLog").getByText(/AI Coach is temporarily unavailable|AI Coach request was/i).waitFor({ state: "visible", timeout: 10_000 });
      assert.match(await page.locator("#helpChatLog").innerText(), /AI Coach is temporarily unavailable|AI Coach request was/i);

      const failedConversation = await pollConversation(token, (conversation) => conversation.messages.some((message) => ["failed", "interrupted"].includes(message.status)));
      assert.ok(failedConversation.messages.some((message) => /recover this Coach conversation/i.test(message.content)));
      const failedAssistant = [...failedConversation.messages].reverse().find((message) => message.role === "assistant" && ["failed", "interrupted"].includes(message.status));
      assert.ok(failedAssistant, "A disconnected request must persist an assistant failure slot.");
      assert.ok(failedAssistant.id, "The assistant failure slot must have a stable message ID for retry replacement.");

      await page.reload({ waitUntil: "networkidle" });
      await page.locator("#globalHelpButton").click();
      await page.locator("#helpChatRetry").waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(await page.locator("#helpChatRetry").isEnabled(), true, "A failed request must remain retryable after a page refresh.");

      abortGatewayRequest = false;
      await page.locator("#helpChatRetry").click();
      await page.locator("#helpChatLog").getByText(/Recovered Coach answer/).waitFor({ timeout: 10_000 });
      const recoveredConversation = await pollConversation(token, (conversation) => conversation.messages.some((message) => /Recovered Coach answer/i.test(message.content)));
      assert.ok(recoveredConversation.messages.some((message) => /Recovered Coach answer/i.test(message.content)));
      const recoveredAssistantVersions = recoveredConversation.messages.filter((message) => message.id === failedAssistant.id);
      assert.equal(recoveredAssistantVersions.length, 1, "Retry must replace the failed assistant slot instead of appending a duplicate reply.");
      assert.equal(recoveredAssistantVersions[0].status, "completed");
      assert.equal(
        recoveredConversation.messages.filter((message) => ["failed", "interrupted", "retrying", "streaming"].includes(message.status)).length,
        0,
        "The replaced failure must not remain in account history.",
      );

      const remoteConversation = {
        conversationId: "browser-stale-merge",
        sourceProduct: "ieltsist",
        surface: "dashboard",
        module: "",
        title: "AI Coach conversation",
        binding: { view: "dashboard" },
        messages: [
          { role: "assistant", content: "A newer server message from another device.", createdAt: "2026-08-19T00:20:02.000Z" },
        ],
        createdAt: "2026-08-19T00:20:02.000Z",
        updatedAt: "2026-08-19T00:20:02.000Z",
      };
      const remoteSaved = await api("/api/coach/conversations", {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversation: remoteConversation }),
      });
      assert.equal(remoteSaved.response.status, 200);
      const localHistoryKey = `ieltsistCoachHistoryV1::${encodeURIComponent(`user:${userId}`)}`;
      await page.evaluate(({ key, thread }) => {
        localStorage.setItem(key, JSON.stringify([thread]));
      }, {
        key: localHistoryKey,
        thread: {
          key: "browser-stale-merge",
          conversationId: "browser-stale-merge",
          sourceProduct: "ieltsist",
          binding: { view: "dashboard" },
          title: "AI Coach conversation",
          messages: [
            { role: "user", content: "An older local message must still be synchronized.", createdAt: "2026-08-19T00:20:01.000Z" },
          ],
          updatedAt: "2026-08-19T00:20:01.000Z",
        },
      });
      await page.reload({ waitUntil: "networkidle" });
      const clientMergedConversation = await pollConversation(
        token,
        (conversation) => conversation.messages.some((message) => /older local message/i.test(message.content)),
        "browser-stale-merge",
      );
      assert.deepEqual(
        clientMergedConversation.messages.map((message) => message.content),
        [
          "An older local message must still be synchronized.",
          "A newer server message from another device.",
        ],
        "A stale browser cache must merge with newer server history before it is synchronized.",
      );

      const bulkConversationIds = Array.from({ length: 21 }, (_, index) => `browser-bulk-${index + 1}`);
      await page.evaluate(({ key, conversationIds }) => {
        localStorage.setItem(key, JSON.stringify(conversationIds.map((conversationId, index) => ({
          key: conversationId,
          conversationId,
          sourceProduct: "ieltsist",
          binding: { view: "dashboard", sessionId: conversationId },
          title: "Bulk Coach conversation",
          messages: [{ role: "user", content: `Bulk conversation ${index + 1}`, createdAt: `2026-08-19T00:30:${String(index).padStart(2, "0")}.000Z` }],
          updatedAt: `2026-08-19T00:30:${String(index).padStart(2, "0")}.000Z`,
        }))));
      }, { key: localHistoryKey, conversationIds: bulkConversationIds });
      await page.reload({ waitUntil: "networkidle" });
      await pollConversations(token, (conversations) => bulkConversationIds.every((id) => conversations.some((conversation) => conversation.conversationId === id)));

      const secondContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      try {
        const secondPage = await secondContext.newPage();
        await secondPage.goto(appBaseUrl, { waitUntil: "networkidle" });
        await secondPage.evaluate((value) => localStorage.setItem("ieltsistAuthToken", value), token);
        await secondPage.reload({ waitUntil: "networkidle" });
        await secondPage.locator("#globalHelpButton").click();
        await secondPage.locator("#helpChatLog").getByText(/Recovered Coach answer/).waitFor({ timeout: 10_000 });
        assert.match(await secondPage.locator("#helpChatLog").innerText(), /recover this Coach conversation|Recovered Coach answer/);
      } finally {
        await secondContext.close();
      }
    } finally {
      await firstContext.close();
    }
  } finally {
    await browser.close();
  }
  console.log("Coach browser history recovery checks passed.");
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(3_000),
  ]);
  await new Promise((resolve) => gateway.close(resolve));
  await Promise.all(["", "-wal", "-shm"].map((suffix) => rm(`${databasePath}${suffix}`, { force: true }).catch(() => {})));
}
