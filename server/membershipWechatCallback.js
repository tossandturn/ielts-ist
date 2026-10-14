"use strict";

const crypto = require("crypto");
const { TextDecoder } = require("util");

// Protocol sources (algorithm reimplemented; no source copied):
// https://developers.weixin.qq.com/miniprogram/dev/framework/server-ability/message-push.html
// https://wximg.gtimg.com/shake_tv/mpwiki/cryptoDemo.zip
// https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment
const PROVIDER_ID = "wechat_virtual";
const MAX_CALLBACK_BODY_BYTES = 256 * 1024;
const MAX_CALLBACK_MESSAGE_BYTES = 256 * 1024;
const MAX_XML_NODES = 64;
const MAX_STRUCTURE_DEPTH = 6;
const TRADE_NO = /^[A-Za-z0-9][A-Za-z0-9_|*@-]{7,31}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const UTF8 = new TextDecoder("utf-8", { fatal: true });

function callbackError(setup = false) {
  return Object.assign(new Error("WeChat virtual-payment callback could not be authenticated."), {
    code: "membership_provider_callback_unverified",
    statusCode: setup ? 503 : 401,
  });
}

function fail(setup = false) {
  throw callbackError(setup);
}

function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function safeString(value, maximum = 512, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && value.length === 0)
      || /[\u0000-\u001f\u007f]/.test(value)) fail();
  return value;
}

function callbackToken(value, setup = false) {
  if (typeof value !== "string" || !/^[A-Za-z0-9]{3,32}$/.test(value)) fail(setup);
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function validateStructure(value, state, depth = 0) {
  if (depth > MAX_STRUCTURE_DEPTH || ++state.nodes > MAX_XML_NODES) fail();
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return;
  if (!isRecord(value)) fail();
  for (const [key, child] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
        || key === "__proto__" || key === "prototype" || key === "constructor") fail();
    validateStructure(child, state, depth + 1);
  }
}

function parseJsonObject(value) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    fail();
  }
  if (!isRecord(parsed)) fail();
  validateStructure(parsed, { nodes: 0 });
  return parsed;
}

function decodeXmlText(value) {
  if (/&(?!lt;|gt;|amp;|quot;|apos;)/.test(value)) fail();
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseXmlObject(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_CALLBACK_MESSAGE_BYTES
      || /<!DOCTYPE|<!ENTITY|<!--|<\?/i.test(value)) fail();
  let index = 0;
  let nodes = 0;
  let root = null;
  const stack = [];

  const appendText = (text) => {
    if (!stack.length) {
      if (text.trim() !== "") fail();
      return;
    }
    stack[stack.length - 1].text.push(text);
  };

  const finish = (node) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const joined = node.text.join("");
    if (hasChildren && joined.trim() !== "") fail();
    const result = hasChildren ? node.children : joined;
    if (!stack.length) {
      if (root !== null || node.name !== "xml") fail();
      root = result;
      return;
    }
    const parent = stack[stack.length - 1];
    if (Object.prototype.hasOwnProperty.call(parent.children, node.name)) fail();
    parent.children[node.name] = result;
  };

  while (index < value.length) {
    if (value.startsWith("<![CDATA[", index)) {
      const end = value.indexOf("]]>", index + 9);
      if (end < 0) fail();
      appendText(value.slice(index + 9, end));
      index = end + 3;
      continue;
    }
    if (value[index] !== "<") {
      const end = value.indexOf("<", index);
      const stop = end < 0 ? value.length : end;
      appendText(decodeXmlText(value.slice(index, stop)));
      index = stop;
      continue;
    }
    const end = value.indexOf(">", index + 1);
    if (end < 0) fail();
    const tag = value.slice(index + 1, end);
    const match = /^(\/)?([A-Za-z][A-Za-z0-9_]{0,63})(\/)?$/.exec(tag);
    if (!match || (match[1] && match[3])) fail();
    const closing = Boolean(match[1]);
    const selfClosing = Boolean(match[3]);
    const name = match[2];
    if (closing) {
      const node = stack.pop();
      if (!node || node.name !== name) fail();
      finish(node);
    } else {
      if (++nodes > MAX_XML_NODES || stack.length + 1 > MAX_STRUCTURE_DEPTH) fail();
      const node = { name, text: [], children: Object.create(null) };
      if (selfClosing) finish(node);
      else stack.push(node);
    }
    index = end + 1;
  }
  if (stack.length || !isRecord(root)) fail();
  return root;
}

