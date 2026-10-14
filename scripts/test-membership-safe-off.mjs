import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import net from "node:net";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = join(tmpdir(), `ieltsist-membership-${process.pid}-${randomUUID()}.sqlite`);
const signingKey = "membership-safe-off-test-key";
let child;
let output = "";
let baseUrl = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const findPort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});

function signedHeaders(body, timestamp = String(Date.now())) {
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  return {
    "content-type": "application/json",
    "x-stem-auth-timestamp": timestamp,
    "x-stem-auth-signature": crypto.createHmac("sha256", signingKey).update(`${timestamp}.${digest}`).digest("base64url"),
  };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}).\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`server did not start.\n${output}`);
}

try {
  const port = await findPort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: "0",
      STEM_INTERNAL_AUTH_KEY: signingKey,
      STEM_IDENTITY_SIGNING_KEY: signingKey,
      MEMBERSHIP_CHECKOUT_ENABLED: "0",
      MEMBERSHIP_ENFORCEMENT_ENABLED: "0",
      MEMBERSHIP_WECHAT_VIRTUAL_ENABLED: "0",
      WECHAT_VIRTUAL_CALLBACK_READY: "0",
      MEMBERSHIP_TESTBUYER_CANARY_ENABLED: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  await waitForServer();

  const catalogResponse = await fetch(`${baseUrl}/api/membership/catalog`);
  assert.equal(catalogResponse.status, 200);
  const catalog = await catalogResponse.json();
  assert.deepEqual(catalog, {
    protocol: "stemist-membership-v1",
    plan: { id: "all-access-month", priceFen: 2880, currency: "CNY", durationDays: 30, autoRenew: false },
    commerce: {
      checkoutEnabled: false,
      reason: "setup_required",
      providers: [
        { id: "wechat_virtual", enabled: false, reason: "setup_required", platforms: [] },
        { id: "wechat_jsapi", enabled: false, reason: "setup_required", platforms: [] },
      ],
    },
    enforcement: { enabled: false, appliesToExistingUsers: true },
  });

  const disabledCallback = await fetch(`${baseUrl}/api/membership/wechat/notify?signature=invalid&timestamp=1&nonce=n&echostr=e`);
  assert.equal(disabledCallback.status, 503, "callback endpoint remains unavailable until its explicit runtime configuration is complete");
  assert.doesNotMatch(await disabledCallback.text(), /signature=|token|aes|secret/i);

  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "member_test", password: "testing123" }),
  });
  assert.equal(register.status, 200);
  const account = await register.json();
  const authorization = { authorization: `Bearer ${account.token}` };

  const privateCatalogResponse = await fetch(`${baseUrl}/api/membership/catalog/private`, { headers: authorization });
  assert.equal(privateCatalogResponse.status, 200);
  assert.deepEqual(await privateCatalogResponse.json(), {
    ...catalog,
    userId: `ielts:${account.user.id}`,
    commerce: { ...catalog.commerce, canary: null },
  }, "private catalog remains owner-bound and checkout-off without explicit canary configuration");
  assert.equal((await fetch(`${baseUrl}/api/membership/catalog/private`)).status, 401);

  const statusResponse = await fetch(`${baseUrl}/api/membership/status`, { headers: authorization });
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.protocol, "stemist-membership-v1");
  assert.equal(status.userId, `ielts:${account.user.id}`);
  assert.deepEqual(status.entitlement, {
    active: false,
    planId: null,
    startsAt: null,
    expiresAt: null,
    version: null,
  });
  assert.deepEqual(status.enforcement, { enabled: false, appliesToExistingUsers: true });

  const checkout = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST",
    headers: { ...authorization, "content-type": "application/json" },
    body: JSON.stringify({
      planId: "all-access-month",
      idempotencyKey: "membership-test-0001",
      wxCode: "must-not-be-echoed",
      platform: "android",
      clientCapability: { requestVirtualPayment: true },
    }),
  });
  assert.equal(checkout.status, 503);
  const checkoutPayload = await checkout.json();
  assert.equal(checkoutPayload.code, "membership_checkout_unavailable");
  assert.doesNotMatch(JSON.stringify(checkoutPayload), /must-not-be-echoed|openid|session_key/i);

  const orders = await fetch(`${baseUrl}/api/membership/orders`, { headers: authorization });
  assert.equal(orders.status, 200);
  assert.deepEqual(await orders.json(), {
    protocol: "stemist-membership-v1",
    userId: `ielts:${account.user.id}`,
    orders: [],
    hasMore: false,
  });

  const internalBody = JSON.stringify({ userId: `ielts:${account.user.id}`, featureIds: ["stem.all-access"] });
  const internal = await fetch(`${baseUrl}/api/stem/internal/entitlements`, {
    method: "POST",
    headers: signedHeaders(internalBody),
    body: internalBody,
  });
  assert.equal(internal.status, 200);
  const internalPayload = await internal.json();
  assert.equal(internalPayload.userId, `ielts:${account.user.id}`);
  assert.equal(internalPayload.entitlement.active, false);
  assert.equal(internalPayload.enforcement.enabled, false);
  assert.equal(internalPayload.authority, "ieltsist-membership");
  assert.doesNotMatch(JSON.stringify(internalPayload), /openid|unionid|session_key/i);

  console.log("Membership safe-off identity authority checks passed.");
} finally {
  if (child) {
    child.kill();
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(2_000)]);
  }
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
