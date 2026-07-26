import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIO_DIR = path.join(ROOT, "public", "generated", "audio");
const CACHE_PATH = path.join(ROOT, "data", "listening-asr-cache.json");
const ERROR_PATH = path.join(ROOT, "data", "listening-asr-cache-errors.json");

loadEnv(path.join(ROOT, ".env"));
loadEnv(path.join(ROOT, ".env.local"));

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_ASR_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
const ASR_TASK_URL = process.env.DASHSCOPE_ASR_TASK_URL || "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription";
const ASR_TASK_POLL_URL = process.env.DASHSCOPE_ASR_TASK_POLL_URL || "https://dashscope.aliyuncs.com/api/v1/tasks";
const MODEL = process.env.DASHSCOPE_FILE_ASR_MODEL || "paraformer-v2";
const PUBLIC_BASE_URL = (process.env.LISTENING_AUDIO_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || "https://ieltsist.com").replace(/\/+$/, "");
const SOURCE = "dashscope-file-asr-timestamped-v1";

const args = parseArgs(process.argv.slice(2));
const force = args.has("force");
const only = String(args.get("only") || "").trim().toLowerCase();
const limit = Number(args.get("limit") || 0);
const minBook = Number(args.get("min-book") || 4);
const concurrency = Math.max(1, Number(args.get("concurrency") || 1));
const pollMs = Math.max(1500, Number(args.get("poll-ms") || 3000));
const timeoutMs = Math.max(30_000, Number(args.get("timeout-ms") || 20 * 60_000));
const speakerCount = Number(args.get("speaker-count") || 0);