function parseObject(value, format) {
  return format === "json" ? parseJsonObject(value) : parseXmlObject(value);
}

function encryptedEnvelope(outer) {
  if (!isRecord(outer) || Object.keys(outer).sort().join(",") !== "Encrypt,ToUserName") fail();
  safeString(outer.ToUserName, 256);
  return stringField(outer, "Encrypt", MAX_CALLBACK_BODY_BYTES);
}

function rawBuffer(rawBody) {
  if (!(typeof rawBody === "string" || Buffer.isBuffer(rawBody))) fail();
  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  if (raw.length === 0 || raw.length > MAX_CALLBACK_BODY_BYTES) fail();
  return raw;
}

function parseConfig(config) {
  if (!isRecord(config)) fail(true);
  let appId;
  let token;
  try {
    appId = safeString(config.appId, 128);
    token = callbackToken(config.token, true);
  } catch {
    fail(true);
  }
  if (!/^[A-Za-z0-9]{43}$/.test(config.encodingAesKey || "")
      || !["json", "xml"].includes(config.callbackFormat)) fail(true);
  const key = Buffer.from(`${config.encodingAesKey}=`, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=$/, "") !== config.encodingAesKey) fail(true);
  return { appId, token, key, format: config.callbackFormat };
}

function isWechatCallbackConfigurationReady(config) {
  try {
    parseConfig(config);
    return true;
  } catch {
    return false;
  }
}

function queryValue(query, name) {
  if (query instanceof URLSearchParams) {
    const values = query.getAll(name);
    return values.length === 1 ? values[0] : "";
  }
  if (!isRecord(query) || !Object.prototype.hasOwnProperty.call(query, name)) return "";
  return typeof query[name] === "string" ? query[name] : "";
}

function timingSafeHexEqual(left, right) {
  if (!/^[a-fA-F0-9]{40}$/.test(left) || !/^[a-f0-9]{40}$/.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left.toLowerCase(), "hex"), Buffer.from(right, "hex"));
}

function verifyWechatCallbackUrl({ query, config } = {}) {
  let token;
  try {
    token = callbackToken(config?.token, true);
  } catch {
    fail(true);
  }
  const signature = queryValue(query, "signature");
  const timestamp = queryValue(query, "timestamp");
  const nonce = queryValue(query, "nonce");
  const echostr = queryValue(query, "echostr");
  if (!/^[1-9][0-9]{0,15}$/.test(timestamp)
      || !Number.isSafeInteger(Number(timestamp))
      || !nonce || nonce.length > 256 || /[\u0000-\u001f\u007f]/.test(nonce)
      || !echostr || echostr.length > 1024 || /[\u0000-\u001f\u007f]/.test(echostr)) fail();
  const expected = crypto.createHash("sha1")
    .update([token, timestamp, nonce].sort().join(""), "utf8")
    .digest("hex");
  if (!timingSafeHexEqual(signature, expected)) fail();
  return echostr;
}

