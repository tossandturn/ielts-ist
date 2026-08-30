import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 8100 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-stem-auth-bridge-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: dbPath,
    SESSION_COOKIE_SECURE: "0",
    STEM_IDENTITY_SIGNING_KEY: "local-browser-contract-signing-key-20260811",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
child.stdout.on("data", (chunk) => { serverOutput += chunk; });
child.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`STEM auth bridge server exited early (${child.exitCode}).\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`STEM auth bridge server did not start.\n${serverOutput}`);
}

function bridgeUrl(action, returnTo, from = "stem") {
  const url = new URL(baseUrl);
  url.searchParams.set("from", from);
  url.searchParams.set("auth", action);
  url.searchParams.set("return_to", returnTo);
  url.hash = "mine";
  return url.toString();
}

const stemReturn = "https://stem.ieltsist.com/papers?paper=S25%2F11&attemptId=attempt-7&token=secret&returnTo=https%3A%2F%2Fevil.example#question?state=temp&part=22";
const canonicalStemReturn = "https://stem.ieltsist.com/papers?paper=S25%2F11&attemptId=attempt-7#question?part=22";
const username = `bridge_${process.pid}_${Date.now()}`.slice(0, 24);
const password = "bridge-pass-2026";

async function waitForStemReturn(page, expectedUrl = canonicalStemReturn) {
  const expected = new URL(expectedUrl);
  const deadline = Date.now() + 20_000;
  let lastUrl = page.url();
  while (Date.now() < deadline) {
    lastUrl = page.url();
    try {
      const url = new URL(lastUrl);
      if (url.origin === expected.origin
        && url.pathname === expected.pathname
        && url.hash === expected.hash
        && url.searchParams.get("paper") === expected.searchParams.get("paper")
        && url.searchParams.get("attemptId") === expected.searchParams.get("attemptId")) {
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for STEM return ${expected.href}. Last URL: ${lastUrl}`);
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route("https://stem.ieltsist.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>STEM return</title><main id='stem-return'>Returned to STEM attempt</main>",
    });
  });
  const page = await context.newPage();

  await page.goto(bridgeUrl("register", stemReturn), { waitUntil: "networkidle" });
  await page.locator('[data-auth-bridge-mode="register"]').waitFor({ state: "visible" });
  assert.equal(new URL(page.url()).search, "", "Temporary auth bridge parameters must be removed immediately");
  assert.equal(new URL(page.url()).hash, "#mine");
  assert.match(await page.locator("#authMessage").innerText(), /return to the original STEM page/i);
  await page.locator("#authUsername").fill(username);
  await page.locator("#authPassword").fill(password);
  await page.locator("#registerUser").click();
  await waitForStemReturn(page);
  assert.equal(await page.locator("#stem-return").innerText(), "Returned to STEM attempt");

  let identity = await context.request.get(`${baseUrl}/api/stem/identity`, {
    headers: { origin: "https://stem.ieltsist.com" },
  });
  assert.equal(identity.status(), 200, "Register bridge must establish the shared IELTSist session");
  const registeredIdentity = await identity.json();
  assert.equal(registeredIdentity.identity.username, username);

  await page.goto(bridgeUrl("logout", stemReturn), { waitUntil: "networkidle" });
  await waitForStemReturn(page);
  identity = await context.request.get(`${baseUrl}/api/stem/identity`, {
    headers: { origin: "https://stem.ieltsist.com" },
  });
  assert.equal(identity.status(), 401, "STEM logout bridge must invalidate the shared server session");

  await page.goto(bridgeUrl("login", stemReturn), { waitUntil: "networkidle" });
  await page.locator('[data-auth-bridge-mode="login"]').waitFor({ state: "visible" });
  await page.locator("#authUsername").fill(username);
  await page.locator("#authPassword").fill(password);
  const loginResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/auth/login"));
  await page.locator("#loginUser").click();
  const loginResponse = await loginResponsePromise;
  assert.equal(loginResponse.status(), 200, "Login bridge must accept the previously registered credentials");
  await waitForStemReturn(page);
  identity = await context.request.get(`${baseUrl}/api/stem/identity`, {
    headers: { origin: "https://stem.ieltsist.com" },
  });
  assert.equal(identity.status(), 200, "Login bridge must restore the shared IELTSist session");
  const loggedInIdentity = await identity.json();
  assert.equal(loggedInIdentity.identity.username, username);

  await page.goto(bridgeUrl("login", "https://evil.example/steal?token=secret", "evil"), { waitUntil: "networkidle" });
  assert.equal(new URL(page.url()).search, "", "Rejected bridge parameters must still be removed from the address bar");
  assert.match(await page.locator("#authMessage").innerText(), /invalid or expired/i);
  assert.equal(await page.locator('[data-auth-bridge-mode]').count(), 0, "Rejected origins must not open an auth bridge mode");

  await page.goto(bridgeUrl("logout", stemReturn), { waitUntil: "networkidle" });
  await waitForStemReturn(page);
  identity = await context.request.get(`${baseUrl}/api/stem/identity`, {
    headers: { origin: "https://stem.ieltsist.com" },
  });
  assert.equal(identity.status(), 401);

  console.log("PASS STEM register/login/logout bridge returned precisely and cleared shared identity on logout.");
} finally {
  await browser.close();
  child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