if (!DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY must be set in .env.local.");

const cache = readJson(CACHE_PATH, {});
const errors = readJson(ERROR_PATH, {});
const allJobs = listAudioJobs();
const jobs = allJobs
  .filter((job) => !only || job.key === only || job.id === only || `${job.id}::${job.section}` === only)
  .filter((job) => force || !hasRealTiming(cache[job.key]));
const selectedJobs = limit > 0 ? jobs.slice(0, limit) : jobs;

console.log(JSON.stringify({
  audioFiles: allJobs.length,
  selected: selectedJobs.length,
  model: MODEL,
  source: SOURCE,
  publicBaseUrl: PUBLIC_BASE_URL,
  concurrency,
  force,
  only,
}, null, 2));

let cursor = 0;
let completed = 0;
let failed = 0;

await Promise.all(Array.from({ length: Math.min(concurrency, selectedJobs.length) }, (_item, index) => runWorker(index + 1)));

writeJsonAtomic(CACHE_PATH, cache);
writeJsonAtomic(ERROR_PATH, errors);
console.log(JSON.stringify({ completed, failed, cacheEntries: Object.keys(cache).length }, null, 2));

async function runWorker(workerId) {
  while (cursor < selectedJobs.length) {
    const job = selectedJobs[cursor];
    cursor += 1;
    await runJob(job, workerId);
  }
}

async function runJob(job, workerId) {
  const startedAt = Date.now();
  try {
    console.log(`[file-asr] start worker=${workerId} ${job.key}`);
    const taskId = await submitTask(job);
    const task = await pollTask(taskId);
    const resultUrl = transcriptionUrlFromTask(task);
    if (!resultUrl) throw new Error(`No transcription_url in task ${taskId}`);
    const raw = await getJson(resultUrl, false);
    const parsed = parseDashScopeTranscription(raw);
    if (!parsed.text || parsed.words.length < 20) {
      throw new Error(`Unusable timestamped ASR result: text=${parsed.text.length} words=${parsed.words.length}`);
    }
    const duration = job.durationSeconds || parsed.duration || 0;
    cache[job.key] = {
      ...(cache[job.key] || {}),
      id: job.id,
      section: String(job.section),
      text: normalizeText(parsed.text),
      source: SOURCE,
      model: MODEL,
      version: 3,
      duration,
      sentences: parsed.sentences,
      timedWords: parsed.words,
      speakers: parsed.speakers,
      timing: {
        source: SOURCE,
        taskId,
        resultUrl,
        duration,
        sentenceCount: parsed.sentences.length,
        wordCount: parsed.words.length,
        speakerCount: parsed.speakers.length,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    delete errors[job.key];
    writeJsonAtomic(CACHE_PATH, cache);
    writeJsonAtomic(ERROR_PATH, errors);
    completed += 1;
    console.log(`[file-asr] done worker=${workerId} ${job.key} words=${parsed.words.length} sentences=${parsed.sentences.length} speakers=${parsed.speakers.length} ms=${Date.now() - startedAt}`);
  } catch (error) {
    failed += 1;
    errors[job.key] = {
      id: job.id,
      section: String(job.section),
      file: path.relative(ROOT, job.filePath).replace(/\\/g, "/"),
      error: error?.message || String(error),
      updatedAt: new Date().toISOString(),
    };
    writeJsonAtomic(ERROR_PATH, errors);
    console.error(`[file-asr] fail worker=${workerId} ${job.key}: ${errors[job.key].error}`);
  }
}

async function submitTask(job) {
  const parameters = {
    language_hints: ["en"],
    timestamp_alignment_enabled: true,
    diarization_enabled: true,
  };
  if (speakerCount > 0) parameters.speaker_count = speakerCount;
  const body = {
    model: MODEL,
    input: {
      file_urls: [job.url],
    },
    parameters,
  };
  const response = await fetch(ASR_TASK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`submit ${response.status}: ${JSON.stringify(json).slice(0, 500)}`);
  const taskId = json?.output?.task_id || json?.task_id;
  if (!taskId) throw new Error(`Missing task_id: ${JSON.stringify(json).slice(0, 500)}`);
  return taskId;
}

async function pollTask(taskId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${ASR_TASK_POLL_URL}/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`poll ${response.status}: ${JSON.stringify(json).slice(0, 500)}`);
    const status = String(json?.output?.task_status || json?.task_status || "").toUpperCase();
    if (status === "SUCCEEDED") return json;
    if (["FAILED", "CANCELED", "UNKNOWN"].includes(status)) throw new Error(`task ${taskId} ${status}: ${JSON.stringify(json).slice(0, 700)}`);
    await delay(pollMs);
  }
  throw new Error(`task ${taskId} timeout after ${timeoutMs}ms`);
}

function transcriptionUrlFromTask(task) {
  const results = task?.output?.results || task?.results || [];
  for (const result of results) {
    if (result?.transcription_url) return result.transcription_url;
    if (result?.transcription?.url) return result.transcription.url;
  }
  return task?.output?.transcription_url || task?.transcription_url || "";
}

function parseDashScopeTranscription(raw) {
  const transcripts = findArraysByName(raw, "transcripts").flat();
  const sentenceArrays = findArraysByName(raw, "sentences");
  const sentences = [];
  const words = [];
  const speakerSet = new Set();
  let wordIndex = 0;

  for (const transcript of transcripts) {
    if (Array.isArray(transcript?.sentences)) parseSentenceArray(transcript.sentences, transcript.speaker_id ?? transcript.speaker);
  }
  if (!sentences.length) {
    for (const array of sentenceArrays) parseSentenceArray(array);
  }

  if (!sentences.length) {
    const flatSentences = collectSentenceLikeObjects(raw);
    parseSentenceArray(flatSentences);
  }

  for (const sentence of sentences) {
    if (sentence.speaker) speakerSet.add(sentence.speaker);
  }

  const text = sentences.length
    ? sentences.map((item) => item.speaker ? `${item.speaker}: ${item.text}` : item.text).join("\n")
    : firstString(raw, ["text", "transcript", "content"]) || "";

  return {
    text,
    sentences,
    words,
    speakers: Array.from(speakerSet),
    duration: Math.max(0, ...sentences.map((item) => Number(item.end) || 0), ...words.map((item) => Number(item.end) || 0)),
  };

  function parseSentenceArray(array, fallbackSpeaker = "") {
    if (!Array.isArray(array)) return;
    for (const item of array) {
      const text = normalizeText(item?.text || item?.sentence || item?.content || "");
      if (!text) continue;
      const speaker = normalizeSpeaker(item?.speaker_id ?? item?.speakerId ?? item?.speaker ?? fallbackSpeaker);
      const start = normalizeTime(item?.begin_time ?? item?.start_time ?? item?.start ?? item?.begin);
      const end = normalizeTime(item?.end_time ?? item?.end ?? item?.finish_time);
      const sentenceIndex = sentences.length;
      const sentenceWords = parseWordArray(item?.words || item?.word_list || item?.tokens || [], { speaker, sentenceIndex });
      const sentence = {
        text,
        speaker,
        start: Number.isFinite(start) ? start : (sentenceWords[0]?.start ?? null),
        end: Number.isFinite(end) ? end : (sentenceWords.at(-1)?.end ?? null),
        wordStart: wordIndex,
        wordEnd: wordIndex + sentenceWords.length,
      };
      sentences.push(sentence);
      for (const word of sentenceWords) {
        words.push({ ...word, index: wordIndex });
        wordIndex += 1;
      }
      if (!sentenceWords.length) {
        const roughWords = normalizeText(text).split(/\s+/).filter(Boolean);
        const sentenceDuration = Math.max(0.4, (Number(sentence.end) || 0) - (Number(sentence.start) || 0));
        roughWords.forEach((word, offset) => {
          const ratio = roughWords.length > 1 ? offset / (roughWords.length - 1) : 0;
          words.push({
            word,
            index: wordIndex,
            sentenceIndex,
            speaker,
            start: Number.isFinite(sentence.start) ? roundTime(sentence.start + ratio * sentenceDuration) : null,
            end: Number.isFinite(sentence.start) ? roundTime(sentence.start + Math.min(1, ratio + 1 / Math.max(1, roughWords.length)) * sentenceDuration) : null,
          });
          wordIndex += 1;
        });
      }
    }
  }
}

function parseWordArray(array, context) {
  if (!Array.isArray(array)) return [];
  return array
    .map((item) => {
      const word = normalizeText(item?.text || item?.word || item?.token || "");
      if (!word) return null;
      return {
        word,
        sentenceIndex: context.sentenceIndex,
        speaker: context.speaker,
        start: normalizeTime(item?.begin_time ?? item?.start_time ?? item?.start ?? item?.begin),
        end: normalizeTime(item?.end_time ?? item?.end ?? item?.finish_time),
      };
    })
    .filter(Boolean);
}

function collectSentenceLikeObjects(root) {
  const results = [];
  walk(root, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    if ((value.text || value.sentence || value.content) && hasTimeField(value)) results.push(value);
  });
  return results;
}

