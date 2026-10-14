import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  verifyAndDecryptWechatMessage,
  verifyEncryptedWechatNotification,
  verifyWechatCallbackUrl,
} = require("../server/membershipWechatCallback.js");
const { createWechatVirtualProvider } = require("../server/membershipWechatVirtual.js");

const NOW = new Date("2026-10-14T12:00:00.000Z");
const APP_ID = "wx-test-callback-app";
const TOKEN = "fakeCallbackToken123";
const AES_KEY = Buffer.alloc(32, 1);
const ENCODING_AES_KEY = AES_KEY.toString("base64").replace(/=$/, "");
const OUT_TRADE_NO = "0123456789abcdef0123456789abcdef";
const OPENID = "openid-test-42";
const PRODUCT_ID = "all-access-month-test-product";

function pkcs7Pad32(value) {
  const padding = 32 - (value.length % 32);
  return Buffer.concat([value, Buffer.alloc(padding, padding)]);
}

function encryptMessage(message, { appId = APP_ID, key = AES_KEY } = {}) {
  const payload = Buffer.from(message, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const plain = pkcs7Pad32(Buffer.concat([
    Buffer.from("0123456789abcdef", "ascii"),
    length,
    payload,
    Buffer.from(appId, "utf8"),
  ]));
  const cipher = crypto.createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(plain), cipher.final()]).toString("base64");
}

function signature(encrypted, { token = TOKEN, timestamp = "1791979200", nonce = "fixture-nonce" } = {}) {
  return crypto.createHash("sha1").update([token, timestamp, nonce, encrypted].sort().join(""), "utf8").digest("hex");
}

function notificationFixture(message, { callbackFormat = "json", appId = APP_ID, key = AES_KEY } = {}) {
  const serialized = callbackFormat === "json" ? JSON.stringify(message) : message;
  const encrypted = encryptMessage(serialized, { appId, key });
  const timestamp = "1791979200";
  const nonce = "fixture-nonce";
  const msgSignature = signature(encrypted, { timestamp, nonce });
  const rawBody = callbackFormat === "json"
    ? JSON.stringify({ ToUserName: "gh_test", Encrypt: encrypted })
    : `<xml><ToUserName><![CDATA[gh_test]]></ToUserName><Encrypt><![CDATA[${encrypted}]]></Encrypt></xml>`;
  return {
    rawBody,
    query: { encrypt_type: "aes", timestamp, nonce, msg_signature: msgSignature },
    config: { appId: APP_ID, token: TOKEN, encodingAesKey: ENCODING_AES_KEY, callbackFormat },
  };
}

function goodsMessage(overrides = {}) {
  return {
    ToUserName: "gh_test",
    FromUserName: "official-wechat-openid",
    CreateTime: 1791979200,
    MsgType: "event",
    Event: "xpay_goods_deliver_notify",
    OpenId: OPENID,
    OutTradeNo: OUT_TRADE_NO,
    Env: 0,
    WeChatPayInfo: {
      MchOrderNo: "wx-order-callback-001",
      TransactionId: "transaction-callback-001",
      PaidTime: 1791979190,
    },
    GoodsInfo: {
      ProductId: PRODUCT_ID,
      Quantity: 1,
      OrigPrice: 2880,
      ActualPrice: 2880,
      Attach: "opaque-authority-binding",
    },
    ...overrides,
  };
}

