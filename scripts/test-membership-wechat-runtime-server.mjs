import assert from "node:assert/strict";
import crypto, { randomUUID } from "node:crypto";
import net from "node:net";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dbPath = join(tmpdir(), `ieltsist-membership-runtime-${process.pid}-${randomUUID()}.sqlite`);
const callbackToken = "RuntimeCallbackToken123";
const callbackAesKey = Buffer.alloc(32, 9).toString("base64").replace(/=$/, "");
let child;
let output = "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const port = await new Promise((resolve, reject) => {
  const listener = net.createServer();
  listener.once("error", reject);
  listener.listen(0, "127.0.0.1", () => {
    const address = listener.address();
    listener.close(() => resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;

try {
  child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      IELTSIST_DB_PATH: dbPath,
      SESSION_COOKIE_SECURE: "0",
      MEMBERSHIP_CHECKOUT_ENABLED: "0",
      MEMBERSHIP_COMMERCE_READY: "0",
      MEMBERSHIP_TESTBUYER_CANARY_ENABLED: "0",
      MEMBERSHIP_WECHAT_VIRTUAL_APP_ID: "wxruntimeendpointtest",
      WECHAT_VIRTUAL_CALLBACK_READY: "1",
      WECHAT_VIRTUAL_CALLBACK_MODE: "safe",
      WECHAT_VIRTUAL_CALLBACK_TOKEN: callbackToken,
      WECHAT_VIRTUAL_CALLBACK_AES_KEY: callbackAesKey,
      WECHAT_VIRTUAL_CALLBACK_FORMAT: "json",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const deadline = Date.now() + 15_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited early (${child.exitCode}).\n${output}`);
    try { if ((await fetch(`${baseUrl}/healthz`)).ok) { ready = true; break; } } catch {}
    await sleep(100);
  }
  assert.equal(ready, true, `server did not start.\n${output}`);

  const timestamp = "1791964800";
  const nonce = "runtime-nonce";
  const echostr = "runtime-verified";
  const signature = crypto.createHash("sha1").update([callbackToken, timestamp, nonce].sort().join(""), "utf8").digest("hex");
  const verifyUrl = new URL(`${baseUrl}/api/membership/wechat/notify`);
  Object.entries({ signature, timestamp, nonce, echostr }).forEach(([key, value]) => verifyUrl.searchParams.set(key, value));
  const verified = await fetch(verifyUrl);
  assert.equal(verified.status, 200);
  assert.equal(await verified.text(), echostr);
  assert.equal(verified.headers.get("cache-control"), "no-store");

  verifyUrl.searchParams.set("signature", "0".repeat(40));
  const invalid = await fetch(verifyUrl);
  assert.equal(invalid.status, 401);
  assert.equal(await invalid.text(), "");

  const unauthenticatedPost = await fetch(`${baseUrl}/api/membership/wechat/notify?encrypt_type=aes&msg_signature=${"0".repeat(40)}&timestamp=${timestamp}&nonce=${nonce}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ToUserName: "to-user", Encrypt: "not-valid-base64" }),
  });
  assert.equal(unauthenticatedPost.status, 503, "callback-only setup verification cannot process payment notifications");
  assert.deepEqual(await unauthenticatedPost.json(), { ErrCode: -1, ErrMsg: "retry" });

  const oversizedPost = await fetch(`${baseUrl}/api/membership/wechat/notify`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: Buffer.alloc(256 * 1024 + 1, 1),
  });
  assert.deepEqual(await oversizedPost.json(), { ErrCode: -1, ErrMsg: "retry" });

  const catalog = await (await fetch(`${baseUrl}/api/membership/catalog`)).json();
  assert.equal(catalog.commerce.checkoutEnabled, false, "callback setup capability must not activate checkout");
  assert.deepEqual(catalog.commerce.providers.find((item) => item.id === "wechat_virtual").platforms, []);
} finally {
  if (child) {
    child.kill();
    await Promise.race([new Promise((resolve) => child.once("exit", resolve)), sleep(2_000)]);
  }
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}

console.log("membership WeChat runtime server callback safe-off tests: PASS");
