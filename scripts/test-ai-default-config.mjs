import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
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

async function startServer(overrides = {}) {
  const port = await findPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      IELTSIST_DB_PATH: ":memory:",
      SESSION_COOKIE_SECURE: "0",
      AI_GATEWAY_API_KEY: "config-test-key",
      AI_GATEWAY_BASE_URL: "",
      AI_GATEWAY_MODEL: "",
      COACH_AI_API_KEY: "",
      QWEN_COACH_API_KEY: "",
      COACH_AI_BASE_URL: "",
      QWEN_COACH_BASE_URL: "",
      WRITING_AI_API_KEY: "",
      QWEN_WRITING_API_KEY: "",
      WRITING_AI_BASE_URL: "",
      QWEN_WRITING_BASE_URL: "",
      WRITING_AI_MODEL: "",
      QWEN_WRITING_MODEL: "",
      DASHSCOPE_API_KEY: "",
      QWEN_API_KEY: "",
      DASHSCOPE_WORKSPACE_ID: "",
      QWEN_WORKSPACE_ID: "",
      DASHSCOPE_REGION: "cn-beijing",
      DASHSCOPE_COMPAT_BASE_URL: "",
      OPENAI_API_KEY: "",
      thridkey: "",
      OPENAI_MODEL: "",
      OPENAI_BASE_URL: "",
      UUAPI_BASE_URL: "",
      ...overrides,
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return { child, baseUrl, tasks: await response.json(), stderr };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  await stopChild(child);
  throw new Error(`Config test server did not start. ${stderr}`);
}

