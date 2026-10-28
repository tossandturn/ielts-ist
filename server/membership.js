"use strict";

const crypto = require("crypto");
const { installTestbuyerCanarySchema } = require("./membershipTestbuyerCanary");

const PROTOCOL = "stemist-membership-v1";
const ALL_ACCESS_FEATURE = "all-access";
const PLAN = Object.freeze({
  id: "all-access-month",
  priceFen: 2880,
  currency: "CNY",
  durationDays: 30,
  autoRenew: false,
});
const PROVIDER_IDS = Object.freeze(["wechat_virtual", "wechat_jsapi"]);
const ORDER_STATUSES = new Set(["created", "pending", "paid", "fulfilled", "refunded", "closed", "failed"]);
const CHECKOUT_REQUEST_KEYS = new Set(["planId", "idempotencyKey", "wxCode", "platform", "clientCapability"]);

function enabled(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function membershipFlags(env = {}) {
  return {
    checkoutEnabled: enabled(env.MEMBERSHIP_CHECKOUT_ENABLED) && enabled(env.MEMBERSHIP_COMMERCE_READY),
    enforcementEnabled: enabled(env.MEMBERSHIP_ENFORCEMENT_ENABLED) && enabled(env.MEMBERSHIP_ENFORCEMENT_READY),
  };
}

function membershipCatalog(env = {}, providerRegistry = {}, { serverAuthorizedCheckout = false, honorGlobalCheckout = true } = {}) {
  const flags = membershipFlags(env);
  const checkoutGate = (honorGlobalCheckout === true && flags.checkoutEnabled) || serverAuthorizedCheckout === true;
  const providers = PROVIDER_IDS.map((id) => {
    const platforms = Array.isArray(providerRegistry[id]?.platforms)
      ? [...new Set(providerRegistry[id].platforms.filter((platform) => ["android", "ios"].includes(platform)))]
      : [];
    const readiness = typeof providerRegistry[id]?.readiness === "function"
      ? providerRegistry[id].readiness()
      : { ready: false, reason: "setup_required" };
    const providerEnabled = checkoutGate && readiness?.ready === true && platforms.length > 0;
    return {
      id,
      enabled: providerEnabled,
      reason: providerEnabled ? "ready" : "setup_required",
      platforms: providerEnabled ? platforms : [],
    };
  });
  const checkoutEnabled = providers.some((provider) => provider.enabled);
  return {
    protocol: PROTOCOL,
    plan: { ...PLAN },
    commerce: {
      checkoutEnabled,
      reason: checkoutEnabled ? "ready" : "setup_required",
      providers,
    },
    enforcement: { enabled: flags.enforcementEnabled, appliesToExistingUsers: true },
  };
}

function installMembershipSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS membership_orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      provider TEXT NOT NULL CHECK (provider IN ('wechat_virtual', 'wechat_jsapi')),
      platform TEXT CHECK (platform IS NULL OR platform IN ('android', 'ios')),
      idempotency_key TEXT NOT NULL,
      out_trade_no TEXT NOT NULL UNIQUE,
      amount_fen INTEGER NOT NULL CHECK (amount_fen > 0),
      currency TEXT NOT NULL CHECK (currency = 'CNY'),
      duration_days INTEGER NOT NULL CHECK (duration_days > 0),
      auto_renew INTEGER NOT NULL DEFAULT 0 CHECK (auto_renew IN (0, 1)),
      status TEXT NOT NULL CHECK (status IN ('created', 'pending', 'paid', 'fulfilled', 'refunded', 'closed', 'failed')),
      payer_app_id TEXT,
      payer_openid TEXT,
      provider_order_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      paid_at TEXT,
      fulfilled_at TEXT,
      refunded_at TEXT,
      UNIQUE(user_id, idempotency_key),
      UNIQUE(provider, provider_order_id)
    );
    CREATE INDEX IF NOT EXISTS idx_membership_orders_user_created ON membership_orders(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_membership_orders_status_updated ON membership_orders(status, updated_at);
    CREATE TABLE IF NOT EXISTS membership_order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      provider_order_id TEXT,
      out_trade_no TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK (event_type IN ('paid', 'refunded')),
      payload_sha256 TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      UNIQUE(provider, event_id)
    );
    CREATE TABLE IF NOT EXISTS membership_baselines (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT,
      starts_at TEXT,
      expires_at TEXT,
      captured_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS membership_grants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL CHECK (source_type IN ('payment', 'redemption', 'admin')),
      source_key TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      duration_days INTEGER NOT NULL CHECK (duration_days > 0),
      effective_at TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      reversed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_membership_grants_user_effective ON membership_grants(user_id, effective_at, id);
  `);
  installTestbuyerCanarySchema(db);
  if (!db.prepare('PRAGMA table_info(membership_orders)').all().some((column) => column.name === 'platform')) {
    db.exec("ALTER TABLE membership_orders ADD COLUMN platform TEXT CHECK (platform IS NULL OR platform IN ('android', 'ios'))");
  }
  // Only an exact, already-bound legacy Android canary establishes platform.
  db.exec(`UPDATE membership_orders SET platform='android' WHERE platform IS NULL
    AND provider='wechat_virtual' AND plan_id='all-access-month' AND amount_fen=2880 AND currency='CNY' AND duration_days=30 AND auto_renew=0
    AND EXISTS (SELECT 1 FROM membership_testbuyer_canary c WHERE c.slot=1 AND c.user_id=membership_orders.user_id
      AND c.idempotency_key=membership_orders.idempotency_key AND (c.order_id IS NULL OR c.order_id=membership_orders.id));
    CREATE INDEX IF NOT EXISTS idx_membership_orders_user_platform_created ON membership_orders(user_id,platform,created_at DESC);`);
}

function canonicalUserId(userId) {
  const numeric = Number(String(userId || "").replace(/^ielts:/, ""));
  if (!Number.isSafeInteger(numeric) || numeric <= 0) throw Object.assign(new Error("Membership user is invalid."), { statusCode: 400, code: "membership_user_invalid" });
  return { numeric, publicId: `ielts:${numeric}` };
}

function currentMembership(db, userId) {
  return db.prepare("SELECT * FROM memberships WHERE user_id = ?").get(userId) || null;
}

function membershipEntitlement(db, userId, now = Date.now()) {
  const row = currentMembership(db, canonicalUserId(userId).numeric);
  const expires = row ? Date.parse(row.expires_at) : Number.NaN;
  return {
    active: Number.isFinite(expires) && expires > now,
    planId: row?.plan || null,
    startsAt: row?.starts_at || null,
    expiresAt: row?.expires_at || null,
    version: row?.updated_at || null,
  };
}

function membershipStatus(db, userId, env = {}, now = Date.now()) {
  const owner = canonicalUserId(userId);
  return {
    protocol: PROTOCOL,
    userId: owner.publicId,
    entitlement: membershipEntitlement(db, owner.numeric, now),
    enforcement: { enabled: membershipFlags(env).enforcementEnabled, appliesToExistingUsers: true },
  };
}

function membershipFeatureForIeltsRequest(method, pathname) {
  const verb = String(method || "GET").toUpperCase();
  const path = String(pathname || "").split("?", 1)[0].toLowerCase();
  if (path === "/qwen-client" || path.startsWith("/generated/") || path === "/cambridge15/pdf"
      || path.startsWith("/cambridge15/audio/") || path.startsWith("/cambridge-local/file/")) return ALL_ACCESS_FEATURE;
  if (path.startsWith("/api/native/ielts/tasks/")) return ALL_ACCESS_FEATURE;
  if (!path.startsWith("/api/")) return null;
  if (path === "/api/me" || path.startsWith("/api/auth/") || path.startsWith("/api/membership/")
      || path.startsWith("/api/admin/") || path === "/api/stem/identity" || path.startsWith("/api/stem/internal/") || path === "/api/redeem"
      || path === "/api/qwen-runtime") return null;
  if (verb === "GET" && (path === "/api/stem/marking/availability"
      || /^\/api\/stem\/marking\/submissions\/[^/]+$/.test(path)
      || /^\/api\/stem\/marking\/organizations\/[^/]+\/summary$/.test(path))) return null;
  if (path.startsWith("/api/stem/marking/")) return ALL_ACCESS_FEATURE;
  if (path === "/api/coach/conversations") return verb === "GET" ? null : ALL_ACCESS_FEATURE;
  if (path.startsWith("/api/drafts") || path.startsWith("/api/vocabulary")) {
    return ["GET", "HEAD", "DELETE"].includes(verb) ? null : ALL_ACCESS_FEATURE;
  }
  if (path === "/api/learning/profile") return null;
  if (path === "/api/learning/state") return verb === "GET" ? null : ALL_ACCESS_FEATURE;
  if (path === "/api/learning/attempts") return ["GET", "HEAD", "DELETE"].includes(verb) ? null : ALL_ACCESS_FEATURE;
  if (path.startsWith("/api/learning/")) return ALL_ACCESS_FEATURE;
  if (verb === "GET" && /^\/api\/objective\/attempts\/[^/]+\/review$/.test(path)) return null;
  if (["/api/objective/exams", "/api/objective/attempts"].includes(path)) return ALL_ACCESS_FEATURE;
  if (["GET", "HEAD"].includes(verb) && (path.startsWith("/api/report/pdf/")
      || path.startsWith("/api/speaking/recording-download/")
      || path.startsWith("/api/writing/feedback/job/"))) return null;
  if (path.startsWith("/api/tasks")) return ALL_ACCESS_FEATURE;
  if (path.startsWith("/api/reading/context") || path.startsWith("/api/listening/scripts")
      || path.startsWith("/api/listening/asr-cache") || path.startsWith("/api/qwen-session")
      || path === "/api/qwen-webrtc-offer") return ALL_ACCESS_FEATURE;
  if (path.startsWith("/api/writing/") || path.startsWith("/api/speaking/")
      || path === "/api/tts" || path.startsWith("/api/help/")
      || path === "/api/listening/score" || path === "/api/reading/score"
      || path === "/api/exam/report") return ALL_ACCESS_FEATURE;
  if (path.startsWith("/api/ai/")) return ALL_ACCESS_FEATURE;
  return null;
}

function requireActiveMembership(db, userId, env = {}, now = Date.now()) {
  if (!membershipFlags(env).enforcementEnabled) return { enforced: false };
  let entitlement;
  try {
    entitlement = membershipEntitlement(db, userId, now);
  } catch {
    throw Object.assign(new Error("Membership authority is unavailable."), {
      statusCode: 503,
      code: "membership_authority_unavailable",
    });
  }
  if (entitlement.active !== true) {
    throw Object.assign(new Error("An active membership is required."), {
      statusCode: 403,
      code: "membership_required",
      entitlement,
    });
  }
  return { ...entitlement, enforced: true };
}

function publicOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    ...(row.platform ? { platform: row.platform } : {}),
    status: row.status,
    planId: row.plan_id,
    priceFen: row.amount_fen,
    currency: row.currency,
    durationDays: row.duration_days,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    ...(row.paid_at ? { paidAt: row.paid_at } : {}),
  };
}

function internalOrder(row) {
  return {
    id: row.id, userId: row.user_id, planId: row.plan_id, productId: row.product_id,
    platform: row.platform || null,
    provider: row.provider, idempotencyKey: row.idempotency_key, outTradeNo: row.out_trade_no,
    amountFen: row.amount_fen, currency: row.currency, durationDays: row.duration_days,
    autoRenew: row.auto_renew === 1, status: row.status, payerAppId: row.payer_app_id,
    payerOpenid: row.payer_openid, providerOrderId: row.provider_order_id || null,
    createdAt: row.created_at, updatedAt: row.updated_at, expiresAt: row.expires_at,
  };
}

function paymentResponse(providerId, payment) {
  const parameters = payment?.parameters || {
    ...(payment?.mode ? { mode: payment.mode } : {}),
    ...(payment?.signData ? { signData: payment.signData } : {}),
    ...(payment?.paySig ? { paySig: payment.paySig } : {}),
    ...(payment?.signature ? { signature: payment.signature } : {}),
  };
  return { provider: providerId, parameters };
}

function checkoutMustNotReturnPayment(status) {
  return ["paid", "fulfilled", "refunded", "closed"].includes(status);
}

function listMembershipOrders(db, userId, { limit = 50, offset = 0 } = {}) {
  const owner = canonicalUserId(userId);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const rows = db.prepare(`
    SELECT * FROM membership_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(owner.numeric, safeLimit + 1, safeOffset);
  return {
    protocol: PROTOCOL,
    userId: owner.publicId,
    orders: rows.slice(0, safeLimit).map(publicOrder),
    hasMore: rows.length > safeLimit,
  };
}

