import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(workspace, ".env");
const localBankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const extractedTextDir = path.join(workspace, "data", "extracted-text");
const ocrAnswerDir = path.join(workspace, "data", "ocr-answer-keys");
const cacheDir = path.join(workspace, "data", "parsed-answer-keys");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

function romanOrNumber(test) {
  return test === 1 ? "(?:1|I|l)" : String(test);
}

function isListeningAnswerStart(text, test) {
  const normalized = String(text || "").replace(/\s+/g, " ");
  const marker = romanOrNumber(test);
  return new RegExp(`(?:PRACTICE\\s+)?TEST\\s*${marker}[^\\n]{0,220}LISTENING`, "i").test(normalized)
    || new RegExp(`LISTENING[^\\n]{0,220}(?:PRACTICE\\s+)?TEST\\s*${marker}`, "i").test(normalized);
}

function isStopPage(text) {
  return /GENERAL TRAINING|Model and sample answers|Model and Sample Answers|Writing tasks/i.test(text);
}

function extractedSegments(book) {
  const filePath = path.join(extractedTextDir, `cam${book}.txt`);
  if (!fs.existsSync(filePath)) return new Map();
  const pages = fs.readFileSync(filePath, "utf8").split("\f");
  const starts = [];
  for (let i = 0; i < pages.length; i += 1) {
    if (i < Math.floor(pages.length * 0.55)) continue;
    for (const test of [1, 2, 3, 4]) {
      if (isListeningAnswerStart(pages[i], test)) starts.push({ test, index: i });
    }
  }
  starts.sort((a, b) => a.index - b.index);
  const result = new Map();
  for (let i = 0; i < starts.length; i += 1) {
    const start = starts[i];
    let end = starts[i + 1]?.index ?? pages.length;
    for (let p = start.index + 1; p < end; p += 1) {
      if (isStopPage(pages[p])) {
        end = p;
        break;
      }
    }
    const text = pages.slice(start.index, end)
      .map((pageText, offset) => `--- Page ${start.index + offset + 1} ---\n${pageText}`)
      .join("\n\n");
    if (text.length > 1000) result.set(start.test, text);
  }
  const manualRanges = {
    4: { 4: [158, 159] },
    7: { 4: [162, 163] },
  };
  for (const [test, range] of Object.entries(manualRanges[book] || {})) {
    if (result.has(Number(test))) continue;
    const [startPage, endPage] = range;
    const text = pages.slice(startPage - 1, endPage)
      .map((pageText, offset) => `--- Page ${startPage + offset} ---\n${pageText}`)
      .join("\n\n");
    if (text.length > 1000) result.set(Number(test), text);
  }
  return result;
}

function ocrSegments(book) {
  const result = new Map();
  for (const test of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const filePath = path.join(ocrAnswerDir, `cam${book}-test${test}.txt`);
    if (fs.existsSync(filePath)) result.set(test, fs.readFileSync(filePath, "utf8"));
  }
  return result;
}

function validAnswers(list) {
  return Array.isArray(list)
    && list.length === 40
    && list.filter((item) => String(item || "").trim()).length >= 36;
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
          "Parse Cambridge IELTS Academic answer-key text into strict JSON.",
          "Return only JSON, no markdown.",
          "Extract only the specified test's LISTENING answers 1-40 and ACADEMIC READING answers 1-40.",
          "Ignore General Training.",
          "Return exactly 40 strings in each array.",
          "Preserve alternatives with slash or parentheses where shown.",
          "For IN EITHER ORDER groups, put each listed answer into the corresponding question slot.",
          "OCR may be noisy. Use the surrounding answer-key layout to recover distorted entries where possible.",
          "Leave a slot empty only when the source gives no defensible answer at all.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Cambridge IELTS ${book}, Test ${test} answer-key OCR/text:\n\n${text}\n\nReturn JSON shape: {"book":${book},"test":${test},"listening":["...40"],"reading":["...40"]}`,
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
      if (!content.trim()) throw new Error(`empty AI content: ${body.slice(0, 500)}`);
      return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
    }
    if (![429, 500, 502, 503, 504, 524].includes(response.status) || attempt === 3) {
      throw new Error(`AI failed ${response.status}: ${body.slice(0, 500)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
  }
  throw new Error("AI failed after retries");
}

function applyOne(bank, book, parsed) {
  const test = Number(parsed.test);
  const summary = { book, test, listening: "missing", reading: "missing" };
  const listening = bank.listeningTests?.find((item) => item.id === `cam${book}-l-test${test}`);
  if (listening) {
    if (validAnswers(parsed.listening)) {
      listening.questions = listening.questions?.length === 40 ? listening.questions : Array.from({ length: 40 }, (_, index) => ({ id: `q${index + 1}`, text: `Question ${index + 1}` }));
      normalizeAnswers(parsed.listening).forEach((answer, index) => {
        listening.questions[index].answer = answer;
        listening.questions[index].answerAvailable = Boolean(answer);
      });
      listening.answerAvailable = true;
      summary.listening = "updated";
    } else {
      summary.listening = `skipped:${Array.isArray(parsed.listening) ? parsed.listening.filter(Boolean).length : 0}/40`;
    }
  }

  const reading = bank.readingTests?.find((item) => item.id === `cam${book}-r-test${test}`);
  if (reading) {
    if (validAnswers(parsed.reading)) {
      reading.questions = reading.questions?.length === 40 ? reading.questions : Array.from({ length: 40 }, (_, index) => ({ id: `q${index + 1}`, text: `Question ${index + 1}` }));
      normalizeAnswers(parsed.reading).forEach((answer, index) => {
        reading.questions[index].answer = answer;
        reading.questions[index].answerAvailable = Boolean(answer);
      });
      reading.answerAvailable = true;
      summary.reading = "updated";
    } else {
      summary.reading = `skipped:${Array.isArray(parsed.reading) ? parsed.reading.filter(Boolean).length : 0}/40`;
    }
  }
  return summary;
}

loadEnv(envPath);
fs.mkdirSync(cacheDir, { recursive: true });

const requestedBooks = process.argv.slice(2).map(Number).filter(Boolean);
const books = requestedBooks.length ? requestedBooks : [1, 3, 4, 5, 6, 7, 10];
const localBank = JSON.parse(fs.readFileSync(localBankPath, "utf8"));
const cambridge15Bank = fs.existsSync(cambridge15BankPath) ? JSON.parse(fs.readFileSync(cambridge15BankPath, "utf8")) : null;
const summaries = [];

for (const book of books) {
  const bank = book === 15 ? cambridge15Bank : localBank;
  if (!bank) continue;
  const segments = new Map([...extractedSegments(book), ...ocrSegments(book)]);
  for (const [test, text] of [...segments.entries()].sort(([a], [b]) => a - b)) {
    const cachePath = path.join(cacheDir, `cam${book}-test${test}-answers.json`);
    let parsed;
    try {
      if (fs.existsSync(cachePath)) {
        parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      } else {
        parsed = await callAi(book, test, text.slice(0, 18000));
        fs.writeFileSync(cachePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
      }
      summaries.push(applyOne(bank, book, parsed));
    } catch (error) {
      summaries.push({ book, test, error: error.message });
    }
  }
}

fs.writeFileSync(localBankPath, `${JSON.stringify(localBank, null, 2)}\n`, "utf8");
if (cambridge15Bank) fs.writeFileSync(cambridge15BankPath, `${JSON.stringify(cambridge15Bank, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summaries, null, 2));
