import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  createBoundedWechatHttpClient,
  createMembershipWechatRuntime,
  createWechatAccessTokenAuthority,
  readMembershipWechatRuntimeConfig,
  WECHAT_VIRTUAL_CALLBACK_PATH,
  wechatCallbackAck,
} = require("../server/membershipWechatRuntime.js");
const { membershipCatalog } = require("../server/membership.js");
const TEST_CALLBACK_AES_KEY = Buffer.alloc(32, 7).toString("base64").replace(/=$/, "");

const fullEnv = Object.freeze({
  MEMBERSHIP_CHECKOUT_ENABLED: "1",
  MEMBERSHIP_COMMERCE_READY: "1",
  MEMBERSHIP_WECHAT_VIRTUAL_ENABLED: "1",
  MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY: "1",
  MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED: "1",
  MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED: "1",
  MEMBERSHIP_WECHAT_VIRTUAL_MODE: "production",
  MEMBERSHIP_WECHAT_VIRTUAL_APP_ID: "wxruntimetestapp",
  MEMBERSHIP_WECHAT_VIRTUAL_OFFER_ID: "1234567890",
  MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID: "membership-runtime-test",
  MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY: "runtime-test-app-key-secret",
  MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET: "runtime-test-app-secret",
  MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY: "1",
  WECHAT_VIRTUAL_CALLBACK_READY: "1",
  WECHAT_VIRTUAL_CALLBACK_MODE: "safe",
  WECHAT_VIRTUAL_CALLBACK_TOKEN: "RuntimeCallbackToken123",
  WECHAT_VIRTUAL_CALLBACK_AES_KEY: TEST_CALLBACK_AES_KEY,
  WECHAT_VIRTUAL_CALLBACK_FORMAT: "json",
});

{
  let networkCalls = 0;
  const runtime = createMembershipWechatRuntime({
    env: {},
    fetchImpl: async () => { networkCalls += 1; throw new Error("disabled runtime must not call network"); },
  });
  assert.deepEqual(runtime.providerRegistry, {});
  assert.deepEqual(runtime.recoveryProviderRegistry, {});
  assert.deepEqual(runtime.readiness(), {
    provider: "wechat_virtual",
    configured: false,
    registryEnabled: false,
    checkoutEnabled: false,
    callbackReady: false,
    paymentAcceptanceReady: false,
    platforms: [],
    reason: "setup_required",
  });
  assert.equal(networkCalls, 0);
}

{
  const recoveryEnv = { ...fullEnv };
  delete recoveryEnv.MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED;
  delete recoveryEnv.MEMBERSHIP_CHECKOUT_ENABLED;
  delete recoveryEnv.MEMBERSHIP_COMMERCE_READY;
  let networkCalls = 0;
  const runtime = createMembershipWechatRuntime({
    env: recoveryEnv,
    fetchImpl: async () => { networkCalls += 1; throw new Error("construction must not call provider"); },
  });
  assert.deepEqual(runtime.providerRegistry, {}, "unaccepted payments never enter the public checkout registry");
  assert.deepEqual(Object.keys(runtime.recoveryProviderRegistry), ["wechat_virtual"], "configured provider remains available for owner query/callback recovery");
  assert.equal(membershipCatalog(recoveryEnv, runtime.recoveryProviderRegistry).commerce.checkoutEnabled, false, "recovery registry cannot enable public catalog");
  assert.equal(membershipCatalog(fullEnv, runtime.recoveryProviderRegistry, { honorGlobalCheckout: false }).commerce.checkoutEnabled, false, "private recovery catalog ignores global flags unless the server authorizes this owner");
  assert.equal(membershipCatalog(recoveryEnv, runtime.recoveryProviderRegistry, { serverAuthorizedCheckout: true }).commerce.checkoutEnabled, true, "only an internal server authorization can expose the configured provider");
  assert.equal(networkCalls, 0);
}

