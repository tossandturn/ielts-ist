import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_OUTPUT = resolve(ROOT, "data", "objective-semantic-topics.json");
const SCHEMA_VERSION = 1;

const TAXONOMY = [
  { key: "work", label: "Work", emoji: "💼", terms: ["job", "jobs", "work", "career", "recruit", "staff", "employee", "employer", "office", "vacancy", "training", "skills", "manager", "agency"] },
  { key: "travel", label: "Travel", emoji: "✈️", terms: ["travel", "holiday", "tour", "tourism", "tourist", "trip", "hotel", "accommodation", "booking", "visitor", "airport", "excursion", "vacation"] },
  { key: "education", label: "Education", emoji: "🎓", terms: ["student", "university", "school", "college", "course", "education", "teacher", "teaching", "learning", "study", "academic", "campus", "lecture", "library"] },
  { key: "environment", label: "Environment & Nature", emoji: "🌿", terms: ["environment", "environmental", "climate", "wildlife", "forest", "tree", "plant", "species", "animal", "bird", "ecology", "conservation", "pollution", "habitat", "eucalyptus", "ocean", "renewable"] },
  { key: "health", label: "Health", emoji: "🩺", terms: ["health", "medical", "medicine", "hospital", "doctor", "disease", "patient", "exercise", "fitness", "nutrition", "diet", "sleep", "therapy", "treatment"] },
  { key: "science", label: "Science & Technology", emoji: "🔬", terms: ["science", "scientist", "technology", "research", "experiment", "engineering", "innovation", "computer", "digital", "internet", "energy", "laboratory", "theory"] },
  { key: "history", label: "History & Archaeology", emoji: "🏺", terms: ["history", "historical", "ancient", "archaeology", "archaeological", "century", "civilisation", "civilization", "heritage", "warship", "excavation", "museum"] },
  { key: "culture", label: "Culture & Arts", emoji: "🎭", terms: ["culture", "cultural", "art", "artist", "music", "festival", "theatre", "film", "literature", "language", "dance", "painting", "photography"] },
  { key: "society", label: "Society", emoji: "🏘️", terms: ["society", "social", "community", "government", "population", "housing", "urban", "city", "family", "public", "people", "local", "policy"] },
  { key: "business", label: "Business & Economics", emoji: "📈", terms: ["business", "company", "market", "finance", "financial", "money", "bank", "consumer", "retail", "sales", "economic", "economy", "advertising"] },
  { key: "transport", label: "Transport", emoji: "🚆", terms: ["transport", "traffic", "rail", "railway", "train", "road", "car", "vehicle", "bicycle", "cycling", "ship", "canal", "airport"] },
  { key: "architecture", label: "Architecture & Design", emoji: "🏛️", terms: ["architecture", "architect", "building", "construction", "design", "house", "bridge", "structure", "urban planning"] },
  { key: "psychology", label: "Psychology & Behaviour", emoji: "🧠", terms: ["psychology", "psychological", "behaviour", "behavior", "brain", "memory", "emotion", "personality", "motivation", "cognitive"] },
  { key: "food", label: "Food & Agriculture", emoji: "🌾", terms: ["food", "farm", "farming", "agriculture", "agricultural", "crop", "restaurant", "cooking", "kitchen", "diet", "production"] },
];

const GENERAL_TOPIC = { key: "general", label: "General interest", emoji: "✨" };
const SEMANTIC_OVERRIDES = new Map([
  ["cam15-l-test1::section::1", "work"],
  ["cam15-l-test1::section::2", "travel"],
  ["cam15-l-test1::section::4", "environment"],
  ["cam9-l-test4::section::4", "environment"],
]);
const READING_OVERRIDES = new Map([
  ["cam15-r-test1::section::1", { topicKey: "history", topicTitle: "Nutmeg – a valuable spice" }],
  ["cam15-r-test2::section::1", { topicKey: "architecture", topicTitle: "Could urban engineers learn from dance?" }],
  ["cam15-r-test3::section::1", { topicKey: "culture", topicTitle: "Henry Moore (1898–1986)" }],
  ["cam15-r-test3::section::2", { topicKey: "science", topicTitle: "The Desolenator: producing clean water" }],
]);
const CACHE_KEY_OVERRIDES = new Map([
  ["cam9-l-test4::section::3", "cam9-l-test4::4"],
  ["cam9-l-test4::section::4", "cam9-l-test4::3"],
]);

