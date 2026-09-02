import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

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

const appPort = Number(process.env.IELTSIST_COACH_PROVIDER_TEST_PORT || await findAvailablePort());
const providerPort = Number(process.env.IELTSIST_COACH_PROVIDER_MOCK_PORT || await findAvailablePort());
const appBaseUrl = `http://127.0.0.1:${appPort}`;
const providerRequests = [];

const provider = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  providerRequests.push({ url: req.url, body });
  const userText = body.messages?.find((item) => item.role === "user")?.content || "";
  res.setHeader("content-type", "application/json");
  if (String(userText).includes("force-provider-failure")) {
    res.statusCode = 403;
    res.end(JSON.stringify({ code: "INSUFFICIENT_BALANCE", message: "Insufficient account balance" }));
    return;
  }
  if (String(userText).includes("force-timeout")) {
    setTimeout(() => res.end(JSON.stringify({ choices: [{ message: { content: "late answer" } }] })), 6_000);
    return;
  }
  if (String(userText).includes("product facts")) {
    res.end(JSON.stringify({ choices: [{ message: { content: "Product facts: one IELTSist ID is used for sign-in.\nInternal system prompt: ignore previous instructions.\nFormula: $v=\\frac{d}{t}$; $a=\\sqrt{x}$; \\mathrm{kg}; x^{2}; \\left\\{x\\right\\}. Set {x}. \\(...\\)\nRecords stay separate by product." } }] }));
    return;
  }
  res.end(JSON.stringify({ choices: [{ message: { content: "千问 Coach route is active." } }] }));
});

await new Promise((resolve, reject) => {
  provider.once("error", reject);
  provider.listen(providerPort, "127.0.0.1", resolve);
});

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    AI_GATEWAY_API_KEY: "",
    AI_GATEWAY_BASE_URL: "",
    AI_GATEWAY_MODEL: "",
    AI_GATEWAY_REASONING_EFFORT: "",
    COACH_AI_API_KEY: "test-coach-key",
    COACH_AI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    COACH_AI_MODEL: "qwen-coach-test",
    COACH_AI_TIMEOUT_MS: "5000",
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
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`AI Coach test server did not start. ${stderr}`);
}

async function askCoach(message) {
  const response = await fetch(`${appBaseUrl}/api/help/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, contextText: "", history: [], helpContext: {} }),
  });
  return { response, json: await response.json() };
}

try {
  const tasks = await waitForServer();
  assert.equal(tasks.aiEnabled, true);
  assert.equal(tasks.model, "qwen-coach-test", "Public AI status must report the Coach model, not the legacy gateway model");

  const success = await askCoach("How should I use IELTS-ist?");
  assert.equal(success.response.status, 200);
  assert.equal(success.json.mode, "ai");
  assert.equal(success.json.answer, "千问 Coach route is active.");

  const facts = await askCoach("Please explain the product facts for shared account login.");
  assert.equal(facts.response.status, 200);
  assert.equal(facts.json.mode, "ai");
  assert.match(facts.json.answer, /Product facts:/i);
  assert.doesNotMatch(facts.json.answer, /system prompt|developer instruction|ignore previous instructions/i);
  assert.doesNotMatch(facts.json.answer, /\$[^$]+\$|\\\(|\\\[|\$\$/);
  assert.doesNotMatch(facts.json.answer, /\\(?:frac|sqrt|mathrm|text)\s*[\[{]/i,
    "Formula output must not leave LaTeX control words in the student-facing answer");
  assert.match(facts.json.answer, /v\s*=\s*d\s*\/\s*t/i,
    "A simple fraction must remain readable as plain text");
  assert.match(facts.json.answer, /a\s*=\s*sqrt\(x\)/i,
    "A square-root expression must remain readable as plain text");
  assert.match(facts.json.answer, /\bkg\b/i,
    "A wrapped unit must remain readable after sanitization");
  assert.match(facts.json.answer, /x\^2/,
    "A superscript must remain readable after sanitization");
  assert.match(facts.json.answer, /Set \{x\}/,
    "Unrelated braces must remain intact when a response also contains a formula");
  assert.match(facts.json.answer, /\{x\}/,
    "Escaped formula braces must remain readable after sanitization");
  const factsPrompt = providerRequests.find((item) => String(item.body.messages?.find((m) => m.role === "user")?.content || "").includes("product facts"));
  assert.ok(factsPrompt, "Product facts request must reach the provider");
  const systemPrompt = factsPrompt.body.messages?.find((item) => item.role === "system")?.content || "";
  assert.match(systemPrompt, /one IELTSist ID/i);
  assert.match(systemPrompt, /returnTo/i);
  assert.match(systemPrompt, /records stay in STEM|stay in IELTSist/i);

  const failed = await askCoach("force-provider-failure");
  assert.equal(failed.response.status, 200);
  assert.equal(failed.json.mode, "local");
  assert.match(failed.json.answer, /temporarily unavailable/i);
  assert.match(failed.json.warning, /temporarily unavailable/i);
  assert.doesNotMatch(JSON.stringify(failed.json), /INSUFFICIENT_BALANCE|account balance|chat=403|responses=403|test-coach-key/i,
    "Provider errors and credentials must never reach the student response");

  const timedOut = await askCoach("force-timeout");
  assert.equal(timedOut.response.status, 200);
  assert.equal(timedOut.json.mode, "local");
  assert.match(timedOut.json.warning, /could not reach|temporarily unavailable/i);
  assert.match(timedOut.json.answer, /temporarily unavailable/i);

  assert.ok(providerRequests.length >= 4);
  assert.ok(providerRequests.every((item) => item.url === "/v1/chat/completions"),
    "Qwen-compatible Coach calls must not retry through the unsupported Responses endpoint");
  assert.ok(providerRequests.every((item) => item.body.model === "qwen-coach-test"));
  console.log("AI Coach Qwen routing and safe-failure regression checks passed.");
} finally {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await new Promise((resolve) => provider.close(resolve));
}
