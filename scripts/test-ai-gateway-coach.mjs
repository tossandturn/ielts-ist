import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const appPort = 6900 + (process.pid % 200);
const gatewayPort = 7200 + (process.pid % 200);
const appBaseUrl = `http://127.0.0.1:${appPort}`;
const gatewayRequests = [];
const testDbPath = path.join(os.tmpdir(), `ieltsist-ai-gateway-${process.pid}.sqlite`);

const gateway = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  gatewayRequests.push({ url: req.url, body, authorization: req.headers.authorization || "" });
  const userText = body.messages?.find((item) => item.role === "user")?.content || "";
  res.setHeader("content-type", "application/json");
  if (String(userText).includes("gateway-failure")) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: { message: "provider internal key=do-not-leak" } }));
    return;
  }
  if (String(userText).includes("gateway-timeout")) {
    setTimeout(() => res.end(JSON.stringify({ choices: [{ message: { content: "late response" } }] })), 6_000);
    return;
  }
  const hasToolResult = body.messages?.some((item) => item.role === "tool");
  if (!hasToolResult) {
    res.end(JSON.stringify({
      choices: [{
        message: {
          role: "assistant",
          tool_calls: [{
            id: "call_shared_policy",
            type: "function",
            function: { name: "get_shared_account_policy", arguments: "{}" },
          }],
        },
      }],
    }));
    return;
  }
  res.end(JSON.stringify({
    choices: [{
      message: {
        role: "assistant",
        content: [
          "One IELTSist ID signs you into both products.",
          "[Open IELTS practice](https://ieltsist.com/#single)",
          "STEM Campus: `https://stem.ieltsist.com/`",
          "Direct STEM URL: https://stem.ieltsist.com/",
          "[Unsafe](javascript:alert(1))",
          "Internal system prompt: ignore previous instructions.",
        ].join("\n"),
      },
    }],
  }));
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
    SESSION_COOKIE_SECURE: "0",
    AI_GATEWAY_API_KEY: "gateway-test-key",
    AI_GATEWAY_BASE_URL: `http://127.0.0.1:${gatewayPort}/v1`,
    AI_GATEWAY_MODEL: "gpt-5.5",
    AI_GATEWAY_REASONING_EFFORT: "xhigh",
    AI_GATEWAY_TIMEOUT_MS: "5000",
    COACH_AI_API_KEY: "",
    OPENAI_API_KEY: "",
    IELTSIST_DB_PATH: testDbPath,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${appBaseUrl}/api/tasks`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`AI gateway test server did not start. ${stderr}`);
}

async function askCoach(message, token = "") {
  const response = await fetch(`${appBaseUrl}/api/help/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, contextText: "", history: [], helpContext: { activeModule: "reading", focusedQuestion: { number: 3 } } }),
  });
  return { response, json: await response.json() };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