const defaultServer = await startServer();
let overrideServer = null;
let coachFallbackServer = null;
let coachOverrideServer = null;
let writingFallbackServer = null;
let writingOverrideServer = null;
let legacyFallbackServer = null;
let aliasServer = null;
try {
  assert.equal(defaultServer.tasks.model, "gpt-5.5", "Default Gateway model must be gpt-5.5");
  assert.equal(defaultServer.tasks.coachModel, "gpt-5.5", "Default coachModel must be gpt-5.5");
  assert.equal(defaultServer.tasks.aiBaseUrl, "https://ai.ieltsist.com/v1", "Default AI gateway URL must be the IELTSist gateway");
  assert.equal(defaultServer.tasks.coachBaseUrl, "https://ai.ieltsist.com/v1", "Gateway-backed Coach must use the IELTSist gateway");
  assert.doesNotMatch(JSON.stringify(defaultServer.tasks), /config-test-key/i, "Server-only gateway keys must not appear in task payloads");

  const browserResponse = await fetch(`${defaultServer.baseUrl}/`);
  assert.equal(browserResponse.status, 200, "The browser entry page must remain reachable");
  const html = await browserResponse.text();
  assert.doesNotMatch(html, /config-test-key/i, "Browser-visible HTML must not contain the gateway key");

  overrideServer = await startServer({
    AI_GATEWAY_BASE_URL: "http://127.0.0.1:49999/v1",
    AI_GATEWAY_MODEL: "explicit-model-override",
  });
  assert.equal(overrideServer.tasks.model, "explicit-model-override", "Explicit model override must win over the default");
  assert.equal(overrideServer.tasks.aiBaseUrl, "http://127.0.0.1:49999/v1", "Explicit gateway URL override must win over the default");
  assert.doesNotMatch(JSON.stringify(overrideServer.tasks), /config-test-key/i, "Override payload must still omit the gateway key");

  coachFallbackServer = await startServer({
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "coach-config-test-key",
  });
  assert.equal(coachFallbackServer.tasks.model, "gpt-5.5", "Coach fallback must default to gpt-5.5");
  assert.equal(coachFallbackServer.tasks.coachModel, "gpt-5.5", "Coach fallback model must default to gpt-5.5");
  assert.equal(coachFallbackServer.tasks.coachBaseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1", "Coach fallback must retain its explicit provider default URL");
  assert.doesNotMatch(JSON.stringify(coachFallbackServer.tasks), /coach-config-test-key/i, "Coach fallback key must not appear in task payloads");

  coachOverrideServer = await startServer({
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "coach-config-test-key",
    COACH_AI_MODEL: "explicit-coach-model",
  });
  assert.equal(coachOverrideServer.tasks.coachModel, "explicit-coach-model", "Explicit Coach model must win over the unified default");

  writingFallbackServer = await startServer({
    AI_GATEWAY_API_KEY: "",
    WRITING_AI_API_KEY: "writing-config-test-key",
  });
  assert.equal(writingFallbackServer.tasks.writingModel, "gpt-5.5", "Writing fallback must default to gpt-5.5");
  assert.equal(writingFallbackServer.tasks.writingAiBaseUrl, "https://dashscope.aliyuncs.com/compatible-mode/v1", "Writing fallback must retain its explicit provider default URL");
  assert.doesNotMatch(JSON.stringify(writingFallbackServer.tasks), /writing-config-test-key/i, "Writing key must not appear in task payloads");

  writingOverrideServer = await startServer({
    AI_GATEWAY_API_KEY: "",
    WRITING_AI_API_KEY: "writing-config-test-key",
    WRITING_AI_MODEL: "explicit-writing-model",
  });
  assert.equal(writingOverrideServer.tasks.writingModel, "explicit-writing-model", "Explicit Writing model must win over the unified default");

  legacyFallbackServer = await startServer({
    AI_GATEWAY_API_KEY: "",
    OPENAI_API_KEY: "legacy-config-test-key",
  });
  assert.equal(legacyFallbackServer.tasks.model, "gpt-5.5", "Legacy application fallback must default to gpt-5.5");
  assert.equal(legacyFallbackServer.tasks.aiBaseUrl, "https://api.openai.com/v1", "Legacy fallback must retain its explicit provider default URL");
  assert.doesNotMatch(JSON.stringify(legacyFallbackServer.tasks), /legacy-config-test-key/i, "Legacy key must not appear in task payloads");

  aliasServer = await startServer({
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "",
    WRITING_AI_API_KEY: "",
    OPENAI_API_KEY: "",
    thridkey: "alias-config-test-key",
  });
  assert.equal(aliasServer.tasks.model, "gpt-5.5", "The thridkey compatibility alias must select the unified default model");
  assert.equal(aliasServer.tasks.aiBaseUrl, "https://ai.ieltsist.com/v1", "The thridkey compatibility alias must use the primary gateway");
  assert.doesNotMatch(JSON.stringify(aliasServer.tasks), /alias-config-test-key/i, "The thridkey alias must never appear in task payloads");

  const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const envExample = await readFile(new URL("../deploy/ubuntu/env.example", import.meta.url), "utf8");
  assert.match(serverSource, /const DEFAULT_AI_MODEL = "gpt-5\.5"/, "The application must have one audited default model");
  assert.match(serverSource, /const THIRD_PARTY_API_KEY = process\.env\.thridkey \|\| ""/);
  assert.match(serverSource, /MODEL = process\.env\.OPENAI_MODEL \|\| DEFAULT_AI_MODEL/);
  assert.match(serverSource, /WRITING_AI_MODEL = process\.env\.WRITING_AI_MODEL \|\| process\.env\.QWEN_WRITING_MODEL \|\| DEFAULT_AI_MODEL/);
  assert.match(serverSource, /AI_GATEWAY_MODEL = process\.env\.AI_GATEWAY_MODEL \|\| DEFAULT_AI_MODEL/);
  assert.match(serverSource, /COACH_AI_MODEL = process\.env\.COACH_AI_MODEL \|\| process\.env\.QWEN_COACH_MODEL \|\| DEFAULT_AI_MODEL/);
  assert.match(serverSource, /const STEM_MARKING_AI_MODEL = .*COACH_AI_MODEL/, "STEM marking must inherit the audited Coach default unless explicitly overridden");
  assert.match(envExample, /^AI_GATEWAY_BASE_URL=https:\/\/ai\.ieltsist\.com\/v1$/m);
  assert.match(envExample, /^AI_GATEWAY_MODEL=gpt-5\.5$/m);
  assert.match(envExample, /^COACH_AI_MODEL=gpt-5\.5$/m);
  assert.match(envExample, /^WRITING_AI_MODEL=gpt-5\.5$/m);
  assert.doesNotMatch(envExample, /^(?:AI_GATEWAY_API_KEY|COACH_AI_API_KEY|WRITING_AI_API_KEY|OPENAI_API_KEY|DASHSCOPE_API_KEY|thridkey)=.+$/m, "Example configuration must not contain a populated key");
  console.log("AI default config contract passed: gpt-5.5 defaults, explicit provider overrides, marking inheritance, and browser key isolation.");
} finally {
  await stopChild(defaultServer.child);
  await stopChild(overrideServer?.child);
  await stopChild(coachFallbackServer?.child);
  await stopChild(coachOverrideServer?.child);
  await stopChild(writingFallbackServer?.child);
  await stopChild(writingOverrideServer?.child);
  await stopChild(legacyFallbackServer?.child);
  await stopChild(aliasServer?.child);
}
