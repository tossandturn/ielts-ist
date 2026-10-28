"use strict";

const MODE = "single-real-payment";
const PLATFORM = "android";
const MAX_WINDOW_MS = 2 * 60 * 60 * 1000;
const IDEMPOTENCY_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const ORDER_RE = /^M[a-f0-9]{30}$/;

function flag(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function clean(value, pattern, maximum = 128) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length <= maximum && pattern.test(normalized) ? normalized : "";
}

function canaryError(code, statusCode = 503, message = "Membership checkout is not available yet.") {
  return Object.assign(new Error(message), { code, statusCode });
}

function readTestbuyerCanaryConfig(env = {}, now = Date.now(), platform = PLATFORM) {
  const prefix = platform === 'ios' ? 'MEMBERSHIP_TESTBUYER_IOS_CANARY_' : 'MEMBERSHIP_TESTBUYER_CANARY_';
  const canaryId = clean(env[prefix + 'ID'], /^[A-Za-z0-9][A-Za-z0-9._:-]{7,63}$/);
  const userId = clean(env.MEMBERSHIP_TESTBUYER_CANARY_USER_ID, /^ielts:[1-9]\d{0,14}$/);
  const startsMs = Date.parse(String(env[prefix + 'STARTS_AT'] || ""));
  const expiresMs = Date.parse(String(env[prefix + 'EXPIRES_AT'] || ""));
  const windowValid = Number.isFinite(startsMs) && Number.isFinite(expiresMs)
    && expiresMs > startsMs && expiresMs - startsMs <= MAX_WINDOW_MS;
  const configured = ['android', 'ios'].includes(platform) && flag(env[prefix + 'ENABLED'])
    && String(env[prefix + 'MODE'] || "").trim() === MODE
    && Boolean(canaryId && userId && windowValid);
  const active = configured && Number(now) >= startsMs && Number(now) < expiresMs;
  return Object.freeze({
    configured,
    active,
    inactiveReason: configured && Number(now) >= expiresMs ? "testbuyer_canary_expired" : "setup_required",
    canaryId: configured ? canaryId : "",
    userId: configured ? userId : "",
    startsAt: configured ? new Date(startsMs).toISOString() : null,
    expiresAt: configured ? new Date(expiresMs).toISOString() : null,
    startsMs: configured ? startsMs : null,
    expiresMs: configured ? expiresMs : null,
    platform,
    maxNewOrders: 1,
  });
}

function installTestbuyerCanarySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS membership_testbuyer_canary (
      slot INTEGER PRIMARY KEY CHECK (slot = 1),
      canary_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      idempotency_key TEXT NOT NULL,
      order_id TEXT UNIQUE,
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      reserved_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS membership_testbuyer_platform_canary (
      platform TEXT PRIMARY KEY CHECK (platform='ios'),
      canary_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      idempotency_key TEXT NOT NULL,
      order_id TEXT UNIQUE,
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      reserved_at TEXT NOT NULL
    );
  `);
}

function numericUserId(value) {
  const match = String(value || "").match(/^ielts:([1-9]\d{0,14})$/);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function storageFor(config) {
  if (config.platform === 'android') return { table: 'membership_testbuyer_canary', key: 'slot', value: 1 };
  if (config.platform === 'ios') return { table: 'membership_testbuyer_platform_canary', key: 'platform', value: 'ios' };
  throw canaryError('membership_platform_unavailable', 409);
}

function rowForSlot(db, config) {
  const storage = storageFor(config);
  return db.prepare(`SELECT * FROM ${storage.table} WHERE ${storage.key}=?`).get(storage.value) || null;
}

function recoveryForRow(db, row, config) {
  if (!row) return null;
  const order = row.order_id
    ? db.prepare("SELECT id,status FROM membership_orders WHERE id=? AND user_id=? AND idempotency_key=? AND (platform=? OR (?='android' AND platform IS NULL))").get(row.order_id, row.user_id, row.idempotency_key, config.platform, config.platform)
    : db.prepare("SELECT id,status FROM membership_orders WHERE user_id=? AND idempotency_key=? AND (platform=? OR (?='android' AND platform IS NULL)) ORDER BY created_at ASC LIMIT 1").get(row.user_id, row.idempotency_key, config.platform, config.platform);
  const retryableBeforePayment = order && ["created", "failed"].includes(order.status);
  return { idempotencyKey: row.idempotency_key, orderId: order && !retryableBeforePayment ? order.id : null };
}

function rowMatchesConfig(row, config) {
  return Boolean(row && config.configured
    && row.canary_id === config.canaryId
    && Number(row.user_id) === numericUserId(config.userId)
    && row.starts_at === config.startsAt
    && row.expires_at === config.expiresAt);
}

function testbuyerCanaryState(db, config, userId) {
  if (!config?.configured || String(userId || "") !== config.userId) {
    return { authorized: false, active: false, reason: "setup_required", canary: null };
  }
  const row = rowForSlot(db, config);
  if (row && !rowMatchesConfig(row, config)) {
    return { authorized: true, active: false, reason: "setup_required", canary: null };
  }
  const recovery = recoveryForRow(db, row, config);
  const descriptor = {
    mode: "single-testbuyer",
    expiresAt: config.expiresAt,
    remainingNewOrders: row ? 0 : 1,
    recovery,
  };
  if (!config.active) return { authorized: true, active: false, reason: config.inactiveReason, canary: descriptor };
  return {
    authorized: true,
    active: true,
    reason: row ? "testbuyer_canary_recovery_required" : "testbuyer_canary",
    canary: descriptor,
  };
}

function reserveTestbuyerCanary(db, config, { userId, idempotencyKey, platform, now = Date.now } = {}) {
  if (!config?.configured || String(userId || "") !== config.userId) throw canaryError("membership_checkout_unavailable");
  if (String(platform || "") !== config.platform) throw canaryError("membership_platform_unavailable", 409, "Membership checkout is not available on this platform.");
  if (!IDEMPOTENCY_RE.test(String(idempotencyKey || ""))) throw canaryError("membership_checkout_invalid", 400, "Membership checkout request is invalid.");
  const checkWindow = () => {
    const observed = Number(typeof now === 'function' ? now() : now);
    if (!Number.isFinite(observed) || observed < config.startsMs) throw canaryError('membership_checkout_unavailable');
    if (observed >= config.expiresMs) throw canaryError('membership_canary_expired', 503, 'The test payment window has expired.');
    return observed;
  };
  checkWindow();
  const numeric = numericUserId(config.userId);
  // SQLite's write lock serializes the cross-table check and insert, including
  // separate processes/connections. A losing platform must not consume its slot.
  db.exec('BEGIN IMMEDIATE');
  try {
  const reservedAt = new Date(checkWindow()).toISOString();
  const other = rowForSlot(db, { platform: config.platform === 'ios' ? 'android' : 'ios' });
  if (other && Number(other.user_id) === numeric && other.idempotency_key === String(idempotencyKey)) {
    throw canaryError('membership_checkout_conflict', 409, 'The test payment key belongs to another platform.');
  }
  const before = rowForSlot(db, config);
  if (!before && db.prepare("SELECT id FROM membership_orders WHERE user_id=? AND idempotency_key=? LIMIT 1").get(numeric, String(idempotencyKey))) {
    throw canaryError("membership_checkout_conflict", 409, "The test payment idempotency key is already in use.");
  }
  const storage = storageFor(config);
  db.prepare(`
    INSERT OR IGNORE INTO ${storage.table}
      (${storage.key},canary_id,user_id,idempotency_key,order_id,starts_at,expires_at,reserved_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(storage.value, config.canaryId, numeric, String(idempotencyKey), null, config.startsAt, config.expiresAt, reservedAt);
  const row = rowForSlot(db, config);
  if (!rowMatchesConfig(row, config) || Number(row.user_id) !== numeric) throw canaryError("membership_checkout_unavailable");
  if (row.idempotency_key !== String(idempotencyKey)) {
    throw canaryError("membership_canary_recovery_required", 409, "The test payment slot is already reserved; recover the existing attempt.");
  }
  const recovery = recoveryForRow(db, row, config);
  const result = Object.freeze({
    canaryId: row.canary_id,
    userId: `ielts:${row.user_id}`,
    idempotencyKey: row.idempotency_key,
    orderId: recovery.orderId,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
  });
  db.exec('COMMIT');
  return result;
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  }
}