function decryptMessage(encrypted, key, appId) {
  if (typeof encrypted !== "string" || encrypted.length === 0 || encrypted.length > MAX_CALLBACK_BODY_BYTES
      || encrypted.length % 4 !== 0 || !BASE64.test(encrypted)) fail();
  const ciphertext = Buffer.from(encrypted, "base64");
  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0 || ciphertext.toString("base64") !== encrypted) fail();
  let padded;
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
    decipher.setAutoPadding(false);
    padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    fail();
  }
  if (padded.length === 0 || padded.length > MAX_CALLBACK_MESSAGE_BYTES + 128) fail();
  const padding = padded[padded.length - 1];
  if (padding < 1 || padding > 32 || padding > padded.length) fail();
  for (let index = padded.length - padding; index < padded.length; index += 1) {
    if (padded[index] !== padding) fail();
  }
  const plain = padded.subarray(0, padded.length - padding);
  if (plain.length < 21) fail();
  const messageLength = plain.readUInt32BE(16);
  if (messageLength === 0 || messageLength > MAX_CALLBACK_MESSAGE_BYTES || 20 + messageLength >= plain.length) fail();
  const message = plain.subarray(20, 20 + messageLength);
  const receivedAppId = plain.subarray(20 + messageLength);
  const expectedAppId = Buffer.from(appId, "utf8");
  if (receivedAppId.length !== expectedAppId.length
      || !crypto.timingSafeEqual(receivedAppId, expectedAppId)) fail();
  try {
    return UTF8.decode(message);
  } catch {
    fail();
  }
}

function integerField(object, name, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!isRecord(object)) fail();
  const raw = object[name];
  let value = raw;
  if (typeof raw === "string" && /^(?:0|[1-9][0-9]{0,15})$/.test(raw)) value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) fail();
  return value;
}

function stringField(object, name, maximum = 512, options) {
  if (!isRecord(object) || !Object.prototype.hasOwnProperty.call(object, name)) fail();
  return safeString(object[name], maximum, options);
}

function validateBaseEvent(message) {
  stringField(message, "ToUserName", 256);
  stringField(message, "FromUserName", 256);
  integerField(message, "CreateTime", { minimum: 1 });
  if (stringField(message, "MsgType", 32) !== "event") fail();
  return stringField(message, "Event", 64);
}

function normalizeGoods(message, appId, rawDigestSha256) {
  const payerOpenid = stringField(message, "OpenId", 256);
  const outTradeNo = stringField(message, "OutTradeNo", 32);
  if (!TRADE_NO.test(outTradeNo)) fail();
  const env = integerField(message, "Env", { maximum: 1 });
  const goods = message.GoodsInfo;
  const productId = stringField(goods, "ProductId", 128);
  const quantity = integerField(goods, "Quantity", { minimum: 1, maximum: 1_000_000 });
  const originalAmountFen = integerField(goods, "OrigPrice", { minimum: 1 });
  const amountFen = integerField(goods, "ActualPrice", { minimum: 1 });
  if (Object.prototype.hasOwnProperty.call(goods, "Attach")) safeString(goods.Attach, 1024, { allowEmpty: true });
  let providerOrderId = null;
  if (message.WeChatPayInfo !== undefined) {
    providerOrderId = stringField(message.WeChatPayInfo, "MchOrderNo", 256);
    if (Object.prototype.hasOwnProperty.call(message.WeChatPayInfo, "TransactionId")) {
      safeString(message.WeChatPayInfo.TransactionId, 256, { allowEmpty: true });
    }
    if (Object.prototype.hasOwnProperty.call(message.WeChatPayInfo, "PaidTime")) {
      integerField(message.WeChatPayInfo, "PaidTime", { minimum: 1 });
    }
  }
  const material = `${PROVIDER_ID}:paid_trigger:${outTradeNo}:${providerOrderId || ""}:${payerOpenid}:${productId}:${quantity}:${amountFen}:${env}`;
  return Object.freeze({
    provider: PROVIDER_ID,
    authenticated: true,
    queryRequired: true,
    notificationId: sha256(material),
    eventType: "paid_trigger",
    outTradeNo,
    providerOrderId,
    payerAppId: appId,
    payerOpenid,
    productId,
    quantity,
    originalAmountFen,
    amountFen,
    env,
    refundSucceededAt: null,
    rawDigestSha256,
  });
}

