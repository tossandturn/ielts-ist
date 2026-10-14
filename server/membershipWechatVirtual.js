"use strict";

const crypto = require("crypto");
const {
  isWechatCallbackConfigurationReady,
  verifyEncryptedWechatNotification,
} = require("./membershipWechatCallback.js");

const PROVIDER_ID = "wechat_virtual";
const QUERY_ORDER_URI = "/xpay/query_order";
const QUERY_ORDER_URL = `https://api.weixin.qq.com${QUERY_ORDER_URI}`;
const REQUEST_VIRTUAL_PAYMENT_URI = "requestVirtualPayment";
const MAX_RESPONSE_BYTES = 256 * 1024;
const SESSION_MAX_AGE_MS = 5 * 60 * 1000;
const FUTURE_SKEW_MS = 30 * 1000;
const PLAN = Object.freeze({
  id: "all-access-month",
  amountFen: 2880,
  currency: "CNY",
  durationDays: 30,
  autoRenew: false,
});
const STATUS_STATES = Object.freeze({
  0: "pending",
  1: "pending",
  2: "paid",
  3: "pending",
  4: "fulfilled",
  5: "refund_pending",
  6: "closed",
  7: "refund_failed",
  8: "refunded",
  9: "refund_settlement",
  10: "refund_settlement",
});

function providerError(code, message, statusCode = 503) {
  return Object.assign(new Error(message), { code, statusCode });
}

function text(value, maximum = 512) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum ? value : "";
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(secret, message) {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function currentDate(clock) {
  const value = clock();
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw providerError("membership_provider_unavailable", "Membership payment provider is unavailable.");
  return date;
}

function authorityBinding(order, config) {
  const material = [
    "stemist-membership-wechat-virtual-v1",
    config.offerId,
    "1",
    "0",
    order.id,
    String(order.userId),
    order.outTradeNo,
    order.payerAppId,
    order.payerOpenid,
    order.productId,
    String(order.amountFen),
    order.currency,
    String(order.durationDays),
    String(order.autoRenew),
  ].join("\n");
  return `stemist-m1:${hmac(config.appKey, `authority&${material}`)}`;
}

function validateOrder(order, config, { checkout = false } = {}) {
  const validUserId = Number.isSafeInteger(Number(order?.userId)) && Number(order.userId) > 0;
  const validTradeNo = typeof order?.outTradeNo === "string"
    && /^[A-Za-z0-9][A-Za-z0-9_|*@-]{7,31}$/.test(order.outTradeNo);
  const validTimes = Number.isFinite(Date.parse(order?.createdAt))
    && Number.isFinite(Date.parse(order?.expiresAt))
    && Number.isFinite(Date.parse(order?.updatedAt));
  if (!order || typeof order !== "object" || Array.isArray(order)
      || !text(order.id, 128) || !validUserId || order.planId !== PLAN.id
      || order.productId !== config.productId || order.provider !== PROVIDER_ID
      || !validTradeNo || order.amountFen !== PLAN.amountFen || order.currency !== PLAN.currency
      || order.durationDays !== PLAN.durationDays || order.autoRenew !== PLAN.autoRenew
      || order.payerAppId !== config.appId || !text(order.payerOpenid, 256)
      || !validTimes || (checkout && !["created", "pending", "failed"].includes(order.status))) {
    throw providerError("membership_payment_mismatch", "Membership payment does not match the configured product.", 409);
  }
  return order;
}

function validateCheckoutIdentity(order, identity, sessionContext, clock) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)
      || identity.appId !== order.payerAppId || identity.openid !== order.payerOpenid
      || Number(identity.userId) !== Number(order.userId)) {
    throw providerError("membership_payment_mismatch", "Membership payer identity does not match the order.", 409);
  }
  const sessionKey = text(sessionContext?.sessionKey, 1024);
  const verifiedAt = Date.parse(sessionContext?.codeVerifiedAt);
  const age = currentDate(clock).getTime() - verifiedAt;
  if (!sessionKey || !Number.isFinite(verifiedAt) || age < -FUTURE_SKEW_MS || age > SESSION_MAX_AGE_MS) {
    throw providerError("membership_payment_mismatch", "A fresh verified WeChat session is required.", 409);
  }
  return sessionKey;
}