{
  const callbackOnlyEnv = {
    MEMBERSHIP_WECHAT_VIRTUAL_APP_ID: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID,
    WECHAT_VIRTUAL_CALLBACK_READY: "1",
    WECHAT_VIRTUAL_CALLBACK_MODE: "safe",
    WECHAT_VIRTUAL_CALLBACK_TOKEN: fullEnv.WECHAT_VIRTUAL_CALLBACK_TOKEN,
    WECHAT_VIRTUAL_CALLBACK_AES_KEY: fullEnv.WECHAT_VIRTUAL_CALLBACK_AES_KEY,
    WECHAT_VIRTUAL_CALLBACK_FORMAT: "json",
  };
  const callbackOnly = createMembershipWechatRuntime({ env: callbackOnlyEnv, fetchImpl: async () => { throw new Error("callback setup does not use provider network"); } });
  assert.deepEqual(callbackOnly.providerRegistry, {});
  assert.equal(callbackOnly.readiness().callbackReady, true);
  assert.equal(callbackOnly.readiness().configured, false);
  const timestamp = "1791964800";
  const nonce = "callback-only";
  const signature = (await import("node:crypto")).default.createHash("sha1")
    .update([callbackOnlyEnv.WECHAT_VIRTUAL_CALLBACK_TOKEN, timestamp, nonce].sort().join(""), "utf8").digest("hex");
  assert.equal(callbackOnly.verifyCallbackUrl(new URLSearchParams({ signature, timestamp, nonce, echostr: "verified" })), "verified");
  assert.throws(() => callbackOnly.processNotification({}), (error) => error.code === "membership_provider_callback_unavailable");
}