function goodsXml(overrides = {}) {
  const values = { ...goodsMessage(), ...overrides };
  return `<xml>
    <ToUserName><![CDATA[${values.ToUserName}]]></ToUserName>
    <FromUserName><![CDATA[${values.FromUserName}]]></FromUserName>
    <CreateTime>${values.CreateTime}</CreateTime>
    <MsgType><![CDATA[${values.MsgType}]]></MsgType>
    <Event><![CDATA[${values.Event}]]></Event>
    <OpenId><![CDATA[${values.OpenId}]]></OpenId>
    <OutTradeNo><![CDATA[${values.OutTradeNo}]]></OutTradeNo>
    <Env>${values.Env}</Env>
    <WeChatPayInfo>
      <MchOrderNo><![CDATA[${values.WeChatPayInfo.MchOrderNo}]]></MchOrderNo>
      <TransactionId><![CDATA[${values.WeChatPayInfo.TransactionId}]]></TransactionId>
      <PaidTime>${values.WeChatPayInfo.PaidTime}</PaidTime>
    </WeChatPayInfo>
    <GoodsInfo>
      <ProductId><![CDATA[${values.GoodsInfo.ProductId}]]></ProductId>
      <Quantity>${values.GoodsInfo.Quantity}</Quantity>
      <OrigPrice>${values.GoodsInfo.OrigPrice}</OrigPrice>
      <ActualPrice>${values.GoodsInfo.ActualPrice}</ActualPrice>
      <Attach><![CDATA[${values.GoodsInfo.Attach}]]></Attach>
    </GoodsInfo>
  </xml>`;
}

function refundMessage(overrides = {}) {
  return {
    ToUserName: "gh_test",
    FromUserName: "official-wechat-openid",
    CreateTime: 1791979200,
    MsgType: "event",
    Event: "xpay_refund_notify",
    OpenId: OPENID,
    WxRefundId: "wx-refund-001",
    MchRefundId: "merchant-refund-001",
    WxOrderId: "wx-order-callback-001",
    MchOrderId: OUT_TRADE_NO,
    RefundFee: 2880,
    RetCode: 0,
    RetMsg: "success",
    RefundStartTimestamp: 1791979205,
    RefundSuccTimestamp: 1791979260,
    WxpayRefundTransactionId: "wxpay-refund-transaction-001",
    RetryTimes: 0,
    ...overrides,
  };
}

function expectCallbackCode(action, code = "membership_provider_callback_unverified") {
  assert.throws(action, (error) => error?.code === code);
}

// Exact GET verification vector from the official Mini Program message-push documentation.
assert.equal(verifyWechatCallbackUrl({
  query: {
    signature: "f464b24fc39322e44b38aa78f5edd27bd1441696",
    echostr: "4375120948345356249",
    timestamp: "1714036504",
    nonce: "1514711492",
  },
  config: { token: "AAAAA" },
}), "4375120948345356249");
expectCallbackCode(() => verifyWechatCallbackUrl({
  query: {
    signature: "0".repeat(40),
    echostr: "4375120948345356249",
    timestamp: "1714036504",
    nonce: "1514711492",
  },
  config: { token: "AAAAA" },
}));

// Exact safe-mode POST vector from the same official documentation. This avoids
// validating our decryptor only with ciphertext generated by the test helper.
const officialEncrypted = "+qdx1OKCy+5JPCBFWw70tm0fJGb2Jmeia4FCB7kao+/Q5c/ohsOzQHi8khUOb05JCpj0JB4RvQMkUyus8TPxLKJGQqcvZqzDpVzazhZv6JsXUnnR8XGT740XgXZUXQ7vJVnAG+tE8NUd4yFyjPy7GgiaviNrlCTj+l5kdfMuFUPpRSrfMZuMcp3Fn2Pede2IuQrKEYwKSqFIZoNqJ4M8EajAsjLY2km32IIjdf8YL/P50F7mStwntrA2cPDrM1kb6mOcfBgRtWygb3VIYnSeOBrebufAlr7F9mFUPAJGj04=";
assert.deepEqual(verifyAndDecryptWechatMessage({
  rawBody: JSON.stringify({ ToUserName: "gh_97417a04a28d", Encrypt: officialEncrypted }),
  query: {
    timestamp: "1714112445",
    nonce: "415670741",
    encrypt_type: "aes",
    msg_signature: "046e02f8204d34f8ba5fa3b1db94908f3df2e9b3",
  },
  config: {
    appId: "wxba5fad812f8e6fb9",
    token: "AAAAA",
    encodingAesKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    callbackFormat: "json",
  },
}).message, {
  ToUserName: "gh_97417a04a28d",
  FromUserName: "o9AgO5Kd5ggOC-bXrbNODIiE3bGY",
  CreateTime: 1714112445,
  MsgType: "event",
  Event: "debug_demo",
  debug_str: "hello world",
});