function normalizeRefund(message, appId, rawDigestSha256) {
  const payerOpenid = stringField(message, "OpenId", 256);
  const refundId = stringField(message, "WxRefundId", 256);
  stringField(message, "MchRefundId", 256);
  const providerOrderId = stringField(message, "WxOrderId", 256);
  const outTradeNo = stringField(message, "MchOrderId", 32);
  if (!TRADE_NO.test(outTradeNo)) fail();
  const amountFen = integerField(message, "RefundFee", { minimum: 1 });
  if (integerField(message, "RetCode", { maximum: Number.MAX_SAFE_INTEGER }) !== 0) fail();
  integerField(message, "RefundStartTimestamp", { minimum: 1 });
  const refundSucceeded = integerField(message, "RefundSuccTimestamp", { minimum: 1 });
  if (Object.prototype.hasOwnProperty.call(message, "RetryTimes")) {
    integerField(message, "RetryTimes", { maximum: 15 });
  }
  const refundSucceededAt = new Date(refundSucceeded * 1000);
  if (!Number.isFinite(refundSucceededAt.getTime())) fail();
  const material = `${PROVIDER_ID}:refunded_trigger:${refundId}:${outTradeNo}:${providerOrderId}:${payerOpenid}:${amountFen}:${refundSucceeded}`;
  return Object.freeze({
    provider: PROVIDER_ID,
    authenticated: true,
    queryRequired: true,
    notificationId: sha256(material),
    eventType: "refunded_trigger",
    outTradeNo,
    providerOrderId,
    payerAppId: appId,
    payerOpenid,
    productId: null,
    quantity: null,
    originalAmountFen: null,
    amountFen,
    env: null,
    refundSucceededAt: refundSucceededAt.toISOString(),
    rawDigestSha256,
  });
}

function verifyAndDecryptWechatMessage({ rawBody, query, config } = {}) {
  const raw = rawBuffer(rawBody);
  const { appId, token, key, format } = parseConfig(config);
  let outerText;
  try {
    outerText = UTF8.decode(raw);
  } catch {
    fail();
  }
  const outer = parseObject(outerText, format);
  const encrypted = encryptedEnvelope(outer);
  const timestamp = queryValue(query, "timestamp");
  const nonce = queryValue(query, "nonce");
  const msgSignature = queryValue(query, "msg_signature");
  if (queryValue(query, "encrypt_type") !== "aes"
      || !/^[1-9][0-9]{0,15}$/.test(timestamp)
      || !Number.isSafeInteger(Number(timestamp))
      || !nonce || nonce.length > 256 || /[\u0000-\u001f\u007f]/.test(nonce)) fail();
  const expected = crypto.createHash("sha1")
    .update([token, timestamp, nonce, encrypted].sort().join(""), "utf8")
    .digest("hex");
  if (!timingSafeHexEqual(msgSignature, expected)) fail();
  const decrypted = decryptMessage(encrypted, key, appId);
  const message = parseObject(decrypted, format);
  return Object.freeze({ appId, message, rawDigestSha256: sha256(raw) });
}

function verifyEncryptedWechatNotification(options = {}) {
  const { appId, message, rawDigestSha256 } = verifyAndDecryptWechatMessage(options);
  const event = validateBaseEvent(message);
  if (event === "xpay_goods_deliver_notify") return normalizeGoods(message, appId, rawDigestSha256);
  if (event === "xpay_refund_notify") return normalizeRefund(message, appId, rawDigestSha256);
  fail();
}

module.exports = {
  MAX_CALLBACK_BODY_BYTES,
  isWechatCallbackConfigurationReady,
  verifyAndDecryptWechatMessage,
  verifyEncryptedWechatNotification,
  verifyWechatCallbackUrl,
};