function assertTestbuyerCanaryActive(db, config, { userId, idempotencyKey, now = Date.now() } = {}) {
  if (!config?.configured || String(userId || "") !== config.userId || !IDEMPOTENCY_RE.test(String(idempotencyKey || ""))) {
    throw canaryError("membership_checkout_unavailable");
  }
  if (Number(now) < config.startsMs) throw canaryError("membership_checkout_unavailable");
  if (Number(now) >= config.expiresMs) throw canaryError("membership_canary_expired", 503, "The test payment window has expired.");
  const row = rowForSlot(db, config);
  if (!rowMatchesConfig(row, config) || row.idempotency_key !== String(idempotencyKey)) {
    throw canaryError("membership_canary_recovery_required", 409, "The test payment slot must recover its original request.");
  }
  return true;
}

function bindTestbuyerCanaryOrder(db, config, { userId, idempotencyKey, orderId, productId } = {}) {
  if (!config?.configured || String(userId || "") !== config.userId || !IDEMPOTENCY_RE.test(String(idempotencyKey || ""))
      || !ORDER_RE.test(String(orderId || "")) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(String(productId || ""))) {
    throw canaryError("membership_canary_binding_conflict", 409, "The test payment order cannot be bound.");
  }
  const row = rowForSlot(db, config);
  const numeric = numericUserId(config.userId);
  const order = db.prepare(`
    SELECT id FROM membership_orders
    WHERE id=? AND user_id=? AND idempotency_key=? AND plan_id='all-access-month' AND provider='wechat_virtual' AND product_id=?
      AND amount_fen=2880 AND currency='CNY' AND duration_days=30 AND auto_renew=0
      AND (platform=? OR (?='android' AND platform IS NULL))
  `).get(String(orderId), numeric, String(idempotencyKey), String(productId), config.platform, config.platform);
  if (!rowMatchesConfig(row, config) || row.idempotency_key !== String(idempotencyKey) || !order) {
    throw canaryError("membership_canary_binding_conflict", 409, "The test payment order cannot be bound.");
  }
  const storage = storageFor(config);
  db.prepare(`UPDATE ${storage.table} SET order_id=? WHERE ${storage.key}=? AND order_id IS NULL`).run(String(orderId), storage.value);
  const bound = rowForSlot(db, config);
  if (bound.order_id !== String(orderId)) throw canaryError("membership_canary_binding_conflict", 409, "The test payment order identity changed.");
  return Object.freeze({
    canaryId: bound.canary_id,
    userId: `ielts:${bound.user_id}`,
    idempotencyKey: bound.idempotency_key,
    orderId: bound.order_id,
    startsAt: bound.starts_at,
    expiresAt: bound.expires_at,
  });
}

module.exports = {
  MAX_WINDOW_MS,
  assertTestbuyerCanaryActive,
  bindTestbuyerCanaryOrder,
  installTestbuyerCanarySchema,
  readTestbuyerCanaryConfig,
  reserveTestbuyerCanary,
  testbuyerCanaryState,
};
