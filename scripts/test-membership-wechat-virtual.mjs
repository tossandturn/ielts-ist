import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createWechatVirtualProvider } = require("../server/membershipWechatVirtual.js");

const NOW = new Date("2026-10-14T08:00:00.000Z");
const APP_KEY = "fake-app-key-for-local-tests";
const SESSION_KEY = "fake-session-key-for-local-tests==";
const ACCESS_TOKEN = "fake-access-token-for-local-tests";

const baseConfig = Object.freeze({
  enabled: true,
  appId: "wx-test-app-id",
  offerId: "test-offer-id",
  appKey: APP_KEY,
  productId: "all-access-month-test-product",
  getAccessToken: async () => ACCESS_TOKEN,
});

const baseOrder = Object.freeze({
  id: "11111111-2222-4333-8444-555555555555",
  userId: 42,
  planId: "all-access-month",
  productId: baseConfig.productId,
  outTradeNo: "0123456789abcdef0123456789abcdef",
  provider: "wechat_virtual",
  amountFen: 2880,
  currency: "CNY",
  durationDays: 30,
  autoRenew: false,
  status: "created",
  payerAppId: baseConfig.appId,
  payerOpenid: "openid-test-42",
  providerOrderId: null,
  createdAt: NOW.toISOString(),
  expiresAt: new Date(NOW.getTime() + 15 * 60_000).toISOString(),
  paidAt: null,
  fulfilledAt: null,
  refundedAt: null,
  updatedAt: NOW.toISOString(),
});

const identity = Object.freeze({ appId: baseConfig.appId, openid: baseOrder.payerOpenid, userId: 42 });
const sessionContext = Object.freeze({ sessionKey: SESSION_KEY, codeVerifiedAt: NOW.toISOString() });

function hmac(key, message) {
  return crypto.createHmac("sha256", key).update(message, "utf8").digest("hex");
}

function makeProvider({ enabled = true, response = null, requests = [] } = {}) {
  return createWechatVirtualProvider({
    config: { ...baseConfig, enabled },
    clock: () => new Date(NOW),
    httpClient: async (request) => {
      requests.push(request);
      if (typeof response === "function") return response(request);
      return response || { statusCode: 500, body: "{}" };
    },
  });
}

async function expectCode(action, code) {
  await assert.rejects(action, (error) => error?.code === code);
}

{
  let networkCalls = 0;
  const provider = createWechatVirtualProvider({
    config: { ...baseConfig, enabled: false },
    clock: () => new Date(NOW),
    httpClient: async () => { networkCalls += 1; throw new Error("must not run"); },
  });
  assert.deepEqual(provider.readiness(), { ready: false, reason: "disabled" });
  await expectCode(() => provider.createCheckout({ order: baseOrder, identity, sessionContext }), "membership_provider_unavailable");
  await expectCode(() => provider.queryOrder({ order: baseOrder }), "membership_provider_unavailable");
  await expectCode(() => provider.verifyAndNormalizeDeliveryCallback({ rawBody: "<xml />", headers: {} }), "membership_provider_unavailable");
  await expectCode(() => provider.refund({ order: baseOrder, reason: "test" }), "membership_provider_unavailable");
  assert.equal(networkCalls, 0);
}

for (const config of [
  { ...baseConfig, appKey: "" },
  { ...baseConfig, getAccessToken: null },
  { ...baseConfig, env: 1 },
]) {
  const unavailable = createWechatVirtualProvider({ config, clock: () => new Date(NOW), httpClient: async () => ({}) });
  assert.deepEqual(unavailable.readiness(), { ready: false, reason: "setup_required" });
  await expectCode(() => unavailable.createCheckout({ order: baseOrder, identity, sessionContext }), "membership_provider_unavailable");
}

const provider = makeProvider();
assert.deepEqual(provider.readiness(), { ready: true, reason: "ready" });
assert.equal(provider.id, "wechat_virtual");
assert.equal(provider.productId, baseConfig.productId);