function hasTimeField(value) {
  return ["begin_time", "start_time", "start", "begin", "end_time", "end"].some((key) => value[key] !== undefined);
}

function findArraysByName(root, name) {
  const results = [];
  walk(root, (value, key) => {
    if (key === name && Array.isArray(value)) results.push(value);
  });
  return results;
}

function firstString(root, keys) {
  let found = "";
  walk(root, (value, key) => {
    if (found || !keys.includes(key) || typeof value !== "string") return;
    found = value;
  });
  return found;
}

function walk(value, visitor, key = "") {
  visitor(value, key);
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor, key));
    return;
  }
  Object.entries(value).forEach(([childKey, childValue]) => walk(childValue, visitor, childKey));
}

function normalizeSpeaker(value) {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  if (/^(?:speaker|voice)\s*\d+$/i.test(text)) return text.replace(/^speaker/i, "Speaker").replace(/^voice/i, "Voice");
  if (/^\d+$/.test(text)) return `Speaker ${Number(text) + 1}`;
  return text;
}

function normalizeTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const looksLikeMilliseconds = Number.isInteger(number) && Math.abs(number) >= 10;
  const seconds = looksLikeMilliseconds || Math.abs(number) > 1000 ? number / 1000 : number;
  return roundTime(seconds);
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\u000c/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[A-Za-z0-9])/g, "$1 ")
    .trim();
}

function hasRealTiming(item) {
  if (!item) return false;
  const hasSentences = Array.isArray(item.sentences) && item.sentences.some((sentence) => Number.isFinite(Number(sentence.start)));
  const hasWords = Array.isArray(item.timedWords) && item.timedWords.some((word) => Number.isFinite(Number(word.start)));
  return hasSentences && hasWords && timedWordsAreMonotonic(item.timedWords);
}

function timedWordsAreMonotonic(words) {
  if (!Array.isArray(words)) return false;
  let previous = -Infinity;
  for (const word of words) {
    const start = Number(word?.start);
    if (!Number.isFinite(start)) continue;
    if (start < previous) return false;
    previous = start;
  }
  return true;
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
        name,
        url: `${PUBLIC_BASE_URL}/generated/audio/${encodeURIComponent(name)}`,
        filePath: path.join(AUDIO_DIR, name),
      };
    })
    .filter(Boolean)
    .filter((job) => job.book >= minBook)
    .map((job) => ({ ...job, durationSeconds: audioDurationSeconds(job.filePath) }))
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
  return Number.isFinite(seconds) ? roundTime(seconds) : 0;
}

function parseArgs(values) {
  const result = new Map();
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[i + 1];
    if (next && !next.startsWith("--")) {
      result.set(key, next);
      i += 1;
    } else {
      result.set(key, "true");
    }
  }
  return result;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1].replace(/^\uFEFF/, "");
    if (process.env[key]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

async function getJson(url, auth = true) {
  const response = await fetch(url, {
    headers: auth ? { Authorization: `Bearer ${DASHSCOPE_API_KEY}` } : undefined,
  });
  const text = await response.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 300)}`);
  }
  if (!response.ok) throw new Error(`GET ${response.status}: ${JSON.stringify(json).slice(0, 500)}`);
  return json;
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

function roundTime(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