{
  const verifiedEvent = Object.freeze({
    verified: true,
    provider: "wechat_virtual",
    eventId: "a".repeat(64),
    providerOrderId: "provider-runtime-order",
    outTradeNo: "M0123456789abcdef0123456789abcd",
    payerAppId: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID,
    payerOpenid: "openid-runtime-user",
    productId: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID,
    amountFen: 2880,
    currency: "CNY",
    paidAt: "2026-10-14T00:00:00.000Z",
    occurredAt: "2026-10-14T00:00:00.000Z",
    eventType: "paid",
    rawDigestSha256: "b".repeat(64),
  });
  let queryCalls = 0;
  let triggerProviderOrderId = verifiedEvent.providerOrderId;
  let currentConfirmation = { provider: "wechat_virtual", providerStatus: 2, state: "paid", normalizedEvent: verifiedEvent, rawDigestSha256: "e".repeat(64) };
  const fakeCallbackVerifier = {
    verifyWechatCallbackUrl: ({ query }) => query.get("echostr"),
    verifyEncryptedWechatNotification: () => Object.freeze({
      provider: "wechat_virtual",
      authenticated: true,
      queryRequired: true,
      notificationId: "c".repeat(64),
      eventType: "paid_trigger",
      outTradeNo: verifiedEvent.outTradeNo,
      providerOrderId: triggerProviderOrderId,
      payerAppId: verifiedEvent.payerAppId,
      payerOpenid: verifiedEvent.payerOpenid,
      productId: verifiedEvent.productId,
      quantity: 1,
      originalAmountFen: 2880,
      amountFen: 2880,
      env: 0,
      refundSucceededAt: null,
      rawDigestSha256: "d".repeat(64),
    }),
  };
  const runtime = createMembershipWechatRuntime({
    env: fullEnv,
    fetchImpl: async () => { throw new Error("fake provider must not use network"); },
    callbackVerifier: fakeCallbackVerifier,
    adapterFactory: ({ config }) => Object.freeze({
      id: "wechat_virtual",
      productId: config.productId,
      readiness: () => ({ ready: true, reason: "ready" }),
      createCheckout: async () => { throw new Error("not used"); },
      queryOrder: async () => {
        queryCalls += 1;
        return currentConfirmation;
      },
      verifyAndNormalizeDeliveryCallback: async ({ rawBody, query }) => fakeCallbackVerifier.verifyEncryptedWechatNotification({ rawBody, query }),
      refund: async () => { throw new Error("not used"); },
    }),
  });
  const orderRow = {
    id: verifiedEvent.outTradeNo,
    user_id: 42,
    plan_id: "all-access-month",
    product_id: verifiedEvent.productId,
    provider: "wechat_virtual",
    idempotency_key: "runtime-callback-idempotency",
    out_trade_no: verifiedEvent.outTradeNo,
    amount_fen: 2880,
    currency: "CNY",
    duration_days: 30,
    auto_renew: 0,
    status: "pending",
    payer_app_id: verifiedEvent.payerAppId,
    payer_openid: verifiedEvent.payerOpenid,
    provider_order_id: null,
    created_at: "2026-10-14T00:00:00.000Z",
    updated_at: "2026-10-14T00:00:00.000Z",
    expires_at: "2026-10-14T00:15:00.000Z",
  };
  assert.equal(runtime.verifyCallbackUrl(new URLSearchParams("signature=x&timestamp=1&nonce=n&echostr=verified")), "verified");
  let applied = 0;
  const processed = await runtime.processNotification({
    rawBody: Buffer.from("encrypted-fixture"),
    query: new URLSearchParams("encrypt_type=aes"),
    lookupOrder: async () => orderRow,
    applyVerifiedEvent: async (event) => {
      applied += 1;
      assert.deepEqual(event, verifiedEvent);
      return { duplicate: false, order: { id: orderRow.id, status: "fulfilled" }, entitlement: { active: true } };
    },
  });
  assert.equal(queryCalls, 1);
  assert.equal(applied, 1);
  assert.deepEqual(processed, {
    provider: "wechat_virtual",
    notificationId: "c".repeat(64),
    eventId: verifiedEvent.eventId,
    eventType: "paid",
    state: "paid",
    duplicate: false,
    durable: true,
  });
  await assert.rejects(() => runtime.processNotification({
    rawBody: Buffer.from("encrypted-fixture"),
    query: new URLSearchParams("encrypt_type=aes"),
    lookupOrder: async () => ({ ...orderRow, payer_openid: "other-openid" }),
    applyVerifiedEvent: async () => { throw new Error("binding mismatch must not apply"); },
  }), (error) => error.code === "membership_provider_callback_retry");
  triggerProviderOrderId = "different-provider-order";
  currentConfirmation = { provider: "wechat_virtual", providerStatus: 2, state: "paid", normalizedEvent: verifiedEvent, rawDigestSha256: "e".repeat(64) };
  await assert.rejects(() => runtime.processNotification({
    rawBody: Buffer.from("encrypted-fixture"),
    query: new URLSearchParams("encrypt_type=aes"),
    lookupOrder: async () => orderRow,
    applyVerifiedEvent: async () => { throw new Error("provider order mismatch must not apply"); },
  }), (error) => error.code === "membership_provider_callback_retry");
  triggerProviderOrderId = verifiedEvent.providerOrderId;
  currentConfirmation = { provider: "wechat_virtual", providerStatus: 1, state: "pending", normalizedEvent: null, rawDigestSha256: "f".repeat(64) };
  await assert.rejects(() => runtime.processNotification({
    rawBody: Buffer.from("encrypted-fixture"),
    query: new URLSearchParams("encrypt_type=aes"),
    lookupOrder: async () => orderRow,
    applyVerifiedEvent: async () => { throw new Error("non-terminal query must not apply"); },
  }), (error) => error.code === "membership_provider_callback_retry");
  assert.deepEqual(wechatCallbackAck("json", true), {
    contentType: "application/json; charset=utf-8",
    body: '{"ErrCode":0,"ErrMsg":"success"}',
  });
  assert.match(wechatCallbackAck("xml", false).body, /<ErrCode>-1<\/ErrCode>/);
}

