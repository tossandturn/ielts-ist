"use strict";

const { createWechatVirtualProvider } = require("./membershipWechatVirtual");
const {
  MAX_CALLBACK_BODY_BYTES,
  encryptWechatBusinessResponse,
  isWechatCallbackConfigurationReady,
  verifyEncryptedWechatNotification,
  verifyWechatCallbackUrl,
} = require("./membershipWechatCallback");

const PROVIDER_ID = "wechat_virtual";
const OFFICIAL_ORIGIN = "https://api.weixin.qq.com";
const STABLE_TOKEN_PATH = "/cgi-bin/stable_token";
const QUERY_ORDER_PATH = "/xpay/query_order";
const WECHAT_VIRTUAL_CALLBACK_PATH = "/api/membership/wechat/notify";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 15_000;

function runtimeError(code = "membership_provider_unavailable", message = "Membership payment provider is unavailable.", statusCode = 503) {
  return Object.assign(new Error(message), { code, statusCode });
}

function flag(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function secretText(value, maximum = 1024) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum && !/[\u0000-\u001f\u007f]/.test(normalized) ? normalized : "";
}

function publicText(value, pattern, maximum = 128) {
  const normalized = secretText(value, maximum);
  return normalized && pattern.test(normalized) ? normalized : "";
}

function readMembershipWechatRuntimeConfig(env = {}) {
  const membershipAppId = publicText(env.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID, /^wx[A-Za-z0-9]{6,62}$/);
  const identityAppId = publicText(
    env.WECHAT_MINIPROGRAM_APP_ID || env.WECHAT_MINIPROGRAM_APPID || env.WECHAT_APP_ID || env.WECHAT_MINI_APPID,
    /^wx[A-Za-z0-9]{6,62}$/,
  );
  const appId = membershipAppId || identityAppId;
  const appIdsMatch = !membershipAppId || !identityAppId || membershipAppId === identityAppId;
  const offerId = publicText(env.MEMBERSHIP_WECHAT_VIRTUAL_OFFER_ID, /^\d{6,32}$/);
  const productId = publicText(env.MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID, /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
  const appKey = secretText(env.MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY);
  const appSecret = secretText(
    env.MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET
      || env.WECHAT_MINIPROGRAM_APP_SECRET
      || env.WECHAT_MINIPROGRAM_SECRET
      || env.WECHAT_APP_SECRET
      || env.WECHAT_MINI_SECRET,
  );
  const callbackToken = publicText(env.WECHAT_VIRTUAL_CALLBACK_TOKEN, /^[A-Za-z0-9]{3,32}$/, 32);
  const callbackEncodingAesKey = publicText(env.WECHAT_VIRTUAL_CALLBACK_AES_KEY, /^[A-Za-z0-9]{43}$/, 43);
  const callbackFormat = ["json", "xml"].includes(String(env.WECHAT_VIRTUAL_CALLBACK_FORMAT || "").trim().toLowerCase())
    ? String(env.WECHAT_VIRTUAL_CALLBACK_FORMAT).trim().toLowerCase()
    : "";
  const androidReady = flag(env.MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY);
  const iosReady = flag(env.MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED)
    && flag(env.MEMBERSHIP_WECHAT_VIRTUAL_IOS_IAP_READY);
  const platforms = Object.freeze([
    ...(androidReady ? ["android"] : []),
    ...(iosReady ? ["ios"] : []),
  ]);
  const callbackReady = flag(env.WECHAT_VIRTUAL_CALLBACK_READY)
    && String(env.WECHAT_VIRTUAL_CALLBACK_MODE || "").trim().toLowerCase() === "safe"
    && isWechatCallbackConfigurationReady({ appId, token: callbackToken, encodingAesKey: callbackEncodingAesKey, callbackFormat });
  const providerEnabled = flag(env.MEMBERSHIP_WECHAT_VIRTUAL_ENABLED);
  const productionReady = flag(env.MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY)
    && String(env.MEMBERSHIP_WECHAT_VIRTUAL_MODE || "").trim().toLowerCase() === "production";
  const configured = providerEnabled
    && productionReady
    && flag(env.MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED)
    && appIdsMatch
    && Boolean(appId && offerId && productId && appKey && appSecret)
    && callbackReady
    && platforms.length > 0;
  const paymentAcceptanceReady = flag(env.MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED);
  const registryEnabled = configured
    && paymentAcceptanceReady
    && flag(env.MEMBERSHIP_CHECKOUT_ENABLED)
    && flag(env.MEMBERSHIP_COMMERCE_READY);
  const publicReadiness = Object.freeze({
    provider: PROVIDER_ID,
    configured,
    registryEnabled,
    checkoutEnabled: registryEnabled,
    callbackReady,
    paymentAcceptanceReady,
    platforms,
    reason: registryEnabled ? "ready" : "setup_required",
  });
  return Object.freeze({
    appId,
    offerId,
    productId,
    appKey,
    appSecret,
    callbackToken,
    callbackEncodingAesKey,
    callbackFormat,
    configured,
    registryEnabled,
    callbackReady,
    paymentAcceptanceReady,
    platforms,
    publicReadiness,
  });
}

function allowedWechatUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { throw runtimeError(); }
  if (url.origin !== OFFICIAL_ORIGIN || url.username || url.password || url.port) throw runtimeError();
  if (url.pathname === STABLE_TOKEN_PATH) {
    if (url.search || url.hash) throw runtimeError();
    return url;
  }
  if ([QUERY_ORDER_PATH, "/xpay/notify_provide_goods"].includes(url.pathname)) {
    const keys = [...url.searchParams.keys()].sort();
    if (url.hash || keys.length !== 2 || keys[0] !== "access_token" || keys[1] !== "pay_sig"
        || !secretText(url.searchParams.get("access_token"), 4096)
        || !secretText(url.searchParams.get("pay_sig"), 512)) throw runtimeError();
    return url;
  }
  throw runtimeError();
}

