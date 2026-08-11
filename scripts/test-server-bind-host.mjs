import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const basePort = 7000 + (process.pid % 200);

async function verifyBinding({ nodeEnv, port, expectedHost, configuredHost = "" }) {
  const databasePath = path.join(root, "data", `bind-host-${nodeEnv}-${process.pid}.sqlite`);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      PORT: String(port),
      IELTSIST_DB_PATH: databasePath,
      IELTSIST_BIND_HOST: configuredHost,
      STEM_MARKING_AI_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  try {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/healthz`);
        if (response.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const health = await fetch(`http://127.0.0.1:${port}/healthz`).catch(() => null);
    assert.equal(health?.status, 200, `Server did not become healthy. ${stderr}`);
    assert.match(stdout, new RegExp(`IELTS-ist running at http://${expectedHost.replaceAll(".", "\\.")}:${port}`));
  } finally {
    child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await Promise.all([
      rm(databasePath, { force: true }),
      rm(`${databasePath}-shm`, { force: true }),
      rm(`${databasePath}-wal`, { force: true }),
    ]);
  }
}

await verifyBinding({
  nodeEnv: "production",
  port: basePort,
  configuredHost: "0.0.0.0",
  expectedHost: "127.0.0.1",
});
await verifyBinding({
  nodeEnv: "development",
  port: basePort + 1,
  expectedHost: "0.0.0.0",
});

console.log("Server bind contract passed: production is loopback-only and local development remains externally reachable.");
