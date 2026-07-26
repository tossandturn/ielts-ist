import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "public", "generated", "audio");
const CACHE_PATH = path.join(ROOT, "data", "listening-asr-cache.json");

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

const only = String(args.get("only") || "").trim();
const force = args.has("force");
const silenceNoise = String(args.get("silence-noise") || "-38dB");
const silenceDuration = Number(args.get("silence-duration") || 0.45);

if (!fs.existsSync(CACHE_PATH)) throw new Error(`Missing cache file: ${CACHE_PATH}`);
const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
let updated = 0;
let skipped = 0;
let failed = 0;

for (const [key, item] of Object.entries(cache)) {
  if (only && key !== only && item?.id !== only) continue;
  if (!item?.text) {
    skipped += 1;
    continue;
  }
  const existing = Array.isArray(item.timedWords) ? item.timedWords : [];
  const words = wordList(item.text);
  if (!force && existing.length === words.length && existing.some((word) => Number.isFinite(Number(word?.start)))) {
    skipped += 1;
    continue;
  }
  const file = audioFileForItem(item, key);
  if (!file || !fs.existsSync(file)) {
    failed += 1;
    console.warn(`[timing] missing audio ${key}`);
    continue;
  }
  const duration = audioDurationSeconds(file);
  if (!duration || !words.length) {
    failed += 1;
    console.warn(`[timing] unusable ${key} duration=${duration} words=${words.length}`);
    continue;
  }
  const intervals = speechIntervals(file, duration);
  item.timedWords = buildTimedWords(words, duration, intervals);
  item.timing = {
    source: "ffmpeg-silence-map-v1",
    silenceNoise,
    silenceDuration,
    duration,
    speechIntervals: intervals.length,
    updatedAt: new Date().toISOString(),
  };
  updated += 1;
  console.log(`[timing] updated ${key} words=${words.length} duration=${duration.toFixed(1)}s intervals=${intervals.length}`);
}

writeJsonAtomic(CACHE_PATH, cache);
console.log(JSON.stringify({ updated, skipped, failed, cacheEntries: Object.keys(cache).length }, null, 2));

function audioFileForItem(item, key) {
  const id = String(item.id || key.split("::")[0] || "").trim();
  const section = String(item.section || key.split("::")[1] || "").trim();
  if (!id || !section) return "";
  for (const ext of [".mp3", ".m4a", ".wav"]) {
    const file = path.join(AUDIO_DIR, `${id}-audio${section}${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return "";
}

function audioDurationSeconds(file) {
  const result = spawnSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ], { encoding: "utf8" });
  const seconds = Number(result.stdout || 0);
  return Number.isFinite(seconds) ? seconds : 0;
}

function speechIntervals(file, duration) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner",
    "-nostats",
    "-i", file,
    "-af", `silencedetect=noise=${silenceNoise}:d=${silenceDuration}`,
    "-f", "null",
    "-",
  ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const log = `${result.stderr || ""}\n${result.stdout || ""}`;
  const silences = [];
  let currentStart = null;
  for (const line of log.split(/\r?\n/)) {
    const start = line.match(/silence_start:\s*([0-9.]+)/);
    if (start) {
      currentStart = Number(start[1]);
      continue;
    }
    const end = line.match(/silence_end:\s*([0-9.]+)/);
    if (end && currentStart !== null) {
      silences.push({ start: Math.max(0, currentStart), end: Math.min(duration, Number(end[1])) });
      currentStart = null;
    }
  }
  if (currentStart !== null) silences.push({ start: Math.max(0, currentStart), end: duration });
  const intervals = [];
  let cursor = 0;
  for (const silence of silences.sort((a, b) => a.start - b.start)) {
    if (silence.start - cursor > 0.15) intervals.push({ start: cursor, end: silence.start });
    cursor = Math.max(cursor, silence.end);
  }
  if (duration - cursor > 0.15) intervals.push({ start: cursor, end: duration });
  return intervals.length ? intervals : [{ start: 0, end: duration }];
}

function buildTimedWords(words, duration, intervals) {
  const totalSpeech = intervals.reduce((sum, item) => sum + Math.max(0, item.end - item.start), 0) || duration;
  const averageWordSeconds = Math.max(0.16, Math.min(0.55, totalSpeech / Math.max(1, words.length)));
  return words.map((word, index) => {
    const offset = words.length > 1 ? (index / (words.length - 1)) * Math.max(0, totalSpeech - averageWordSeconds) : 0;
    const start = timeAtSpeechOffset(intervals, offset);
    const end = Math.min(duration, timeAtSpeechOffset(intervals, offset + averageWordSeconds));
    return {
      word,
      index,
      progress: words.length > 1 ? index / (words.length - 1) : 0,
      start: roundTime(start),
      end: roundTime(Math.max(start + 0.08, end)),
    };
  });
}

function timeAtSpeechOffset(intervals, offset) {
  let remaining = Math.max(0, offset);
  for (const interval of intervals) {
    const length = Math.max(0, interval.end - interval.start);
    if (remaining <= length) return interval.start + remaining;
    remaining -= length;
  }
  return intervals.at(-1)?.end || 0;
}

function wordList(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function roundTime(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}
