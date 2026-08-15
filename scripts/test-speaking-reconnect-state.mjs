import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

function functionSource(name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing function ${name}`);
  const start = match.index;
  const remaining = source.slice(start + match[0].length);
  const next = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(remaining);
  return source.slice(start, next ? start + match[0].length + next.index : source.length);
}

function asyncFunctionSource(name) {
  const match = new RegExp(`async\\s+function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing async function ${name}`);
  const start = match.index;
  const remaining = source.slice(start + match[0].length);
  const next = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(remaining);
  return source.slice(start, next ? start + match[0].length + next.index : source.length);
}

const errorSession = { connectionRecovering: true, transport: "ws", userDisconnected: false };
let recoveringWhenScheduled = null;
const errorContext = {
  qwenSession: () => errorSession,
  scheduleQwenConnectionRecovery: () => {
    recoveringWhenScheduled = errorSession.connectionRecovering;
    return true;
  },
};
vm.createContext(errorContext);
vm.runInContext(`${functionSource("handleQwenMessage")}\nthis.handle = handleQwenMessage;`, errorContext);
errorContext.handle("single", { type: "error", message: "Qwen realtime error: ETIMEDOUT" });
assert.equal(recoveringWhenScheduled, false, "an upstream error during recovery must release the recovery lock before retrying");

class FakeWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;

  constructor() {
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

const socketSession = { connectionRecovering: false, connected: true, userDisconnected: false, transport: "" };
const bubbles = [];
let staleCloseRecoveryCalls = 0;
const socketContext = {
  WebSocket: FakeWebSocket,
  location: { origin: "https://ieltsist.test" },
  qwenSession: () => socketSession,
  qwenSend: () => {},
  qwenAddBubble: (_prefix, _role, text) => bubbles.push(text),
  handleQwenMessage: () => {},
  startQwenHttpFallback: () => {},
  scheduleQwenConnectionRecovery: () => {
    staleCloseRecoveryCalls += 1;
    return true;
  },
  stopQwenHeartbeat: () => {},
  qwenSetStatus: () => {},
  qwenSetControls: () => {},
};
vm.createContext(socketContext);
vm.runInContext(`${functionSource("startQwenWebSocket")}\nthis.start = startQwenWebSocket;`, socketContext);
socketContext.start("single", "recover", { recovery: true });
const oldSocket = socketSession.ws;
oldSocket.readyState = FakeWebSocket.OPEN;
oldSocket.emit("open");
assert.ok(bubbles.includes("Reconnecting to the examiner..."), "local WebSocket open must remain a reconnecting state until Qwen confirms qwen-open");
assert.equal(bubbles.includes("Connection restored through WebSocket."), false, "local gateway open is not a recovered examiner session");

socketSession.ws = new FakeWebSocket();
oldSocket.emit("close");
assert.equal(staleCloseRecoveryCalls, 0, "a stale socket close must not start a parallel reconnect");

const directCalls = [];
const directSession = { transport: "", connected: false };
const directContext = {
  qwenSession: () => directSession,
  qwenShouldTryWebRtc: async () => true,
  startQwenWebRtc: async (prefix, instructions) => directCalls.push(["webrtc", prefix, instructions]),
  startQwenWebSocket: () => directCalls.push(["ws"]),
  qwenCloseWebRtc: () => {},
  qwenAddBubble: () => {},
};
vm.createContext(directContext);
vm.runInContext(`${asyncFunctionSource("startQwenRecoveryTransport")}\nthis.startRecovery = startQwenRecoveryTransport;`, directContext);
await directContext.startRecovery("single", "continue this test");
assert.deepEqual(directCalls, [["webrtc", "single", "continue this test"]], "recovery must retry WebRTC before using the relay");

const fallbackCalls = [];
const fallbackContext = {
  qwenSession: () => ({ transport: "webrtc", connected: false }),
  qwenShouldTryWebRtc: async () => true,
  startQwenWebRtc: async () => { throw new Error("SDP exchange failed"); },
  startQwenWebSocket: (_prefix, _instructions, options) => fallbackCalls.push(options),
  qwenCloseWebRtc: () => {},
  qwenAddBubble: () => {},
};
vm.createContext(fallbackContext);
vm.runInContext(`${asyncFunctionSource("startQwenRecoveryTransport")}\nthis.startRecovery = startQwenRecoveryTransport;`, fallbackContext);
await fallbackContext.startRecovery("single", "continue this test");
assert.equal(fallbackCalls.length, 1, "relay fallback must run once after a direct reconnect fails");
assert.equal(fallbackCalls[0]?.recovery, true, "relay fallback is allowed only after a direct reconnect fails");

const retrySession = {
  connectionRecovering: false,
  connectionRecoveryAttempts: 3,
  lastDisconnectReason: "Qwen realtime error: ETIMEDOUT",
  dialogueTurns: [{ role: "Candidate", text: "My answer" }],
};
let retryOptions = null;
const retryContext = {
  qwenSession: () => retrySession,
  scheduleQwenConnectionRecovery: (_prefix, _reason, options) => {
    retryOptions = { attempts: retrySession.connectionRecoveryAttempts, options };
    return true;
  },
};
vm.createContext(retryContext);
vm.runInContext(`${functionSource("retryQwenConnection")}\nthis.retry = retryQwenConnection;`, retryContext);
assert.equal(retryContext.retry("single"), true);
assert.equal(retryOptions.attempts, 0, "manual retry must reset the bounded automatic-retry counter");
assert.equal(retryOptions.options?.manual, true, "manual retry must preserve the active speaking session");
assert.equal(retrySession.dialogueTurns.length, 1, "manual retry must not discard the active transcript");
assert.match(source, /button\.dataset\.qwenRetry/, "the visible start control must become a reconnect action after bounded failures");

const limitContext = { QWEN_MAX_CONNECTION_RECOVERY_ATTEMPTS: 3 };
vm.createContext(limitContext);
vm.runInContext(`${functionSource("qwenShouldRecoverConnection")}\nthis.shouldRecover = qwenShouldRecoverConnection;`, limitContext);
const recoverable = { userDisconnected: false, finalScoreInFlight: false, autoFinishStarted: false, connectionRecovering: false, suppressConnectionRecovery: false };
assert.equal(limitContext.shouldRecover({ ...recoverable, connectionRecoveryAttempts: 2 }), true);
assert.equal(limitContext.shouldRecover({ ...recoverable, connectionRecoveryAttempts: 3 }), false, "automatic retries must stop at a visible retry state");
assert.equal(limitContext.shouldRecover({ ...recoverable, connectionRecoveryAttempts: 3 }, { manual: true }), true, "the student can retry without losing the current session");

console.log("Speaking reconnect state keeps recovery honest and serial.");
