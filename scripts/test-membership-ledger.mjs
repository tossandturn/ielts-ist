import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const {
  applyVerifiedProviderResult,
  installMembershipSchema,
  membershipEntitlement,
  recordMembershipGrant,
} = require("../server/membership");

const db = new DatabaseSync(":memory:");
db.exec(`
  PRAGMA foreign_keys=ON;
  CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
  CREATE TABLE memberships (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);
installMembershipSchema(db);
db.prepare("INSERT INTO users (id,username) VALUES (1,'one'),(2,'two')").run();

const paidAt = "2026-10-14T00:00:00.000Z";
const day = 24 * 60 * 60 * 1000;

function insertOrder({ id, userId, outTradeNo, openid, createdAt = paidAt }) {
  db.prepare(`
    INSERT INTO membership_orders
      (id,user_id,plan_id,product_id,provider,idempotency_key,out_trade_no,amount_fen,currency,duration_days,auto_renew,status,payer_app_id,payer_openid,created_at,updated_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, userId, "all-access-month", "product-month", "wechat_virtual", `idem-${id}`, outTradeNo,
    2880, "CNY", 30, 0, "pending", "wx-app", openid, createdAt, createdAt,
    new Date(Date.parse(createdAt) + 15 * 60 * 1000).toISOString());
}

function event({ eventId, providerOrderId, outTradeNo, openid, eventType = "paid", occurredAt = paidAt }) {
  return {
    verified: true,
    provider: "wechat_virtual",
    eventId,
    providerOrderId,
    outTradeNo,
    payerAppId: "wx-app",
    payerOpenid: openid,
    productId: "product-month",
    amountFen: 2880,
    currency: "CNY",
    paidAt: occurredAt,
    occurredAt,
    eventType,
    rawDigestSha256: eventId.padEnd(64, "0").slice(0, 64),
  };
}

insertOrder({ id: "order-1", userId: 1, outTradeNo: "trade000000000001", openid: "open-1" });
const first = applyVerifiedProviderResult(db, event({
  eventId: "a", providerOrderId: "provider-1", outTradeNo: "trade000000000001", openid: "open-1",
}));
assert.equal(first.order.status, "fulfilled");
assert.equal(first.entitlement.active, true);
assert.equal(first.entitlement.expiresAt, new Date(Date.parse(paidAt) + 30 * day).toISOString());

const duplicate = applyVerifiedProviderResult(db, event({
  eventId: "a", providerOrderId: "provider-1", outTradeNo: "trade000000000001", openid: "open-1",
}));
assert.equal(duplicate.duplicate, true);
assert.equal(duplicate.entitlement.expiresAt, first.entitlement.expiresAt, "same callback must never add another 30 days");
assert.throws(() => applyVerifiedProviderResult(db, event({
  eventId: "a", providerOrderId: "provider-conflict", outTradeNo: "trade000000000002", openid: "open-1",
})), /event identity conflicts/i, "an idempotency event cannot be rebound to another provider order");

insertOrder({
  id: "order-2", userId: 1, outTradeNo: "trade000000000002", openid: "open-1",
  createdAt: new Date(Date.parse(paidAt) + day).toISOString(),
});
const renewal = applyVerifiedProviderResult(db, event({
  eventId: "b", providerOrderId: "provider-2", outTradeNo: "trade000000000002", openid: "open-1",
  occurredAt: new Date(Date.parse(paidAt) + day).toISOString(),
}));
assert.equal(renewal.entitlement.expiresAt, new Date(Date.parse(paidAt) + 60 * day).toISOString(), "renewal extends from active expiry");

const refunded = applyVerifiedProviderResult(db, event({
  eventId: "c", providerOrderId: "provider-1", outTradeNo: "trade000000000001", openid: "open-1",
  eventType: "refunded", occurredAt: new Date(Date.parse(paidAt) + 2 * day).toISOString(),
}));
assert.equal(refunded.order.status, "refunded");
assert.equal(refunded.entitlement.expiresAt, new Date(Date.parse(paidAt) + 31 * day).toISOString(), "refund reverses only its own grant");
const duplicateRefund = applyVerifiedProviderResult(db, event({
  eventId: "c", providerOrderId: "provider-1", outTradeNo: "trade000000000001", openid: "open-1",
  eventType: "refunded", occurredAt: new Date(Date.parse(paidAt) + 2 * day).toISOString(),
}));
assert.equal(duplicateRefund.entitlement.expiresAt, refunded.entitlement.expiresAt);

assert.throws(() => applyVerifiedProviderResult(db, event({
  eventId: "d", providerOrderId: "provider-1", outTradeNo: "trade000000000001", openid: "open-1",
  occurredAt: new Date(Date.parse(paidAt) + 3 * day).toISOString(),
})), /refunded membership order/i);
assert.equal(membershipEntitlement(db, 1, Date.parse(paidAt) + 3 * day).expiresAt, refunded.entitlement.expiresAt);

db.prepare("INSERT INTO memberships (user_id,plan,starts_at,expires_at,updated_at) VALUES (2,'legacy','2026-10-01T00:00:00.000Z','2026-10-24T00:00:00.000Z','2026-10-01T00:00:00.000Z')").run();
recordMembershipGrant(db, {
  userId: 2, sourceType: "redemption", sourceKey: "redemption:code-1", planId: "month",
  durationDays: 30, effectiveAt: paidAt, grantedAt: paidAt,
});
recordMembershipGrant(db, {
  userId: 2, sourceType: "redemption", sourceKey: "redemption:code-1", planId: "month",
  durationDays: 30, effectiveAt: paidAt, grantedAt: paidAt,
});
assert.equal(membershipEntitlement(db, 2, Date.parse(paidAt)).expiresAt, "2026-11-23T00:00:00.000Z", "existing active membership is baseline and duplicate grant is idempotent");

assert.throws(() => applyVerifiedProviderResult(db, { verified: false }), /Verified membership provider result/);

db.close();
console.log("Membership ledger idempotency and refund checks passed.");
