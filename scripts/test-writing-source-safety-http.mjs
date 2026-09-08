import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(os.tmpdir(), `ieltsist-writing-source-safety-${process.pid}.sqlite`);
let providerCalls = 0;

const listen = (server, port) => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});
const close = (server) => new Promise((resolve) => server.close(() => resolve()));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const findPort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const port = probe.address().port;
    probe.close((error) => error ? reject(error) : resolve(port));
  });
});

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(2_000).then(() => child.kill("SIGKILL")),
  ]);
}

const providerPort = await findPort();
const appPort = await findPort();
const provider = http.createServer(async (req, res) => {
  for await (const _chunk of req) {}
  providerCalls += 1;
  res.setHeader("content-type", "application/json");
  const evidence = "Public transport reduces congestion.";
  res.end(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          overall: 7,
          confidence: "high",
          criteria: ["Task Response", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy"]
            .map((label) => ({ label, score: 7, feedback: "Develop the evidence.", evidence, bandRationale: "Relevant evidence is present." })),
          fullReport: "Source-bound fixture feedback.",
        }),
      },
    }],
  }));
});
await listen(provider, providerPort);

let output = "";
const app = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(appPort),
    SERVER_HOST: "127.0.0.1",
    SESSION_COOKIE_SECURE: "0",
    IELTSIST_DB_PATH: dbPath,
    AI_GATEWAY_API_KEY: "source-safety-vision-fixture",
    AI_GATEWAY_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    AI_GATEWAY_MODEL: "source-safety-model",
    AI_GATEWAY_REASONING_EFFORT: "xhigh",
    WRITING_AI_API_KEY: "source-safety-text-fixture",
    WRITING_AI_BASE_URL: `http://127.0.0.1:${providerPort}/v1`,
    WRITING_AI_MODEL: "source-safety-model",
    COACH_AI_API_KEY: "",
    OPENAI_API_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.on("data", (chunk) => { output += chunk.toString("utf8"); });
app.stderr.on("data", (chunk) => { output += chunk.toString("utf8"); });

const baseUrl = `http://127.0.0.1:${appPort}`;
try {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (app.exitCode !== null) throw new Error(`Writing source fixture exited early. ${output}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) break;
    } catch {}
    if (attempt === 99) throw new Error(`Writing source fixture did not start. ${output}`);
    await sleep(50);
  }

  const legacy = await (await fetch(`${baseUrl}/api/tasks`)).json();
  const cam7 = legacy.writingTasks.filter((item) => /^cam7-w-test[1-4]-task[12]$/.test(item.id));
  assert.equal(cam7.length, 8);
  assert.ok(cam7.every((item) => item.sourceAvailability === "pending-review" && /^[a-f0-9]{64}$/.test(item.sourceRevision)));
  const ready = legacy.writingTasks.find((item) => item.sourceAvailability === "ready" && /-task1$/.test(item.id));
  assert.ok(ready, "At least one unaffected Task 1 fixture is required for backward-compatibility coverage");

  const nativeCatalog = await (await fetch(`${baseUrl}/api/native/ielts/catalog`)).json();
  const nativePending = nativeCatalog.writingTasks.find((item) => item.id === cam7[0].id);
  assert.equal(nativePending.sourceAvailability, "pending-review");
  assert.equal(nativePending.sourceRevision, cam7[0].sourceRevision);
  const nativeDetail = await (await fetch(`${baseUrl}/api/native/ielts/tasks/writing/${cam7[0].id}`)).json();
  assert.equal(nativeDetail.task.sourceAvailability, "pending-review");
  assert.equal(nativeDetail.task.sourceRevision, cam7[0].sourceRevision);

  const post = (url, body) => fetch(`${baseUrl}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const essay = Array(12).fill("Public transport reduces congestion.").join(" ");
  const pendingPayload = { taskId: cam7[0].id, sourceRevision: cam7[0].sourceRevision, prompt: cam7[0].prompt, essay };
  const unauthenticatedNative = await fetch(`${baseUrl}/api/writing/feedback/start`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-stemist-native": "1" },
    body: JSON.stringify(pendingPayload),
  });
  assert.equal(unauthenticatedNative.status, 401, "sourceRevision must not bypass native login/ownership checks");
  assert.equal(providerCalls, 0);
  for (const url of ["/api/writing/feedback", "/api/writing/feedback/start"]) {
    const response = await post(url, pendingPayload);
    const json = await response.json();
    assert.equal(response.status, 409);
    assert.deepEqual(Object.keys(json).sort(), ["code", "error", "sourceAvailability", "sourceRevision", "sourceTaskId"]);
    assert.equal(json.code, "writing_source_review_required");
    assert.equal(json.sourceTaskId, cam7[0].id);
    assert.equal(json.sourceAvailability, "pending-review");
    assert.equal(json.sourceRevision, cam7[0].sourceRevision);
    assert.equal(json.jobId, undefined);
  }

  const pair = cam7.filter((item) => /^cam7-w-test1-task[12]$/.test(item.id));
  const pairResponse = await post("/api/writing/feedback/start", {
    items: pair.map((item, index) => ({
      id: item.id,
      taskNumber: index + 1,
      sourceRevision: item.sourceRevision,
      prompt: item.prompt,
      essay,
    })),
  });
  assert.equal(pairResponse.status, 409);
  assert.equal((await pairResponse.json()).code, "writing_source_review_required");
  assert.equal(providerCalls, 0, "Pending single/pair requests must be rejected before the provider is called");

  const staleResponse = await post("/api/writing/feedback/start", {
    taskId: ready.id,
    sourceRevision: "0".repeat(64),
    prompt: ready.prompt,
    essay,
  });
  const stale = await staleResponse.json();
  assert.equal(staleResponse.status, 409);
  assert.equal(stale.code, "writing_source_changed");
  assert.equal(stale.sourceTaskId, ready.id);
  assert.equal(stale.sourceAvailability, "ready");
  assert.equal(stale.sourceRevision, ready.sourceRevision);
  assert.equal(providerCalls, 0);

  const legacyResponse = await post("/api/writing/feedback/start", {
    taskId: ready.id,
    prompt: ready.prompt,
    essay,
  });
  const legacyJob = await legacyResponse.json();
  assert.equal(legacyResponse.status, 202, "An unaffected ready task remains compatible with a revision-less legacy web request");
  assert.ok(legacyJob.jobId);
  let status = null;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    status = await (await fetch(`${baseUrl}/api/writing/feedback/job/${legacyJob.jobId}`)).json();
    if (status.status !== "pending") break;
    await sleep(50);
  }
  assert.equal(status.status, "done", output);
  assert.equal(providerCalls, 1);
  assert.equal(status.result.provenance.sourceTaskId, ready.id);
  assert.equal(status.result.provenance.sourceAvailability, "ready");
  assert.equal(status.result.provenance.sourceRevision, ready.sourceRevision);
  assert.doesNotMatch(JSON.stringify(status), /source-safety-(?:vision|text)-fixture/);

  console.log("PASS Writing source HTTP safety: catalog/detail metadata, exact 409 contracts, no rejected provider/job work, and unaffected legacy scoring.");
} finally {
  await stopChild(app);
  await close(provider);
  await Promise.all(["", "-wal", "-shm"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
