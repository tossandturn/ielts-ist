import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_PATH = path.join(ROOT, "data", "listening-asr-cache.json");

const args = parseArgs(process.argv.slice(2));
const dryRun = args.has("dry-run");
const only = String(args.get("only") || "").trim().toLowerCase();

const cache = readJson(CACHE_PATH, {});
const officialSources = loadOfficialSources();
const report = {
  entries: 0,
  changedEntries: 0,
  officialRepairs: 0,
  continuityRepairs: 0,
  wordRepairs: 0,
  examples: [],
};

for (const [key, entry] of Object.entries(cache)) {
  if (only && key.toLowerCase() !== only && String(entry?.id || "").toLowerCase() !== only) continue;
  if (!Array.isArray(entry?.sentences) || entry.sentences.length < 2) continue;
  report.entries += 1;
  const sources = officialSourcesForKey(key, officialSources);
  const fixed = entry.sentences.map((sentence, index) => ({ ...sentence, index }));
  const changes = [];

  for (let index = 1; index < fixed.length; index += 1) {
    const previous = fixed[index - 1];
    const current = fixed[index];
    if (!previous?.speaker || !current?.speaker || previous.speaker === current.speaker) continue;
    const officialHit = sources.find((source) => isSameOfficialTurn(source.turns, previous.text, current.text));
    const continuityHit = !officialHit && shouldInheritPreviousSpeaker(previous, current);
    if (!officialHit && !continuityHit) continue;

    const oldSpeaker = current.speaker;
    current.speaker = previous.speaker;
    changes.push({
      index,
      from: oldSpeaker,
      to: previous.speaker,
      method: officialHit ? "official-script" : "continuity",
      text: current.text,
      previous: previous.text,
    });
    if (officialHit) report.officialRepairs += 1;
    else report.continuityRepairs += 1;
  }

  if (!changes.length) continue;
  const changedSentenceIndexes = new Map(changes.map((change) => [change.index, change.to]));
  let wordRepairs = 0;
  const fixedWords = Array.isArray(entry.timedWords)
    ? entry.timedWords.map((word) => {
        const targetSpeaker = changedSentenceIndexes.get(Number(word?.sentenceIndex));
        if (!targetSpeaker || word.speaker === targetSpeaker) return word;
        wordRepairs += 1;
        return { ...word, speaker: targetSpeaker };
      })
    : entry.timedWords;

  report.changedEntries += 1;
  report.wordRepairs += wordRepairs;
  if (report.examples.length < 20) {
    changes.slice(0, 3).forEach((change) => report.examples.push({ key, ...change }));
  }
  if (!dryRun) {
    entry.sentences = fixed.map(({ index, ...sentence }) => sentence);
    entry.timedWords = fixedWords;
    entry.speakers = unique([
      ...(Array.isArray(entry.speakers) ? entry.speakers : []),
      ...entry.sentences.map((sentence) => sentence.speaker),
      ...(Array.isArray(entry.timedWords) ? entry.timedWords.map((word) => word.speaker) : []),
    ]);
    entry.speakerRepair = {
      version: 1,
      method: "official-script-continuity",
      updatedAt: new Date().toISOString(),
      changes: changes.length,
    };
  }
}

if (!dryRun) writeJsonAtomic(CACHE_PATH, cache);
console.log(JSON.stringify(report, null, 2));

function loadOfficialSources() {
  const dirs = [
    path.join(ROOT, "data", "extracted-text"),
    path.join(ROOT, "data", "ocr-cambridge-16-21"),
    path.join(ROOT, "data", "ocr-reading-writing"),
  ];
  const sources = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".txt")) continue;
      const fullPath = path.join(dir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const book = Number(file.match(/cam(\d+)/i)?.[1] || 0);
      if (!book) continue;
      const turns = parseOfficialTurns(raw);
      if (!turns.length) continue;
      sources.push({ book, file: path.relative(ROOT, fullPath).replace(/\\/g, "/"), turns });
    }
  }
  return sources;
}

