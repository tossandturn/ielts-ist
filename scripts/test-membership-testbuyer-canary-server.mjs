import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const root = fileURLToPath(new URL("../", import.meta.url));
const dualPlatform = process.argv.includes('--dual-platform');
const dbPath = join(tmpdir(), `ieltsist-membership-canary-${process.pid}-${randomUUID()}.sqlite`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const { port } = listener.address();
      listener.close(() => resolve(port));
    });
  });
}

const [port, wechatPort] = await Promise.all([freePort(), freePort()]);
const baseUrl = `http://127.0.0.1:${port}`;
const appId = "wxcanaryservertest";
const callbackAesKey = Buffer.alloc(32, 4).toString("base64").replace(/=$/, "");
const startsAt = new Date(Date.now() - 60_000).toISOString();
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
let child;
let output = "";
const wechat = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.writeHead(200, { "content-type": "application/json" });
  if (url.searchParams.get("js_code") === "bad-code") {
    res.end(JSON.stringify({ errcode: 40029, errmsg: "invalid code fixture" }));
  } else {
    res.end(JSON.stringify({ openid: "openid-canary-testbuyer", session_key: "fixture-session-key" }));
  }
});
await new Promise((resolve, reject) => {
  wechat.once("error", reject);
  wechat.listen(wechatPort, "127.0.0.1", resolve);
});

