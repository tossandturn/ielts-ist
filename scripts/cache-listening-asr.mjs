import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "public", "generated", "audio");
const CACHE_PATH = path.join(ROOT, "data", "listening-asr-cache.json");
const ERROR_PATH = path.join(ROOT, "data", "listening-asr-cache-errors.json");
const SOURCE = "qwen-asr-live-vad-v1";
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const DEFAULT_CHUNK_MS = 100;

loadEnv(path.join(ROOT, ".env"));
loadEnv(path.join(ROOT, ".env.local"));

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
const DASHSCOPE_WORKSPACE_ID = process.env.DASHSCOPE_WORKSPACE_ID || process.env.QWEN_WORKSPACE_ID || "";
const DASHSCOPE_REGION = process.env.DASHSCOPE_REGION || "cn-beijing";
const QWEN_ASR_MODEL = process.env.QWEN_ASR_MODEL || "qwen3-asr-flash-realtime";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const value = process.argv[i];
  if (!value.startsWith("--")) continue;
  const key = value.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, "true");
  }
}

const force = args.has("force");
const limit = Number(args.get("limit") || 0);
const only = String(args.get("only") || "").trim();
const sendDelayMs = Number(args.get("send-delay-ms") || 8);
const chunkMs = Math.max(20, Number(args.get("chunk-ms") || DEFAULT_CHUNK_MS));
const sliceSeconds = Math.max(0, Number(args.get("slice-seconds") || 0));
const settleMs = Number(args.get("settle-ms") || 18000);
const minWords = Number(args.get("min-words") || 80);
const minBook = Number(args.get("min-book") || 4);
const maxDurationSeconds = Number(args.get("max-duration") || 900);
const concurrency = Math.max(1, Number(args.get("concurrency") || 1));

if (!DASHSCOPE_API_KEY || !DASHSCOPE_WORKSPACE_ID) {
  throw new Error("DASHSCOPE_API_KEY and DASHSCOPE_WORKSPACE_ID must be set in .env.local.");
}

fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });

const cache = readJson(CACHE_PATH, {});
const errors = readJson(ERROR_PATH, {});
const jobs = listAudioJobs()
  .filter((job) => !only || job.key === only || job.id === only)
  .filter((job) => force || !isUsableAsrText(cache[job.key]?.text, minWords));
const selectedJobs = limit > 0 ? jobs.slice(0, limit) : jobs;

console.log(JSON.stringify({
  audioFiles: listAudioJobs().length,
  pending: jobs.length,
  selected: selectedJobs.length,
  force,
  only,
  model: QWEN_ASR_MODEL,
  region: DASHSCOPE_REGION,
  minBook,
  maxDurationSeconds,
  concurrency,
  chunkMs,
  sliceSeconds,
}, null, 2));

let completed = 0;
let cursor = 0;

async function runNext(workerId) {
  while (cursor < selectedJobs.length) {
    const job = selectedJobs[cursor];
    cursor += 1;
    await runJob(job, workerId);
  }
}

async function runJob(job, workerId) {
  const startedAt = Date.now();
  try {
    console.log(`[asr-cache] start worker=${workerId} ${job.key} ${path.basename(job.filePath)}`);
    const text = sliceSeconds > 0
      ? await transcribeAudioInSlices(job.filePath, { sendDelayMs, settleMs, chunkMs, sliceSeconds })
      : await transcribeAudio(job.filePath, { sendDelayMs, settleMs, chunkMs });
    const clean = normalizeText(text);
    const words = wordCount(clean);
    if (!isUsableAsrText(clean, minWords)) {
      throw new Error(`ASR text rejected: ${words} words`);
    }
    cache[job.key] = {
      id: job.id,
      section: String(job.section),
      text: clean,
      source: SOURCE,
      mode: "live-vad",
      version: 2,
      timedWords: buildTimedWords(clean),
      updatedAt: new Date().toISOString(),
    };
    delete errors[job.key];
    writeJsonAtomic(CACHE_PATH, cache);
    writeJsonAtomic(ERROR_PATH, errors);
    completed += 1;
    console.log(`[asr-cache] done worker=${workerId} ${job.key} words=${words} ms=${Date.now() - startedAt}`);
  } catch (error) {
    errors[job.key] = {
      id: job.id,
      section: String(job.section),
      file: path.relative(ROOT, job.filePath).replace(/\\/g, "/"),
      error: error?.message || String(error),
      updatedAt: new Date().toISOString(),
    };
    writeJsonAtomic(ERROR_PATH, errors);
    console.error(`[asr-cache] fail worker=${workerId} ${job.key}: ${errors[job.key].error}`);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, selectedJobs.length) }, (_item, index) => runNext(index + 1)));

