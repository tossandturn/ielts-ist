import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const root = new URL("../", import.meta.url);
const signingKey = "coach-conversations-stem-hmac-key";

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selectedPort = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(selectedPort));
    });
  });
}

const port = Number(process.env.IELTSIST_COACH_CONVERSATIONS_TEST_PORT || await findAvailablePort());
const baseUrl = `http://127.0.0.1:${port}`;
const databasePath = path.join(os.tmpdir(), `ieltsist-coach-conversations-${process.pid}.sqlite`);
let output = "";

const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    IELTSIST_DB_PATH: databasePath,
    SESSION_COOKIE_SECURE: "0",
    AI_GATEWAY_API_KEY: "",
    COACH_AI_API_KEY: "",
    OPENAI_API_KEY: "",
    STEM_INTERNAL_AUTH_KEY: signingKey,
    STEM_IDENTITY_SIGNING_KEY: signingKey,
    STEM_MARKING_AI_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Coach conversations test server exited early.\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await sleep(75);
  }
  throw new Error(`Coach conversations test server did not start.\n${output}`);
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { response, json };
}

function jsonOptions(method, body, token = "") {
  return {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
}

function signedHeaders(body, { timestamp = String(Date.now()), key = signingKey } = {}) {
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const signature = crypto.createHmac("sha256", key).update(`${timestamp}.${digest}`).digest("base64url");
  return {
    "content-type": "application/json",
    "x-stem-auth-timestamp": timestamp,
    "x-stem-auth-signature": signature,
  };
}

async function signedStemRequest(method, pathname, payload = {}, options = {}) {
  const body = method === "GET" ? "" : JSON.stringify(payload);
  const authPayload = method === "GET" ? `${body}\n${new URL(pathname, baseUrl).pathname}${new URL(pathname, baseUrl).search}` : body;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: signedHeaders(authPayload, options),
    ...(body ? { body } : {}),
  });
  return { response, json: await response.json() };
}

function sampleConversation(conversationId, sourceProduct = "ieltsist") {
  return {
    conversationId,
    sourceProduct,
    surface: sourceProduct === "stem" ? "stem-question" : "reading",
    module: sourceProduct === "stem" ? "physics" : "reading",
    title: sourceProduct === "stem" ? "STEM Q4 review" : "Reading Q3 evidence",
    binding: {
      sessionId: "practice-session-a",
      module: "reading",
      paperId: "cambridge-21-test-1",
      questionId: "q3",
      routeId: "stem-route-a",
      returnTo: "https://stem.ieltsist.com/physics?topic=forces&code=temporary-code&state=private-state&access_token=super-secret",
    },
    metadata: {
      model: "gpt-5.5",
      status: "completed",
      providerTrace: "must-not-survive",
    },
    messages: [
      {
        role: "user",
        content: "Please explain Q3. My accidental key is sk-test-should-redact.",
        createdAt: "2026-08-19T00:00:00.000Z",
        attachments: [
          { type: "image", mimeType: "image/png", dataUrl: "data:image/png;base64,AAAA", url: "data:image/png;base64,BBBB", bytes: 4 },
          { type: "screenshot", mimeType: "image/png", name: "q3.png", size: 1234, sha256: "abc123" },
        ],
      },
      { role: "tool", content: "internal tool output should not be stored" },
      { role: "assistant", content: "Use the evidence sentence and retry.", createdAt: "2026-08-19T00:00:01.000Z" },
    ],
  };
}