function getMembershipOrder(db, userId, orderId) {
  const owner = canonicalUserId(userId);
  const id = String(orderId || "").trim();
  const row = id ? db.prepare("SELECT * FROM membership_orders WHERE id = ? AND user_id = ?").get(id, owner.numeric) : null;
  if (!row) throw Object.assign(new Error("Membership order not found."), { statusCode: 404, code: "membership_order_not_found" });
  return {
    protocol: PROTOCOL,
    userId: owner.publicId,
    order: publicOrder(row),
    entitlement: membershipEntitlement(db, owner.numeric),
  };
}

async function refreshMembershipOrder({ db, userId, orderId, providerRegistry = {} }) {
  const owner = canonicalUserId(userId);
  const id = String(orderId || "").trim();
  const order = id ? db.prepare("SELECT * FROM membership_orders WHERE id = ? AND user_id = ?").get(id, owner.numeric) : null;
  if (!order) throw Object.assign(new Error("Membership order not found."), { statusCode: 404, code: "membership_order_not_found" });
  if (["refunded", "closed"].includes(order.status)) return getMembershipOrder(db, owner.publicId, id);
  const provider = providerRegistry[order.provider];
  if (!provider || typeof provider.queryOrder !== "function" || provider.readiness?.().ready !== true) {
    throw Object.assign(new Error("Membership payment confirmation is temporarily unavailable."), {
      statusCode: 503,
      code: "membership_provider_unavailable",
    });
  }
  const result = await provider.queryOrder({ order: internalOrder(order) });
  if (!result || result.provider !== order.provider || !result.state) {
    throw Object.assign(new Error("Membership payment confirmation is invalid."), {
      statusCode: 503,
      code: "membership_provider_invalid",
    });
  }
  if (result.normalizedEvent) applyVerifiedProviderResult(db, result.normalizedEvent);
  else if (result.state === "closed") {
    db.prepare("UPDATE membership_orders SET status='closed',updated_at=? WHERE id=? AND status IN ('created','pending','failed')")
      .run(new Date().toISOString(), order.id);
  } else if (["created", "failed"].includes(order.status)) {
    db.prepare("UPDATE membership_orders SET status='pending',updated_at=? WHERE id=? AND status IN ('created','failed')")
      .run(new Date().toISOString(), order.id);
  }
  return getMembershipOrder(db, owner.publicId, id);
}

function normalizeCheckoutRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).some((key) => !CHECKOUT_REQUEST_KEYS.has(key))) {
    throw Object.assign(new Error("Membership checkout request is invalid."), { statusCode: 400, code: "membership_checkout_invalid" });
  }
  const planId = String(payload.planId || "");
  const idempotencyKey = String(payload.idempotencyKey || "");
  if (planId !== PLAN.id || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(idempotencyKey)) {
    throw Object.assign(new Error("Membership checkout request is invalid."), { statusCode: 400, code: "membership_checkout_invalid" });
  }
  return {
    planId,
    idempotencyKey,
    wxCode: String(payload.wxCode || "").slice(0, 512),
    platform: String(payload.platform || "unknown").trim().toLowerCase().slice(0, 32),
    clientCapability: payload.clientCapability && typeof payload.clientCapability === "object" && !Array.isArray(payload.clientCapability)
      ? payload.clientCapability
      : {},
  };
}

async function createMembershipCheckout({ db, userId, payload, env = {}, providerRegistry = {}, resolveWechatIdentity, serverAuthorizedCheckout = false, assertCheckoutAuthorized }) {
  const request = normalizeCheckoutRequest(payload);
  const owner = canonicalUserId(userId);
  const assertLifecycle = (phase) => {
    if (!serverAuthorizedCheckout) return;
    if (typeof assertCheckoutAuthorized !== "function") {
      throw Object.assign(new Error("Membership checkout authorization is unavailable."), { statusCode: 503, code: "membership_checkout_unavailable" });
    }
    assertCheckoutAuthorized({ phase, userId: owner.publicId, idempotencyKey: request.idempotencyKey });
  };
  const initialExisting = db.prepare("SELECT * FROM membership_orders WHERE user_id = ? AND idempotency_key = ?").get(owner.numeric, request.idempotencyKey);
  const assertOrderPlatform = (row) => {
    if (row && (row.platform && row.platform !== request.platform || !row.platform && !checkoutMustNotReturnPayment(row.status))) {
      throw Object.assign(new Error("Membership checkout platform conflicts with the existing order."), { statusCode: 409, code: "membership_checkout_conflict" });
    }
  };
  assertOrderPlatform(initialExisting);
  if (initialExisting && checkoutMustNotReturnPayment(initialExisting.status)) return getMembershipOrder(db, owner.publicId, initialExisting.id);
  const catalog = membershipCatalog(env, providerRegistry, { serverAuthorizedCheckout });
  if (!catalog.commerce.checkoutEnabled) {
    throw Object.assign(new Error("Membership checkout is not available yet."), { statusCode: 503, code: "membership_checkout_unavailable" });
  }
  const provider = catalog.commerce.providers.find((item) => item.enabled && providerRegistry[item.id]
    && item.platforms.includes(request.platform) && (!initialExisting || item.id === initialExisting.provider));
  if (!provider) throw Object.assign(new Error("Membership checkout is not available on this platform."), {
    statusCode: 409,
    code: "membership_platform_unavailable",
  });
  assertLifecycle("before_identity");
  const identity = await resolveWechatIdentity({ userId: owner.numeric, provider: provider.id, wxCode: request.wxCode });
  assertLifecycle("after_identity");
  if (!identity || Number(identity.userId) !== owner.numeric || !identity.appId || !identity.openid) {
    throw Object.assign(new Error("A verified WeChat payer identity is required."), { statusCode: 409, code: "wechat_identity_required" });
  }
  const existing = db.prepare("SELECT * FROM membership_orders WHERE user_id = ? AND idempotency_key = ?").get(owner.numeric, request.idempotencyKey);
  assertOrderPlatform(existing);
  if (existing) {
    if (existing.provider !== provider.id || existing.payer_app_id !== identity.appId || existing.payer_openid !== identity.openid) {
      throw Object.assign(new Error("Membership checkout identity changed for this idempotency key."), { statusCode: 409, code: "membership_checkout_conflict" });
    }
    if (checkoutMustNotReturnPayment(existing.status)) return getMembershipOrder(db, owner.publicId, existing.id);
    let payment;
    try {
      assertLifecycle("before_provider_checkout");
      payment = await providerRegistry[provider.id].createCheckout({
        order: internalOrder(existing), identity, sessionContext: identity.sessionContext || null,
      });
    } catch (error) {
      const latest = db.prepare("SELECT * FROM membership_orders WHERE id=?").get(existing.id);
      if (latest && checkoutMustNotReturnPayment(latest.status)) return getMembershipOrder(db, owner.publicId, latest.id);
      throw error;
    }
    const afterProvider = db.prepare("SELECT * FROM membership_orders WHERE id=?").get(existing.id);
    if (checkoutMustNotReturnPayment(afterProvider.status)) return getMembershipOrder(db, owner.publicId, afterProvider.id);
    assertLifecycle("after_provider_checkout");
    if (payment?.providerOrderId && afterProvider.provider_order_id && payment.providerOrderId !== afterProvider.provider_order_id) {
      throw Object.assign(new Error("Membership provider order identity changed during checkout."), { statusCode: 409, code: "membership_checkout_conflict" });
    }
    db.prepare("UPDATE membership_orders SET status='pending', provider_order_id=COALESCE(provider_order_id,?), updated_at=? WHERE id=? AND status IN ('created','pending','failed')")
      .run(payment?.providerOrderId || null, new Date().toISOString(), existing.id);
    const refreshed = db.prepare("SELECT * FROM membership_orders WHERE id = ?").get(existing.id);
    if (checkoutMustNotReturnPayment(refreshed.status)) return getMembershipOrder(db, owner.publicId, refreshed.id);
    assertLifecycle("before_payment_return");
    return { protocol: PROTOCOL, userId: owner.publicId, order: publicOrder(refreshed), payment: paymentResponse(provider.id, payment) };
  }
  const now = new Date();
  const transactionId = `M${crypto.randomBytes(15).toString("hex")}`;
  const order = {
    id: transactionId, userId: owner.numeric, planId: PLAN.id, platform: request.platform,
    productId: String(providerRegistry[provider.id].productId || PLAN.id), provider: provider.id,
    idempotencyKey: request.idempotencyKey,
    outTradeNo: transactionId, amountFen: PLAN.priceFen,
    currency: PLAN.currency, durationDays: PLAN.durationDays, autoRenew: false,
    status: "created", payerAppId: identity.appId, payerOpenid: identity.openid,
    providerOrderId: null, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
  };
  db.prepare(`
    INSERT INTO membership_orders
      (id,user_id,plan_id,product_id,provider,idempotency_key,out_trade_no,amount_fen,currency,duration_days,auto_renew,status,payer_app_id,payer_openid,provider_order_id,created_at,updated_at,expires_at,platform)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(order.id, order.userId, order.planId, order.productId, order.provider, order.idempotencyKey, order.outTradeNo,
    order.amountFen, order.currency, order.durationDays, 0, "created", order.payerAppId, order.payerOpenid,
    null, order.createdAt, order.updatedAt, order.expiresAt, order.platform);
  let payment;
  try {
    assertLifecycle("before_provider_checkout");
    payment = await providerRegistry[provider.id].createCheckout({ order, identity, sessionContext: identity.sessionContext || null });
    const afterProvider = db.prepare("SELECT * FROM membership_orders WHERE id=?").get(order.id);
    if (!checkoutMustNotReturnPayment(afterProvider.status)) {
      assertLifecycle("after_provider_checkout");
      if (payment?.providerOrderId && afterProvider.provider_order_id && payment.providerOrderId !== afterProvider.provider_order_id) {
        throw Object.assign(new Error("Membership provider order identity changed during checkout."), { statusCode: 409, code: "membership_checkout_conflict" });
      }
      db.prepare("UPDATE membership_orders SET status='pending',provider_order_id=COALESCE(provider_order_id,?),updated_at=? WHERE id=? AND status IN ('created','failed')")
        .run(payment?.providerOrderId || null, new Date().toISOString(), order.id);
    }
  } catch (error) {
    let latest = db.prepare("SELECT * FROM membership_orders WHERE id=?").get(order.id);
    if (latest && checkoutMustNotReturnPayment(latest.status)) return getMembershipOrder(db, owner.publicId, latest.id);
    db.prepare("UPDATE membership_orders SET status='failed',updated_at=? WHERE id=? AND status='created'")
      .run(new Date().toISOString(), order.id);
    latest = db.prepare("SELECT * FROM membership_orders WHERE id=?").get(order.id);
    if (latest && checkoutMustNotReturnPayment(latest.status)) return getMembershipOrder(db, owner.publicId, latest.id);
    throw error;
  }
  const stored = db.prepare("SELECT * FROM membership_orders WHERE id = ?").get(order.id);
  if (checkoutMustNotReturnPayment(stored.status)) return getMembershipOrder(db, owner.publicId, stored.id);
  assertLifecycle("before_payment_return");
  return { protocol: PROTOCOL, userId: owner.publicId, order: publicOrder(stored), payment: paymentResponse(provider.id, payment) };
}

function ensureBaseline(db, userId, capturedAt) {
  if (db.prepare("SELECT user_id FROM membership_baselines WHERE user_id = ?").get(userId)) return;
  const row = currentMembership(db, userId);
  db.prepare("INSERT INTO membership_baselines (user_id, plan_id, starts_at, expires_at, captured_at) VALUES (?, ?, ?, ?, ?)")
    .run(userId, row?.plan || null, row?.starts_at || null, row?.expires_at || null, capturedAt);
}

function recomputeMembership(db, userId, updatedAt) {
  const baseline = db.prepare("SELECT * FROM membership_baselines WHERE user_id = ?").get(userId) || null;
  const grants = db.prepare(`
    SELECT * FROM membership_grants WHERE user_id = ? AND reversed_at IS NULL ORDER BY effective_at ASC, id ASC
  `).all(userId);
  let startsAt = baseline?.starts_at || null;
  let expiresMs = baseline?.expires_at ? Date.parse(baseline.expires_at) : Number.NaN;
  let planId = baseline?.plan_id || null;
  for (const grant of grants) {
    const effectiveMs = Date.parse(grant.effective_at);
    if (!Number.isFinite(effectiveMs)) throw new Error("Membership grant timestamp is invalid.");
    if (!startsAt) startsAt = grant.effective_at;
    expiresMs = Math.max(Number.isFinite(expiresMs) ? expiresMs : effectiveMs, effectiveMs)
      + Number(grant.duration_days) * 24 * 60 * 60 * 1000;
    planId = grant.plan_id;
  }
  if (!planId || !Number.isFinite(expiresMs)) {
    db.prepare("DELETE FROM memberships WHERE user_id = ?").run(userId);
    return null;
  }
  const expiresAt = new Date(expiresMs).toISOString();
  db.prepare(`
    INSERT INTO memberships (user_id, plan, starts_at, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,starts_at=excluded.starts_at,expires_at=excluded.expires_at,updated_at=excluded.updated_at
  `).run(userId, planId, startsAt || updatedAt, expiresAt, updatedAt);
  return currentMembership(db, userId);
}

function recordMembershipGrant(db, { userId, sourceType, sourceKey, planId, durationDays, effectiveAt, grantedAt }) {
  const owner = canonicalUserId(userId);
  const source = String(sourceKey || "");
  const days = Number(durationDays);
  if (!new Set(["payment", "redemption", "admin"]).has(sourceType) || !source || !Number.isInteger(days) || days <= 0) {
    throw new Error("Membership grant is invalid.");
  }
  ensureBaseline(db, owner.numeric, grantedAt);
  db.prepare(`
    INSERT OR IGNORE INTO membership_grants
      (user_id,source_type,source_key,plan_id,duration_days,effective_at,granted_at)
    VALUES (?,?,?,?,?,?,?)
  `).run(owner.numeric, sourceType, source, planId, days, effectiveAt, grantedAt);
  return recomputeMembership(db, owner.numeric, grantedAt);
}

function applyVerifiedProviderResult(db, result) {
  if (!result || result.verified !== true || !PROVIDER_IDS.includes(result.provider)
      || !["paid", "refunded"].includes(result.eventType)) {
    throw Object.assign(new Error("Verified membership provider result is required."), { code: "membership_provider_verification_required" });
  }
  const eventId = String(result.eventId || "");
  const payloadSha = String(result.rawDigestSha256 || "");
  if (!eventId || !/^[a-f0-9]{64}$/.test(payloadSha)) throw new Error("Verified membership event identity is invalid.");
  const existingEvent = db.prepare("SELECT * FROM membership_order_events WHERE provider = ? AND event_id = ?").get(result.provider, eventId);
  if (existingEvent) {
    if (existingEvent.out_trade_no !== result.outTradeNo
        || existingEvent.provider_order_id !== result.providerOrderId
        || existingEvent.event_type !== result.eventType) {
      throw Object.assign(new Error("Membership provider event identity conflicts with an earlier event."), { code: "membership_payment_mismatch" });
    }
    const duplicateOrder = db.prepare("SELECT * FROM membership_orders WHERE provider = ? AND out_trade_no = ?").get(result.provider, existingEvent.out_trade_no);
    return { duplicate: true, order: publicOrder(duplicateOrder), entitlement: duplicateOrder ? membershipEntitlement(db, duplicateOrder.user_id) : null };
  }
  const order = db.prepare("SELECT * FROM membership_orders WHERE provider = ? AND out_trade_no = ?").get(result.provider, result.outTradeNo);
  if (!order || order.payer_app_id !== result.payerAppId
      || order.payer_openid !== result.payerOpenid || order.product_id !== result.productId
      || order.amount_fen !== Number(result.amountFen) || order.currency !== result.currency) {
    throw Object.assign(new Error("Verified payment does not match the membership order."), { code: "membership_payment_mismatch" });
  }
  if (!String(result.providerOrderId || "") || (order.provider_order_id && order.provider_order_id !== result.providerOrderId)) {
    throw new Error("Membership provider order identity mismatch.");
  }
  const occurredAt = new Date(result.occurredAt || result.paidAt || Date.now()).toISOString();
  const paidAt = result.eventType === "paid" ? new Date(result.paidAt || occurredAt).toISOString() : null;
  const processedAt = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`INSERT INTO membership_order_events (provider,event_id,provider_order_id,out_trade_no,event_type,payload_sha256,occurred_at,processed_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(result.provider, eventId, result.providerOrderId || null, order.out_trade_no, result.eventType, payloadSha, occurredAt, processedAt);
    if (result.eventType === "paid") {
      if (order.status === "refunded") throw new Error("A refunded membership order cannot become paid again.");
      db.prepare("UPDATE membership_orders SET status='fulfilled',provider_order_id=?,paid_at=COALESCE(paid_at,?),fulfilled_at=COALESCE(fulfilled_at,?),updated_at=? WHERE id=?")
        .run(result.providerOrderId || null, paidAt, processedAt, processedAt, order.id);
      recordMembershipGrant(db, {
        userId: order.user_id, sourceType: "payment", sourceKey: `payment:${result.provider}:${result.providerOrderId}`,
        planId: order.plan_id, durationDays: order.duration_days, effectiveAt: paidAt, grantedAt: processedAt,
      });
    } else {
      const refundBeforePaid = ["created", "pending", "failed"].includes(order.status);
      const refundAfterPaid = ["paid", "fulfilled", "refunded"].includes(order.status)
        && order.provider_order_id === result.providerOrderId;
      if (!refundBeforePaid && !refundAfterPaid) throw new Error("Refund does not match a payable provider order.");
      // A provider-confirmed full refund can race ahead of the paid delivery.
      // Capture any legacy entitlement before recomputing an order that never
      // created a payment grant, otherwise an empty ledger could erase it.
      ensureBaseline(db, order.user_id, processedAt);
      db.prepare("UPDATE membership_orders SET status='refunded',provider_order_id=COALESCE(provider_order_id,?),refunded_at=COALESCE(refunded_at,?),updated_at=? WHERE id=?")
        .run(result.providerOrderId, occurredAt, processedAt, order.id);
      db.prepare("UPDATE membership_grants SET reversed_at=COALESCE(reversed_at,?) WHERE source_key=?")
        .run(occurredAt, `payment:${result.provider}:${result.providerOrderId}`);
      recomputeMembership(db, order.user_id, processedAt);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return {
    duplicate: false,
    order: publicOrder(db.prepare("SELECT * FROM membership_orders WHERE id = ?").get(order.id)),
    entitlement: membershipEntitlement(db, order.user_id),
  };
}

module.exports = {
  PROTOCOL,
  PLAN,
  applyVerifiedProviderResult,
  createMembershipCheckout,
  getMembershipOrder,
  installMembershipSchema,
  listMembershipOrders,
  membershipCatalog,
  membershipEntitlement,
  membershipFeatureForIeltsRequest,
  membershipFlags,
  membershipStatus,
  normalizeCheckoutRequest,
  publicOrder,
  refreshMembershipOrder,
  requireActiveMembership,
  recordMembershipGrant,
};
