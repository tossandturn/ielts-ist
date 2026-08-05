import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import http from "node:http";

const root = new URL("../", import.meta.url);
const port = 5100 + (process.pid % 500);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverStderr = "";
child.stderr.on("data", (chunk) => { serverStderr += chunk; });

function request(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: pathname,
      method: "GET",
      headers,
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await request("/");
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Static-cache test server did not start. ${serverStderr}`);
}

try {
  await waitForServer();
  const source = await readFile(new URL("../public/app.js", import.meta.url));
  const compressed = await request("/app.js?v=cache-test", { "accept-encoding": "gzip" });

  assert.equal(compressed.status, 200);
  assert.equal(compressed.headers["content-encoding"], "gzip");
  assert.equal(compressed.headers["cache-control"], "no-cache");
  assert.match(compressed.headers.etag || "", /^W\/"[^"]+"$/);
  assert.ok(compressed.headers["last-modified"]);
  assert.ok(compressed.body.length < source.length);

  const unchanged = await request("/app.js?v=cache-test", {
    "accept-encoding": "gzip",
    "if-none-match": compressed.headers.etag,
  });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body.length, 0);
  assert.equal(unchanged.headers.etag, compressed.headers.etag);

  const identity = await request("/app.js?v=cache-test", { "accept-encoding": "identity" });
  assert.equal(identity.status, 200);
  assert.equal(identity.headers["content-encoding"], undefined);
  assert.equal(identity.body.length, source.length);

  const tasks = await request("/api/tasks", { "accept-encoding": "gzip" });
  assert.equal(tasks.status, 200);
  assert.equal(tasks.headers["content-encoding"], "gzip");
  assert.match(tasks.headers.etag || "", /^"tasks-[a-f0-9]+"$/);
  const unchangedTasks = await request("/api/tasks", {
    "accept-encoding": "gzip",
    "if-none-match": tasks.headers.etag,
  });
  assert.equal(unchangedTasks.status, 304);
  assert.equal(unchangedTasks.body.length, 0);

  console.log("Static asset and task-catalog cache: gzip, validators, 304, and identity responses passed.");
} finally {
  child.kill("SIGTERM");
}
