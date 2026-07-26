const fs = require("fs");
const path = require("path");

const workspace = path.resolve(__dirname, "..");
const outputPath = path.join(workspace, "data", "speaking-bank.json");

function buildSources() {
  const items = [];

  for (const book of [1, 3, 4, 5, 6, 7, 10]) {
    items.push({ book, file: path.join(workspace, "data", "extracted-text", `cam${book}.txt`) });
  }

  for (const book of [8, 9, 11, 13, 14, 15]) {
    for (const test of [1, 2, 3, 4]) {
      items.push({
        book,
        test,
        file: path.join(workspace, "data", "ocr-reading-writing", `cam${book}-test${test}-reading-writing.txt`),
      });
    }
  }

  for (const test of [5, 6, 7, 8]) {
    items.push({
      book: 12,
      test,
      file: path.join(workspace, "data", "ocr-reading-writing", `cam12-test${test}-reading-writing.txt`),
    });
  }

  items.push(
    { book: 16, file: path.join(workspace, "data", "ocr-cambridge-16-21", "cam16-pages.txt") },
    { book: 17, file: path.join(workspace, "data", "extracted-text", "cam17-pages.txt") },
    { book: 18, file: path.join(workspace, "data", "ocr-cambridge-16-21", "cam18-pages.txt") },
    { book: 19, file: path.join(workspace, "data", "ocr-cambridge-16-21", "cam19-pages.txt") },
    { book: 20, file: path.join(workspace, "data", "ocr-cambridge-16-21", "cam20-pages.txt") },
    { book: 21, file: path.join(workspace, "data", "ocr-cambridge-16-21", "cam21-pages.txt") },
  );

  return items;
}

const sources = buildSources();

function readFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function normaliseText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
}

function compact(text) {
  return normaliseText(text)
    .replace(/[|]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageSegments(text) {
  const normalised = normaliseText(text);
  const matches = [...normalised.matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---|$)/g)];
  if (matches.length) return matches.map((match) => ({ page: Number(match[1]), text: match[2] }));
  const raw = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
  const pages = raw.split("\f");
  if (pages.length <= 1) return [];
  return pages
    .map((pageText, index) => ({ page: index + 1, text: normaliseText(pageText) }))
    .filter((segment) => segment.text.trim());
}

function hasSpeakingMarkers(text) {
  const source = normaliseText(text);
  return /SPEAKI[\w~]*G/i.test(source) && /\bPART\s*1\b/i.test(source) && /\bPART\s*2\b/i.test(source) && /\bPART\s*3\b/i.test(source);
}

function speakingBlocks(text) {
  const pages = pageSegments(text);
  const pageCandidates = pages.filter((segment) => hasSpeakingMarkers(segment.text));
  if (pageCandidates.length) return pageCandidates;

  const source = normaliseText(text);
  const blocks = [];
  const pattern = /(?:^|\n)(?:Test\s*(\d+)[\s\S]{0,160}?)?SPEAKI[\w~]*G([\s\S]*?)(?=\n\s*Test\s*\d+\s*\n\s*(?:LISTENING|READING|WRITING|SECTION)|$)/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const blockText = `SPEAKING${match[2]}`;
    if (hasSpeakingMarkers(blockText)) {
      blocks.push({
        page: null,
        test: match[1] ? Number(match[1]) : null,
        text: blockText,
      });
    }
  }
  return blocks;
}

function between(text, start, end) {
  const source = normaliseText(text);
  const startMatch = source.match(start);
  if (!startMatch) return "";
  const from = startMatch.index + startMatch[0].length;
  const tail = source.slice(from);
  const endMatch = tail.match(end);
  return compact(endMatch ? tail.slice(0, endMatch.index) : tail);
}

function isSpeakingCandidate(text) {
  const source = normaliseText(text);
  return /\bPART\s*1\b/i.test(source)
    && /\bPART\s*2\b/i.test(source)
    && /\bPART\s*3\b/i.test(source)
    && /Describe\s+(?:a|an|the|some|your|an?\s+)/i.test(source)
    && /Discussion topics/i.test(source)
    && /Example questions/i.test(source);
}