{
  const outTradeNo = "Mfedcba9876543210fedcba98765432";
  const providerOrderId = "provider-refund-runtime";
  const refundEvent = Object.freeze({
    verified: true, provider: "wechat_virtual", eventId: "9".repeat(64), providerOrderId, outTradeNo,
    payerAppId: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID, payerOpenid: "openid-refund-runtime",
    productId: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_ID, amountFen: 2880, currency: "CNY",
    occurredAt: "2026-10-14T00:02:00.000Z", refundObservedAt: "2026-10-14T00:02:00.000Z",
    eventType: "refunded", rawDigestSha256: "8".repeat(64),
  });
  const refundTrigger = Object.freeze({
    provider: "wechat_virtual", authenticated: true, queryRequired: true, notificationId: "7".repeat(64),
    eventType: "refunded_trigger", outTradeNo, providerOrderId,
    payerAppId: refundEvent.payerAppId, payerOpenid: refundEvent.payerOpenid,
    productId: null, quantity: null, originalAmountFen: null, amountFen: 2880, env: null,
    refundSucceededAt: "2026-10-14T00:01:59.000Z", rawDigestSha256: "6".repeat(64),
  });
  const runtime = createMembershipWechatRuntime({
    env: fullEnv,
    fetchImpl: async () => { throw new Error("fake refund provider must not use network"); },
    callbackVerifier: { verifyWechatCallbackUrl: () => "", verifyEncryptedWechatNotification: () => refundTrigger },
    adapterFactory: ({ config }) => Object.freeze({
      id: "wechat_virtual", productId: config.productId,
      readiness: () => ({ ready: true, reason: "ready" }),
      createCheckout: async () => { throw new Error("not used"); },
      queryOrder: async () => ({ provider: "wechat_virtual", providerStatus: 8, state: "refunded", normalizedEvent: refundEvent, rawDigestSha256: "5".repeat(64) }),
      verifyAndNormalizeDeliveryCallback: async () => refundTrigger,
      refund: async () => { throw new Error("not used"); },
    }),
  });
  const row = {
    id: outTradeNo, user_id: 43, plan_id: "all-access-month", product_id: refundEvent.productId,
    provider: "wechat_virtual", idempotency_key: "runtime-refund", out_trade_no: outTradeNo,
    amount_fen: 2880, currency: "CNY", duration_days: 30, auto_renew: 0, status: "pending",
    payer_app_id: refundEvent.payerAppId, payer_openid: refundEvent.payerOpenid, provider_order_id: null,
    created_at: "2026-10-14T00:00:00.000Z", updated_at: "2026-10-14T00:00:00.000Z", expires_at: "2026-10-14T00:15:00.000Z",
  };
  let duplicate = false;
  const process = () => runtime.processNotification({
    rawBody: Buffer.from("refund-encrypted-fixture"), query: new URLSearchParams("encrypt_type=aes"),
    lookupOrder: async () => row,
    applyVerifiedEvent: async (event) => {
      assert.deepEqual(event, refundEvent);
      return { duplicate, order: { id: outTradeNo, status: "refunded" }, entitlement: { active: false } };
    },
  });
  assert.equal((await process()).duplicate, false);
  duplicate = true;
  assert.equal((await process()).duplicate, true, "authenticated refund callback replay remains idempotently durable");
}