function parseProviderResponse(response) {
  if (!response || response.statusCode !== 200
      || !(typeof response.body === "string" || Buffer.isBuffer(response.body))) {
    throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
  }
  const raw = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body, "utf8");
  if (raw.length === 0 || raw.length > MAX_RESPONSE_BYTES) {
    throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
  }
  let payload;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.errcode !== 0
      || !payload.order || typeof payload.order !== "object" || Array.isArray(payload.order)) {
    throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
  }
  return { payload, rawDigestSha256: digest(raw) };
}

function occurredAt(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw providerError("membership_payment_mismatch", "Membership provider timestamp is invalid.", 409);
  }
  const date = new Date(seconds * 1000);
  if (!Number.isFinite(date.getTime())) {
    throw providerError("membership_payment_mismatch", "Membership provider timestamp is invalid.", 409);
  }
  return date.toISOString();
}

function normalizeEvent({ order, providerOrder, rawDigestSha256, eventType, observedAt }) {
  const providerOrderId = text(providerOrder.wx_order_id, 256);
  if (!providerOrderId) {
    throw providerError("membership_payment_mismatch", "Membership provider order identity is missing.", 409);
  }
  const time = eventType === "paid" ? occurredAt(providerOrder.paid_time) : observedAt;
  if (!Number.isFinite(Date.parse(time))) {
    throw providerError("membership_payment_mismatch", "Membership provider timestamp is invalid.", 409);
  }
  const base = {
    provider: PROVIDER_ID,
    eventId: digest(`${PROVIDER_ID}:${eventType}:${providerOrderId}`),
    providerOrderId,
    outTradeNo: order.outTradeNo,
    userId: Number(order.userId),
    payerAppId: order.payerAppId,
    payerOpenid: order.payerOpenid,
    productId: order.productId,
    amountFen: order.amountFen,
    currency: order.currency,
    occurredAt: time,
    eventType,
    rawDigestSha256,
    verified: true,
  };
  if (eventType === "paid") return { ...base, paidAt: time };
  return { ...base, refundObservedAt: time };
}

