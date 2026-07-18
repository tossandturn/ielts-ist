import fs from "fs";
import path from "path";

const workspace = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const envPath = path.join(workspace, ".env");
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const extractedTextDir = path.join(workspace, "data", "extracted-text");
const outputDir = path.join(workspace, "data", "parsed-answer-keys");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

function answerKeyText(book) {
  const filePath = path.join(extractedTextDir, `cam${book}.txt`);
  const pages = fs.readFileSync(filePath, "utf8").split("\f");
  const start = pages.findIndex((page, index) => index > 20 && /Answer key|Answer keys|Listening and Reading Answer Keys/i.test(page));
  if (start < 0) throw new Error(`No answer key pages found for cam${book}`);
  return pages.slice(start, Math.min(start + 12, pages.length)).map((page, index) => `--- Page ${start + index + 1} ---\n${page}`).join("\n\n");
}

async function callOpenAI(book, text) {
  const key = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.UUAPI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You parse Cambridge IELTS answer key pages into strict JSON.",
            "Return only JSON, no markdown.",
            "Extract Academic Listening and Academic Reading answers only for Test 1 to Test 4.",
            "For each test, return exactly 40 strings for listening and exactly 40 strings for reading when available.",
            "Preserve alternatives with slash, e.g. 'city/cities'. For grouped answers such as 5-6 in either order, fill both question slots with the listed individual answers.",
            "If an answer is unreadable, use an empty string for that slot.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Cambridge IELTS ${book} answer key text:\n\n${text}\n\nJSON shape: {"book":${book},"tests":[{"test":1,"listening":["...40"],"reading":["...40"]}]}`,
        },
      ],
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`AI failed ${response.status}: ${body.slice(0, 500)}`);
  const json = JSON.parse(body);
  const content = json.choices?.[0]?.message?.content || "";
  if (!content.trim()) throw new Error(`AI returned empty content: ${body.slice(0, 500)}`);
  return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
}

function validAnswers(list) {
  return Array.isArray(list) && list.length === 40 && list.filter((item) => String(item || "").trim()).length >= 36;
}

function applyAnswers(bank, parsed) {
  const summary = { book: parsed.book, listeningUpdated: 0, readingUpdated: 0, skipped: [] };
  for (const test of parsed.tests || []) {
    const testNumber = Number(test.test);
    const listening = bank.listeningTests.find((item) => item.id === `cam${parsed.book}-l-test${testNumber}`);
    if (listening && validAnswers(test.listening)) {
      listening.questions.forEach((question, index) => {
        question.answer = String(test.listening[index] || "").trim();
        question.answerAvailable = Boolean(question.answer);
      });
      listening.answerAvailable = true;
      summary.listeningUpdated += 1;
    } else if (listening) {
      summary.skipped.push(`listening test ${testNumber}`);
    }

    const reading = bank.readingTests.find((item) => item.id === `cam${parsed.book}-r-test${testNumber}`);
    if (reading && validAnswers(test.reading)) {
      reading.questions.forEach((question, index) => {
        question.answer = String(test.reading[index] || "").trim();
        question.answerAvailable = Boolean(question.answer);
      });
      reading.answerAvailable = true;
      summary.readingUpdated += 1;
    } else if (reading) {
      summary.skipped.push(`reading test ${testNumber}`);
    }
  }
  return summary;
}

loadEnv(envPath);
fs.mkdirSync(outputDir, { recursive: true });
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const books = process.argv.slice(2).map(Number).filter(Boolean);
const targets = books.length ? books : [4, 5, 6, 7];
const summaries = [];

for (const book of targets) {
  const cachePath = path.join(outputDir, `cam${book}-answers.json`);
  let parsed;
  if (fs.existsSync(cachePath)) {
    parsed = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } else {
    parsed = await callOpenAI(book, answerKeyText(book));
    fs.writeFileSync(cachePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }
  summaries.push(applyAnswers(bank, parsed));
}

fs.writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summaries, null, 2));
