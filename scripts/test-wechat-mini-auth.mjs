import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = join(tmpdir(), `ieltsist-wechat-mini-${process.pid}-${randomUUID()}.sqlite`);
const signingKey = "wechat-mini-auth-test-signing-key";
const legacyIdentityKey = "legacy-browser-identity-key-must-be-different";
let providerMode = "ok";
let providerQuery = null;
let provider = null;
let child = null;
let output = "";
let baseUrl = "";
let mockUrl = "";
let nativeRecordId = "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const listen = (server, portNumber) => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(portNumber, "127.0.0.1", resolve);
});
const close = (server) => new Promise((resolve) => server?.close(() => resolve()));
const findAvailablePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    const port = typeof address === "object" && address ? address.port : 0;
    probe.close(() => resolve(port));
  });
});

function signedHeaders(body, timestamp = String(Date.now())) {
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  return {
    "content-type": "application/json",
    "x-stem-auth-timestamp": timestamp,
    "x-stem-auth-signature": crypto.createHmac("sha256", signingKey).update(`${timestamp}.${digest}`).digest("base64url"),
  };
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}).\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/healthz`)).ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`server did not start.\n${output}`);
}

async function internalRequest(payload) {
  const body = JSON.stringify(payload);
  const response = await fetch(`${baseUrl}/api/stem/internal/authenticate`, { method: "POST", headers: signedHeaders(body), body });
  return { response, json: await response.json() };
}

async function internalHandoffRequest(payload) {
  const body = JSON.stringify(payload);
  const response = await fetch(`${baseUrl}/api/stem/internal/webview-handoff`, { method: "POST", headers: signedHeaders(body), body });
  return { response, json: await response.json() };
}

try {
  const port = await findAvailablePort();
  const mockPort = await findAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  mockUrl = `http://127.0.0.1:${mockPort}/sns/jscode2session`;
  provider = http.createServer((req, res) => {
    providerQuery = new URL(req.url, `http://${req.headers.host}`).searchParams;
    res.setHeader("content-type", "application/json");
    if (providerMode === "invalid") {
      res.end(JSON.stringify({ errcode: 40029, errmsg: "invalid code" }));
      return;
    }
    res.end(JSON.stringify({ openid: "open-id-1", unionid: "union-id-1", session_key: "must-not-be-stored" }));
  });
  await listen(provider, mockPort);
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: "0",
      STEM_INTERNAL_AUTH_KEY: signingKey,
      STEM_IDENTITY_SIGNING_KEY: legacyIdentityKey,
      WECHAT_MINIPROGRAM_APP_ID: "wx-test-app",
      WECHAT_MINIPROGRAM_APP_SECRET: "test-secret",
      WECHAT_MINIPROGRAM_CODE2SESSION_URL: mockUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  await waitForServer();
  const legacyCatalog=await (await fetch(`${baseUrl}/api/tasks`)).json();
  const nativeCatalogResponse=await fetch(`${baseUrl}/api/native/ielts/catalog`,{headers:{'accept-encoding':'gzip'}});
  const nativeCatalog=await nativeCatalogResponse.json();
  assert.equal(nativeCatalogResponse.status,200);
  assert.equal(nativeCatalog.schemaVersion,'native-ielts-catalog-v1');
  if(JSON.stringify(nativeCatalog).length>1024)assert.equal(nativeCatalogResponse.headers.get('content-encoding'),'gzip');
  assert.deepEqual(nativeCatalog.readingTests.map(t=>t.id),legacyCatalog.readingTests.map(t=>t.id));
  assert.doesNotMatch(JSON.stringify(nativeCatalog),/"(?:questions|answer|answerKey|aiBaseUrl|prompt)"\s*:/);
  if(nativeCatalog.readingTests.length){
    const detail=await (await fetch(`${baseUrl}/api/native/ielts/tasks/reading/${nativeCatalog.readingTests[0].id}`)).json();
    assert.equal(detail.schemaVersion,'native-ielts-task-v1');assert.equal(detail.task.questions.length,40);
    assert.doesNotMatch(JSON.stringify(detail),/"(?:answer|answerKey|expected)"\s*:/);
  }
  assert.equal((await fetch(`${baseUrl}/api/native/ielts/tasks/reading/not-a-paper`)).status,404);

  const first = await internalRequest({ mode: "wechat", code: "one-time-code" });
  assert.equal(first.response.status, 200);
  assert.equal(first.json.identity.id, "ielts:1");
  assert.match(first.json.identity.username, /^wx_[a-f0-9]{16}$/);
  assert.doesNotMatch(JSON.stringify(first.json), /session_key|test-secret|one-time-code/i);
  assert.equal(first.response.headers.get("set-cookie"), null, "internal WeChat exchange must not create a browser session");
  assert.equal(providerQuery.get("appid"), "wx-test-app");
  assert.equal(providerQuery.get("js_code"), "one-time-code");
  assert.equal(providerQuery.get("grant_type"), "authorization_code");

  const jwtHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const jwtBody = Buffer.from(JSON.stringify({ iss: "ieltsist.com", aud: "stem.ieltsist.com", sub: first.json.identity.id, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
  const jwtSignature = crypto.createHmac("sha256", signingKey).update(`${jwtHeader}.${jwtBody}`).digest("base64url");
  const identityToken = `${jwtHeader}.${jwtBody}.${jwtSignature}`;
  const nativeResponse = await fetch(`${baseUrl}/api/auth/native-session`, { method: "POST", headers: { "x-stem-identity": identityToken, "content-type": "application/json" }, body: "{}" });
  assert.equal(nativeResponse.status, 200, "native clients need a bounded IELTS session without a WebView");
  const nativeSession = await nativeResponse.json();
  assert.equal(nativeSession.user.id, 1);
  assert.ok(Date.parse(nativeSession.expiresAt) - Date.now() <= 1800000);
  assert.equal(nativeResponse.headers.get("set-cookie"), null);
  const me = await fetch(`${baseUrl}/api/me`, { headers: { authorization: `Bearer ${nativeSession.token}` } });
  assert.equal(me.status, 200);
  if(legacyCatalog.readingTests.length){
    const task=legacyCatalog.readingTests[0],questionIds=task.questions.slice(0,13).map(q=>q.id);
    const headers={authorization:`Bearer ${nativeSession.token}`,'content-type':'application/json','x-stemist-native':'1'};
    const start=await fetch(`${baseUrl}/api/objective/attempts`,{method:'POST',headers,body:JSON.stringify({clientAttemptKey:'native-record-fixture',context:'single',module:'reading',taskId:task.id,questionIds})});
    assert.equal(start.status,201);const capability=await start.json();
    nativeRecordId=capability.attemptId;
    const body=JSON.stringify({...capability,taskId:task.id,questionIds,answers:{q1:'qa-response'}});
    for(let i=0;i<2;i++)assert.equal((await fetch(`${baseUrl}/api/reading/score`,{method:'POST',headers,body})).status,200);
    const state=await (await fetch(`${baseUrl}/api/learning/state`,{headers})).json();
    const rows=state.attempts.filter(a=>a.attemptId===capability.attemptId);
    assert.equal(rows.length,1,'native submission creates one immutable cloud record, including retries');
    assert.ok(rows[0].itemId.includes('::'),'a subset must not complete the whole source test');
    assert.equal(rows[0].score.band,undefined);assert.equal(rows[0].result.band,undefined);
    const summary=await (await fetch(`${baseUrl}/api/learning/state?summary=1`,{headers})).json();
    assert.deepEqual(summary.attempts[0].result,{},'lists do not eagerly ship full report bodies');
    const report=await (await fetch(`${baseUrl}/api/learning/attempts/${capability.attemptId}`,{headers})).json();
    assert.equal(report.attempt.result.details.length,13);
    assert.equal((await fetch(`${baseUrl}/api/learning/attempts/${capability.attemptId}`)).status,401);
  }
  const invalidNative = await fetch(`${baseUrl}/api/auth/native-session`, { method: "POST", headers: { "x-stem-identity": identityToken + "x" }, body: "{}" });
  assert.equal(invalidNative.status, 401);
  const now = Math.floor(Date.now() / 1000);
  const mint = (claims = {}, key = signingKey, alg = "HS256") => {
    const h = Buffer.from(JSON.stringify({ alg, typ: "JWT" })).toString("base64url");
    const b = Buffer.from(JSON.stringify({ iss: "ieltsist.com", aud: "stem.ieltsist.com", sub: "ielts:1", iat: now, exp: now + 300, ...claims })).toString("base64url");
    return `${h}.${b}.${crypto.createHmac("sha256", key).update(`${h}.${b}`).digest("base64url")}`;
  };
  if(nativeRecordId){
    const second=await internalRequest({mode:'register',username:'native_second',password:'fixture-password-only'});
    assert.equal(second.response.status,200);
    const exchange=await fetch(`${baseUrl}/api/auth/native-session`,{method:'POST',headers:{'x-stem-identity':mint({sub:second.json.identity.id})},body:'{}'});
    assert.equal(exchange.status,200);const session=await exchange.json();
    const forbidden=await fetch(`${baseUrl}/api/learning/attempts/${nativeRecordId}`,{headers:{authorization:`Bearer ${session.token}`}});
    assert.equal(forbidden.status,404,'another account cannot read the native report');
  }
  for (const token of [mint({}, legacyIdentityKey), mint({aud:"other-app"}), mint({iss:"other-site"}), mint({exp:now-1}), mint({exp:String(now+300)}), mint({iat:now+600,exp:now+900}), mint({exp:now+7200}), mint({sub:"ielts:999999"}), mint({},signingKey,"none")]) {
    const denied = await fetch(`${baseUrl}/api/auth/native-session`, { method:"POST", headers:{"x-stem-identity":token}, body:"{}" });
    assert.equal(denied.status,401,"invalid or legacy-only identity must not mint a native session");
  }
  const nativeConfig = await (await fetch(`${baseUrl}/api/auth/native-config`)).json();
  assert.equal(nativeConfig.wechatConfigured, true);
  assert.doesNotMatch(JSON.stringify(nativeConfig), /test-secret|must-not-be-stored/);

  const repeat = await internalRequest({ mode: "wechat", code: "another-code" });
  assert.equal(repeat.response.status, 200);
  assert.equal(repeat.json.identity.id, "ielts:1", "the same unionid/openid must recover the same account");

  const handoff = await internalHandoffRequest({ userId: first.json.identity.id, returnTo: "/?module=speaking&token=must-not-survive" });
  assert.equal(handoff.response.status, 200);
  assert.match(handoff.json.url, /^https:\/\/ieltsist\.com\/api\/auth\/stem-handoff\/consume\?code=/);
  assert.doesNotMatch(handoff.json.url, /must-not-survive/);
  const remoteConsume = new URL(handoff.json.url);
  const consumed = await fetch(`${baseUrl}${remoteConsume.pathname}${remoteConsume.search}`, { redirect: "manual" });
  assert.equal(consumed.status, 302);
  assert.equal(consumed.headers.get("location"), "/?module=speaking");
  assert.match(String(consumed.headers.get("set-cookie") || ""), /^ieltsist_session=/);
  const consumedAgain = await fetch(`${baseUrl}${remoteConsume.pathname}${remoteConsume.search}`, { redirect: "manual" });
  assert.equal(consumedAgain.status, 401);
  const unsafeHandoff = await internalHandoffRequest({ userId: first.json.identity.id, returnTo: "https://evil.example/steal" });
  assert.equal(unsafeHandoff.response.status, 400);

  providerMode = "invalid";
  const invalid = await internalRequest({ mode: "wechat", code: "expired-code" });
  assert.equal(invalid.response.status, 401);
  assert.equal(invalid.json.code, "wechat_code_invalid");
  assert.doesNotMatch(JSON.stringify(invalid.json), /expired-code|invalid code/i);

  console.log("WeChat Mini Program identity exchange checks passed.");
} finally {
  if (child) {
    child.kill();
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(2_000)]);
  }
  await close(provider);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