const goodsFixture = notificationFixture(goodsMessage());
const goods = verifyEncryptedWechatNotification(goodsFixture);
assert.deepEqual(goods, {
  provider: "wechat_virtual",
  authenticated: true,
  queryRequired: true,
  notificationId: crypto.createHash("sha256").update(
    `wechat_virtual:paid_trigger:${OUT_TRADE_NO}:wx-order-callback-001:${OPENID}:${PRODUCT_ID}:1:2880:0`,
  ).digest("hex"),
  eventType: "paid_trigger",
  outTradeNo: OUT_TRADE_NO,
  providerOrderId: "wx-order-callback-001",
  payerAppId: APP_ID,
  payerOpenid: OPENID,
  productId: PRODUCT_ID,
  quantity: 1,
  originalAmountFen: 2880,
  amountFen: 2880,
  env: 0,
  refundSucceededAt: null,
  rawDigestSha256: crypto.createHash("sha256").update(goodsFixture.rawBody).digest("hex"),
});
assert.equal("verified" in goods, false);
assert.equal(verifyEncryptedWechatNotification(goodsFixture).notificationId, goods.notificationId);
expectCallbackCode(() => verifyEncryptedWechatNotification({
  rawBody: JSON.stringify(goodsMessage()),
  query: {
    signature: "0".repeat(40),
    timestamp: "1791979200",
    nonce: "fixture-nonce",
  },
  config: goodsFixture.config,
}));
expectCallbackCode(() => verifyEncryptedWechatNotification({
  ...goodsFixture,
  rawBody: JSON.stringify({
    ...goodsMessage(),
    Encrypt: JSON.parse(goodsFixture.rawBody).Encrypt,
  }),
}));

const xmlFixture = notificationFixture(goodsXml(), { callbackFormat: "xml" });
assert.deepEqual(verifyEncryptedWechatNotification(xmlFixture), {
  ...goods,
  rawDigestSha256: crypto.createHash("sha256").update(xmlFixture.rawBody).digest("hex"),
});

const refundFixture = notificationFixture(refundMessage());
const refund = verifyEncryptedWechatNotification(refundFixture);
assert.deepEqual(refund, {
  provider: "wechat_virtual",
  authenticated: true,
  queryRequired: true,
  notificationId: crypto.createHash("sha256").update(
    `wechat_virtual:refunded_trigger:wx-refund-001:${OUT_TRADE_NO}:wx-order-callback-001:${OPENID}:2880:1791979260`,
  ).digest("hex"),
  eventType: "refunded_trigger",
  outTradeNo: OUT_TRADE_NO,
  providerOrderId: "wx-order-callback-001",
  payerAppId: APP_ID,
  payerOpenid: OPENID,
  productId: null,
  quantity: null,
  originalAmountFen: null,
  amountFen: 2880,
  env: null,
  refundSucceededAt: "2026-10-14T12:01:00.000Z",
  rawDigestSha256: crypto.createHash("sha256").update(refundFixture.rawBody).digest("hex"),
});
assert.equal("verified" in refund, false);
assert.equal(verifyEncryptedWechatNotification(refundFixture).notificationId, refund.notificationId);

for (const broken of [
  { ...goodsFixture, query: { ...goodsFixture.query, msg_signature: "0".repeat(40) } },
  { ...goodsFixture, query: { ...goodsFixture.query, encrypt_type: "" } },
  { ...goodsFixture, query: { ...goodsFixture.query, timestamp: "not-a-timestamp" } },
  { ...goodsFixture, config: { ...goodsFixture.config, token: "wrong-token" } },
  { ...goodsFixture, config: { ...goodsFixture.config, encodingAesKey: "A".repeat(42) } },
  notificationFixture(goodsMessage(), { appId: "wx-wrong-app" }),
  notificationFixture({ ...goodsMessage(), Event: "xpay_coin_pay_notify" }),
  notificationFixture({ ...goodsMessage(), MsgType: "text" }),
  notificationFixture({ ...goodsMessage(), GoodsInfo: { ...goodsMessage().GoodsInfo, Quantity: 0 } }),
  notificationFixture({ ...goodsMessage(), GoodsInfo: { ...goodsMessage().GoodsInfo, ActualPrice: -1 } }),
  notificationFixture(refundMessage({ RetCode: 1 })),
  notificationFixture(refundMessage({ RefundSuccTimestamp: 0 })),
]) {
  expectCallbackCode(() => verifyEncryptedWechatNotification(broken));
}

