const http = require("http");

function loadEnvFile(file) {
  try {
    const fs = require("fs");
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {}
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const PORT = Number(process.env.PORT || 4322);
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
const DASHSCOPE_WORKSPACE_ID = process.env.DASHSCOPE_WORKSPACE_ID || process.env.QWEN_WORKSPACE_ID || "";
const DASHSCOPE_REGION = process.env.DASHSCOPE_REGION || "cn-beijing";
const QWEN_REALTIME_MODEL = process.env.QWEN_REALTIME_MODEL || "qwen3.5-omni-flash-realtime";
const DASHSCOPE_WEBRTC_ENDPOINT = (process.env.DASHSCOPE_WEBRTC_ENDPOINT || process.env.QWEN_WEBRTC_ENDPOINT || "").replace(/\/+$/, "");
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": ALLOW_ORIGIN,
    "access-control-allow-methods": "POST, OPTIONS, GET",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function qwenEndpoint() {
  if (DASHSCOPE_WEBRTC_ENDPOINT) return DASHSCOPE_WEBRTC_ENDPOINT;
  if (DASHSCOPE_WORKSPACE_ID) return `https://${DASHSCOPE_WORKSPACE_ID}.${DASHSCOPE_REGION}.maas.aliyuncs.com`;
  return "https://dashscope.aliyuncs.com";
}

async function handleOffer(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!DASHSCOPE_API_KEY) {
    sendJson(res, 500, { error: "DASHSCOPE_API_KEY is not configured." });
    return;
  }
  const offerSdp = await readBody(req);
  if (!offerSdp || !/^v=0/m.test(offerSdp)) {
    sendJson(res, 400, { error: "Invalid WebRTC offer SDP." });
    return;
  }
  const url = new URL("/api/v1/webrtc/realtime", `${qwenEndpoint()}/`);
  url.searchParams.set("model", QWEN_REALTIME_MODEL);
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/sdp",
      "authorization": `Bearer ${DASHSCOPE_API_KEY}`,
      ...(DASHSCOPE_WORKSPACE_ID ? { "x-dashscope-workspace": DASHSCOPE_WORKSPACE_ID } : {}),
    },
    body: offerSdp,
  });
  const answerSdp = await response.text();
  console.log(`[exchange-proxy] status=${response.status} ms=${Date.now() - startedAt} endpoint=${url.origin}`);
  if (!response.ok) {
    sendJson(res, response.status, {
      error: `Qwen WebRTC SDP exchange failed: HTTP ${response.status}`,
      detail: answerSdp.slice(0, 500),
    });
    return;
  }
  res.writeHead(200, {
    "content-type": "application/sdp; charset=utf-8",
    "access-control-allow-origin": ALLOW_ORIGIN,
    "cache-control": "no-store",
  });
  res.end(answerSdp);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/healthz") {
      sendJson(res, 200, { ok: true, name: "qwen-webrtc-exchange-proxy", region: DASHSCOPE_REGION });
      return;
    }
    if (req.url === "/api/qwen-webrtc-offer") {
      await handleOffer(req, res);
      return;
    }
    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Qwen WebRTC exchange proxy listening on http://localhost:${PORT}`);
});
