import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";

const root = new URL("../", import.meta.url);

function findPort() {
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

function readJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch { resolve({}); }
    });
  });
}

function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function startProvider(kind, behavior, requests) {
  const port = await findPort();
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      jsonResponse(res, 404, { error: "not found" });
      return;
    }
    const body = await readJsonBody(req);
    requests.push({ kind, body, authorization: req.headers.authorization || "" });
    await behavior(req, res, body);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { server, port };
}

async function stopServer(server) {
  if (!server || !server.listening) return;
  await new Promise((resolve) => server.close(() => resolve()));
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    child.once("exit", finish);
    child.kill();
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      finish();
    }, 2_000);
  });
}

async function startApp({ gatewayUrl, qwenUrl = "", gatewayKey = "gateway-test-key", qwenKey = "qwen-test-key" }) {
  const port = await findPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      IELTSIST_DB_PATH: ":memory:",
      SESSION_COOKIE_SECURE: "0",
      AI_GATEWAY_API_KEY: gatewayKey,
      AI_GATEWAY_BASE_URL: gatewayUrl,
      AI_GATEWAY_MODEL: "gateway-test-model",
      AI_GATEWAY_TIMEOUT_MS: "5000",
      COACH_AI_API_KEY: qwenKey,
      COACH_AI_BASE_URL: qwenUrl,
      COACH_AI_MODEL: "qwen-test-model",
      COACH_AI_TIMEOUT_MS: "5000",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
      OPENAI_BASE_URL: "",
      UUAPI_BASE_URL: "",
      THRID_AI_KEY: "",
      thridkey: "",
      DASHSCOPE_API_KEY: "",
      QWEN_API_KEY: "",
      QWEN_COACH_API_KEY: "",
      DASHSCOPE_WORKSPACE_ID: "",
      QWEN_WORKSPACE_ID: "",
      DASHSCOPE_COMPAT_BASE_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Fallback test server exited before readiness.");
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return { child, baseUrl, getOutput: () => output };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  await stopChild(child);
  throw new Error("Fallback test server did not start.");
}

async function ask(baseUrl, message) {
  const response = await fetch(`${baseUrl}/api/help/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, contextText: "", history: [], helpContext: {} }),
  });
  return { status: response.status, requestId: response.headers.get("x-request-id") || "", json: await response.json() };
}

function telemetryFrom(output) {
  return output.split(/\r?\n/)
    .filter((line) => line.startsWith("[coach-provider] "))
    .map((line) => JSON.parse(line.slice("[coach-provider] ".length)));
}

const gatewayRequests = [];
const qwenRequests = [];
const gateway = await startProvider("gateway", async (req, res, body) => {
  const userText = String(body.messages?.find((item) => item.role === "user")?.content || "");
  if (userText.includes("fallback-timeout")) {
    setTimeout(() => { if (!res.destroyed) jsonResponse(res, 503, { error: { message: "gateway timeout" } }); }, 6_000);
    return;
  }
  jsonResponse(res, 503, { error: { message: "gateway unavailable" } });
}, gatewayRequests);
const qwen = await startProvider("qwen", async (_req, res) => {
  jsonResponse(res, 200, { choices: [{ message: { content: "Qwen fallback answer" } }] });
}, qwenRequests);

let app = null;
let gatewayOnlyApp = null;
try {
  app = await startApp({ gatewayUrl: `http://127.0.0.1:${gateway.port}/v1`, qwenUrl: `http://127.0.0.1:${qwen.port}/v1` });
  const tasksResponse = await fetch(`${app.baseUrl}/api/tasks`);
  const tasks = await tasksResponse.json();
  assert.equal(tasksResponse.status, 200);
  assert.equal(tasks.coachFallbackAvailable, true, "The public task contract must report an available Qwen fallback");
  assert.ok(Number(tasks.coachTimeoutMs) >= 10_000, "The public task contract must advertise the bounded server Coach deadline");
  const failedGateway = await ask(app.baseUrl, "fallback-text");
  assert.equal(failedGateway.status, 200);
  assert.match(failedGateway.requestId, /^[0-9a-f-]{20,}$/i);
  assert.equal(failedGateway.json.mode, "ai", "A healthy Qwen fallback must remain an AI answer");
  assert.equal(failedGateway.json.answer, "Qwen fallback answer");

  const timedGateway = await ask(app.baseUrl, "fallback-timeout");
  assert.equal(timedGateway.status, 200);
  assert.match(timedGateway.requestId, /^[0-9a-f-]{20,}$/i);
  assert.equal(timedGateway.json.mode, "ai", "A timed-out gateway must fall through to Qwen");
  assert.equal(timedGateway.json.answer, "Qwen fallback answer");
  assert.equal(gatewayRequests.length, 2);
  assert.equal(qwenRequests.length, 2);
  assert.ok(gatewayRequests.every((item) => item.authorization === "Bearer gateway-test-key"));
  assert.ok(qwenRequests.every((item) => item.authorization === "Bearer qwen-test-key"));
  assert.ok(gatewayRequests.every((item) => item.body.model === "gateway-test-model"));
  assert.ok(qwenRequests.every((item) => item.body.model === "qwen-test-model"));
  const telemetry = telemetryFrom(app.getOutput());
  assert.ok(telemetry.length >= 4, "Each provider attempt must emit telemetry");
  assert.ok(telemetry.every((item) => item.requestId && item.provider && item.model && Number.isFinite(item.durationMs)));
  assert.ok(telemetry.every((item) => ["success", "failed", "timeout", "empty"].includes(item.status)));
  assert.equal(new Set(telemetry.map((item) => item.requestId)).size, 2, "Each request must have one stable requestId across fallback attempts");
  assert.deepEqual(
    telemetry.map((item) => [item.provider, item.status]),
    [["gateway", "failed"], ["qwen", "success"], ["gateway", "timeout"], ["qwen", "success"]],
    "Fallback telemetry must preserve provider order and outcome",
  );
  assert.doesNotMatch(app.getOutput(), /gateway-test-key|qwen-test-key/i, "Provider telemetry must never contain key material");

  const clientSource = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(clientSource, /coachClientTimeoutMs = Math\.max\(coachClientTimeoutMs, advertisedCoachTimeoutMs \+ 2_000\)/,
    "The browser timeout must not expire before the server fallback deadline");
  const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(serverSource, /deadlineAt: Date\.now\(\) \+ attemptTimeoutMs/,
    "Each provider attempt must pass one bounded deadline into the request pipeline");

  gatewayOnlyApp = await startApp({ gatewayUrl: `http://127.0.0.1:${gateway.port}/v1`, qwenUrl: "", qwenKey: "" });
  const failClosed = await ask(gatewayOnlyApp.baseUrl, "fallback-text");
  assert.equal(failClosed.status, 200);
  assert.equal(failClosed.json.mode, "local", "Gateway-only failure must remain fail-closed");
  assert.equal(qwenRequests.length, 2, "No Qwen request is allowed without a real Qwen key");
  assert.doesNotMatch(JSON.stringify(failClosed.json), /gateway-test-key|qwen-test-key|score\s*[:=]\s*0/i);
  console.log("Gateway to Qwen Coach fallback and telemetry contract passed.");
} finally {
  await stopChild(app?.child);
  await stopChild(gatewayOnlyApp?.child);
  await stopServer(gateway.server);
  await stopServer(qwen.server);
}