{
  const config = readMembershipWechatRuntimeConfig(fullEnv);
  assert.equal(config.configured, true);
  assert.equal(config.registryEnabled, true);
  assert.deepEqual(config.platforms, ["android"]);
  assert.equal(JSON.stringify(config.publicReadiness).includes(fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY), false);
  assert.equal(JSON.stringify(config.publicReadiness).includes(fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET), false);
  const notYetAccepted = { ...fullEnv };
  delete notYetAccepted.MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED;
  const capabilityOnly = readMembershipWechatRuntimeConfig(notYetAccepted);
  assert.equal(capabilityOnly.configured, true, "reviewed signing/config capability is separate from real-payment acceptance");
  assert.equal(capabilityOnly.registryEnabled, false);
  assert.equal(capabilityOnly.publicReadiness.paymentAcceptanceReady, false);

  const noIap = readMembershipWechatRuntimeConfig({ ...fullEnv, MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED: "1" });
  assert.deepEqual(noIap.platforms, ["android"], "iOS needs a separate explicit IAP readiness flag");
  const withIap = readMembershipWechatRuntimeConfig({
    ...fullEnv,
    MEMBERSHIP_WECHAT_VIRTUAL_IOS_ENABLED: "1",
    MEMBERSHIP_WECHAT_VIRTUAL_IOS_IAP_READY: "1",
  });
  assert.deepEqual(withIap.platforms, ["android", "ios"]);
  const mismatchedIdentityApp = readMembershipWechatRuntimeConfig({ ...fullEnv, WECHAT_MINIPROGRAM_APP_ID: "wxdifferentidentityapp" });
  assert.equal(mismatchedIdentityApp.registryEnabled, false, "payer identity AppID and payment AppID must not drift");
  assert.deepEqual(
    createMembershipWechatRuntime({
      env: { ...fullEnv, WECHAT_MINIPROGRAM_APP_ID: "wxdifferentidentityapp" },
      fetchImpl: async () => { throw new Error("mismatched AppID must fail before provider network"); },
    }).providerRegistry,
    {},
    "an identity/payment AppID mismatch cannot expose checkout",
  );

  const identityAliasPairs = [
    ["WECHAT_MINIPROGRAM_APP_ID", "WECHAT_MINIPROGRAM_APP_SECRET"],
    ["WECHAT_MINIPROGRAM_APPID", "WECHAT_MINIPROGRAM_SECRET"],
    ["WECHAT_APP_ID", "WECHAT_APP_SECRET"],
    ["WECHAT_MINI_APPID", "WECHAT_MINI_SECRET"],
  ];
  for (const [appIdName, appSecretName] of identityAliasPairs) {
    const aliasEnv = { ...fullEnv };
    delete aliasEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID;
    delete aliasEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET;
    aliasEnv[appIdName] = "wxlegacyidentityapp";
    aliasEnv[appSecretName] = "legacy-identity-secret";
    const aliasConfig = readMembershipWechatRuntimeConfig(aliasEnv);
    assert.equal(aliasConfig.appId, "wxlegacyidentityapp", appIdName);
    assert.equal(aliasConfig.configured, true, `${appIdName}/${appSecretName} matches login authority aliases`);
    assert.equal(aliasConfig.registryEnabled, true, `${appIdName}/${appSecretName} can become ready only with every explicit gate`);
  }

  const unknownIdentityEnv = { ...fullEnv };
  delete unknownIdentityEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID;
  delete unknownIdentityEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET;
  const unknownIdentity = readMembershipWechatRuntimeConfig(unknownIdentityEnv);
  assert.equal(unknownIdentity.configured, false);
  assert.equal(unknownIdentity.registryEnabled, false, "missing payer identity authority is fail-closed");

  for (const key of [
    "MEMBERSHIP_COMMERCE_READY",
    "MEMBERSHIP_CHECKOUT_ENABLED",
    "MEMBERSHIP_WECHAT_VIRTUAL_PRODUCTION_READY",
    "MEMBERSHIP_WECHAT_VIRTUAL_PRODUCT_PUBLISHED",
    "MEMBERSHIP_WECHAT_VIRTUAL_REAL_PAYMENT_ACCEPTED",
    "MEMBERSHIP_WECHAT_VIRTUAL_APP_KEY",
    "MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET",
    "WECHAT_VIRTUAL_CALLBACK_READY",
    "WECHAT_VIRTUAL_CALLBACK_MODE",
    "WECHAT_VIRTUAL_CALLBACK_TOKEN",
    "WECHAT_VIRTUAL_CALLBACK_AES_KEY",
    "WECHAT_VIRTUAL_CALLBACK_FORMAT",
    "MEMBERSHIP_WECHAT_VIRTUAL_ANDROID_READY",
  ]) {
    const disabled = { ...fullEnv };
    delete disabled[key];
    assert.equal(readMembershipWechatRuntimeConfig(disabled).registryEnabled, false, key);
  }
}

{
  let now = Date.parse("2026-10-14T00:00:00.000Z");
  let tokenCalls = 0;
  const tokenBodies = [];
  const requestJson = async (request) => {
    tokenCalls += 1;
    tokenBodies.push(JSON.parse(request.body));
    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: `token-${tokenCalls}`, expires_in: 600 }),
    };
  };
  const authority = createWechatAccessTokenAuthority({
    appId: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID,
    appSecret: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET,
    requestJson,
    clock: () => now,
  });
  const [first, concurrent] = await Promise.all([authority.getAccessToken(), authority.getAccessToken()]);
  assert.equal(first, "token-1");
  assert.equal(concurrent, "token-1");
  assert.equal(tokenCalls, 1, "concurrent callers share one stable-token request");
  assert.deepEqual(tokenBodies[0], {
    grant_type: "client_credential",
    appid: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_ID,
    secret: fullEnv.MEMBERSHIP_WECHAT_VIRTUAL_APP_SECRET,
    force_refresh: false,
  });
  assert.equal(await authority.getAccessToken(), "token-1");
  now += 301_000;
  assert.equal(await authority.getAccessToken(), "token-2", "token refreshes before provider expiry");
  assert.equal(tokenCalls, 2);
  assert.deepEqual(authority.inspect(), { cached: true, refreshInMs: 300_000, requestInFlight: false });
}