console.log(JSON.stringify({
  completed,
  cacheEntries: Object.keys(cache).length,
  usableCacheEntries: Object.values(cache).filter((item) => isUsableAsrText(item?.text, minWords)).length,
  errors: Object.keys(errors).length,
}, null, 2));

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1].replace(/^\uFEFF/, "");
    if (process.env[key]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}

function listAudioJobs() {
  if (!fs.existsSync(AUDIO_DIR)) return [];
  return fs.readdirSync(AUDIO_DIR)
    .map((name) => {
      const match = name.match(/^(cam\d+-l-test\d+)-audio([1-4])\.(?:mp3|m4a|wav)$/i);
      if (!match) return null;
      const id = match[1].toLowerCase();
      const section = Number(match[2]);
      return {
        id,
        book: Number(id.match(/^cam(\d+)/i)?.[1] || 0),
        section,
        key: `${id}::${section}`,
        filePath: path.join(AUDIO_DIR, name),
      };
    })
    .filter(Boolean)
    .filter((job) => job.book >= minBook)
    .map((job) => ({ ...job, durationSeconds: audioDurationSeconds(job.filePath) }))
    .filter((job) => !maxDurationSeconds || job.durationSeconds <= maxDurationSeconds)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }) || a.section - b.section);
}

function audioDurationSeconds(filePath) {
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ], { encoding: "utf8" });
  const seconds = Number(result.stdout || 0);
  return Number.isFinite(seconds) ? seconds : 0;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\u000c/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[A-Za-z0-9])/g, "$1 ")
    .replace(/\bi\s/g, "I ")
    .trim();
}

function wordCount(text) {
  return normalizeText(text).split(/\s+/).filter(Boolean).length;
}

function isUsableAsrText(text, threshold = minWords) {
  const clean = normalizeText(text);
  const words = wordCount(clean);
  if (words < threshold) return false;
  if (/published by cambridge|this recording is copyright|cambridge assessment english/i.test(clean) && words < 180) return false;
  return true;
}

function buildTimedWords(text) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  return words.map((word, index) => ({
    word,
    index,
    progress: words.length > 1 ? index / (words.length - 1) : 0,
  }));
}

async function transcribeAudio(filePath, options) {
  const ws = await connectAsr();
  const transcript = createTranscriptCollector();
  ws.on("message", (data) => {
    try {
      transcript.add(JSON.parse(data.toString("utf8")));
    } catch {
      // Ignore binary or malformed upstream messages.
    }
  });
  await delay(600);
  await sendPcm(ws, filePath, options.sendDelayMs, options.chunkMs, options.segment);
  safeSend(ws, {
    event_id: `event_${cryptoId()}`,
    type: "input_audio_buffer.commit",
  });
  safeSend(ws, {
    event_id: `event_${cryptoId()}`,
    type: "session.finish",
  });
  const quietStartedAt = Date.now();
  let lastText = "";
  while (Date.now() - quietStartedAt < options.settleMs) {
    await delay(500);
    const current = transcript.text();
    if (current && current === lastText && Date.now() - transcript.updatedAt > 3500) break;
    lastText = current;
  }
  try {
    ws.close(1000, "done");
  } catch {}
  return transcript.text();
}

async function transcribeAudioInSlices(filePath, options) {
  const totalSeconds = audioDurationSeconds(filePath);
  const parts = [];
  for (let start = 0; start < totalSeconds; start += options.sliceSeconds) {
    const duration = Math.min(options.sliceSeconds, totalSeconds - start);
    const text = await transcribeAudio(filePath, {
      ...options,
      segment: { start, duration },
    });
    const clean = normalizeText(text);
    if (clean) parts.push(clean);
  }
  return mergeTranscript(parts.join(" "));
}

