import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testDbPath = path.join(os.tmpdir(), `ieltsist-writing-timeout-${process.pid}.sqlite`);

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(() => resolve()));
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve();
    };
    child.once("exit", finish);
    child.once("close", finish);
    child.kill();
    timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      finish();
    }, 2_000);
  });
}

async function waitForServer(baseUrl, child, stderr) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Writing timeout fixture exited early. ${stderr.value}`);
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Writing timeout fixture did not start. ${stderr.value}`);
}

const providerPort = await findAvailablePort();
const appPort = await findAvailablePort();
const provider = http.createServer(async (req, res) => {
  for await (const _chunk of req) {}
  setTimeout(() => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            overall: 7,
            confidence: "high",
            criteria: [
              { label: "Task Response", score: 7, feedback: "Late provider response.", evidence: "Public transport reduces congestion.", bandRationale: "Late." },
              { label: "Coherence & Cohesion", score: 7, feedback: "Late provider response.", evidence: "Public transport reduces congestion.", bandRationale: "Late." },
              { label: "Lexical Resource", score: 7, feedback: "Late provider response.", evidence: "Public transport reduces congestion.", bandRationale: "Late." },
              { label: "Grammatical Range & Accuracy", score: 7, feedback: "Late provider response.", evidence: "Public transport reduces congestion.", bandRationale: "Late." },
            ],
          }),
        },
      }],
    }));
  }, 2_500);
});
await new Promise((resolve, reject) => {
  provider.once("error", reject);
  provider.listen(providerPort, "127.0.0.1", resolve);
});

const stderr = { value: "" };
const app = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(appPort),
    SERVER_HOST: "127.0.0.1",
    SESSION_COOKIE_SECURE: "0",
    DATA_DB_PATH: testDbPath,
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "",
    OPENAI_API_KEY: "",
    WRITING_AI_API_KEY: "writing-timeout-test-key",
    WRITING_AI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    WRITING_AI_MODEL: "writing-timeout-test",
    WRITING_AI_TIMEOUT_MS: "1000",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
app.stderr.on("data", (chunk) => { stderr.value += chunk.toString("utf8"); });

try {
  const appBaseUrl = `http://127.0.0.1:${appPort}`;
  await waitForServer(appBaseUrl, app, stderr);
  const startedAt = Date.now();
  const response = await fetch(`${appBaseUrl}/api/writing/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "Discuss public transport.",
      essay: "Public transport reduces congestion. It also helps workers reach jobs more reliably.",
    }),
  });
  const elapsedMs = Date.now() - startedAt;
  const json = await response.json();
  assert.equal(response.status, 200);
  assert.ok(elapsedMs < 2_000, `Writing feedback must safely fall back before a delayed provider response (${elapsedMs}ms)`);
  assert.equal(json.mode, "local", "A timed-out provider must not be represented as a completed AI score");
  assert.match(String(json.warning || ""), /could not reach|temporarily unavailable|timed out/i);
  assert.equal(json.contract?.review?.required, true, "A local fallback must require human review");
  assert.equal(json.contract?.provenance?.model, "local-writing-estimate",
    "A local fallback must not be labelled with the configured provider model");
  assert.equal(json.contract?.provenance?.promptVersion, "ielts-writing-rubric.v2");
  assert.equal((json.contract?.score?.criteria || []).length, 4);
  assert.doesNotMatch(JSON.stringify(json), /writing-timeout-test-key|Late provider response/i);
  console.log("Writing timeout regression passed: delayed provider aborts into a safe, review-required local contract.");
} finally {
  await stopChild(app);
  await closeServer(provider);
  await rm(testDbPath, { force: true }).catch(() => {});
  await rm(`${testDbPath}-wal`, { force: true }).catch(() => {});
  await rm(`${testDbPath}-shm`, { force: true }).catch(() => {});
}