{
  const requests = [];
  const httpClient = createBoundedWechatHttpClient({
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json", "content-length": "11" },
      });
    },
  });
  const response = await httpClient({
    url: "https://api.weixin.qq.com/cgi-bin/stable_token",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    timeoutMs: 1000,
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body, '{"ok":true}');
  assert.equal(requests[0].options.redirect, "error");
  await assert.rejects(() => httpClient({
    url: "https://example.invalid/cgi-bin/stable_token",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }), (error) => error.code === "membership_provider_unavailable" && !error.message.includes("example.invalid"));

  const oversized = createBoundedWechatHttpClient({
    fetchImpl: async () => new Response("x", { status: 200, headers: { "content-length": String(300 * 1024) } }),
  });
  await assert.rejects(() => oversized({
    url: "https://api.weixin.qq.com/cgi-bin/stable_token",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }), (error) => error.code === "membership_provider_unavailable");
}

{
  let networkCalls = 0;
  const runtime = createMembershipWechatRuntime({
    env: fullEnv,
    fetchImpl: async () => { networkCalls += 1; throw new Error("construction must not call provider"); },
  });
  assert.deepEqual(Object.keys(runtime.providerRegistry), ["wechat_virtual"]);
  assert.deepEqual(Object.keys(runtime.recoveryProviderRegistry), ["wechat_virtual"]);
  assert.deepEqual(runtime.providerRegistry.wechat_virtual.platforms, ["android"]);
  assert.deepEqual(membershipCatalog(fullEnv, runtime.providerRegistry).commerce, {
    checkoutEnabled: true,
    reason: "ready",
    providers: [
      { id: "wechat_virtual", enabled: true, reason: "ready", platforms: ["android"] },
      { id: "wechat_jsapi", enabled: false, reason: "setup_required", platforms: [] },
    ],
  });
  assert.deepEqual(runtime.readiness(), {
    provider: "wechat_virtual",
    configured: true,
    registryEnabled: true,
    checkoutEnabled: true,
    callbackReady: true,
    paymentAcceptanceReady: true,
    platforms: ["android"],
    reason: "ready",
  });
  assert.equal(networkCalls, 0);
}

const source = fs.readFileSync(fileURLToPath(new URL("../server/membershipWechatRuntime.js", import.meta.url)), "utf8");
const serverSource = fs.readFileSync(fileURLToPath(new URL("../server.js", import.meta.url)), "utf8");
assert.doesNotMatch(source, /[\u4e00-\u9fff]/, "runtime source must not depend on local non-standard secret variable names");
assert.doesNotMatch(source, /console\.(?:log|warn|error)/);
assert.equal(WECHAT_VIRTUAL_CALLBACK_PATH, "/api/membership/wechat/notify");
assert.match(serverSource, /createMembershipWechatRuntime\(\{ env: process\.env, fetchImpl: globalThis\.fetch \}\)/);
assert.match(serverSource, /MEMBERSHIP_PROVIDER_REGISTRY = MEMBERSHIP_WECHAT_RUNTIME\.providerRegistry/);
assert.match(serverSource, /MEMBERSHIP_RECOVERY_PROVIDER_REGISTRY = MEMBERSHIP_WECHAT_RUNTIME\.recoveryProviderRegistry/);
assert.doesNotMatch(serverSource, /const MEMBERSHIP_PROVIDER_REGISTRY = Object\.freeze\(\{\}\)/);
assert.match(serverSource, /requestPathname === WECHAT_VIRTUAL_CALLBACK_PATH[\s\S]{0,160}handleMembershipWechatCallback/);
assert.ok(
  serverSource.indexOf("requestPathname === WECHAT_VIRTUAL_CALLBACK_PATH")
    < serverSource.indexOf('requestPathname.startsWith("/api/membership/")'),
  "unauthenticated provider callback dispatch must precede the user-authenticated membership router",
);

console.log("membership WeChat runtime safe-off/config/token/transport tests: PASS");