function parseArgs(argv) {
  const result = { check: false, output: DEFAULT_OUTPUT, asrCache: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--check") result.check = true;
    else if (value === "--output") result.output = resolve(argv[++index]);
    else if (value === "--asr-cache") result.asrCache = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${value}`);
  }
  return result;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function enabledCambridge(item) {
  const match = String(item?.id || "").match(/^cam(\d+)-/i);
  return !match || Number(match[1]) >= 4;
}

function uniqueEligiblePapers(banks, kind) {
  const imageKey = kind === "listeningTests" ? "questionPageImages" : "readingPageImages";
  const papers = new Map();
  for (const bank of banks) {
    for (const paper of bank[kind] || []) {
      if (!enabledCambridge(paper) || paper.questions?.length !== 40 || !paper[imageKey]?.length || papers.has(paper.id)) continue;
      papers.set(paper.id, paper);
    }
  }
  return [...papers.values()].sort(comparePaperIds);
}

function comparePaperIds(left, right) {
  const parts = (value) => String(value.id || value).match(/^cam(\d+)-[lr]-test(\d+)/i)?.slice(1).map(Number) || [0, 0];
  const [leftBook, leftTest] = parts(left);
  const [rightBook, rightTest] = parts(right);
  return leftBook - rightBook || leftTest - rightTest;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/Speaker\s+\d+:/gi, " ")
    .replace(/--- Page \d+ ---/gi, " ")
    .replace(/[^a-z0-9'& -]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripBoilerplate(value) {
  return normalizeText(value)
    .replace(/\b(?:you should spend about twenty minutes|you will hear a number of different recordings|write (?:no more than|one word|the correct)|choose (?:the correct|one word)|answer questions?)\b[^.]{0,180}/gi, " ")
    .replace(/\b(?:cambridge|ielts|answer sheet|recording is copyright|university press|assessment english)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return [...text.matchAll(new RegExp(`\\b${escaped}\\b`, "gi"))].length;
}

function classifyTopic({ canonicalId, title, intro, body }) {
  const weightedParts = [[stripBoilerplate(title), 7], [stripBoilerplate(intro), 3], [stripBoilerplate(body), 1]];
  const ranked = TAXONOMY.map((topic, taxonomyIndex) => ({
    topic,
    taxonomyIndex,
    score: topic.terms.reduce((sum, term) => sum + weightedParts.reduce((termScore, [text, weight]) => termScore + Math.min(4, countTerm(text, term)) * weight, 0), 0),
  })).sort((left, right) => right.score - left.score || left.taxonomyIndex - right.taxonomyIndex);
  const overrideKey = SEMANTIC_OVERRIDES.get(canonicalId);
  const winner = overrideKey ? TAXONOMY.find((topic) => topic.key === overrideKey) : ranked[0]?.score >= 4 ? ranked[0].topic : GENERAL_TOPIC;
  const winningScore = ranked.find((item) => item.topic.key === winner.key)?.score || 0;
  const runnerUp = ranked.find((item) => item.topic.key !== winner.key)?.score || 0;
  const confidence = winner.key === "general" ? 0.35 : Math.min(0.99, Math.max(0.55, 0.55 + winningScore / 100 + Math.max(0, winningScore - runnerUp) / 80));
  return { ...winner, confidence: Number(confidence.toFixed(2)) };
}

function cleanTitle(value, fallback) {
  const title = String(value || "")
    .replace(/Speaker\s+\d+:/gi, "")
    .replace(/^(?:a |an )?(?:conversation|talk|lecture|discussion|interview)\s+(?:between .*?\s+)?(?:about|on)\s+/i, "")
    .replace(/^(?:a |an )?(?:man|woman|student|customer|speaker)\s+/i, "")
    .replace(/\b(?:first,? you have|now listen|questions?\s+\w+).*/i, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.-]+|[\s:;,.-]+$/g, "")
    .trim();
  const chosen = title.length >= 4 ? title : fallback;
  return chosen.length > 120 ? `${chosen.slice(0, 117).replace(/\s+\S*$/, "")}...` : chosen;
}

function listeningIntro(text, section) {
  const source = String(text || "").replace(/\s+/g, " ");
  const word = ["", "one", "two", "three", "four"][section];
  const pattern = new RegExp(`(?:part|section)\\s+(?:${section}|${word})[,.: -]+(?:you (?:will|'ll) hear\\s+)?(.{15,500}?)(?=Speaker\\s+\\d+:\\s+(?:First|Now)|First,? you have|Now listen|questions?\\s+(?:${(section - 1) * 10 + 1}|one|eleven|twenty|thirty)|$)`, "i");
  const match = source.match(pattern);
  const unnumbered = source.match(/you (?:will|'ll) hear\s+(.{15,500}?)(?=Speaker\s+\d+:\s+(?:First|Now)|First,? you have|Now listen|questions?\s+\d|$)/i);
  return cleanTitle(match?.[1] || unnumbered?.[1] || "", `Listening Section ${section}`);
}

function detectedSection(text) {
  const intro = String(text || "").slice(0, 2500);
  const match = intro.match(/(?:part|section)\s+(one|two|three|four|[1-4])\b/i);
  if (match) return { one: 1, two: 2, three: 3, four: 4 }[match[1].toLowerCase()] || Number(match[1]);
  const range = intro.match(/questions?\s+(\d{1,2})\s+(?:to|through|-)\s+(\d{1,2})/i);
  const start = Number(range?.[1] || 0);
  const end = Number(range?.[2] || 0);
  return start >= 1 && end <= 40 && start <= end ? Math.ceil(end / 10) : 0;
}

function paperValidatesRange(questionPaper, section) {
  const start = (section - 1) * 10 + 1;
  const end = section * 10;
  const normalized = String(questionPaper || "")
    .replace(/[–—一+]/g, "-")
    .replace(/S\s*E\s*C\s*T\s*I\s*O\s*N/gi, "SECTION")
    .replace(/P\s*A\s*R\s*T/gi, "PART");
  const spacedEnd = String(end).split("").join("\\s*");
  if (new RegExp(`Questions?\\s+${start}\\s*-\\s*${spacedEnd}`, "i").test(normalized)) return true;
  const sectionToken = ["", "(?:1|I)", "(?:2|II)", "(?:3|III)", "(?:4|IV)"][section];
  const marker = normalized.search(new RegExp(`(?:SECTION|PART)\\s+${sectionToken}\\b`, "i"));
  if (marker < 0) return false;
  const remainder = normalized.slice(marker);
  const nextMarker = remainder.slice(1).search(/(?:SECTION|PART)\s+[1-4]\b/i);
  const sectionText = nextMarker >= 0 ? remainder.slice(0, nextMarker + 1) : remainder;
  if (new RegExp(`Questions?\\s+${start}\\s*-\\s*${end}`, "i").test(sectionText)) return true;
  const firstQuestion = Number(sectionText.match(/Questions?\s+(\d{1,2})\b/i)?.[1] || 0);
  return firstQuestion >= start && firstQuestion <= end;
}

function asrValidatesRange(text, section) {
  const start = (section - 1) * 10 + 1;
  const end = section * 10;
  return new RegExp(`questions?\\s+${start}\\s+(?:to|through|-)\\s+${end}`, "i").test(String(text || "").slice(0, 3000));
}

function listeningCacheKey(paperId, section) {
  const canonicalId = `${paperId}::section::${section}`;
  if (CACHE_KEY_OVERRIDES.has(canonicalId)) return CACHE_KEY_OVERRIDES.get(canonicalId);
  const cam12 = paperId.match(/^cam12-l-test([1-4])$/);
  if (cam12) return `cam12-l-test${Number(cam12[1]) + 4}::${section}`;
  return `${paperId}::${section}`;
}

function listeningEntry(paper, section, asrCache) {
  const canonicalId = `${paper.id}::section::${section}`;
  const cacheKey = listeningCacheKey(paper.id, section);
  const cacheEntry = asrCache[cacheKey];
  if (!cacheEntry?.text) throw new Error(`Missing offline ASR intro for ${canonicalId} (expected ${cacheKey})`);
  const marker = detectedSection(cacheEntry.text);
  if (marker !== section) throw new Error(`ASR section marker mismatch for ${canonicalId}: ${cacheKey} says Section ${marker || "unknown"}`);
  if (!paperValidatesRange(paper.questionPaper, section) && !asrValidatesRange(cacheEntry.text, section)) {
    throw new Error(`Question range validation failed for ${canonicalId}`);
  }
  const topicTitle = listeningIntro(cacheEntry.text, section);
  const topic = classifyTopic({ canonicalId, title: topicTitle, intro: String(cacheEntry.text).slice(0, 2500), body: cacheEntry.text });
  const sourceSuffix = cacheKey === `${paper.id}::${section}` ? cacheKey : CACHE_KEY_OVERRIDES.has(canonicalId) ? `cache-repair:${cacheKey}` : `cache-alias:${cacheKey}`;
  return {
    topicKey: topic.key,
    topicLabel: topic.label,
    emoji: topic.emoji,
    topicTitle,
    source: `asr:intro:${sourceSuffix}`,
    confidence: topic.confidence,
    schemaVersion: SCHEMA_VERSION,
  };
}

function readingChunks(readingPaper) {
  const source = String(readingPaper || "");
  const markers = [...source.matchAll(/R[ \t]*E[ \t]*A[ \t]*D[ \t]*I[ \t]*N[ \t]*G[ \t]+P[ \t]*A[ \t]*S[ \t]*S[ \t]*A[ \t]*G[ \t]*E[ \t]+([123])[ \t]*(?=\??[ \t\r\n]+You should spend)/gi)];
  const chunks = new Map();
  const firstMarker = markers[0];
  if (firstMarker && Number(firstMarker[1]) === 2) chunks.set(1, source.slice(0, firstMarker.index));
  for (let index = 0; index < markers.length; index += 1) {
    const section = Number(markers[index][1]);
    if (!chunks.has(section)) chunks.set(section, source.slice(markers[index].index, markers[index + 1]?.index ?? source.length));
  }
  return chunks;
}

function readingTitle(chunk, passage) {
  const normalized = String(chunk || "").replace(/\r/g, "");
  const afterInstructionsMatch = normalized.match(new RegExp(`Passage\\s+${passage}\\s+(?:below|on the following pages)\\.?(?:\\s|\\n)+([^\\n]{4,140})`, "i"))?.[1];
  const afterInstructions = /Questions?|answer sheet|List of/i.test(afterInstructionsMatch || "") ? "" : afterInstructionsMatch;
  const pageHeading = [...normalized.matchAll(/--- Page \d+ ---\n([\s\S]{4,350}?)(?=\n\s*[A-H]\s+[A-Z])/g)]
    .map((match) => match[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^(?:Reading|Test\s+\d+)$/i.test(line))
      .join(" "))
    .find((candidate) => candidate.length >= 4 && candidate.length <= 180 && !/Questions?|answer sheet|List of/i.test(candidate));
  const beforeParagraph = [...normalized.matchAll(/\n([^\n]{4,140})\n\s*[A-H]\s+[A-Z]/g)]
    .map((match) => match[1].trim())
    .find((line) => !/^(?:Questions?|List of|Reading|Test|Write |Choose |Do the following|Which )/i.test(line));
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const fallback = lines.find((line) => line.length >= 8 && line.length <= 120
    && !/^(?:---|READING PASSAGE|You should|Questions?|Reading|Test|Write |Choose |List of|Which |In boxes|TRUE|FALSE|NOT GIVEN|\d+\s)/i.test(line));
  const title = cleanTitle(afterInstructions || pageHeading || beforeParagraph || fallback || "", "");
  if (!title || title.length > 100 || /\.\.\.$/.test(title)
    || /^(?:complete|choose|write|questions?|in boxes|true|false|not given)\b/i.test(title)
    || /\b(?:and|or|the|a|an|of|to|with|for|from|in|on|by|as|that|which|who|were|was|is|are)[|. ]*$/i.test(title)) return "";
  return title;
}

function readingEntry(paper, passage, chunk) {
  const canonicalId = `${paper.id}::section::${passage}`;
  if (!chunk) throw new Error(`Missing Reading Passage ${passage} marker for ${paper.id}`);
  const override = READING_OVERRIDES.get(canonicalId);
  const extractedTitle = readingTitle(chunk, passage);
  const classified = classifyTopic({ canonicalId, title: override?.topicTitle || extractedTitle, intro: String(chunk).slice(0, 2200), body: chunk });
  const topic = override
    ? { ...TAXONOMY.find((item) => item.key === override.topicKey), confidence: 0.99 }
    : classified;
  const topicTitle = override?.topicTitle || extractedTitle || `${topic.label} — Passage ${passage}`;
  return {
    topicKey: topic.key,
    topicLabel: topic.label,
    emoji: topic.emoji,
    topicTitle,
    source: override ? "readingPaper:semantic-override" : "readingPaper:heading+weighted-text",
    confidence: topic.confidence,
    schemaVersion: SCHEMA_VERSION,
  };
}

function resolveAsrCache(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.LISTENING_ASR_CACHE_PATH,
    resolve(ROOT, "data", "listening-asr-cache.json"),
    resolve(ROOT, "..", "..", "data", "listening-asr-cache.json"),
  ].filter(Boolean).map((value) => resolve(value));
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`Offline ASR cache not found. Tried: ${candidates.join(", ")}`);
  return found;
}

export async function generateCatalog({ asrCachePath = "" } = {}) {
  const banks = await Promise.all([
    readJson(resolve(ROOT, "data", "cambridge15-bank.json")),
    readJson(resolve(ROOT, "data", "cambridge-local-bank.json")),
  ]);
  const listeningPapers = uniqueEligiblePapers(banks, "listeningTests");
  const readingPapers = uniqueEligiblePapers(banks, "readingTests");
  if (listeningPapers.length !== 72 || readingPapers.length !== 72) {
    throw new Error(`Expected 72 Listening and 72 Reading papers, found ${listeningPapers.length} and ${readingPapers.length}`);
  }
  const asrCache = await readJson(resolveAsrCache(asrCachePath));
  const catalog = {};
  for (const paper of listeningPapers) {
    for (let section = 1; section <= 4; section += 1) catalog[`${paper.id}::section::${section}`] = listeningEntry(paper, section, asrCache);
  }
  for (const paper of readingPapers) {
    const chunks = readingChunks(paper.readingPaper);
    for (let passage = 1; passage <= 3; passage += 1) catalog[`${paper.id}::section::${passage}`] = readingEntry(paper, passage, chunks.get(passage));
  }
  return catalog;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generated = `${JSON.stringify(await generateCatalog({ asrCachePath: options.asrCache }), null, 2)}\n`;
  if (options.check) {
    const existing = await readFile(options.output, "utf8");
    if (existing !== generated) throw new Error(`${options.output} is not reproducible; run the generator and commit the result`);
    console.log(`PASS semantic topic catalog is reproducible (${Object.keys(JSON.parse(existing)).length} entries)`);
    return;
  }
  await writeFile(options.output, generated, "utf8");
  console.log(`Wrote ${Object.keys(JSON.parse(generated)).length} semantic topics to ${options.output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