try {
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: "0",
      WECHAT_MINIPROGRAM_APP_ID: appId,
      WECHAT_MINIPROGRAM_APP_SECRET: "fixture-app-secret",
      WECHAT_MINIPROGRAM_CODE2SESSION_URL: `http://127.0.0.1:${wechatPort}/sns/jscode2session`,
      MEMBERSHIP_CHECKOUT_ENABLED: "1",
      MEMBERSHIP_COMMERCE_READY: "1",
      MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED: "0",
      MEMBERSHIP_WECHAT_VIRTUAL_ENABLED: "1",
      MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY: "1",
      MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED: "1",
      MEMBERSHIP_WECHAT_VIRTUAL_MODE: "production",
      MEMBERSHIP_WECHAT_VIRTUAL_APP_ID: appId,
      MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET: "fixture-app-secret",
      MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY: "fixture-app-key",
      MEMBERSHIP_WECHAT_VIRTUAL_OFFER_ID: "1234567890",
      MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID: "membership",
      MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY: "1",
      MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED: dualPlatform ? "1" : "0",
      MEMBERSHIP_WECHAT_VIRTUAL_IOS_IAP_READY: dualPlatform ? "1" : "0",
      WECHAT_VIRTUAL_CALLBACK_READY: "1",
      WECHAT_VIRTUAL_CALLBACK_MODE: "safe",
      WECHAT_VIRTUAL_CALLBACK_TOKEN: "CanaryCallbackToken123",
      WECHAT_VIRTUAL_CALLBACK_AES_KEY: callbackAesKey,
      WECHAT_VIRTUAL_CALLBACK_FORMAT: "json",
      MEMBERSHIP_TESTBUYER_CANARY_ENABLED: "1",
      MEMBERSHIP_TESTBUYER_CANARY_MODE: "single-real-payment",
      MEMBERSHIP_TESTBUYER_CANARY_ID: "first-payment-server-test",
      MEMBERSHIP_TESTBUYER_CANARY_USER_ID: "ielts:1",
      MEMBERSHIP_TESTBUYER_CANARY_STARTS_AT: startsAt,
      MEMBERSHIP_TESTBUYER_CANARY_EXPIRES_AT: expiresAt,
      MEMBERSHIP_TESTBUYER_IOS_CANARY_ENABLED: dualPlatform ? '1' : '0',
      MEMBERSHIP_TESTBUYER_IOS_CANARY_MODE: 'single-real-payment',
      MEMBERSHIP_TESTBUYER_IOS_CANARY_ID: 'ios-payment-server-test',
      MEMBERSHIP_TESTBUYER_IOS_CANARY_STARTS_AT: startsAt,
      MEMBERSHIP_TESTBUYER_IOS_CANARY_EXPIRES_AT: expiresAt,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}).\n${output}`);
    try { if ((await fetch(`${baseUrl}/healthz`)).ok) break; } catch {}
    await sleep(100);
  }
  assert.equal((await fetch(`${baseUrl}/healthz`)).ok, true, output);

  const publicCatalog = await (await fetch(`${baseUrl}/api/membership/catalog`)).json();
  assert.equal(publicCatalog.commerce.checkoutEnabled, false, "public catalog remains globally off during canary");
  assert.equal("canary" in publicCatalog.commerce, false);
  assert.equal('platformCanaries' in publicCatalog.commerce, false);
  assert.equal((await fetch(`${baseUrl}/api/membership/catalog/private`)).status, 401);

  async function register(username) {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password: "testing123" }),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const buyer = await register("canary_buyer");
  const other = await register("canary_other");
  assert.equal(buyer.user.id, 1);
  const buyerHeaders = { authorization: `Bearer ${buyer.token}` };
  const otherHeaders = { authorization: `Bearer ${other.token}` };

  const db = new DatabaseSync(dbPath);
  const timestamp = new Date().toISOString();
  db.prepare("INSERT INTO wechat_identities (app_id,openid,unionid,user_id,created_at,updated_at,last_seen_at) VALUES (?,?,?,?,?,?,?)")
    .run(appId, "openid-canary-testbuyer", null, buyer.user.id, timestamp, timestamp, timestamp);
  db.close();

  const otherCatalog = await (await fetch(`${baseUrl}/api/membership/catalog/private`, { headers: otherHeaders })).json();
  assert.equal(otherCatalog.userId, "ielts:2");
  assert.equal(otherCatalog.commerce.checkoutEnabled, false);
  assert.equal(otherCatalog.commerce.canary, null);
  assert.deepEqual(otherCatalog.commerce.platformCanaries, {}, 'Other accounts cannot see per-platform recovery information');

  let privateCatalog = await (await fetch(`${baseUrl}/api/membership/catalog/private`, { headers: buyerHeaders })).json();
  assert.equal(privateCatalog.userId, "ielts:1");
  assert.equal(privateCatalog.commerce.checkoutEnabled, true);
  assert.equal(privateCatalog.commerce.reason, "testbuyer_canary");
  assert.deepEqual(privateCatalog.commerce.canary, {
    mode: "single-testbuyer", expiresAt, remainingNewOrders: 1, recovery: null,
  });
  assert.deepEqual(privateCatalog.commerce.providers, [
    { id: "wechat_virtual", enabled: true, reason: "ready", platforms: dualPlatform ? ["android", "ios"] : ["android"] },
    { id: "wechat_jsapi", enabled: false, reason: "setup_required", platforms: [] },
  ]);

  const nonAllowlistedCheckout = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST", headers: { ...otherHeaders, "content-type": "application/json" },
    body: JSON.stringify({ planId: "all-access-month", idempotencyKey: "other-user-canary-attempt", wxCode: "good-code", platform: "android", clientCapability: {} }),
  });
  assert.equal(nonAllowlistedCheckout.status, 503);
  const iosCheckout = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST", headers: { ...buyerHeaders, "content-type": "application/json" },
    body: JSON.stringify({ planId: "all-access-month", idempotencyKey: "ios-canary-attempt-0001", wxCode: "good-code", platform: "ios", clientCapability: {} }),
  });
  assert.equal(iosCheckout.status, dualPlatform ? 201 : 409);
  if (dualPlatform) {
    const iosOrder = await iosCheckout.json();
    assert.equal(iosOrder.order.platform, 'ios');
    assert.deepEqual(privateCatalog.commerce.platformCanaries.ios, { platform:'ios', checkoutEnabled:true, reason:'testbuyer_canary', mode:'single-testbuyer', expiresAt, remainingNewOrders:1, recovery:null });
    const secondIos = await fetch(`${baseUrl}/api/membership/orders`, { method:'POST', headers:{...buyerHeaders,'content-type':'application/json'},body:JSON.stringify({planId:'all-access-month',idempotencyKey:'second-ios-key-0002',wxCode:'good-code',platform:'ios'}) });
    assert.equal(secondIos.status,409);
  }

  const forbiddenOverride = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST", headers: { ...buyerHeaders, "content-type": "application/json" },
    body: JSON.stringify({ planId: "all-access-month", idempotencyKey: "canary-idempotency-server-1", wxCode: "good-code", platform: "android", clientCapability: {}, canary: true }),
  });
  assert.equal(forbiddenOverride.status, 400);

  const firstAttempt = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST", headers: { ...buyerHeaders, "content-type": "application/json" },
    body: JSON.stringify({ planId: "all-access-month", idempotencyKey: "canary-idempotency-server-1", wxCode: "bad-code", platform: "android", clientCapability: { requestVirtualPayment: true } }),
  });
  assert.equal(firstAttempt.status, 401, "fresh wxCode failure leaves a recoverable reservation rather than an order");
  privateCatalog = await (await fetch(`${baseUrl}/api/membership/catalog/private`, { headers: buyerHeaders })).json();
  assert.equal(privateCatalog.commerce.checkoutEnabled, true);
  assert.equal(privateCatalog.commerce.reason, "testbuyer_canary_recovery_required");
  assert.deepEqual(privateCatalog.commerce.canary.recovery, { idempotencyKey: "canary-idempotency-server-1", orderId: null });

  const retry = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST", headers: { ...buyerHeaders, "content-type": "application/json" },
    body: JSON.stringify({ planId: "all-access-month", idempotencyKey: privateCatalog.commerce.canary.recovery.idempotencyKey, wxCode: "good-code", platform: "android", clientCapability: { requestVirtualPayment: true } }),
  });
  assert.equal(retry.status, 201);
  const checkout = await retry.json();
  assert.match(checkout.order.id, /^M[a-f0-9]{30}$/);
  assert.deepEqual({ priceFen: checkout.order.priceFen, currency: checkout.order.currency, durationDays: checkout.order.durationDays }, {
    priceFen: 2880, currency: "CNY", durationDays: 30,
  });
  assert.equal(checkout.payment.provider, "wechat_virtual");

  privateCatalog = await (await fetch(`${baseUrl}/api/membership/catalog/private`, { headers: buyerHeaders })).json();
  assert.equal(privateCatalog.commerce.reason, "testbuyer_canary_recovery_required");
  assert.deepEqual(privateCatalog.commerce.canary.recovery, { idempotencyKey: "canary-idempotency-server-1", orderId: checkout.order.id });
  const secondLogicalOrder = await fetch(`${baseUrl}/api/membership/orders`, {
    method: "POST", headers: { ...buyerHeaders, "content-type": "application/json" },
    body: JSON.stringify({ planId: "all-access-month", idempotencyKey: "canary-idempotency-server-2", wxCode: "good-code", platform: "android", clientCapability: {} }),
  });
  assert.equal(secondLogicalOrder.status, 409);
  assert.equal((await secondLogicalOrder.json()).code, "membership_canary_recovery_required");

  const verifyDb = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal(verifyDb.prepare("SELECT COUNT(*) AS count FROM membership_orders").get().count, dualPlatform ? 2 : 1);
  assert.deepEqual({ ...verifyDb.prepare("SELECT amount_fen,currency,duration_days,auto_renew FROM membership_orders WHERE platform='android'").get() }, {
    amount_fen: 2880, currency: "CNY", duration_days: 30, auto_renew: 0,
  });
  assert.deepEqual({ ...verifyDb.prepare("SELECT idempotency_key,order_id FROM membership_testbuyer_canary WHERE slot=1").get() }, {
    idempotency_key: "canary-idempotency-server-1", order_id: checkout.order.id,
  });
  verifyDb.close();
} finally {
  if (child) {
    child.kill();
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(2_000)]);
  }
  await new Promise((resolve) => wechat.close(resolve));
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}

console.log("Membership testbuyer private-catalog/single-order/recovery server checks passed without real payment.");