function parseOfficialTurns(raw) {
  const afterScripts = raw.split(/Audioscripts?/i).slice(1).join("\nAudioscripts\n") || raw;
  const normalized = afterScripts
    .replace(/\r/g, "")
    .replace(/[|]/g, "I")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, " - ");
  const labelPattern = /(?:^|\n)\s*([A-Za-z][A-Za-z.'-]{1,24})\s*[:!]\s*/g;
  const matches = [...normalized.matchAll(labelPattern)].filter((match) => isLikelySpeakerLabel(match[1]));
  const turns = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const text = normalized.slice(match.index + match[0].length, next ? next.index : normalized.length);
    const clean = normalizeOfficialText(text);
    if (clean.split(/\s+/).length < 2) continue;
    turns.push({
      speaker: normalizeLabel(match[1]),
      text: clean,
      norm: normalizeForMatch(clean),
    });
  }
  return turns;
}

function isLikelySpeakerLabel(label) {
  const clean = normalizeLabel(label);
  if (/^(?:q\d+|part|section|test|example|questions?|page|listening|reading|writing|speaking|audioscripts?|answers?|table|date|day|time|cost|name|address|phone|email)$/i.test(clean)) return false;
  return clean.length >= 2 && clean.length <= 24;
}

function officialSourcesForKey(key, sources) {
  const book = Number(String(key).match(/^cam(\d+)/i)?.[1] || 0);
  if (!book) return [];
  return sources.filter((source) => source.book === book);
}

function isSameOfficialTurn(turns, previousText, currentText) {
  const previousTail = lastWords(normalizeForMatch(previousText), 10);
  const currentNorm = normalizeForMatch(currentText);
  const currentHead = firstWords(currentNorm, 8);
  if (!previousTail || !currentHead) return false;
  const combined = `${previousTail} ${currentHead}`.replace(/\s+/g, " ").trim();
  const currentWords = currentHead.split(" ").filter(Boolean);
  if (currentWords.length < 2) return false;

  return turns.some((turn) => {
    if (!turn.norm.includes(currentHead)) return false;
    if (turn.norm.includes(combined)) return true;
    const previousIndex = turn.norm.lastIndexOf(previousTail);
    const currentIndex = turn.norm.indexOf(currentHead);
    return previousIndex >= 0 && currentIndex >= previousIndex && currentIndex - previousIndex < 180;
  });
}

function shouldInheritPreviousSpeaker(previous, current) {
  const previousText = normalizeOfficialText(previous.text || "");
  const currentText = normalizeOfficialText(current.text || "");
  if (!previousText || !currentText || isNarrator(currentText)) return false;
  const gap = Number(current.start) - Number(previous.end);
  const duration = Number(current.end) - Number(current.start);
  if (Number.isFinite(gap) && (gap < -0.12 || gap > 0.35)) return false;
  const wordCount = currentText.split(/\s+/).filter(Boolean).length;
  const startsAsContinuation = /^[a-z]/.test(currentText) || /^[,;:)-]/.test(currentText);
  const previousLooksOpen = !/[.!?]$/.test(previousText);
  const shortTail = Number.isFinite(duration) && duration > 0 && duration <= 1.8 && wordCount <= 6;
  return startsAsContinuation || (previousLooksOpen && shortTail);
}

function isNarrator(text) {
  return /^(?:test\s+\w+|part\s+[1-4]|section\s+[1-4]|published by|this recording is|you will hear|you will have to answer|there will now be|first you have some time|now listen carefully|that is the end of|you now have|turn to section|now turn to section|cambridge assessment english)\b/i.test(String(text || "").trim());
}

function normalizeOfficialText(text) {
  return String(text || "")
    .replace(/\u000c/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, " - ")
    .replace(/\bQ\d+\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?=[A-Za-z0-9])/g, "$1 ")
    .trim();
}

function normalizeForMatch(text) {
  return normalizeOfficialText(text)
    .toLowerCase()
    .replace(/\bcv\b/g, "cv")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstWords(text, count) {
  return String(text || "").split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}

function lastWords(text, count) {
  return String(text || "").split(/\s+/).filter(Boolean).slice(-count).join(" ");
}

function normalizeLabel(label) {
  return String(label || "").replace(/[^A-Za-z.'-]/g, "").trim();
}

function unique(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
}
