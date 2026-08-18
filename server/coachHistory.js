"use strict";

const crypto = require("crypto");

const MAX_CONVERSATIONS_PER_WRITE = 20;
const MAX_STORED_CONVERSATIONS = 80;
const MAX_MESSAGES = 80;
const MAX_CONTENT_LENGTH = 12_000;
const PRODUCT_RETURN_TO_ORIGINS = new Set(["https://ieltsist.com", "https://stem.ieltsist.com"]);
const TRANSIENT_RETURN_TO_PARAMS = new Set([
  "from",
  "focus",
  "returnto",
  "return_to",
  "auth",
  "bridge",
  "token",
  "access_token",
  "id_token",
  "refresh_token",
  "session",
  "code",
  "state",
  "callback",
  "redirect",
]);

function coachHistoryError(message, statusCode = 400, code = "") {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function initCoachHistorySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS coach_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_product TEXT NOT NULL DEFAULT 'ieltsist',
      surface TEXT,
      module TEXT,
      title TEXT,
      binding_json TEXT NOT NULL DEFAULT '{}',
      messages_json TEXT NOT NULL DEFAULT '[]',
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, conversation_id)
    );
    CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_updated ON coach_conversations(user_id, updated_at DESC);
  `);
}

function safeText(value, maxLength = 400) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function redactSecrets(value) {
  return safeText(value, MAX_CONTENT_LENGTH)
    .replace(/\bdata:[^,\s]+,[^\s]*/gi, "[data omitted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{10,}\b/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/gi, "[redacted]")
    .replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, "[redacted]")
    .replace(/\b((?:api[_-]?key|authorization|access[_-]?token|id[_-]?token|refresh[_-]?token|token|session)\s*[:=]\s*)[^\s,;]+/gi, "$1[redacted]");
}

function safeDate(value, fallback = new Date().toISOString()) {
  const text = safeText(value, 80);
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function safeObjectFields(value, allowedFields, maxFieldLength = 300) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  for (const field of allowedFields) {
    const raw = value[field];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "number" || typeof raw === "boolean") {
      output[field] = raw;
      continue;
    }
    const text = redactSecrets(raw).slice(0, maxFieldLength);
    if (text && !/^data:/i.test(text)) output[field] = text;
  }
  return output;
}

function sanitizeProductReturnTo(value) {
  const raw = safeText(value, 2_000);
  if (!raw || /^data:/i.test(raw)) return "";
  try {
    const url = new URL(raw);
    if (!PRODUCT_RETURN_TO_ORIGINS.has(url.origin.toLowerCase())) return "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRANSIENT_RETURN_TO_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    if (/(?:^|[?&#;])(from|focus|returnto|return_to|auth|bridge|token|access_token|id_token|refresh_token|session|code|state|callback|redirect)(?:=|[&#;]|$)/i.test(url.hash)) {
      url.hash = "";
    }
    const canonical = url.toString();
    return canonical.length <= 500 ? canonical : "";
  } catch {
    return "";
  }
}

function sanitizeAttachment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.dataUrl === "string" || /^data:/i.test(String(value.url || ""))) return null;
  const attachment = safeObjectFields(value, ["type", "mimeType", "name", "sha256", "source", "createdAt"], 180);
  const size = Number(value.size ?? value.bytes);
  if (Number.isFinite(size) && size >= 0 && size <= 50_000_000) attachment.size = Math.round(size);
  const width = Number(value.width);
  const height = Number(value.height);
  if (Number.isFinite(width) && width > 0 && width < 20_000) attachment.width = Math.round(width);
  if (Number.isFinite(height) && height > 0 && height < 20_000) attachment.height = Math.round(height);
  return Object.keys(attachment).length ? attachment : null;
}

function sanitizeMessage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const role = safeText(value.role, 20).toLowerCase();
  if (!["user", "assistant"].includes(role)) return null;
  const content = redactSecrets(value.content);
  if (!content) return null;
  const attachments = Array.isArray(value.attachments)
    ? value.attachments.map(sanitizeAttachment).filter(Boolean).slice(0, 4)
    : [];
  return {
    ...(safeText(value.id, 120) ? { id: safeText(value.id, 120) } : {}),
    role,
    content,
    createdAt: safeDate(value.createdAt),
    updatedAt: safeDate(value.updatedAt, safeDate(value.createdAt)),
    ...(attachments.length ? { attachments } : {}),
    ...(safeText(value.status, 40) ? { status: safeText(value.status, 40) } : {}),
  };
}

function normalizeConversationId(value) {
  const text = safeText(value, 180);
  if (text) return text;
  return `coach-${crypto.randomUUID()}`;
}

function normalizeConversation(value, defaults = {}) {
  const source = value && typeof value === "object" ? value : {};
  const now = new Date().toISOString();
  const messages = (Array.isArray(source.messages) ? source.messages : [])
    .map(sanitizeMessage)
    .filter(Boolean)
    .slice(-MAX_MESSAGES);
  if (!messages.length) {
    throw coachHistoryError("At least one user or assistant message is required.", 400, "coach_conversation_empty");
  }
  const requestedSourceProduct = defaults.forceSourceProduct
    ? defaults.sourceProduct
    : source.sourceProduct || source.source_product || defaults.sourceProduct || "ieltsist";
  const sourceProduct = safeText(requestedSourceProduct, 40).toLowerCase();
  const normalizedSourceProduct = ["ieltsist", "stem"].includes(sourceProduct) ? sourceProduct : "ieltsist";
  const binding = safeObjectFields(source.binding || {}, [
    "sessionId",
    "module",
    "paperId",
    "questionId",
    "view",
    "routeId",
    "topicId",
    "termId",
    "attemptId",
    "examId",
  ], 500);
  const returnTo = sanitizeProductReturnTo(source.binding?.returnTo);
  if (returnTo) binding.returnTo = returnTo;
  return {
    conversationId: redactSecrets(normalizeConversationId(source.conversationId || source.conversation_id || source.key)),
    sourceProduct: normalizedSourceProduct,
    surface: redactSecrets(safeText(source.surface || source.view || "", 120)),
    module: redactSecrets(safeText(source.module || source.binding?.module || "", 80)),
    title: redactSecrets(safeText(source.title || "AI Coach conversation", 180)),
    binding,
    messages,
    metadata: safeObjectFields(source.metadata || {}, [
      "status",
      "model",
      "reasoningEffort",
      "errorCode",
      "source",
      "routeId",
      "attemptId",
      "examId",
      "updatedAt",
    ], 260),
    createdAt: safeDate(source.createdAt, now),
    updatedAt: safeDate(source.updatedAt, now),
  };
}

function parseStoredJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function publicConversation(row) {
  return {
    conversationId: row.conversation_id,
    sourceProduct: row.source_product,
    surface: row.surface || "",
    module: row.module || "",
    title: row.title || "AI Coach conversation",
    binding: parseStoredJson(row.binding_json, {}),
    messages: parseStoredJson(row.messages_json, []),
    metadata: parseStoredJson(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeConversationList(payload, defaults = {}) {
  const raw = Array.isArray(payload?.conversations)
    ? payload.conversations
    : payload?.conversation
      ? [payload.conversation]
      : [];
  if (!raw.length) throw coachHistoryError("Conversation payload is required.", 400, "coach_conversation_required");
  if (raw.length > MAX_CONVERSATIONS_PER_WRITE) throw coachHistoryError("Too many conversations in one request.", 413, "coach_conversations_too_large");
  return raw.map((conversation) => normalizeConversation(conversation, defaults));
}

function coachMessageIdentity(message) {
  const id = safeText(message?.id, 120);
  if (id) return `id:${id}`;
  return `turn:${message.role}|${message.createdAt}|${message.content}`;
}

function coachMessageStatusRank(value) {
  return new Map([
    ["completed", 5],
    ["fallback", 4],
    ["interrupted", 3],
    ["failed", 2],
    ["retrying", 1],
    ["streaming", 0],
  ]).get(safeText(value, 40).toLowerCase()) || 0;
}

function richerCoachMessage(current, candidate) {
  const currentStatus = coachMessageStatusRank(current.status);
  const candidateStatus = coachMessageStatusRank(candidate.status);
  const currentUpdatedAt = Date.parse(current.updatedAt || current.createdAt) || 0;
  const candidateUpdatedAt = Date.parse(candidate.updatedAt || candidate.createdAt) || 0;
  const preferred = candidateUpdatedAt > currentUpdatedAt
    || (candidateUpdatedAt === currentUpdatedAt && (candidateStatus > currentStatus || (candidateStatus === currentStatus && candidate.content.length >= current.content.length)))
    ? candidate
    : current;
  const secondary = preferred === candidate ? current : candidate;
  const attachments = Array.isArray(preferred.attachments) && preferred.attachments.length
    ? preferred.attachments
    : secondary.attachments;
  return {
    ...secondary,
    ...preferred,
    ...(attachments?.length ? { attachments } : {}),
  };
}

function mergeCoachMessages(...messageLists) {
  const byIdentity = new Map();
  let position = 0;
  for (const list of messageLists) {
    for (const rawMessage of Array.isArray(list) ? list : []) {
      const message = sanitizeMessage(rawMessage);
      const currentPosition = position;
      position += 1;
      if (!message) continue;
      const identity = coachMessageIdentity(message);
      const existing = byIdentity.get(identity);
      const merged = existing ? richerCoachMessage(existing.message, message) : message;
      byIdentity.set(identity, {
        message: merged,
        position: existing ? Math.min(existing.position, currentPosition) : currentPosition,
      });
    }
  }
  return [...byIdentity.values()]
    .sort((left, right) => {
      const leftTime = Date.parse(left.message.createdAt) || 0;
      const rightTime = Date.parse(right.message.createdAt) || 0;
      return leftTime - rightTime || left.position - right.position;
    })
    .slice(-MAX_MESSAGES)
    .map((entry) => entry.message);
}

function earliestCoachDate(...values) {
  const dates = values.map((value) => safeDate(value, "")).filter(Boolean).sort();
  return dates[0] || new Date().toISOString();
}

function latestCoachDate(...values) {
  const dates = values.map((value) => safeDate(value, "")).filter(Boolean).sort();
  return dates.at(-1) || new Date().toISOString();
}

function mergeCoachConversation(existing, incoming, defaults = {}) {
  if (!existing) return incoming;
  const existingPayload = Object.prototype.hasOwnProperty.call(existing, "conversation_id")
    ? publicConversation(existing)
    : existing;
  const previous = normalizeConversation(existingPayload, defaults);
  const currentTime = Date.parse(previous.updatedAt) || 0;
  const incomingTime = Date.parse(incoming.updatedAt) || 0;
  const newest = incomingTime >= currentTime ? incoming : previous;
  const older = newest === incoming ? previous : incoming;
  return {
    ...older,
    ...newest,
    conversationId: incoming.conversationId,
    sourceProduct: incoming.sourceProduct,
    surface: newest.surface || older.surface || "",
    module: newest.module || older.module || "",
    title: newest.title || older.title || "AI Coach conversation",
    binding: { ...(older.binding || {}), ...(newest.binding || {}) },
    messages: mergeCoachMessages(previous.messages, incoming.messages),
    metadata: { ...(older.metadata || {}), ...(newest.metadata || {}) },
    createdAt: earliestCoachDate(previous.createdAt, incoming.createdAt),
    updatedAt: latestCoachDate(previous.updatedAt, incoming.updatedAt),
  };
}

function upsertCoachConversations(db, userId, payload, defaults = {}) {
  const byConversationId = new Map();
  for (const conversation of normalizeConversationList(payload, defaults)) {
    byConversationId.set(
      conversation.conversationId,
      mergeCoachConversation(byConversationId.get(conversation.conversationId), conversation, defaults),
    );
  }
  const conversations = [...byConversationId.values()];
  const write = db.prepare(`
    INSERT INTO coach_conversations (
      conversation_id, user_id, source_product, surface, module, title,
      binding_json, messages_json, metadata_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, conversation_id) DO UPDATE SET
      source_product = excluded.source_product,
      surface = excluded.surface,
      module = excluded.module,
      title = excluded.title,
      binding_json = excluded.binding_json,
      messages_json = excluded.messages_json,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `);
  const readExisting = db.prepare("SELECT * FROM coach_conversations WHERE user_id = ? AND conversation_id = ?");
  db.exec("BEGIN");
  try {
    for (const incoming of conversations) {
      const existing = readExisting.get(userId, incoming.conversationId);
      if (existing && defaults.forceSourceProduct && String(existing.source_product || "").toLowerCase() !== String(defaults.sourceProduct || "").toLowerCase()) {
        throw coachHistoryError("Conversation ID belongs to another Coach product.", 409, "coach_conversation_source_conflict");
      }
      const conversation = mergeCoachConversation(existing, incoming, defaults);
      write.run(
        conversation.conversationId,
        userId,
        conversation.sourceProduct,
        conversation.surface,
        conversation.module,
        conversation.title,
        JSON.stringify(conversation.binding),
        JSON.stringify(conversation.messages),
        JSON.stringify(conversation.metadata),
        conversation.createdAt,
        conversation.updatedAt,
      );
    }
    const stale = db.prepare(`
      SELECT id FROM coach_conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT -1 OFFSET ?
    `).all(userId, MAX_STORED_CONVERSATIONS);
    if (stale.length) {
      const remove = db.prepare("DELETE FROM coach_conversations WHERE id = ? AND user_id = ?");
      stale.forEach((row) => remove.run(row.id, userId));
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const placeholders = conversations.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT * FROM coach_conversations
    WHERE user_id = ? AND conversation_id IN (${placeholders})
    ORDER BY updated_at DESC
  `).all(userId, ...conversations.map((conversation) => conversation.conversationId));
  return rows.map(publicConversation);
}

function listCoachConversations(db, userId, options = {}) {
  const limit = Math.max(1, Math.min(MAX_STORED_CONVERSATIONS, Number(options.limit || 40) || 40));
  return db.prepare(`
    SELECT * FROM coach_conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(userId, limit).map(publicConversation);
}

function parseCoachUserId(value) {
  const text = safeText(value, 80);
  const match = text.match(/^(?:ielts:)?([1-9]\d*)$/i);
  if (!match) throw coachHistoryError("A valid IELTSist userId is required.", 400, "coach_user_id_invalid");
  return Number(match[1]);
}

module.exports = {
  coachHistoryError,
  initCoachHistorySchema,
  listCoachConversations,
  parseCoachUserId,
  upsertCoachConversations,
};