const checkout = await provider.createCheckout({ order: baseOrder, identity, sessionContext });
const expectedSignData = JSON.stringify({
  offerId: baseConfig.offerId,
  buyQuantity: 1,
  env: 0,
  currencyType: "CNY",
  productId: baseConfig.productId,
  goodsPrice: 2880,
  outTradeNo: baseOrder.outTradeNo,
  attach: JSON.parse(checkout.parameters.signData).attach,
});
assert.deepEqual(checkout, {
  provider: "wechat_virtual",
  providerOrderId: null,
  parameters: {
    mode: "short_series_goods",
    signData: expectedSignData,
    paySig: hmac(APP_KEY, `requestVirtualPayment&${expectedSignData}`),
    signature: hmac(SESSION_KEY, expectedSignData),
  },
});
const serializedCheckout = JSON.stringify(checkout);
assert.equal(serializedCheckout.includes(APP_KEY), false);
assert.equal(serializedCheckout.includes(SESSION_KEY), false);
const retryCheckout = await provider.createCheckout({
  order: { ...baseOrder, status: "pending" }, identity, sessionContext,
});
assert.deepEqual(retryCheckout.parameters, checkout.parameters);

for (const changed of [
  { order: { ...baseOrder, amountFen: 2879 }, identity, sessionContext },
  { order: { ...baseOrder, productId: "other-product" }, identity, sessionContext },
  { order: baseOrder, identity: { ...identity, appId: "other-app" }, sessionContext },
  { order: baseOrder, identity: { ...identity, openid: "other-openid" }, sessionContext },
  { order: baseOrder, identity, sessionContext: { ...sessionContext, codeVerifiedAt: "2026-10-14T07:00:00.000Z" } },
]) {
  await expectCode(() => provider.createCheckout(changed), "membership_payment_mismatch");
}

const attach = JSON.parse(checkout.parameters.signData).attach;
const paidPayload = {
  errcode: 0,
  errmsg: "",
  order: {
    order_id: baseOrder.outTradeNo,
    status: 2,
    order_fee: 2880,
    paid_fee: 2880,
    refund_fee: 0,
    paid_time: 1791964800,
    provide_time: 0,
    biz_meta: attach,
    env_type: 1,
    left_fee: 2880,
    wx_order_id: "wx-order-verified-001",
    order_type: 0,
  },
};
let responseBody = JSON.stringify(paidPayload);
const requests = [];
const queryProvider = makeProvider({
  requests,
  response: () => ({ statusCode: 200, body: responseBody }),
});
const paid = await queryProvider.queryOrder({ order: baseOrder });
assert.equal(requests.length, 1);
assert.deepEqual(requests[0].headers, { "content-type": "application/json" });
assert.equal(requests[0].method, "POST");
assert.equal(requests[0].timeoutMs, 8000);
const expectedQueryBody = JSON.stringify({ openid: baseOrder.payerOpenid, env: 0, order_id: baseOrder.outTradeNo });
assert.equal(requests[0].body, expectedQueryBody);
const queryUrl = new URL(requests[0].url);
assert.equal(`${queryUrl.origin}${queryUrl.pathname}`, "https://api.weixin.qq.com/xpay/query_order");
assert.equal(queryUrl.searchParams.get("access_token"), ACCESS_TOKEN);
assert.equal(queryUrl.searchParams.get("pay_sig"), hmac(APP_KEY, `/xpay/query_order&${expectedQueryBody}`));
assert.equal(paid.provider, "wechat_virtual");
assert.equal(paid.providerStatus, 2);
assert.equal(paid.state, "paid");
assert.equal(paid.rawDigestSha256, crypto.createHash("sha256").update(responseBody).digest("hex"));
assert.deepEqual(paid.normalizedEvent, {
  provider: "wechat_virtual",
  eventId: crypto.createHash("sha256").update("wechat_virtual:paid:wx-order-verified-001").digest("hex"),
  providerOrderId: "wx-order-verified-001",
  outTradeNo: baseOrder.outTradeNo,
  userId: 42,
  payerAppId: baseConfig.appId,
  payerOpenid: baseOrder.payerOpenid,
  productId: baseConfig.productId,
  amountFen: 2880,
  currency: "CNY",
  paidAt: "2026-10-14T08:00:00.000Z",
  occurredAt: "2026-10-14T08:00:00.000Z",
  eventType: "paid",
  rawDigestSha256: paid.rawDigestSha256,
  verified: true,
});
const replay = await queryProvider.queryOrder({ order: baseOrder });
assert.equal(replay.normalizedEvent.eventId, paid.normalizedEvent.eventId);