{
  const duplicateQuery = new URLSearchParams(goodsFixture.query);
  duplicateQuery.append("nonce", "second-nonce");
  expectCallbackCode(() => verifyEncryptedWechatNotification({ ...goodsFixture, query: duplicateQuery }));
}

expectCallbackCode(() => verifyEncryptedWechatNotification(notificationFixture(
  goodsXml().replace(
    "<Event><![CDATA[xpay_goods_deliver_notify]]></Event>",
    "<Event><![CDATA[xpay_goods_deliver_notify]]></Event><Event><![CDATA[xpay_goods_deliver_notify]]></Event>",
  ),
  { callbackFormat: "xml" },
)));

{
  const encrypted = encryptMessage(JSON.stringify(goodsMessage()));
  const damaged = `${encrypted.slice(0, -5)}AAAA=`;
  const timestamp = "1791979200";
  const nonce = "fixture-nonce";
  expectCallbackCode(() => verifyEncryptedWechatNotification({
    rawBody: JSON.stringify({ Encrypt: damaged }),
    query: { encrypt_type: "aes", timestamp, nonce, msg_signature: signature(damaged, { timestamp, nonce }) },
    config: goodsFixture.config,
  }));
}

expectCallbackCode(() => verifyEncryptedWechatNotification({
  ...goodsFixture,
  rawBody: Buffer.alloc(256 * 1024 + 1, 65),
}));

expectCallbackCode(() => verifyEncryptedWechatNotification(notificationFixture(
  "<!DOCTYPE xml [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><xml><Event>&xxe;</Event></xml>",
  { callbackFormat: "xml" },
)));

const provider = createWechatVirtualProvider({
  config: {
    enabled: true,
    appId: APP_ID,
    offerId: "fake-offer",
    appKey: "fake-app-key",
    productId: PRODUCT_ID,
    getAccessToken: async () => "fake-access-token",
    env: 0,
    token: TOKEN,
    encodingAesKey: ENCODING_AES_KEY,
    callbackFormat: "json",
  },
  clock: () => new Date(NOW),
  httpClient: async () => { throw new Error("callback verification must not call the provider"); },
});
assert.deepEqual(await provider.verifyAndNormalizeDeliveryCallback(goodsFixture), goods);
for (const mismatch of [
  { ...goodsMessage(), Env: 1 },
  { ...goodsMessage(), GoodsInfo: { ...goodsMessage().GoodsInfo, ProductId: "other-product" } },
  { ...goodsMessage(), GoodsInfo: { ...goodsMessage().GoodsInfo, Quantity: 2 } },
  { ...goodsMessage(), GoodsInfo: { ...goodsMessage().GoodsInfo, OrigPrice: 2879 } },
  { ...goodsMessage(), GoodsInfo: { ...goodsMessage().GoodsInfo, ActualPrice: 2879 } },
]) {
  await assert.rejects(
    () => provider.verifyAndNormalizeDeliveryCallback(notificationFixture(mismatch)),
    (error) => error?.code === "membership_payment_mismatch",
  );
}
assert.deepEqual(await provider.verifyAndNormalizeDeliveryCallback(refundFixture), refund);
await assert.rejects(
  () => provider.verifyAndNormalizeDeliveryCallback(notificationFixture(refundMessage({ RefundFee: 2879 }))),
  (error) => error?.code === "membership_payment_mismatch",
);

console.log("membership WeChat callback crypto tests: PASS");
