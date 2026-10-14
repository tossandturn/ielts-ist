import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const {
  applyVerifiedProviderResult,
  createMembershipCheckout,
  installMembershipSchema,
  refreshMembershipOrder,
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
  INSERT INTO users (id,username) VALUES (42,'member');
`);
installMembershipSchema(db);

const env = {
  MEMBERSHIP_CHECKOUT_ENABLED: "1",
  MEMBERSHIP_COMMERCE_READY: "1",
};
const checkoutCalls = [];
const identityCalls = [];
const provider = {
  id: "wechat_virtual",
  productId: "product-month",
  platforms: ["android"],
  readiness: () => ({ ready: true, reason: "ready" }),
  createCheckout: async ({ order, identity, sessionContext }) => {
    checkoutCalls.push({ order, identity, sessionContext });
    assert.equal(order.amountFen, 2880);
    assert.equal(order.currency, "CNY");
    assert.equal(order.durationDays, 30);
    assert.equal(order.autoRenew, false);
    assert.equal(identity.openid, "openid-42");
    assert.equal(sessionContext.sessionKey, "transient-session-key");
    return {
      provider: "wechat_virtual",
      providerOrderId: null,
      parameters: { mode: "short_series_goods", signData: order.outTradeNo, paySig: "pay-sig", signature: "session-sig" },
    };
  },
};
const providerRegistry = { wechat_virtual: provider };
const resolveWechatIdentity = async ({ userId, provider: providerId, wxCode }) => {
  identityCalls.push({ userId, providerId, wxCode });
  return {
    userId,
    appId: "wx-app",
    openid: "openid-42",
    sessionContext: { sessionKey: "transient-session-key", codeVerifiedAt: new Date().toISOString() },
  };
};
const basePayload = {
  planId: "all-access-month",
  idempotencyKey: "membership-order-retry-0001",
  wxCode: "fresh-code-1",
  platform: "android",
  clientCapability: { requestVirtualPayment: true },
};

const first = await createMembershipCheckout({
  db, userId: "ielts:42", payload: basePayload, env, providerRegistry, resolveWechatIdentity,
});
assert.equal(first.order.status, "pending");
assert.equal(first.payment.provider, "wechat_virtual");
assert.match(first.order.id, /^M[a-f0-9]{30}$/);
assert.equal(first.order.id, checkoutCalls[0].order.outTradeNo, "the public order id is the provider-safe server trade number");
assert.equal(first.payment.parameters.signData, checkoutCalls[0].order.outTradeNo);
await assert.rejects(() => createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: { ...basePayload, idempotencyKey: "membership-ios-blocked-0001", platform: "ios", wxCode: "unused-code" },
  env,
  providerRegistry,
  resolveWechatIdentity: async () => { throw new Error("platform rejection must happen before payer exchange"); },
}), (error) => error.code === "membership_platform_unavailable" && error.statusCode === 409);

const retry = await createMembershipCheckout({
  db, userId: "ielts:42", payload: { ...basePayload, wxCode: "fresh-code-2" }, env, providerRegistry, resolveWechatIdentity,
});
assert.equal(retry.order.id, first.order.id);
assert.equal(checkoutCalls.length, 2);
assert.equal(checkoutCalls[1].order.outTradeNo, checkoutCalls[0].order.outTradeNo, "a retry must reuse the provider order identity");
assert.deepEqual(identityCalls.map((item) => item.wxCode), ["fresh-code-1", "fresh-code-2"]);
assert.equal(db.prepare("SELECT COUNT(*) AS total FROM membership_orders").get().total, 1);

await assert.rejects(() => createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: { ...basePayload, amountFen: 1 },
  env,
  providerRegistry,
  resolveWechatIdentity,
}), /checkout request is invalid/i, "the client cannot override price or other authority fields");

const firstInternal = checkoutCalls[0].order;
applyVerifiedProviderResult(db, {
  verified: true,
  provider: "wechat_virtual",
  eventId: "a".repeat(64),
  providerOrderId: "wx-provider-order-1",
  outTradeNo: firstInternal.outTradeNo,
  payerAppId: "wx-app",
  payerOpenid: "openid-42",
  productId: "product-month",
  amountFen: 2880,
  currency: "CNY",
  paidAt: new Date().toISOString(),
  occurredAt: new Date().toISOString(),
  eventType: "paid",
  rawDigestSha256: "b".repeat(64),
});

const fulfilledRetry = await createMembershipCheckout({
  db, userId: "ielts:42", payload: { ...basePayload, wxCode: "" }, env: {}, providerRegistry: {},
  resolveWechatIdentity: async () => { throw new Error("a final order must be recoverable without exchanging another WeChat code"); },
});
assert.equal(fulfilledRetry.order.id, first.order.id);
assert.equal(fulfilledRetry.order.status, "fulfilled");
assert.equal(fulfilledRetry.entitlement.active, true);
assert.equal(Object.hasOwn(fulfilledRetry, "payment"), false, "a fulfilled idempotent retry must not initiate payment again");
assert.equal(checkoutCalls.length, 2);

const pendingOrder = {
  ...basePayload,
  idempotencyKey: "membership-order-query-0002",
  wxCode: "fresh-code-4",
};
const second = await createMembershipCheckout({
  db, userId: "ielts:42", payload: pendingOrder, env, providerRegistry, resolveWechatIdentity,
});
const secondInternal = checkoutCalls.at(-1).order;
let queryCalls = 0;
const queryRegistry = {
  wechat_virtual: {
    ...provider,
    queryOrder: async ({ order }) => {
      queryCalls += 1;
      assert.equal(order.id, second.order.id);
      return {
        provider: "wechat_virtual",
        providerStatus: 2,
        state: "paid",
        rawDigestSha256: "c".repeat(64),
        normalizedEvent: {
          verified: true,
          provider: "wechat_virtual",
          eventId: "d".repeat(64),
          providerOrderId: "wx-provider-order-2",
          outTradeNo: secondInternal.outTradeNo,
          payerAppId: "wx-app",
          payerOpenid: "openid-42",
          productId: "product-month",
          amountFen: 2880,
          currency: "CNY",
          paidAt: new Date().toISOString(),
          occurredAt: new Date().toISOString(),
          eventType: "paid",
          rawDigestSha256: "c".repeat(64),
        },
      };
    },
  },
};
const confirmed = await refreshMembershipOrder({
  db, userId: "ielts:42", orderId: second.order.id, providerRegistry: queryRegistry,
});
assert.equal(queryCalls, 1);
assert.equal(confirmed.order.status, "fulfilled");
assert.equal(confirmed.entitlement.active, true);
assert.deepEqual(Object.keys(confirmed).sort(), ["entitlement", "order", "protocol", "userId"]);

queryRegistry.wechat_virtual.queryOrder = async () => ({
  provider: "wechat_virtual",
  providerStatus: 8,
  state: "refunded",
  rawDigestSha256: "e".repeat(64),
  normalizedEvent: {
    verified: true,
    provider: "wechat_virtual",
    eventId: "f".repeat(64),
    providerOrderId: "wx-provider-order-2",
    outTradeNo: secondInternal.outTradeNo,
    payerAppId: "wx-app",
    payerOpenid: "openid-42",
    productId: "product-month",
    amountFen: 2880,
    currency: "CNY",
    occurredAt: new Date().toISOString(),
    eventType: "refunded",
    rawDigestSha256: "e".repeat(64),
  },
});
const refunded = await refreshMembershipOrder({
  db, userId: "ielts:42", orderId: second.order.id, providerRegistry: queryRegistry,
});
assert.equal(refunded.order.status, "refunded", "server-side provider query must revoke a refunded grant");
queryRegistry.wechat_virtual.queryOrder = async () => { throw new Error("a refunded order must not be re-queried and re-granted"); };
assert.equal((await refreshMembershipOrder({
  db, userId: "ielts:42", orderId: second.order.id, providerRegistry: queryRegistry,
})).order.status, "refunded");

let releaseDeferredProvider;
let markDeferredProviderStarted;
const deferredProviderStarted = new Promise((resolve) => { markDeferredProviderStarted = resolve; });
const deferredProvider = {
  ...provider,
  createCheckout: async ({ order }) => {
    markDeferredProviderStarted(order);
    return new Promise((resolve) => { releaseDeferredProvider = resolve; });
  },
};
const deferredPayload = {
  ...basePayload,
  idempotencyKey: "membership-order-terminal-race-0003",
  wxCode: "fresh-code-race",
};
const inFlightCheckout = createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: deferredPayload,
  env,
  providerRegistry: { wechat_virtual: deferredProvider },
  resolveWechatIdentity,
});
const deferredOrder = await deferredProviderStarted;
const racePaidAt = new Date().toISOString();
applyVerifiedProviderResult(db, {
  verified: true,
  provider: "wechat_virtual",
  eventId: "1".repeat(64),
  providerOrderId: "wx-provider-order-race",
  outTradeNo: deferredOrder.outTradeNo,
  payerAppId: "wx-app",
  payerOpenid: "openid-42",
  productId: "product-month",
  amountFen: 2880,
  currency: "CNY",
  paidAt: racePaidAt,
  occurredAt: racePaidAt,
  eventType: "paid",
  rawDigestSha256: "2".repeat(64),
});
applyVerifiedProviderResult(db, {
  verified: true,
  provider: "wechat_virtual",
  eventId: "3".repeat(64),
  providerOrderId: "wx-provider-order-race",
  outTradeNo: deferredOrder.outTradeNo,
  payerAppId: "wx-app",
  payerOpenid: "openid-42",
  productId: "product-month",
  amountFen: 2880,
  currency: "CNY",
  occurredAt: new Date().toISOString(),
  eventType: "refunded",
  rawDigestSha256: "4".repeat(64),
});
releaseDeferredProvider({
  provider: "wechat_virtual",
  providerOrderId: null,
  parameters: { mode: "short_series_goods", signData: deferredOrder.outTradeNo, paySig: "late", signature: "late" },
});
const raceResult = await inFlightCheckout;
assert.equal(raceResult.order.status, "refunded", "a late checkout result cannot overwrite a terminal provider event");
assert.equal(Object.hasOwn(raceResult, "payment"), false, "a terminal race must not return stale payment parameters");
assert.equal(
  db.prepare("SELECT provider_order_id FROM membership_orders WHERE id=?").get(deferredOrder.id).provider_order_id,
  "wx-provider-order-race",
  "a late null provider id cannot clear the verified provider order identity",
);

const identityRacePayload = {
  ...basePayload,
  idempotencyKey: "membership-order-identity-race-0004",
  wxCode: "fresh-code-before-identity-race",
};
const identityRaceOrder = await createMembershipCheckout({
  db, userId: "ielts:42", payload: identityRacePayload, env, providerRegistry, resolveWechatIdentity,
});
const identityRaceInternal = checkoutCalls.at(-1).order;
let releaseIdentityRace;
let markIdentityRaceStarted;
const identityRaceStarted = new Promise((resolve) => { markIdentityRaceStarted = resolve; });
const identityRaceRetry = createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: { ...identityRacePayload, wxCode: "fresh-code-during-identity-race" },
  env,
  providerRegistry: {
    wechat_virtual: {
      ...provider,
      createCheckout: async () => { throw new Error("terminal state after identity exchange must suppress provider checkout"); },
    },
  },
  resolveWechatIdentity: async () => {
    markIdentityRaceStarted();
    return new Promise((resolve) => { releaseIdentityRace = resolve; });
  },
});
await identityRaceStarted;
const identityRacePaidAt = new Date().toISOString();
applyVerifiedProviderResult(db, {
  verified: true, provider: "wechat_virtual", eventId: "5".repeat(64), providerOrderId: "wx-provider-order-identity-race",
  outTradeNo: identityRaceInternal.outTradeNo, payerAppId: "wx-app", payerOpenid: "openid-42", productId: "product-month",
  amountFen: 2880, currency: "CNY", paidAt: identityRacePaidAt, occurredAt: identityRacePaidAt,
  eventType: "paid", rawDigestSha256: "6".repeat(64),
});
applyVerifiedProviderResult(db, {
  verified: true, provider: "wechat_virtual", eventId: "7".repeat(64), providerOrderId: "wx-provider-order-identity-race",
  outTradeNo: identityRaceInternal.outTradeNo, payerAppId: "wx-app", payerOpenid: "openid-42", productId: "product-month",
  amountFen: 2880, currency: "CNY", occurredAt: new Date().toISOString(), eventType: "refunded",
  rawDigestSha256: "8".repeat(64),
});
releaseIdentityRace({
  userId: 42, appId: "wx-app", openid: "openid-42",
  sessionContext: { sessionKey: "transient-session-key", codeVerifiedAt: new Date().toISOString() },
});
const identityRaceResult = await identityRaceRetry;
assert.equal(identityRaceResult.order.id, identityRaceOrder.order.id);
assert.equal(identityRaceResult.order.status, "refunded");
assert.equal(Object.hasOwn(identityRaceResult, "payment"), false);

let rejectDeferredProvider;
let markRejectProviderStarted;
const rejectProviderStarted = new Promise((resolve) => { markRejectProviderStarted = resolve; });
const rejectedCheckout = createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: { ...basePayload, idempotencyKey: "membership-order-reject-race-0005", wxCode: "fresh-code-reject-race" },
  env,
  providerRegistry: {
    wechat_virtual: {
      ...provider,
      createCheckout: async ({ order }) => {
        markRejectProviderStarted(order);
        return new Promise((resolve, reject) => { rejectDeferredProvider = reject; });
      },
    },
  },
  resolveWechatIdentity,
});
const rejectedOrder = await rejectProviderStarted;
const rejectRacePaidAt = new Date().toISOString();
applyVerifiedProviderResult(db, {
  verified: true, provider: "wechat_virtual", eventId: "9".repeat(64), providerOrderId: "wx-provider-order-reject-race",
  outTradeNo: rejectedOrder.outTradeNo, payerAppId: "wx-app", payerOpenid: "openid-42", productId: "product-month",
  amountFen: 2880, currency: "CNY", paidAt: rejectRacePaidAt, occurredAt: rejectRacePaidAt,
  eventType: "paid", rawDigestSha256: "a".repeat(64),
});
applyVerifiedProviderResult(db, {
  verified: true, provider: "wechat_virtual", eventId: "b".repeat(64), providerOrderId: "wx-provider-order-reject-race",
  outTradeNo: rejectedOrder.outTradeNo, payerAppId: "wx-app", payerOpenid: "openid-42", productId: "product-month",
  amountFen: 2880, currency: "CNY", occurredAt: new Date().toISOString(), eventType: "refunded",
  rawDigestSha256: "c".repeat(64),
});
rejectDeferredProvider(Object.assign(new Error("late provider failure"), { code: "provider_timeout" }));
const rejectedRaceResult = await rejectedCheckout;
assert.equal(rejectedRaceResult.order.status, "refunded", "a late provider rejection must reconcile to the authoritative terminal order");
assert.equal(Object.hasOwn(rejectedRaceResult, "payment"), false);

let authorizationClock = 0;
const expireAt = 100;
const assertCheckoutAuthorized = () => {
  if (authorizationClock >= expireAt) throw Object.assign(new Error("canary expired"), { code: "membership_canary_expired", statusCode: 503 });
};
let releaseHeldIdentity;
let markHeldIdentityStarted;
const heldIdentityStarted = new Promise((resolve) => { markHeldIdentityStarted = resolve; });
let expiredIdentityProviderCalls = 0;
const identityExpiryCheckout = createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: { ...basePayload, idempotencyKey: "membership-canary-identity-expiry", wxCode: "held-code" },
  env: {},
  providerRegistry: { wechat_virtual: { ...provider, createCheckout: async () => { expiredIdentityProviderCalls += 1; return {}; } } },
  serverAuthorizedCheckout: true,
  assertCheckoutAuthorized,
  resolveWechatIdentity: async () => {
    markHeldIdentityStarted();
    return new Promise((resolve) => { releaseHeldIdentity = resolve; });
  },
});
await heldIdentityStarted;
authorizationClock = expireAt;
releaseHeldIdentity({
  userId: 42, appId: "wx-app", openid: "openid-42",
  sessionContext: { sessionKey: "transient-session-key", codeVerifiedAt: new Date().toISOString() },
});
await assert.rejects(identityExpiryCheckout, (error) => error.code === "membership_canary_expired");
assert.equal(expiredIdentityProviderCalls, 0, "expiry after code2session must block provider signing");
assert.equal(db.prepare("SELECT COUNT(*) AS count FROM membership_orders WHERE idempotency_key=?").get("membership-canary-identity-expiry").count, 0);

authorizationClock = 0;
let releaseHeldCanaryProvider;
let markHeldCanaryProviderStarted;
const heldCanaryProviderStarted = new Promise((resolve) => { markHeldCanaryProviderStarted = resolve; });
const providerExpiryCheckout = createMembershipCheckout({
  db,
  userId: "ielts:42",
  payload: { ...basePayload, idempotencyKey: "membership-canary-provider-expiry", wxCode: "fresh-code" },
  env: {},
  providerRegistry: {
    wechat_virtual: {
      ...provider,
      createCheckout: async ({ order }) => {
        markHeldCanaryProviderStarted(order);
        return new Promise((resolve) => { releaseHeldCanaryProvider = resolve; });
      },
    },
  },
  serverAuthorizedCheckout: true,
  assertCheckoutAuthorized,
  resolveWechatIdentity,
});
const providerExpiryOrder = await heldCanaryProviderStarted;
authorizationClock = expireAt;
releaseHeldCanaryProvider({
  provider: "wechat_virtual", providerOrderId: null,
  parameters: { mode: "short_series_goods", signData: providerExpiryOrder.outTradeNo, paySig: "held", signature: "held" },
});
await assert.rejects(providerExpiryCheckout, (error) => error.code === "membership_canary_expired");
assert.equal(db.prepare("SELECT status FROM membership_orders WHERE id=?").get(providerExpiryOrder.id).status, "failed", "post-provider expiry keeps the order recoverable but returns no payment");

db.close();
console.log("Membership checkout recovery and provider confirmation checks passed.");
