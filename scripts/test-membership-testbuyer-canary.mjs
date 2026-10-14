import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const { installMembershipSchema } = require("../server/membership");
const {
  assertTestbuyerCanaryActive,
  bindTestbuyerCanaryOrder,
  installTestbuyerCanarySchema,
  readTestbuyerCanaryConfig,
  reserveTestbuyerCanary,
  testbuyerCanaryState,
} = require("../server/membershipTestbuyerCanary");

const startsAt = "2026-10-14T12:00:00.000Z";
const expiresAt = "2026-10-14T14:00:00.000Z";
const env = Object.freeze({
  MEMBERSHIP_TESTBUYER_CANARY_ENABLED: "1",
  MEMBERSHIP_TESTBUYER_CANARY_MODE: "single-real-payment",
  MEMBERSHIP_TESTBUYER_CANARY_ID: "first-payment-20261014",
  MEMBERSHIP_TESTBUYER_CANARY_USER_ID: "ielts:42",
  MEMBERSHIP_TESTBUYER_CANARY_STARTS_AT: startsAt,
  MEMBERSHIP_TESTBUYER_CANARY_EXPIRES_AT: expiresAt,
});
const activeNow = Date.parse("2026-10-14T12:30:00.000Z");

const disabled = readTestbuyerCanaryConfig({}, activeNow);
assert.equal(disabled.configured, false);
assert.equal(disabled.active, false);
const active = readTestbuyerCanaryConfig(env, activeNow);
assert.deepEqual({
  configured: active.configured,
  active: active.active,
  canaryId: active.canaryId,
  userId: active.userId,
  startsAt: active.startsAt,
  expiresAt: active.expiresAt,
  platform: active.platform,
  maxNewOrders: active.maxNewOrders,
}, {
  configured: true,
  active: true,
  canaryId: "first-payment-20261014",
  userId: "ielts:42",
  startsAt,
  expiresAt,
  platform: "android",
  maxNewOrders: 1,
});
assert.equal(readTestbuyerCanaryConfig({ ...env, MEMBERSHIP_TESTBUYER_CANARY_EXPIRES_AT: "2026-10-14T14:00:00.001Z" }, activeNow).configured, false, "window over two hours is rejected");
assert.equal(readTestbuyerCanaryConfig({ ...env, MEMBERSHIP_TESTBUYER_CANARY_USER_ID: "42" }, activeNow).configured, false);
assert.equal(readTestbuyerCanaryConfig(env, Date.parse(expiresAt)).active, false, "expiry is exclusive");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "membership-canary-"));
const databasePath = path.join(temp, "canary.sqlite");
function open() {
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2000;");
  return db;
}
try {
  const racePath = path.join(temp, "race.sqlite");
  const raceSetup = new DatabaseSync(racePath);
  raceSetup.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
    CREATE TABLE memberships (user_id INTEGER PRIMARY KEY REFERENCES users(id),plan TEXT NOT NULL,starts_at TEXT NOT NULL,expires_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT INTO users (id,username) VALUES (42,'testbuyer');
  `);
  installMembershipSchema(raceSetup);
  raceSetup.close();
  const gate = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
  const gateView = new Int32Array(gate);
  const workerSource = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { DatabaseSync } = require('node:sqlite');
    const { reserveTestbuyerCanary } = require(workerData.modulePath);
    const view = new Int32Array(workerData.gate);
    const db = new DatabaseSync(workerData.databasePath);
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2000;');
    Atomics.add(view, 0, 1); Atomics.notify(view, 0);
    Atomics.wait(view, 1, 0);
    try {
      const result = reserveTestbuyerCanary(db, workerData.config, {
        userId: 'ielts:42', idempotencyKey: workerData.idempotencyKey, platform: 'android', now: workerData.now,
      });
      parentPort.postMessage({ ok: true, idempotencyKey: result.idempotencyKey });
    } catch (error) {
      parentPort.postMessage({ ok: false, code: error.code || error.name, statusCode: error.statusCode || null });
    } finally { db.close(); }
  `;
  const workerInput = ["canary-concurrent-one-0001", "canary-concurrent-two-0002"].map((idempotencyKey) => new Worker(workerSource, {
    eval: true,
    workerData: {
      modulePath: fileURLToPath(new URL("../server/membershipTestbuyerCanary.js", import.meta.url)),
      databasePath: racePath,
      config: active,
      idempotencyKey,
      now: activeNow,
      gate,
    },
  }));
  const raceResults = workerInput.map((worker) => new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => { if (code !== 0) reject(new Error(`canary worker exited ${code}`)); });
  }));
  const raceDeadline = Date.now() + 5_000;
  while (Atomics.load(gateView, 0) < 2 && Date.now() < raceDeadline) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(Atomics.load(gateView, 0), 2, "both SQLite connections reached the reservation race");
  Atomics.store(gateView, 1, 1);
  Atomics.notify(gateView, 1, 2);
  const raced = await Promise.all(raceResults);
  assert.equal(raced.filter((result) => result.ok).length, 1, "only one concurrent idempotency key can reserve the singleton");
  assert.deepEqual(raced.filter((result) => !result.ok).map((result) => [result.code, result.statusCode]), [["membership_canary_recovery_required", 409]]);
  const raceWinner = raced.find((result) => result.ok).idempotencyKey;
  const raceVerify = new DatabaseSync(racePath, { readOnly: true });
  assert.equal(raceVerify.prepare("SELECT idempotency_key FROM membership_testbuyer_canary WHERE slot=1").get().idempotency_key, raceWinner);
  raceVerify.close();

  const first = open();
  first.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
    CREATE TABLE memberships (user_id INTEGER PRIMARY KEY REFERENCES users(id),plan TEXT NOT NULL,starts_at TEXT NOT NULL,expires_at TEXT NOT NULL,updated_at TEXT NOT NULL);
    INSERT INTO users (id,username) VALUES (42,'testbuyer'),(43,'other');
  `);
  installMembershipSchema(first);
  installTestbuyerCanarySchema(first);
  const second = open();

  assert.deepEqual(testbuyerCanaryState(first, active, "ielts:43"), {
    authorized: false, active: false, reason: "setup_required", canary: null,
  });
  assert.deepEqual(testbuyerCanaryState(first, active, "ielts:42"), {
    authorized: true,
    active: true,
    reason: "testbuyer_canary",
    canary: { mode: "single-testbuyer", expiresAt, remainingNewOrders: 1, recovery: null },
  });

  first.prepare(`
    INSERT INTO membership_orders
      (id,user_id,plan_id,product_id,provider,idempotency_key,out_trade_no,amount_fen,currency,duration_days,auto_renew,status,payer_app_id,payer_openid,created_at,updated_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run("Maaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 42, "all-access-month", "other-product", "wechat_virtual",
    "preexisting-canary-key", "Maaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", 2880, "CNY", 30, 0, "closed",
    "wx-test-app", "openid-testbuyer", startsAt, startsAt, "2026-10-14T12:15:00.000Z");
  assert.throws(() => reserveTestbuyerCanary(first, active, {
    userId: "ielts:42", idempotencyKey: "preexisting-canary-key", platform: "android", now: activeNow,
  }), (error) => error.code === "membership_checkout_conflict", "a canary cannot adopt a pre-slot historical order");

  const reservation = reserveTestbuyerCanary(first, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", platform: "android", now: activeNow,
  });
  assert.equal(reservation.idempotencyKey, "canary-idempotency-0001");
  assert.equal(reservation.orderId, null);
  assert.equal(assertTestbuyerCanaryActive(first, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", now: activeNow,
  }), true);
  assert.throws(() => assertTestbuyerCanaryActive(first, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", now: Date.parse(expiresAt),
  }), (error) => error.code === "membership_canary_expired");
  assert.deepEqual(reserveTestbuyerCanary(second, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", platform: "android", now: activeNow,
  }), reservation, "same idempotency key resumes across database connections");
  assert.throws(() => reserveTestbuyerCanary(second, active, {
    userId: "ielts:42", idempotencyKey: "different-idempotency-0002", platform: "android", now: activeNow,
  }), (error) => error.code === "membership_canary_recovery_required" && error.statusCode === 409);
  assert.throws(() => reserveTestbuyerCanary(second, active, {
    userId: "ielts:43", idempotencyKey: "canary-idempotency-0001", platform: "android", now: activeNow,
  }), (error) => error.code === "membership_checkout_unavailable");
  assert.throws(() => reserveTestbuyerCanary(second, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", platform: "ios", now: activeNow,
  }), (error) => error.code === "membership_platform_unavailable");

  first.close();
  second.close();
  const restarted = open();
  installTestbuyerCanarySchema(restarted);
  assert.deepEqual(testbuyerCanaryState(restarted, active, "ielts:42"), {
    authorized: true,
    active: true,
    reason: "testbuyer_canary_recovery_required",
    canary: {
      mode: "single-testbuyer", expiresAt, remainingNewOrders: 0,
      recovery: { idempotencyKey: "canary-idempotency-0001", orderId: null },
    },
  }, "a reservation made before wxCode validation survives restart");

  restarted.prepare(`
    INSERT INTO membership_orders
      (id,user_id,plan_id,product_id,provider,idempotency_key,out_trade_no,amount_fen,currency,duration_days,auto_renew,status,payer_app_id,payer_openid,created_at,updated_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run("M0123456789abcdef0123456789abcd", 42, "all-access-month", "membership", "wechat_virtual",
    "canary-idempotency-0001", "M0123456789abcdef0123456789abcd", 2880, "CNY", 30, 0, "failed",
    "wx-test-app", "openid-testbuyer", startsAt, startsAt, "2026-10-14T12:45:00.000Z");
  assert.equal(testbuyerCanaryState(restarted, active, "ielts:42").canary.recovery.orderId, null, "a pre-payment failed order resumes the same idempotency key with a fresh wxCode");
  restarted.prepare("UPDATE membership_orders SET status='pending' WHERE id=?").run("M0123456789abcdef0123456789abcd");
  assert.equal(testbuyerCanaryState(restarted, active, "ielts:42").canary.recovery.orderId, "M0123456789abcdef0123456789abcd", "a payment-parameter-bearing order is query-only");
  const bound = bindTestbuyerCanaryOrder(restarted, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", orderId: "M0123456789abcdef0123456789abcd", productId: "membership",
  });
  assert.equal(bound.orderId, "M0123456789abcdef0123456789abcd");
  assert.throws(() => bindTestbuyerCanaryOrder(restarted, active, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", orderId: "Mffffffffffffffffffffffffffffff", productId: "membership",
  }), (error) => error.code === "membership_canary_binding_conflict");

  const expired = readTestbuyerCanaryConfig(env, Date.parse(expiresAt) + 1);
  const expiredState = testbuyerCanaryState(restarted, expired, "ielts:42");
  assert.equal(expiredState.active, false);
  assert.equal(expiredState.reason, "testbuyer_canary_expired");
  assert.equal(expiredState.canary.recovery.orderId, "M0123456789abcdef0123456789abcd", "query recovery remains visible after expiry");
  assert.throws(() => reserveTestbuyerCanary(restarted, expired, {
    userId: "ielts:42", idempotencyKey: "canary-idempotency-0001", platform: "android", now: Date.parse(expiresAt) + 1,
  }), (error) => error.code === "membership_canary_expired");
  restarted.prepare("DELETE FROM users WHERE id=42").run();
  assert.deepEqual({ ...restarted.prepare("SELECT slot,user_id FROM membership_testbuyer_canary").get() }, { slot: 1, user_id: null }, "owner deletion removes account data without releasing the one-payment slot");
  restarted.close();
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("Membership single-testbuyer canary SQLite concurrency/restart/expiry checks passed.");