function stripSideInstructions(line) {
  let value = compact(line).replace(/\s*\|\s*/g, " ");
  const cutPatterns = [
    /\s+\b(?:You|Vou)\s+w(?:ill|il|ll)\s+h(?:ave|av)?\s+to\s+talk\b/i,
    /\s+\babout\s+(?:the\s+)?(?:topic|hi)\s+for\s+one\b/i,
    /\s+\btopic\s+for\b.*$/i,
    /\s+\b(?:one|two|2|10)\s+(?:to\s+two\s+)?min(?:ute|utes|uts|ts|t?s)\b/i,
    /\s+\bhave\s+one\s+minute\s+to\b/i,
    /\s+\bYou\s+have\b.*$/i,
    /\s+\bYou\s+will\b.*$/i,
    /\s+\bYou\s+can\s+make\s+some\s+notes\b.*$/i,
    /\s+\b1\s+minute\s+to\b/i,
    /\s+\bwhat\s+you\s+are\s+going\s+to\b/i,
    /\s+\bwhat\s+you\s*$/i,
    /\s+\bthink\s+about\s*$/i,
    /\s+\babout\s+the\s+hi\b.*$/i,
    /\s+\bare\s+(?:going|gong|gaing|gale)\s+(?:to\s+)?say\b/i,
    /\s+\bcan\s+(?:make|malay|malk|mar)\s+some\b/i,
    /\s+\bhelp\s+you\b.*$/i,
    /\s+\bnotes?\s+to\s+help\b/i,
    /\s+\bto\s+help\s+you\b/i,
    /\s+\bif\s+you\s+wish\b/i,
  ];
  for (const pattern of cutPatterns) {
    const match = value.match(pattern);
    if (match) value = value.slice(0, match.index).trim();
  }
  return value;
}

function cleanLine(line) {
  return compact(line)
    .replace(/^[\s\u2022\u25cf\u25aa\u25c6\u00bb\u00ab\u00a9\u00a7+*=:\-]+/g, "")
    .replace(/^[oO]\s+(?=[A-Z])/g, "")
    .replace(/^EXAMPLE\s*/i, "")
    .replace(/^Example questions:\s*/i, "")
    .replace(/^Discussion topics:\s*/i, "")
    .replace(/\s+([?.!,;:])/g, "$1")
    .trim();
}

function bulletise(text) {
  return compact(text)
    .replace(/[\u2022\u25cf\u25aa\u25c6\u00bb\u00ab\u00a9\u00a7]\s*/g, "\n")
    .replace(/(?:^|\s)[+*=]\s+(?=[A-Z])/g, "\n")
    .replace(/\s+[oO]\s+(?=[A-Z][a-z])/g, "\n");
}

