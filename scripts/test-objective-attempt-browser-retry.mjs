import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const rootPath = fileURLToPath(root);
const port = 8100 + (process.pid % 300);
const baseUrl = `http://127.0.0.1:${port}`;
const tempDirectory = await mkdtemp(join(tmpdir(), "ieltsist-objective-browser-retry-"));
const databasePath = join(tempDirectory, "objective-browser-retry.sqlite");
const child = spawn(process.execPath, ["server.js"], {
  cwd: rootPath,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: databasePath,
    SESSION_COOKIE_SECURE: "0",
    OPENAI_API_KEY: "",
    DASHSCOPE_API_KEY: "",
    QWEN_API_KEY: "",
    STEM_MARKING_AI_DISABLED: "1",
  },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-6_000); });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Objective browser retry server did not start. ${stderr}`);
}

async function stopServer() {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/?test=objective-browser-retry#home`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && Array.isArray(state.data?.listeningTests));

  await page.evaluate(async () => {
    const bootstrap = mergedItems("reading").map(normalizeItem).find((item) => item.questions?.length);
    if (!bootstrap) throw new Error("Reading bootstrap fixture is unavailable");
    await ensureObjectiveAttempt(bootstrap, "reading", "single");
  });

  let firstAccepted = null;
  let routedRequests = 0;
  await page.route("**/api/objective/attempts", async (route) => {
    routedRequests += 1;
    if (routedRequests === 1) {
      const response = await route.fetch();
      firstAccepted = await response.json();
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  const firstResult = await page.evaluate(async () => {
    const item = mergedItems("listening").map(normalizeItem).find((entry) => entry.questions?.length);
    try {
      await ensureObjectiveAttempt(item, "listening", "single");
      return { rejected: false };
    } catch (error) {
      const binding = objectiveAttemptBinding(item, "listening", "single");
      return {
        rejected: true,
        message: error.message,
        pending: readObjectiveAttemptStore().attempts[binding.key],
      };
    }
  });
  assert.equal(firstResult.rejected, true, "The first browser response must be lost after the server accepts it");
  assert.equal(firstResult.pending?.status, "starting");
  assert.match(firstResult.pending?.clientAttemptKey || "", /^[A-Za-z0-9_-]{8,120}$/);
  assert.match(firstResult.pending?.attemptToken || "", /^[A-Za-z0-9_-]{32,128}$/);
  assert.ok(firstAccepted?.attemptId, "The server must have accepted the first start request");

  const recovered = await page.evaluate(async () => {
    const item = mergedItems("listening").map(normalizeItem).find((entry) => entry.questions?.length);
    return ensureObjectiveAttempt(item, "listening", "single");
  });
  assert.equal(recovered.attemptId, firstAccepted.attemptId, "Browser retry must recover the server's original attempt");
  assert.equal(recovered.attemptToken, firstResult.pending.attemptToken, "Browser retry must reuse the original capability");
  assert.equal(routedRequests, 2, "Recovery should make exactly one retry request");

  console.log(`Objective browser retry passed: recovered ${recovered.attemptId} after the first response was lost.`);
} finally {
  await browser?.close();
  await stopServer();
  await rm(tempDirectory, { recursive: true, force: true });
}