async function readBoundedBody(response, maximum = MAX_RESPONSE_BYTES) {
  const declared = Number(response?.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maximum) throw runtimeError();
  if (!response?.body || typeof response.body.getReader !== "function") {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maximum) throw runtimeError();
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maximum) throw runtimeError();
      chunks.push(chunk);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  return Buffer.concat(chunks, total);
}

function createBoundedWechatHttpClient({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw runtimeError();
  return async function boundedWechatRequest({ url, method, headers = {}, body = "", timeoutMs = 8_000 } = {}) {
    const target = allowedWechatUrl(url);
    const normalizedMethod = String(method || "").toUpperCase();
    const normalizedContentType = String(headers["content-type"] || headers["Content-Type"] || "").toLowerCase();
    const requestBody = typeof body === "string" || Buffer.isBuffer(body) ? body : "";
    const requestBytes = Buffer.byteLength(requestBody);
    if (normalizedMethod !== "POST" || normalizedContentType !== "application/json"
        || requestBytes === 0 || requestBytes > MAX_REQUEST_BYTES) throw runtimeError();
    const boundedTimeout = Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Number(timeoutMs) || 8_000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), boundedTimeout);
    try {
      const response = await fetchImpl(target.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: requestBody,
        signal: controller.signal,
        redirect: "error",
      });
      const responseBody = await readBoundedBody(response);
      return { statusCode: Number(response.status), body: responseBody.toString("utf8") };
    } catch (error) {
      if (error?.code === "membership_provider_unavailable") throw error;
      throw runtimeError();
    } finally {
      clearTimeout(timer);
    }
  };
}

