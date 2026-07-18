import fs from "fs";
import path from "path";

const workspace = process.cwd();
const envPath = path.join(workspace, ".env");
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cacheDir = path.join(workspace, "data", "parsed-answer-keys");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

function pageTextFile(book) {
  const candidates = [
    path.join(workspace, "data", "ocr-cambridge-16-21", `cam${book}-pages.txt`),
    path.join(workspace, "data", "extracted-text", `cam${book}-pages.txt`),
  ];
  return candidates.find(fs.existsSync);
}

function pageMap(book) {
  const filePath = pageTextFile(book);
  if (!filePath) throw new Error(`Missing OCR text for Cambridge ${book}`);
  const text = fs.readFileSync(filePath, "utf8");
  const map = new Map();
  for (const match of text.matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---|$)/g)) {
    map.set(Number(match[1]), match[2].trim());
  }
  return map;
}

function isAnswerKeyPage(text, test, moduleName) {
  const normalized = String(text || "").replace(/\s+/g, " ");
  return new RegExp(`TEST\\s*${test}\\b[\\s\\S]{0,260}\\b${moduleName}\\b`, "i").test(normalized)
    || new RegExp(`\\b${moduleName}\\b[\\s\\S]{0,260}TEST\\s*${test}\\b`, "i").test(normalized);
}

function answerSegment(book, test) {
  const manualAnswerPages = {
    16: { 1: [121, 122], 2: [123, 124], 3: [125, 126], 4: [127, 128] },
    17: { 1: [119, 120], 2: [121, 122], 3: [123, 124], 4: [125, 126] },
    18: { 1: [121, 122], 2: [123, 124], 3: [125, 126], 4: [127, 128] },
    19: { 1: [120, 121], 2: [122, 123], 3: [124, 125], 4: [126, 127] },
    20: { 1: [118, 119], 2: [120, 121], 3: [122, 123], 4: [124, 125] },
    21: { 1: [118, 119], 2: [120, 121], 3: [122, 123], 4: [124, 125] },
  };
  const pages = pageMap(book);
  const manual = manualAnswerPages[book]?.[test];
  if (manual) {
    return manual.map((page) => `--- Page ${page} ---\n${pages.get(page) || ""}`).join("\n\n");
  }
  const candidates = [...pages.entries()]
    .filter(([page]) => page >= 110)
    .filter(([, text]) => /Listening and Reading answer keys|Answer key|LISTENING|READING/i.test(text));
  const selected = candidates
    .filter(([, text]) => isAnswerKeyPage(text, test, "LISTENING") || isAnswerKeyPage(text, test, "READING"))
    .sort(([a], [b]) => a - b);
  if (!selected.length) throw new Error(`No answer-key pages found for Cambridge ${book} Test ${test}`);
  return selected.map(([page, text]) => `--- Page ${page} ---\n${text}`).join("\n\n");
}

function validAnswers(list) {
  return Array.isArray(list)
    && list.length === 40
    && list.filter((item) => String(item || "").trim()).length >= 38;
}

function normalizeAnswers(list) {
  return Array.from({ length: 40 }, (_, index) => String(list?.[index] || "").trim());
}

async function callAi(book, test, text) {
  const key = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.UUAPI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const payload = {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "You parse Cambridge IELTS Academic answer-key OCR.",
          "Return strict JSON only.",
          "Extract exactly this test's LISTENING answers 1-40 and Academic READING answers 1-40.",
          "Ignore score tables, explanations, General Training, page numbers and Resource Bank text.",
          "OCR is noisy: recover obvious letters and words from answer-key layout.",
          "For IN EITHER ORDER groups, fill the grouped answers into the corresponding consecutive question slots.",
          "Preserve answer alternatives using slash and optional parentheses when shown.",
          "Each array must contain exactly 40 strings.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Cambridge IELTS ${book}, Test ${test} answer-key OCR/text:\n\n${text.slice(0, 24000)}\n\nReturn JSON shape: {"book":${book},"test":${test},"listening":["1","2", "..."],"reading":["1","2", "..."]}`,
      },
    ],
  };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    if (response.ok) {
      const json = JSON.parse(body);
      const content = json.choices?.[0]?.message?.content || "";
      return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
    }
    if (![429, 500, 502, 503, 504, 524].includes(response.status) || attempt === 3) {
      throw new Error(`AI failed ${response.status}: ${body.slice(0, 500)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
}

function applyAnswers(bank, book, test, parsed) {
  const summary = { book, test, listening: "skipped", reading: "skipped" };
  const listening = bank.listeningTests.find((item) => item.id === `cam${book}-l-test${test}`);
  const reading = bank.readingTests.find((item) => item.id === `cam${book}-r-test${test}`);
  if (listening && validAnswers(parsed.listening)) {
    normalizeAnswers(parsed.listening).forEach((answer, index) => {
      listening.questions[index].answer = answer;
      listening.questions[index].answerAvailable = true;
    });
    listening.answerAvailable = true;
    summary.listening = "updated";
  } else {
    summary.listening = `invalid:${Array.isArray(parsed.listening) ? parsed.listening.filter(Boolean).length : 0}/40`;
  }
  if (reading && validAnswers(parsed.reading)) {
    normalizeAnswers(parsed.reading).forEach((answer, index) => {
      reading.questions[index].answer = answer;
      reading.questions[index].answerAvailable = true;
    });
    reading.answerAvailable = true;
    summary.reading = "updated";
  } else {
    summary.reading = `invalid:${Array.isArray(parsed.reading) ? parsed.reading.filter(Boolean).length : 0}/40`;
  }
  return summary;
}

loadEnv(envPath);
fs.mkdirSync(cacheDir, { recursive: true });
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const summaries = [];

for (const book of [16, 17, 18, 19, 20, 21]) {
  for (const test of [1, 2, 3, 4]) {
    const cachePath = path.join(cacheDir, `cam${book}-test${test}-answers.json`);
    try {
      const parsed = fs.existsSync(cachePath)
        ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
        : await callAi(book, test, answerSegment(book, test));
      if (!fs.existsSync(cachePath)) fs.writeFileSync(cachePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      summaries.push(applyAnswers(bank, book, test, parsed));
    } catch (error) {
      summaries.push({ book, test, error: error.message });
    }
  }
}

fs.writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summaries, null, 2));
