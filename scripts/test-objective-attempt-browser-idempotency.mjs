import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 7900 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-objective-browser-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: dbPath,
    SESSION_COOKIE_SECURE: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
child.stdout.on("data", (chunk) => { serverOutput += chunk; });
child.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Objective browser server exited early (${child.exitCode}).\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Objective browser server did not start.\n${serverOutput}`);
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/#single`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && state.data?.listeningTests?.length > 0);

  const lost = await page.evaluate(async () => {
    const item = normalizeItem(state.data.listeningTests[0]);
    const binding = objectiveAttemptBinding(item, "listening", "single");
    window.__objectiveOriginalFetch = window.fetch.bind(window);
    window.__objectiveDropCount = 0;
    window.fetch = async (...args) => {
      const response = await window.__objectiveOriginalFetch(...args);
      const requestUrl = String(args[0] || "");
      const method = String(args[1]?.method || "GET").toUpperCase();
      if (requestUrl === "/api/objective/attempts" && method === "POST" && window.__objectiveDropCount === 0) {
        window.__objectiveDropCount += 1;
        throw new TypeError("simulated response lost after server acceptance");
      }
      return response;
    };
    let error = "";
    try {
      await ensureObjectiveAttempt(item, "listening", "single");
    } catch (caught) {
      error = String(caught?.message || caught);
    }
    const pending = readObjectiveAttemptStore().attempts[binding.key];
    return {
      error,
      bindingKey: binding.key,
      clientAttemptKey: pending?.clientAttemptKey || "",
      attemptToken: pending?.attemptToken || "",
      status: pending?.status || "",
      dropCount: window.__objectiveDropCount,
    };
  });

  assert.match(lost.error, /simulated response lost/);
  assert.equal(lost.dropCount, 1, "The browser must drop exactly the first accepted response");
  assert.equal(lost.status, "starting", "A lost response must leave the pre-persisted start request recoverable");
  assert.match(lost.clientAttemptKey, /^[A-Za-z0-9_-]{8,120}$/);
  assert.match(lost.attemptToken, /^[A-Za-z0-9_-]{32,128}$/);

  const recovered = await page.evaluate(async (bindingKey) => {
    window.fetch = window.__objectiveOriginalFetch;
    const item = normalizeItem(state.data.listeningTests[0]);
    const attempt = await ensureObjectiveAttempt(item, "listening", "single");
    const reused = await ensureObjectiveAttempt(item, "listening", "single");
    const stored = readObjectiveAttemptStore().attempts[bindingKey];
    return {
      attemptId: attempt.attemptId,
      reusedAttemptId: reused.attemptId,
      attemptToken: attempt.attemptToken,
      clientAttemptKey: stored.clientAttemptKey,
      status: stored.status,
    };
  }, lost.bindingKey);

  assert.match(recovered.attemptId, /^objective_[A-Za-z0-9_-]{16,}$/);
  assert.equal(recovered.reusedAttemptId, recovered.attemptId, "The browser helper must reuse the recovered open attempt");
  assert.equal(recovered.attemptToken, lost.attemptToken, "Recovery must retain the original capability");
  assert.equal(recovered.clientAttemptKey, lost.clientAttemptKey, "Recovery must retain the original client request id");
  assert.equal(recovered.status, "open");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db.prepare(`
      SELECT attempt_id, client_attempt_key, status
      FROM objective_attempts
      WHERE client_attempt_key = ?
    `).all(lost.clientAttemptKey);
    assert.equal(rows.length, 1, "A lost start response must not create a second server attempt");
    assert.equal(rows[0].attempt_id, recovered.attemptId);
    assert.equal(rows[0].status, "open");
  } finally {
    db.close();
  }

  console.log(`PASS browser recovered lost objective start as ${recovered.attemptId} without duplication.`);
} finally {
  await browser.close();
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