function createWechatVirtualProvider({ config = {}, httpClient, clock = () => new Date() } = {}) {
  const readiness = () => {
    if (config.enabled !== true) return { ready: false, reason: "disabled" };
    const configured = text(config.appId, 128) && text(config.offerId, 128)
      && text(config.appKey, 1024) && text(config.productId, 128)
      && typeof config.getAccessToken === "function" && typeof httpClient === "function"
      && typeof clock === "function" && (config.env === undefined || config.env === 0)
      && isWechatCallbackConfigurationReady(config);
    return configured ? { ready: true, reason: "ready" } : { ready: false, reason: "setup_required" };
  };

  const assertReady = () => {
    if (!readiness().ready) {
      throw providerError("membership_provider_unavailable", "Membership payment provider is unavailable.");
    }
  };

  const createCheckout = async ({ order, identity, sessionContext } = {}) => {
    assertReady();
    validateOrder(order, config, { checkout: true });
    const sessionKey = validateCheckoutIdentity(order, identity, sessionContext, clock);
    const signData = JSON.stringify({
      offerId: config.offerId,
      buyQuantity: 1,
      env: 0,
      currencyType: PLAN.currency,
      productId: order.productId,
      goodsPrice: order.amountFen,
      outTradeNo: order.outTradeNo,
      attach: authorityBinding(order, config),
    });
    return {
      provider: PROVIDER_ID,
      providerOrderId: null,
      parameters: {
        mode: "short_series_goods",
        signData,
        paySig: hmac(config.appKey, `${REQUEST_VIRTUAL_PAYMENT_URI}&${signData}`),
        signature: hmac(sessionKey, signData),
      },
    };
  };

  const queryOrder = async ({ order } = {}) => {
    assertReady();
    validateOrder(order, config);
    let accessToken;
    try {
      accessToken = await config.getAccessToken();
    } catch {
      throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
    }
    if (!text(accessToken, 4096)) {
      throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
    }
    const body = JSON.stringify({ openid: order.payerOpenid, env: 0, order_id: order.outTradeNo });
    const paySig = hmac(config.appKey, `${QUERY_ORDER_URI}&${body}`);
    const url = new URL(QUERY_ORDER_URL);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("pay_sig", paySig);
    let response;
    try {
      response = await httpClient({
        url: url.toString(),
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        timeoutMs: 8000,
      });
    } catch {
      throw providerError("membership_provider_query_failed", "Membership provider query failed.", 502);
    }
    const { payload, rawDigestSha256 } = parseProviderResponse(response);
    const providerOrder = payload.order;
    const status = providerOrder.status;
    const state = STATUS_STATES[status];
    if (!Number.isSafeInteger(status) || !state) {
      throw providerError("membership_provider_status_unrecognized", "Membership provider order status is not recognized.", 502);
    }
    if (providerOrder.order_id !== order.outTradeNo || providerOrder.env_type !== 1
        || providerOrder.order_fee !== order.amountFen
        || providerOrder.biz_meta !== authorityBinding(order, config)) {
      throw providerError("membership_payment_mismatch", "Membership provider order does not match the local order.", 409);
    }
    let normalizedEvent = null;
    if (status === 2 || status === 4) {
      if (providerOrder.paid_fee !== order.amountFen || providerOrder.refund_fee !== 0
          || ![0, 7].includes(providerOrder.order_type)) {
        throw providerError("membership_payment_mismatch", "Membership provider payment amount does not match.", 409);
      }
      normalizedEvent = normalizeEvent({ order, providerOrder, rawDigestSha256, eventType: "paid" });
    } else if (status === 8) {
      if (providerOrder.refund_fee !== order.amountFen || providerOrder.left_fee !== 0) {
        throw providerError("membership_payment_mismatch", "Membership provider refund amount does not match.", 409);
      }
      normalizedEvent = normalizeEvent({
        order,
        providerOrder,
        rawDigestSha256,
        eventType: "refunded",
        // query_order does not expose an unambiguous refund-completion timestamp.
        // Record the controlled observation time instead of reusing paid_time.
        observedAt: currentDate(clock).toISOString(),
      });
    }
    return { provider: PROVIDER_ID, providerStatus: status, state, normalizedEvent, rawDigestSha256 };
  };

  const verifyAndNormalizeDeliveryCallback = async ({ rawBody, query } = {}) => {
    assertReady();
    const trigger = verifyEncryptedWechatNotification({ rawBody, query, config });
    if (trigger.eventType === "paid_trigger"
        && (trigger.env !== 0 || trigger.productId !== config.productId || trigger.quantity !== 1
          || trigger.originalAmountFen !== PLAN.amountFen || trigger.amountFen !== PLAN.amountFen)) {
      throw providerError("membership_payment_mismatch", "Membership payment does not match the configured product.", 409);
    }
    if (trigger.eventType === "refunded_trigger" && trigger.amountFen !== PLAN.amountFen) {
      throw providerError("membership_payment_mismatch", "Membership refund does not match the configured product.", 409);
    }
    return trigger;
  };

  const refund = async () => {
    assertReady();
    throw providerError(
      "membership_provider_refund_unavailable",
      "WeChat virtual-payment refunds are not enabled.",
      503,
    );
  };

  return Object.freeze({
    id: PROVIDER_ID,
    productId: text(config.productId, 128) || "",
    readiness,
    createCheckout,
    queryOrder,
    verifyAndNormalizeDeliveryCallback,
    refund,
  });
}

module.exports = {
  PLAN,
  PROVIDER_ID,
  createWechatVirtualProvider,
};