for (const [status, expectedState, hasEvent] of [
  [0, "pending", false],
  [1, "pending", false],
  [3, "pending", false],
  [4, "fulfilled", true],
  [5, "refund_pending", false],
  [6, "closed", false],
  [7, "refund_failed", false],
  [9, "refund_settlement", false],
  [10, "refund_settlement", false],
]) {
  const changed = structuredClone(paidPayload);
  changed.order.status = status;
  responseBody = JSON.stringify(changed);
  const result = await queryProvider.queryOrder({ order: baseOrder });
  assert.equal(result.state, expectedState, `status ${status}`);
  assert.equal(Boolean(result.normalizedEvent), hasEvent, `status ${status} event`);
}

{
  const refundedPayload = structuredClone(paidPayload);
  Object.assign(refundedPayload.order, { status: 8, refund_fee: 2880, left_fee: 0, paid_time: 1791964860 });
  responseBody = JSON.stringify(refundedPayload);
  const refunded = await queryProvider.queryOrder({ order: baseOrder });
  assert.equal(refunded.state, "refunded");
  assert.equal(refunded.normalizedEvent.eventType, "refunded");
  assert.equal(refunded.normalizedEvent.refundedAt, "2026-10-14T08:01:00.000Z");
  assert.equal(refunded.normalizedEvent.eventId, crypto.createHash("sha256").update("wechat_virtual:refunded:wx-order-verified-001").digest("hex"));
}

for (const mutate of [
  (value) => { value.order.order_id = "other-order"; },
  (value) => { value.order.order_fee = 2879; },
  (value) => { value.order.paid_fee = 2879; },
  (value) => { value.order.biz_meta = "wrong-attach"; },
  (value) => { value.order.wx_order_id = ""; },
  (value) => { value.order.env_type = 2; },
]) {
  const changed = structuredClone(paidPayload);
  mutate(changed);
  responseBody = JSON.stringify(changed);
  await expectCode(() => queryProvider.queryOrder({ order: baseOrder }), "membership_payment_mismatch");
}

responseBody = JSON.stringify({ errcode: 268490003, errmsg: "signature error" });
await expectCode(() => queryProvider.queryOrder({ order: baseOrder }), "membership_provider_query_failed");
responseBody = "not-json";
await expectCode(() => queryProvider.queryOrder({ order: baseOrder }), "membership_provider_query_failed");
responseBody = JSON.stringify({ ...paidPayload, order: { ...paidPayload.order, status: 11 } });
await expectCode(() => queryProvider.queryOrder({ order: baseOrder }), "membership_provider_status_unrecognized");

const fakeCallback = {
  rawBody: "<xml><Event>xpay_goods_deliver_notify</Event><OutTradeNo>0123456789abcdef0123456789abcdef</OutTradeNo></xml>",
  headers: { "x-wechat-signature": "forged" },
};
await expectCode(() => provider.verifyAndNormalizeDeliveryCallback(fakeCallback), "membership_provider_callback_unverified");
await expectCode(() => provider.verifyAndNormalizeDeliveryCallback(fakeCallback), "membership_provider_callback_unverified");
await expectCode(() => provider.refund({ order: baseOrder, reason: "requested" }), "membership_provider_refund_unavailable");

console.log("membership WeChat virtual adapter tests: PASS");