function createWechatAccessTokenAuthority({ appId, appSecret, requestJson, clock = () => Date.now() } = {}) {
  if (!appId || !appSecret || typeof requestJson !== "function" || typeof clock !== "function") throw runtimeError();
  let cachedToken = "";
  let refreshAt = 0;
  let inFlight = null;

  async function fetchToken() {
    const response = await requestJson({
      url: `${OFFICIAL_ORIGIN}${STABLE_TOKEN_PATH}`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credential", appid: appId, secret: appSecret, force_refresh: false }),
      timeoutMs: 8_000,
    });
    let payload;
    try { payload = JSON.parse(String(response?.body || "")); } catch { throw runtimeError(); }
    const token = secretText(payload?.access_token, 4096);
    const expiresIn = Number(payload?.expires_in);
    if (response?.statusCode !== 200 || Number(payload?.errcode || 0) !== 0 || !token
        || !Number.isSafeInteger(expiresIn) || expiresIn < 30 || expiresIn > 7_200) throw runtimeError();
    const observedAt = Number(clock());
    if (!Number.isFinite(observedAt)) throw runtimeError();
    const refreshMarginSeconds = Math.min(300, Math.max(15, Math.floor(expiresIn / 2)));
    cachedToken = token;
    refreshAt = observedAt + (expiresIn - refreshMarginSeconds) * 1000;
    return cachedToken;
  }

  async function getAccessToken() {
    const now = Number(clock());
    if (!Number.isFinite(now)) throw runtimeError();
    if (cachedToken && Number.isFinite(now) && now < refreshAt) return cachedToken;
    if (!inFlight) {
      inFlight = fetchToken().finally(() => { inFlight = null; });
    }
    return inFlight;
  }

  function invalidate() {
    cachedToken = "";
    refreshAt = 0;
  }

  function inspect() {
    const now = Number(clock());
    return Object.freeze({
      cached: Boolean(cachedToken),
      refreshInMs: cachedToken && Number.isFinite(now) ? Math.max(0, refreshAt - now) : 0,
      requestInFlight: Boolean(inFlight),
    });
  }

  return Object.freeze({ getAccessToken, inspect, invalidate });
}

function wechatCallbackAck(format, success) {
  const ok = success === true;
  if (format === "xml") {
    return Object.freeze({
      contentType: "application/xml; charset=utf-8",
      body: `<xml><ErrCode>${ok ? 0 : -1}</ErrCode><ErrMsg><![CDATA[${ok ? "success" : "retry"}]]></ErrMsg></xml>`,
    });
  }
  return Object.freeze({
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({ ErrCode: ok ? 0 : -1, ErrMsg: ok ? "success" : "retry" }),
  });
}

function providerOrderFromRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) throw runtimeError("membership_provider_callback_retry");
  return Object.freeze({
    id: row.id,
    platform: row.platform || null,
    userId: Number(row.user_id),
    planId: row.plan_id,
    productId: row.product_id,
    provider: row.provider,
    idempotencyKey: row.idempotency_key,
    outTradeNo: row.out_trade_no,
    amountFen: Number(row.amount_fen),
    currency: row.currency,
    durationDays: Number(row.duration_days),
    autoRenew: Number(row.auto_renew) === 1,
    status: row.status,
    payerAppId: row.payer_app_id,
    payerOpenid: row.payer_openid,
    providerOrderId: row.provider_order_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  });
}

function triggerMatchesOrder(trigger, order) {
  if (!trigger || trigger.provider !== PROVIDER_ID || trigger.authenticated !== true || trigger.queryRequired !== true
      || trigger.outTradeNo !== order.outTradeNo || trigger.payerAppId !== order.payerAppId
      || trigger.payerOpenid !== order.payerOpenid || Number(trigger.amountFen) !== order.amountFen
      || (trigger.providerOrderId && order.providerOrderId && trigger.providerOrderId !== order.providerOrderId)) return false;
  if (trigger.eventType === "paid_trigger") {
    return trigger.productId === order.productId && trigger.quantity === 1 && trigger.env === 0
      && Number(trigger.originalAmountFen) === order.amountFen;
  }
  return ["refunded_trigger", "refund_failed_trigger"].includes(trigger.eventType);
}

function callbackRetryError() {
  return runtimeError("membership_provider_callback_retry", "Membership provider callback must be retried.", 503);
}