function questionSentences(text) {
  const source = bulletise(text).replace(/\n+/g, " ");
  const matches = [...source.matchAll(/\b(?:In what ways|To what extent|What|When|Where|Why|How|Who|Which|Do|Does|Did|Are|Is|Was|Were|Have|Has|Can|Could|Would|Should|If)\b[^?]{5,220}\?(?:\s*\[[^\]]+\])?/gi)];
  const seen = new Set();
  return matches
    .map((match) => cleanLine(match[0]))
    .filter((question) => question.length >= 12 && question.length <= 260)
    .filter((question) => {
      const key = question.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function extractPart1(part1Block) {
  const exampleIndex = part1Block.search(/\bEXAMPLE\b/i);
  const exampleBlock = exampleIndex >= 0 ? part1Block.slice(exampleIndex + 7) : part1Block;
  const lines = bulletise(exampleBlock)
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
  const topic = lines.find((line) =>
    !/\?/.test(line)
    && !/examiner asks/i.test(line)
    && !/familiar topics/i.test(line)
    && line.length <= 80,
  ) || "General questions";
  return {
    topic,
    questions: questionSentences(exampleBlock).slice(0, 6),
  };
}

function stripCueNoiseTail(line) {
  let value = line;
  const cutPatterns = [
    /\bthing\s+(?:Ado|can\s+malay|[A-Z][A-Za-z]*)\b.*$/i,
    /\bare\/gang\b.*$/i,
    /\bcan\s+malay\s+soma\s+nates\b.*$/i,
    /\bthink\s+sboutwhat\b.*$/i,
    /\btink\s+sboutwhat\b.*$/i,
    /\bve\s+oe\s+on\b.*$/i,
    /\s+[\u00a3\u00a5\u20ac]\s*$/i,
    /\bwhat\s+you\s*$/i,
    /\bYou\s+have\s*$/i,
    /\bYou\s+will\s*$/i,
    /\b(?:fivo|hifik|pirat|frtbdieded|froitdelndined|Jaron|Ado)\b.*$/i,
    /\b(?:You\s+wil|You\s+wll|You\s+wilt|You\s+wiI|Vou\s+will)\b.*$/i,
  ];
  for (const pattern of cutPatterns) {
    const match = value.match(pattern);
    if (match) value = value.slice(0, match.index).trim();
  }
  return value;
}

function looksNoisy(line) {
  const lower = line.toLowerCase();
  const needles = [
    "ado",
    "jaron",
    "malay",
    "soma",
    "nates",
    "gaing",
    "gale",
    "hifik",
    "fivo",
    "pirat",
    "frtbdieded",
    "froitdelndined",
    "wen!",
    "helpyou",
    "abo",
    "yliiia",
    "1odio",
    "talk]",
    "you wish;",
    "0 minutes",
    "help you",
    "topic for",
  ];
  return needles.some((needle) => lower.includes(needle)) || /\bHK\b/.test(line);
}

function cleanCueCard(part2Block) {
  const rawLines = normaliseText(part2Block)
    .replace(/\bYous?\s+sa(?:y)?\b/gi, "You should say")
    .replace(/\bYou\s+should\s+say\s*[:：]?/gi, "\nYou should say:")
    .replace(/\band explain\b/gi, "\nand explain")
    .replace(/\b(?:what|where|when|why|how|who|which)\b/gi, (match) => `\n${match.toLowerCase()}`)
    .split(/\n+/);

  const lines = [];
  for (const rawLine of rawLines) {
    let line = cleanLine(stripSideInstructions(rawLine));
    if (!line) continue;
    if (/^(minutes|wish|say|notes|topic)$/i.test(line)) continue;
    if (/^(\d+|[A-Z]{1,3})$/.test(line)) continue;
    if (/^SPEAKING$/i.test(line) || /^PART\s*[123]$/i.test(line)) continue;
    line = cleanLine(stripCueNoiseTail(line));
    if (!line || looksNoisy(line)) continue;
    if (
      /^Describe\b/i.test(line)
      || /^You should say/i.test(line)
      || /^(what|where|when|why|how|who|which)\b/i.test(line)
      || /^and explain\b/i.test(line)
    ) {
      lines.push(line);
    }
  }

  const start = lines.findIndex((line) => /^Describe\b/i.test(line));
  if (start < 0) return "";
  return compact(lines.slice(start).join("\n"))
    .replace(/\n\s*/g, "\n")
    .replace(/You should say:\s*/i, "You should say:\n")
    .trim();
}

function cleanCueTitle(raw) {
  return cleanLine(raw)
    .replace(/^Describe\s+/i, "")
    .replace(/\bthat\s+you\s+will\s+have\s+to\s+talk\b.*$/i, "")
    .replace(/\bYou should say\b.*$/i, "")
    .replace(/\b(?:one|two|1|2)\s+(?:to\s+two\s+)?minutes?\b.*$/i, "")
    .replace(/\s+minutes?\.?$/i, "")
    .replace(/\s+\b(?:what|where|when|why|how|who|which)\s+(?:this|that|these|those|you|your|it|they|he|she|people|someone|the)\b.*$/i, "")
    .replace(/\s+\b(?:what|where|when|why|how|who|which|for|because|or|a|an|the)\s*\.?$/i, "")
    .replace(/\bAtime\b/gi, "A time")
    .replace(/\bpak\b/gi, "park")
    .replace(/\s*\([^)]*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^(a|an|the)\s+/i, "")
    .trim();
}

function titleLooksUnusable(title) {
  const lower = String(title || "").toLowerCase();
  const noisyNeedles = [
    " ked ",
    "ypc",
    "askec",
    "wero",
    "ett >",
    "gong",
    "tose",
    "malay",
    "nates",
  ];
  return !title
    || title.split(/\s+/).length < 2
    || title.length < 8
    || /(?:\[|,)$/.test(title)
    || /\b(?:minutes|you|in|had|started|learned|that|has|to|of|won|improving)\.?$/i.test(title)
    || noisyNeedles.some((needle) => lower.includes(needle));
}

function titleFromCueCard(part2, fallback) {
  const lines = normaliseText(part2)
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
  const describeIndex = lines.findIndex((line) => /^Describe\b/i.test(line));
  const titleLines = [];
  if (describeIndex >= 0) {
    titleLines.push(lines[describeIndex]);
    const next = lines[describeIndex + 1] || "";
    if (/^(who|which|that|where|in which)\s+(?:is|are|was|were|you|has|have)\b/i.test(next) && !/\?$/.test(next)) {
      titleLines.push(next);
    }
  }
  let title = cleanCueTitle(titleLines.join(" "));
  if (titleLooksUnusable(title)) return "Speaking topic";
  title = title.length > 90 ? `${title.slice(0, 87).trim()}...` : title;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function extractDiscussionTopics(part3Block) {
  const lines = compact(part3Block)
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean);
  const topics = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^Example questions:?$/i.test(line) || /\?/.test(line)) continue;
    if (/^PART\s*3$/i.test(line)) continue;
    if (/^Discussion topics:?$/i.test(line)) continue;
    if (line.length <= 80 && /^[A-Z]/.test(line)) topics.push(line);
  }
  return [...new Set(topics)].slice(0, 4);
}

function explicitTestNumber(text) {
  const match = normaliseText(text).match(/\bTest\s*([1-8])\b/i) || normaliseText(text).match(/\bTEST\s*([1-8])\b/);
  const value = Number(match?.[1] || 0);
  return value >= 1 && value <= 8 ? value : null;
}

function extractEntry(source, segment, fallbackTest) {
  if (!isSpeakingCandidate(segment.text)) return null;
  const part1Block = between(segment.text, /\bPART\s*1\b/i, /\bPART\s*2\b/i);
  const part2Block = between(segment.text, /\bPART\s*2\b/i, /\bPART\s*3\b/i);
  const part3Block = between(segment.text, /\bPART\s*3\b/i, /(?:\n--- Page \d+ ---|Example Speaking test video|$)/i);
  const part1 = extractPart1(part1Block);
  const part2 = cleanCueCard(part2Block);
  const part3 = questionSentences(part3Block).slice(0, 10);
  const part2Lines = part2
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (
    part1.questions.length < 2
    || !/^Describe\b/i.test(part2)
    || part2.length < 20
    || part2Lines.length < 3
    || part2Lines.length > 12
    || part3.length < 4
  ) {
    return null;
  }
  const test = source.test || explicitTestNumber(segment.text) || fallbackTest;
  if (!test || test < 1) return null;
  const extractedTitle = titleFromCueCard(part2, part1.topic);
  const title = extractedTitle === "Speaking topic"
    ? `Cambridge IELTS ${source.book} Test ${test} Speaking`
    : extractedTitle;
  return {
    id: `cam${source.book}-s-test${test}`,
    module: "speaking",
    title,
    source: `Cambridge IELTS ${source.book} OCR`,
    period: `Cambridge ${source.book}`,
    book: source.book,
    test,
    page: Number.isFinite(segment.page) && segment.page > 0 ? segment.page : null,
    part1Topic: part1.topic,
    part1: part1.questions,
    part2,
    part3Topics: extractDiscussionTopics(part3Block),
    part3,
  };
}

const speakingSets = [];
const skipped = [];
const usedIds = new Set();

for (const source of sources) {
  const content = readFile(source.file);
  if (!content) {
    skipped.push({
      book: source.book,
      test: source.test || null,
      file: path.relative(workspace, source.file),
      reason: "source file missing",
    });
    continue;
  }

  let fallbackTest = 1;
  const segments = speakingBlocks(content);
  for (const segment of segments) {
    const fallbackForSegment = segment.test || fallbackTest;
    const entry = extractEntry(source, segment, fallbackForSegment);
    if (!entry) {
      skipped.push({
        book: source.book,
        test: source.test || segment.test || fallbackForSegment,
        page: segment.page,
        file: path.relative(workspace, source.file),
        reason: "unstable OCR block",
      });
      continue;
    }
    fallbackTest += 1;
    if (usedIds.has(entry.id)) continue;
    usedIds.add(entry.id);
    speakingSets.push(entry);
  }
}

speakingSets.sort((a, b) => a.book - b.book || a.test - b.test || (a.page || 0) - (b.page || 0));

const bank = {
  generatedAt: new Date().toISOString(),
  sourcePolicy: "Only OCR speaking tests that passed the strict stability gate are included. Missing, incomplete, or noisy pages are skipped.",
  speakingSets,
  skipped,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");

console.log(`Wrote ${path.relative(workspace, outputPath)}`);
console.log(`Speaking sets: ${speakingSets.length}`);
console.log(`Skipped candidates: ${skipped.length}`);