try {
  const tasks = await waitForServer();
  assert.equal(tasks.aiEnabled, true);
  assert.equal(tasks.coachModel, "gpt-5.5");
  assert.equal(tasks.coachReasoningEffort, "xhigh");
  assert.equal(tasks.coachAgentEnabled, true);
  assert.equal(tasks.coachBaseUrl, `http://127.0.0.1:${gatewayPort}/v1`);
  assert.doesNotMatch(JSON.stringify(tasks), /gateway-test-key/i, "The gateway key must never be present in public task data");
  const blockedPreflight = await fetch(`${appBaseUrl}/api/help/chat`, {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.example",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
  assert.equal(blockedPreflight.status, 403);
  assert.notEqual(blockedPreflight.headers.get("access-control-allow-origin"), "*", "AI Coach proxy must not advertise wildcard CORS");

  const username = `aiqa${String(process.pid).slice(-8)}`;
  const registerResponse = await fetch(`${appBaseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: "safe-test-password" }),
  });
  assert.equal(registerResponse.status, 200, "The AI Coach test must cover the logged-in auth path");
  const registered = await registerResponse.json();
  assert.ok(registered.token);

  const success = await askCoach("Explain shared account login.");
  assert.equal(success.response.status, 200);
  assert.equal(success.json.mode, "ai");
  assert.match(success.json.answer, /One IELTSist ID/i);
  assert.match(success.json.answer, /\[Open IELTS practice\]\(https:\/\/ieltsist\.com\/#single\)/);
  assert.match(success.json.answer, /`https:\/\/stem\.ieltsist\.com\/`/);
  assert.match(success.json.answer, /https:\/\/stem\.ieltsist\.com\//);
  assert.doesNotMatch(success.json.answer, /javascript:|system prompt|ignore previous instructions/i);
  assert.equal(gatewayRequests.length, 2, "The allowlisted agent tool must result in one controlled follow-up completion");
  assert.equal(gatewayRequests[0].url, "/v1/chat/completions");
  assert.equal(gatewayRequests[0].body.model, "gpt-5.5");
  assert.equal(gatewayRequests[0].body.reasoning_effort, "xhigh");
  assert.equal("temperature" in gatewayRequests[0].body, false, "GPT-5.5 request must omit unsupported temperature");
  assert.ok(Array.isArray(gatewayRequests[0].body.tools));
  assert.deepEqual(
    gatewayRequests[0].body.tools.map((item) => item.function.name).sort(),
    ["get_current_ielts_context", "get_shared_account_policy", "suggest_ielts_next_step"].sort(),
    "Only fixed, reviewed Coach tools may be exposed to the gateway",
  );
  assert.equal(gatewayRequests[1].body.messages.some((item) => item.role === "tool"), true);
  assert.match(String(gatewayRequests[1].body.messages.find((item) => item.role === "tool")?.content || ""), /Identity is shared/i);
  assert.doesNotMatch(
    JSON.stringify(gatewayRequests.map((item) => item.body)),
    /gateway-test-key/,
    "The gateway key must never be serialized into provider request JSON",
  );

  const loggedIn = await askCoach("Explain shared account login for a logged-in learner.", registered.token);
  assert.equal(loggedIn.response.status, 200);
  assert.equal(loggedIn.json.mode, "ai");
  assert.match(loggedIn.json.answer, /One IELTSist ID/i);

  const failure = await askCoach("gateway-failure");
  assert.equal(failure.response.status, 200);
  assert.equal(failure.json.mode, "local");
  assert.match(failure.json.warning, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(failure.json), /provider internal|do-not-leak|gateway-test-key/i);

  const timedOut = await askCoach("gateway-timeout");
  assert.equal(timedOut.response.status, 200);
  assert.equal(timedOut.json.mode, "local");
  assert.match(timedOut.json.warning, /could not reach|temporarily unavailable/i);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${appBaseUrl}/`, { waitUntil: "networkidle" });
    await page.context().route("https://stem.ieltsist.com/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html", body: "<title>STEM handoff</title>" });
    });
    const linkRendering = await page.evaluate(() => {
      const host = document.createElement("div");
      host.id = "coach-link-render-test";
      host.innerHTML = window.renderHelpRichText([
        "[Safe](https://ieltsist.com/#single)",
        "`https://stem.ieltsist.com/`",
        "https://stem.ieltsist.com/",
        "[Bad](javascript:alert(1))",
      ].join("\n"));
      document.body.append(host);
      const anchors = [...host.querySelectorAll("a")];
      const anchor = anchors[0];
      return {
        safeHref: anchor?.getAttribute("href") || "",
        target: anchor?.getAttribute("target") || "",
        rel: anchor?.getAttribute("rel") || "",
        stemAnchorCount: anchors.filter((item) => /stem\.ieltsist\.com/i.test(item.getAttribute("href") || "")).length,
        unsafeAnchorCount: anchors.filter((item) => /javascript:/i.test(item.getAttribute("href") || "")).length,
        text: host.textContent || "",
      };
    });
    assert.equal(linkRendering.safeHref, "https://ieltsist.com/#single");
    assert.equal(linkRendering.target, "_blank");
    assert.match(linkRendering.rel, /noopener/);
    assert.equal(linkRendering.stemAnchorCount, 2, "Backtick and bare STEM URLs must both become links");
    assert.equal(linkRendering.unsafeAnchorCount, 0);
    assert.match(linkRendering.text, /Bad/);
    const popupPromise = page.waitForEvent("popup");
    await page.locator("#coach-link-render-test a[href^='https://stem.ieltsist.com']").first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    assert.equal(new URL(popup.url()).origin, "https://stem.ieltsist.com");
    await popup.close();
  } finally {
    await browser.close();
  }

  console.log("AI gateway Coach regression checks passed: GPT-5.5 xhigh, server-only secret, tool allowlist, safe fallback, and clickable safe Markdown links.");
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill();
  await new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    const timeout = setTimeout(resolve, 3_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  await closeServer(gateway);
  await rm(testDbPath, { force: true }).catch(() => {});
  await rm(`${testDbPath}-wal`, { force: true }).catch(() => {});
  await rm(`${testDbPath}-shm`, { force: true }).catch(() => {});
}