function createMembershipWechatRuntime({
  env = {},
  fetchImpl = globalThis.fetch,
  clock = () => Date.now(),
  adapterFactory = createWechatVirtualProvider,
  callbackVerifier = { verifyEncryptedWechatNotification, verifyWechatCallbackUrl },
} = {}) {
  const config = readMembershipWechatRuntimeConfig(env);
  const unavailableCallback = () => { throw runtimeError("membership_provider_callback_unavailable"); };
  const verifyCallbackUrlQuery = config.callbackReady && typeof callbackVerifier?.verifyWechatCallbackUrl === "function"
    ? (query) => callbackVerifier.verifyWechatCallbackUrl({ query, config: { token: config.callbackToken } })
    : unavailableCallback;
  if (!config.configured) {
    return Object.freeze({
      providerRegistry: Object.freeze({}),
      recoveryProviderRegistry: Object.freeze({}),
      readiness: () => config.publicReadiness,
      callbackFormat: config.callbackFormat || "json",
      verifyCallbackUrl: verifyCallbackUrlQuery,
      processNotification: unavailableCallback,
    });
  }
  const httpClient = createBoundedWechatHttpClient({ fetchImpl });
  const accessTokenAuthority = createWechatAccessTokenAuthority({
    appId: config.appId,
    appSecret: config.appSecret,
    requestJson: httpClient,
    clock,
  });
  const provider = adapterFactory({
    config: {
      enabled: true,
      appId: config.appId,
      offerId: config.offerId,
      appKey: config.appKey,
      productId: config.productId,
      env: 0,
      token: config.callbackToken,
      encodingAesKey: config.callbackEncodingAesKey,
      callbackFormat: config.callbackFormat,
      getAccessToken: accessTokenAuthority.getAccessToken,
    },
    httpClient,
    clock: () => new Date(Number(clock())),
  });
  if (!provider || typeof provider.readiness !== "function" || provider.readiness().ready !== true) {
    return Object.freeze({
      providerRegistry: Object.freeze({}),
      recoveryProviderRegistry: Object.freeze({}),
      readiness: () => config.publicReadiness,
      callbackFormat: config.callbackFormat,
      verifyCallbackUrl: verifyCallbackUrlQuery,
      processNotification: unavailableCallback,
    });
  }
  const registeredProvider = Object.freeze({
    id: provider.id,
    productId: provider.productId,
    platforms: config.platforms,
    readiness: provider.readiness,
    createCheckout: provider.createCheckout,
    queryOrder: provider.queryOrder,
    notifyDelivered: provider.notifyDelivered,
    verifyAndNormalizeDeliveryCallback: provider.verifyAndNormalizeDeliveryCallback,
    refund: provider.refund,
  });
  async function processNotification({ rawBody, query, lookupOrder, lookupIosOrder, applyVerifiedEvent } = {}) {
    if (typeof lookupOrder !== "function" || typeof applyVerifiedEvent !== "function") throw callbackRetryError();
    let trigger;
    try {
      trigger = await registeredProvider.verifyAndNormalizeDeliveryCallback({ rawBody, query });
    } catch (error) {
      if (error?.code === "membership_provider_callback_unverified") throw error;
      throw callbackRetryError();
    }
    if (trigger.eventType === "ios_refund_inquiry") {
      // Apple requires a response within 3 seconds. Never call the payment API
      // or infer actual consumption from a membership grant. Missing/late local
      // evidence is reported honestly; this advisory response grants/revokes nothing.
      let timer;
      let row;
      try {
        row = await Promise.race([
          Promise.resolve().then(() => typeof lookupIosOrder === "function" ? lookupIosOrder(trigger.paymentId) : null),
          new Promise(resolve => { timer = setTimeout(() => resolve(null), 300); }),
        ]);
      } catch { row = null; } finally { clearTimeout(timer); }
      const matches = row && row.platform === "ios" && row.provider === PROVIDER_ID
        && row.payer_app_id === trigger.payerAppId && row.payer_openid === trigger.payerOpenid
        && row.product_id === trigger.productId && trigger.productId === config.productId && trigger.quantity === 1
        && [row.out_trade_no, row.provider_order_id].includes(trigger.paymentId);
      const localStatus = matches && ["created", "pending", "paid", "fulfilled", "refunded", "closed", "failed"].includes(row.status)
        ? row.status : "not_verified";
      const evidence = `Policy: no consumption-based objection. Local fulfillment=${localStatus}; consumption not measured. Apple makes the final refund decision.`;
      const responseBody = config.callbackFormat === "json"
        ? JSON.stringify({ ErrCode: 0, ErrMsg: "success", IosRefundQueryResponse: { result_code: 0, result_info: "No objection to refund", evidence } })
        : `<xml><ErrCode>0</ErrCode><ErrMsg>success</ErrMsg><IosRefundQueryResponse><result_code>0</result_code><result_info>No objection to refund</result_info><evidence>${evidence}</evidence></IosRefundQueryResponse></xml>`;
      return Object.freeze({
        eventType: trigger.eventType,
        response: encryptWechatBusinessResponse({ body: responseBody, clock, config: {
          appId: config.appId, token: config.callbackToken, encodingAesKey: config.callbackEncodingAesKey, callbackFormat: config.callbackFormat,
        } }),
      });
    }
    const row = await lookupOrder(trigger.outTradeNo);
    const order = providerOrderFromRow(row);
    if (!triggerMatchesOrder(trigger, order)) throw callbackRetryError();
    if (trigger.eventType === "refund_failed_trigger") {
      return Object.freeze({ eventType: trigger.eventType, durable: true, entitlementChanged: false });
    }
    let confirmation;
    try {
      confirmation = await registeredProvider.queryOrder({ order, notification: trigger });
    } catch {
      throw callbackRetryError();
    }
    const event = confirmation?.normalizedEvent;
    const allowedEventTypes = trigger.eventType === "paid_trigger" ? new Set(["paid", "refunded"]) : new Set(["refunded"]);
    if (!event || event.verified !== true || event.provider !== PROVIDER_ID
        || !allowedEventTypes.has(event.eventType) || event.outTradeNo !== order.outTradeNo
        || event.payerAppId !== order.payerAppId || event.payerOpenid !== order.payerOpenid
        || event.productId !== order.productId || Number(event.amountFen) !== order.amountFen
        || event.currency !== order.currency || !event.providerOrderId
        || trigger.providerOrderId && trigger.providerOrderId !== event.providerOrderId) throw callbackRetryError();
    let applied;
    try { applied = await applyVerifiedEvent(event); } catch { throw callbackRetryError(); }
    const durableStatus = String(applied?.order?.status || "");
    const durable = event.eventType === "paid"
      ? durableStatus === "fulfilled" || applied?.duplicate === true && durableStatus === "refunded"
      : durableStatus === "refunded";
    if (!durable) throw callbackRetryError();
    return Object.freeze({
      provider: PROVIDER_ID,
      notificationId: trigger.notificationId,
      eventId: event.eventId,
      eventType: event.eventType,
      state: confirmation.state,
      duplicate: applied?.duplicate === true,
      durable: true,
    });
  }
  const recoveryProviderRegistry = Object.freeze({ [PROVIDER_ID]: registeredProvider });
  return Object.freeze({
    providerRegistry: config.registryEnabled
      ? recoveryProviderRegistry
      : Object.freeze({}),
    recoveryProviderRegistry,
    readiness: () => config.publicReadiness,
    callbackFormat: config.callbackFormat,
    verifyCallbackUrl: verifyCallbackUrlQuery,
    processNotification,
  });
}

module.exports = {
  MAX_CALLBACK_BODY_BYTES,
  WECHAT_VIRTUAL_CALLBACK_PATH,
  createBoundedWechatHttpClient,
  createMembershipWechatRuntime,
  createWechatAccessTokenAuthority,
  readMembershipWechatRuntimeConfig,
  wechatCallbackAck,
};