function connectAsr() {
  return new Promise((resolve, reject) => {
    const url = `wss://${DASHSCOPE_WORKSPACE_ID}.${DASHSCOPE_REGION}.maas.aliyuncs.com/api-ws/v1/realtime?model=${encodeURIComponent(QWEN_ASR_MODEL)}`;
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
      handshakeTimeout: 15000,
    });
    const timer = setTimeout(() => reject(new Error("ASR websocket open timeout")), 20000);
    ws.once("open", () => {
      clearTimeout(timer);
      safeSend(ws, {
        event_id: `event_${cryptoId()}`,
        type: "session.update",
        session: {
          modalities: ["text"],
          input_audio_format: "pcm",
          sample_rate: SAMPLE_RATE,
          instructions: "Transcribe IELTS listening audio accurately with natural punctuation and original casing. If different speakers can be distinguished, prefix turns as Speaker 1: and Speaker 2:. Return transcript text only.",
          turn_detection: {
            type: "server_vad",
            threshold: 0.0,
            silence_duration_ms: 500,
          },
          input_audio_transcription: {
            model: QWEN_ASR_MODEL,
            language: "en",
          },
        },
      });
      resolve(ws);
    });
    ws.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function createTranscriptCollector() {
  const items = new Map();
  const chunks = [];
  return {
    updatedAt: Date.now(),
    add(message) {
      const type = message?.type || "";
      const text = extractAsrText(message);
      if (!text) return;
      const itemId = String(message.item_id || message.itemId || message.item?.id || message.id || "");
      if (/completed|done|final/i.test(type) && itemId) {
        items.set(itemId, text);
      } else if (/completed|done|final/i.test(type)) {
        chunks.push(text);
      } else if (itemId && !items.has(itemId)) {
        items.set(itemId, text);
      }
      this.updatedAt = Date.now();
    },
    text() {
      return mergeTranscript([...items.values(), ...chunks].join(" "));
    },
  };
}

function extractAsrText(payload = {}) {
  const candidates = [
    payload.text,
    payload.transcript,
    payload.delta,
    payload.output_text,
    payload.audio_transcript,
    payload.transcription,
    payload.transcription?.text,
    payload.output?.text,
    payload.output?.transcript,
    payload.delta?.text,
    payload.delta?.transcript,
    payload.item?.content?.map?.((part) => part?.text || part?.transcript || "").join(" "),
    payload.content?.map?.((part) => part?.text || part?.transcript || "").join(" "),
    payload.response?.output_text,
    payload.response?.text,
    payload.response?.output?.map?.((item) => item?.content?.map?.((part) => part?.text || part?.transcript || "").join(" ")).join(" "),
  ];
  for (const value of candidates) {
    if (value === null || value === undefined || typeof value === "object") continue;
    const clean = normalizeText(value);
    if (clean) return clean;
  }
  return "";
}

function mergeTranscript(text) {
  const parts = normalizeText(text).split(/(?<=[.!?])\s+/).filter(Boolean);
  const output = [];
  for (const part of parts) {
    const clean = normalizeText(part);
    if (!clean) continue;
    const last = output[output.length - 1] || "";
    if (last.toLowerCase().endsWith(clean.toLowerCase())) continue;
    if (clean.toLowerCase().startsWith(last.toLowerCase()) && last.length > 12) {
      output[output.length - 1] = clean;
    } else {
      output.push(clean);
    }
  }
  return normalizeText(output.join(" "));
}

function sendPcm(ws, filePath, sendDelay, chunkMs = DEFAULT_CHUNK_MS, segment = null) {
  return new Promise((resolve, reject) => {
    const chunkBytes = Math.round((SAMPLE_RATE * CHANNELS * BYTES_PER_SAMPLE * chunkMs) / 1000);
    const inputArgs = segment
      ? ["-ss", String(Math.max(0, segment.start || 0)), "-t", String(Math.max(0.1, segment.duration || 0))]
      : [];
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      ...inputArgs,
      "-i", filePath,
      "-f", "s16le",
      "-ac", "1",
      "-ar", String(SAMPLE_RATE),
      "pipe:1",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let pending = Buffer.alloc(0);
    let chain = Promise.resolve();
    let stderr = "";
    let sendError = null;
    let closeInfo = "";
    ws.once("close", (code, reason) => {
      closeInfo = ` code=${code} reason=${reason?.toString?.() || ""}`.trim();
    });
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString("utf8"));
        if (message?.type === "error" || message?.error) {
          closeInfo = `server=${JSON.stringify(message).slice(0, 500)}`;
        }
      } catch {}
    });
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    ffmpeg.stdout.on("data", (chunk) => {
      if (sendError) return;
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= chunkBytes) {
        const packet = pending.subarray(0, chunkBytes);
        pending = pending.subarray(chunkBytes);
        chain = chain
          .then(() => sendAudioChunk(ws, packet, sendDelay, () => closeInfo))
          .catch((error) => {
            sendError = error;
            try {
              ffmpeg.kill("SIGTERM");
            } catch {}
          });
      }
    });
    ffmpeg.once("error", reject);
    ffmpeg.once("close", (code) => {
      chain
        .then(async () => {
          if (sendError) throw sendError;
          if (pending.length) await sendAudioChunk(ws, pending, sendDelay, () => closeInfo);
          if (code !== 0) throw new Error(`ffmpeg failed (${code}): ${stderr.slice(0, 300)}`);
          resolve();
        })
        .catch(reject);
    });
  });
}

async function sendAudioChunk(ws, buffer, sendDelay, closeInfo = "") {
  const info = typeof closeInfo === "function" ? closeInfo() : closeInfo;
  if (ws.readyState !== WebSocket.OPEN) throw new Error(`ASR websocket closed while sending audio${info ? ` (${info})` : ""}`);
  safeSend(ws, {
    event_id: `event_${cryptoId()}`,
    type: "input_audio_buffer.append",
    audio: buffer.toString("base64"),
  });
  if (sendDelay > 0) await delay(sendDelay);
}

function safeSend(ws, value) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(value));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cryptoId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