try {
  await waitForServer();

  const noAuthGet = await request("/api/coach/conversations");
  assert.equal(noAuthGet.response.status, 401, "IELTS Coach conversations require a signed-in account.");

  const userA = await request("/api/auth/register", jsonOptions("POST", { username: `coacha${process.pid}`.slice(0, 24), password: "testing123" }));
  assert.equal(userA.response.status, 200);
  const tokenA = userA.json.token;
  const userIdA = userA.json.user.id;

  const userB = await request("/api/auth/register", jsonOptions("POST", { username: `coachb${process.pid}`.slice(0, 24), password: "testing123" }));
  assert.equal(userB.response.status, 200);
  const tokenB = userB.json.token;

  const forgedPublicSource = sampleConversation("conv-a", "stem");
  const savedA = await request("/api/coach/conversations", jsonOptions("PUT", { conversation: forgedPublicSource }, tokenA));
  assert.equal(savedA.response.status, 200);
  assert.equal(savedA.json.conversations.length, 1);
  assert.equal(savedA.json.conversations[0].conversationId, "conv-a");
  assert.equal(savedA.json.conversations[0].sourceProduct, "ieltsist", "The public IELTSist API must stamp its own product source.");
  assert.equal(savedA.json.conversations[0].userId, undefined, "Student response must not expose raw database user_id.");
  assert.equal(savedA.json.conversations[0].messages.length, 2, "Only user and assistant messages are persisted.");
  assert.doesNotMatch(JSON.stringify(savedA.json), /data:image|sk-test-should-redact|providerTrace|tool output/i);
  assert.equal(savedA.json.conversations[0].binding.returnTo, "https://stem.ieltsist.com/physics?topic=forces");
  assert.doesNotMatch(JSON.stringify(savedA.json), /temporary-code|private-state|super-secret/i);
  assert.match(JSON.stringify(savedA.json), /\[redacted\]/);
  assert.equal(savedA.json.conversations[0].messages[0].attachments.length, 1, "Attachment metadata is retained without data URLs.");

  const unsafeFields = sampleConversation("redaction-bypass");
  unsafeFields.title = "sk-abcdefghijklmnop1234";
  unsafeFields.messages[0].content = "data:application/pdf;base64,JVBERi0xLjQK";
  const unsafeSaved = await request("/api/coach/conversations", jsonOptions("PUT", { conversation: unsafeFields }, tokenA));
  assert.equal(unsafeSaved.response.status, 200);
  assert.doesNotMatch(JSON.stringify(unsafeSaved.json), /sk-abcdefghijklmnop1234|data:application\/pdf;base64/i);

  const sharedBase = sampleConversation("shared-conversation");
  sharedBase.messages = [
    { role: "user", content: "Please explain the first evidence sentence.", createdAt: "2026-08-19T00:10:00.000Z" },
  ];
  sharedBase.updatedAt = "2026-08-19T00:10:00.000Z";
  const sharedSeed = await request("/api/coach/conversations", jsonOptions("PUT", { conversation: sharedBase }, tokenA));
  assert.equal(sharedSeed.response.status, 200);

  const staleDeviceOne = {
    ...sharedBase,
    messages: [
      ...sharedBase.messages,
      { role: "assistant", content: "Device one found the sentence.", createdAt: "2026-08-19T00:10:05.000Z", status: "completed" },
    ],
    updatedAt: "2026-08-19T00:10:05.000Z",
  };
  const staleDeviceTwo = {
    ...sharedBase,
    messages: [
      ...sharedBase.messages,
      { role: "user", content: "Second device asks for the next step.", createdAt: "2026-08-19T00:10:06.000Z" },
    ],
    updatedAt: "2026-08-19T00:10:06.000Z",
  };
  assert.equal((await request("/api/coach/conversations", jsonOptions("PUT", { conversation: staleDeviceOne }, tokenA))).response.status, 200);
  assert.equal((await request("/api/coach/conversations", jsonOptions("PUT", { conversation: staleDeviceTwo }, tokenA))).response.status, 200);
  const sharedHistory = await request("/api/coach/conversations", { headers: { authorization: `Bearer ${tokenA}` } });
  const mergedConversation = sharedHistory.json.conversations.find((conversation) => conversation.conversationId === "shared-conversation");
  assert.deepEqual(
    mergedConversation.messages.map((message) => message.content),
    [
      "Please explain the first evidence sentence.",
      "Device one found the sentence.",
      "Second device asks for the next step.",
    ],
    "Concurrent writes from stale devices must merge instead of overwriting earlier account history.",
  );

  const parallelConversation = sampleConversation("parallel-conversation");
  const parallelOne = {
    ...parallelConversation,
    messages: [{ role: "user", content: "Parallel device A message.", createdAt: "2026-08-19T00:10:10.000Z" }],
    updatedAt: "2026-08-19T00:10:10.000Z",
  };
  const parallelTwo = {
    ...parallelConversation,
    messages: [{ role: "user", content: "Parallel device B message.", createdAt: "2026-08-19T00:10:11.000Z" }],
    updatedAt: "2026-08-19T00:10:11.000Z",
  };
  const parallelWrites = await Promise.all([
    request("/api/coach/conversations", jsonOptions("PUT", { conversation: parallelOne }, tokenA)),
    request("/api/coach/conversations", jsonOptions("PUT", { conversation: parallelTwo }, tokenA)),
  ]);
  assert.ok(parallelWrites.every((result) => result.response.status === 200));
  const parallelHistory = await request("/api/coach/conversations", { headers: { authorization: `Bearer ${tokenA}` } });
  const parallelMerged = parallelHistory.json.conversations.find((conversation) => conversation.conversationId === "parallel-conversation");
  assert.deepEqual(parallelMerged.messages.map((message) => message.content), ["Parallel device A message.", "Parallel device B message."]);

  const sameTimestampSeed = sampleConversation("same-timestamp-conversation");
  sameTimestampSeed.messages = [
    { role: "user", content: "First legacy message at the shared timestamp.", createdAt: "2026-08-19T00:11:00.000Z" },
  ];
  sameTimestampSeed.updatedAt = "2026-08-19T00:11:00.000Z";
  assert.equal((await request("/api/coach/conversations", jsonOptions("PUT", { conversation: sameTimestampSeed }, tokenA))).response.status, 200);
  const sameTimestampStale = {
    ...sameTimestampSeed,
    messages: [
      { role: "user", content: "Second legacy message at the shared timestamp.", createdAt: "2026-08-19T00:11:00.000Z" },
    ],
    updatedAt: "2026-08-19T00:11:01.000Z",
  };
  assert.equal((await request("/api/coach/conversations", jsonOptions("PUT", { conversation: sameTimestampStale }, tokenA))).response.status, 200);
  const sameTimestampHistory = await request("/api/coach/conversations", { headers: { authorization: `Bearer ${tokenA}` } });
  const sameTimestampConversation = sameTimestampHistory.json.conversations.find((conversation) => conversation.conversationId === "same-timestamp-conversation");
  assert.deepEqual(
    sameTimestampConversation.messages.map((message) => message.content),
    [
      "First legacy message at the shared timestamp.",
      "Second legacy message at the shared timestamp.",
    ],
    "Legacy messages that share a timestamp must remain distinct unless they share a stable message ID.",
  );

  const versionedConversation = sampleConversation("versioned-assistant-conversation");
  versionedConversation.messages = [
    {
      id: "assistant-retry-1",
      role: "assistant",
      content: "The previous completed response was longer but is now obsolete.",
      createdAt: "2026-08-19T00:12:00.000Z",
      updatedAt: "2026-08-19T00:12:00.000Z",
      status: "completed",
    },
  ];
  versionedConversation.updatedAt = "2026-08-19T00:12:00.000Z";
  assert.equal((await request("/api/coach/conversations", jsonOptions("PUT", { conversation: versionedConversation }, tokenA))).response.status, 200);
  const replacement = {
    ...versionedConversation,
    messages: [{
      ...versionedConversation.messages[0],
      content: "The replacement response is current.",
      updatedAt: "2026-08-19T00:12:01.000Z",
    }],
    updatedAt: "2026-08-19T00:12:01.000Z",
  };
  assert.equal((await request("/api/coach/conversations", jsonOptions("PUT", { conversation: replacement }, tokenA))).response.status, 200);
  const versionedHistory = await request("/api/coach/conversations", { headers: { authorization: `Bearer ${tokenA}` } });
  const versioned = versionedHistory.json.conversations.find((conversation) => conversation.conversationId === "versioned-assistant-conversation");
  assert.deepEqual(versioned.messages.map((message) => message.content), ["The replacement response is current."]);
  assert.equal(versioned.messages[0].id, "assistant-retry-1");

  const listA = await request("/api/coach/conversations", { headers: { authorization: `Bearer ${tokenA}` } });
  assert.equal(listA.response.status, 200);
  assert.deepEqual(
    listA.json.conversations.map((item) => item.conversationId).sort(),
    ["conv-a", "parallel-conversation", "redaction-bypass", "same-timestamp-conversation", "shared-conversation", "versioned-assistant-conversation"],
  );

  const cookieListA = await request("/api/coach/conversations", {
    headers: { cookie: `ieltsist_session=${encodeURIComponent(tokenA)}` },
  });
  assert.equal(cookieListA.response.status, 200, "The normal signed-in session cookie can read the account's Coach history.");
  assert.deepEqual(
    cookieListA.json.conversations.map((item) => item.conversationId).sort(),
    ["conv-a", "parallel-conversation", "redaction-bypass", "same-timestamp-conversation", "shared-conversation", "versioned-assistant-conversation"],
  );

  const crossOriginPreflight = await fetch(`${baseUrl}/api/coach/conversations`, {
    method: "OPTIONS",
    headers: {
      origin: "https://evil.example",
      "access-control-request-method": "PUT",
      "access-control-request-headers": "authorization,content-type",
    },
  });
  assert.equal(crossOriginPreflight.status, 403);
  assert.notEqual(crossOriginPreflight.headers.get("access-control-allow-origin"), "*");

  const listB = await request("/api/coach/conversations", { headers: { authorization: `Bearer ${tokenB}` } });
  assert.equal(listB.response.status, 200);
  assert.deepEqual(listB.json.conversations, [], "A second account must not see the first account's Coach history.");

  const invalid = await request("/api/coach/conversations", jsonOptions("PUT", { conversation: { conversationId: "bad", messages: [] } }, tokenA));
  assert.equal(invalid.response.status, 400);

  const forgedStemSource = sampleConversation("stem-conv", "ieltsist");
  const stemSaved = await signedStemRequest("PUT", "/api/internal/stem/coach/conversations", {
    userId: `ielts:${userIdA}`,
    conversations: [forgedStemSource],
  });
  assert.equal(stemSaved.response.status, 200);
  assert.deepEqual(stemSaved.json.conversations.map((item) => item.conversationId), ["stem-conv"]);
  assert.equal(stemSaved.json.conversations[0].sourceProduct, "stem", "The signed STEM API must stamp the STEM source.");
  assert.doesNotMatch(JSON.stringify(stemSaved.json), /data:image|providerTrace|sk-test-should-redact/i);

  const crossProductCollision = await request("/api/coach/conversations", jsonOptions("PUT", {
    conversation: {
      ...sampleConversation("stem-conv", "ieltsist"),
      messages: [{ role: "user", content: "This product collision must not rewrite STEM history.", createdAt: "2026-08-19T00:13:00.000Z" }],
    },
  }, tokenA));
  assert.equal(crossProductCollision.response.status, 409, "A conversation ID cannot be rewritten across product stores.");

  const stemList = await signedStemRequest("GET", `/api/internal/stem/coach/conversations?userId=ielts:${userIdA}`);
  assert.equal(stemList.response.status, 200);
  assert.deepEqual(
    stemList.json.conversations.map((item) => item.conversationId).sort(),
    ["conv-a", "parallel-conversation", "redaction-bypass", "same-timestamp-conversation", "shared-conversation", "stem-conv", "versioned-assistant-conversation"],
  );

  const signedForA = signedHeaders(`\n/api/internal/stem/coach/conversations?userId=ielts:${userIdA}`);
  const tamperedStem = await fetch(`${baseUrl}/api/internal/stem/coach/conversations?userId=ielts:${userB.json.user.id}`, {
    headers: signedForA,
  });
  assert.equal(tamperedStem.status, 403, "Signed STEM query parameters must be bound to the signature.");

  const forgedStem = await signedStemRequest("GET", `/api/internal/stem/coach/conversations?userId=ielts:${userIdA}`, {}, { key: "wrong-key" });
  assert.equal(forgedStem.response.status, 403);

  const missingUser = await signedStemRequest("GET", "/api/internal/stem/coach/conversations?userId=ielts:999999");
  assert.equal(missingUser.response.status, 404);

  console.log("Coach conversation persistence contract checks passed.");
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill();
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(3_000),
  ]);
  await Promise.all(["", "-wal", "-shm"].map((suffix) => rm(`${databasePath}${suffix}`, { force: true }).catch(() => {})));
}
