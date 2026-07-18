import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localBankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const extractedTextDir = path.join(workspace, "data", "extracted-text");
const outDir = path.join(workspace, "data", "ocr-reading-writing");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const textJobs = [
  { book: 1, tests: [1, 2, 3, 4] },
  { book: 3, tests: [1, 2, 3, 4] },
  { book: 4, tests: [1, 2, 3, 4] },
  { book: 5, tests: [1, 2, 3, 4] },
  { book: 6, tests: [1, 2, 3, 4] },
  { book: 7, tests: [1, 2, 3, 4] },
  { book: 10, tests: [1, 2, 3, 4] },
];

const ocrJobs = [
  {
    book: 8,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题8.pdf",
    tests: [
      { test: 1, pages: [16, 31] },
      { test: 2, pages: [39, 54] },
      { test: 3, pages: [62, 79] },
      { test: 4, pages: [87, 103] },
    ],
  },
  {
    book: 9,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题9.pdf",
    tests: [
      { test: 1, pages: [9, 24] },
      { test: 2, pages: [32, 47] },
      { test: 3, pages: [55, 70] },
      { test: 4, pages: [78, 94] },
    ],
  },
  {
    book: 11,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题11.pdf",
    tests: [
      { test: 1, pages: [14, 31] },
      { test: 2, pages: [39, 55] },
      { test: 3, pages: [63, 78] },
      { test: 4, pages: [86, 101] },
    ],
  },
  {
    book: 12,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题12.pdf",
    tests: [
      { test: 5, pages: [17, 29] },
      { test: 6, pages: [37, 52] },
      { test: 7, pages: [60, 73] },
      { test: 8, pages: [81, 94] },
    ],
  },
  {
    book: 13,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题13.pdf",
    tests: [
      { test: 1, pages: [18, 32] },
      { test: 2, pages: [40, 54] },
      { test: 3, pages: [62, 76] },
      { test: 4, pages: [84, 96] },
    ],
  },
  {
    book: 14,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑14\\剑14真题.pdf",
    tests: [
      { test: 1, pages: [17, 31] },
      { test: 2, pages: [38, 52] },
      { test: 3, pages: [60, 77] },
      { test: 4, pages: [85, 96] },
    ],
  },
  {
    book: 15,
    bankPath: cambridge15BankPath,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15\\剑15.pdf",
    tests: [
      { test: 1, pages: [19, 32] },
      { test: 2, pages: [40, 53] },
      { test: 3, pages: [61, 75] },
      { test: 4, pages: [83, 98] },
    ],
  },
];

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function findIndex(text, patterns, from = 0) {
  const slice = text.slice(from);
  let best = -1;
  for (const pattern of patterns) {
    const match = slice.match(pattern);
    if (!match || match.index == null) continue;
    const absolute = from + match.index;
    if (best === -1 || absolute < best) best = absolute;
  }
  return best;
}

function splitReadingWriting(raw) {
  const text = cleanText(raw);
  const readingStart = findIndex(text, [/\bREADING PASSAGE\s+1\b/i, /^\s*READING\s*$/im]);
  const writingStart = findIndex(text, [/\bWRITING TASK\s+1\b/i, /^\s*WRITING\s*$/im], Math.max(readingStart, 0));
  const readingPaper = readingStart >= 0
    ? cleanText(text.slice(readingStart, writingStart >= 0 ? writingStart : undefined))
    : "";
  const writingPaper = writingStart >= 0 ? cleanText(text.slice(writingStart)) : "";
  return { readingPaper, writingPaper };
}

function splitWritingTasks(writingPaper) {
  const text = cleanText(writingPaper);
  const task1Start = findIndex(text, [/\bWRITING TASK\s+(?:1|I)\b/i]);
  const task2Start = findIndex(text, [/\bWRITING TASK\s+(?:2|II)\b/i], task1Start >= 0 ? task1Start + 1 : 0);
  return {
    task1: task1Start >= 0 ? cleanText(text.slice(task1Start, task2Start >= 0 ? task2Start : undefined)) : "",
    task2: task2Start >= 0 ? cleanText(text.slice(task2Start)) : "",
  };
}

function textSectionsForBook(book, expectedCount) {
  const filePath = path.join(extractedTextDir, `cam${book}.txt`);
  if (!fs.existsSync(filePath)) return [];
  const text = cleanText(fs.readFileSync(filePath, "utf8"));
  const readingMatches = [...text.matchAll(/\bREADING PASSAGE\s+1\b/gi)].map((match) => match.index).filter((index) => index != null);
  const sections = [];
  for (const start of readingMatches) {
    const writingStart = findIndex(text, [/\bWRITING TASK\s+(?:1|I)\b/i, /^\s*WRITING\s*$/im], start);
    if (writingStart < 0) continue;
    const nextReading = readingMatches.find((index) => index > writingStart) ?? text.length;
    const sectionText = cleanText(text.slice(start, nextReading));
    const { readingPaper, writingPaper } = splitReadingWriting(sectionText);
    if (readingPaper.length < 1000 || writingPaper.length < 200) continue;
    sections.push({ readingPaper, writingPaper });
    if (sections.length >= expectedCount) break;
  }
  return sections;
}

async function renderPage(doc, pageNumber, scale = 1.65) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvas.encode("png");
}

function attachToBank(bank, book, test, readingPaper, writingPaper, source) {
  const reading = bank.readingTests.find((entry) => entry.id === `cam${book}-r-test${test}`);
  if (reading && readingPaper) {
    reading.readingPaper = readingPaper;
    reading.readingPaperSource = source;
    reading.passage = `Full Reading Test ${test} question paper is imported below. Answers may still need manual checking unless an answer key is available.`;
  }

  const tasks = splitWritingTasks(writingPaper);
  const task1 = bank.writingTasks.find((entry) => entry.id === `cam${book}-w-test${test}-task1`);
  const task2 = bank.writingTasks.find((entry) => entry.id === `cam${book}-w-test${test}-task2`);
  if (task1 && tasks.task1) {
    task1.prompt = tasks.task1;
    task1.promptSource = source;
  }
  if (task2 && tasks.task2) {
    task2.prompt = tasks.task2;
    task2.promptSource = source;
  }
}

function writeLoadedBanks() {
  for (const [filePath, bank] of banks) {
    fs.writeFileSync(filePath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
  }
}

fs.mkdirSync(outDir, { recursive: true });
const banks = new Map();
function loadBank(filePath) {
  if (!banks.has(filePath)) banks.set(filePath, JSON.parse(fs.readFileSync(filePath, "utf8")));
  return banks.get(filePath);
}

let textAttached = 0;
for (const job of textJobs) {
  const bank = loadBank(localBankPath);
  const sections = textSectionsForBook(job.book, job.tests.length);
  job.tests.forEach((test, index) => {
    const section = sections[index];
    if (!section) return;
    attachToBank(bank, job.book, test, section.readingPaper, section.writingPaper, `pdftotext:data/extracted-text/cam${job.book}.txt`);
    textAttached += 1;
  });
}
writeLoadedBanks();

const worker = await createWorker("eng");
let ocrAttached = 0;
for (const job of ocrJobs) {
  const bank = loadBank(job.bankPath || localBankPath);
  const data = new Uint8Array(fs.readFileSync(job.pdf));
  const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
  for (const testJob of job.tests) {
    const textPath = path.join(outDir, `cam${job.book}-test${testJob.test}-reading-writing.txt`);
    let paper = "";
    if (fs.existsSync(textPath) && fs.statSync(textPath).size > 500) {
      console.error(`Using existing OCR text for Cambridge ${job.book} Test ${testJob.test}`);
      paper = cleanText(fs.readFileSync(textPath, "utf8"));
    } else {
      const chunks = [];
      for (let page = testJob.pages[0]; page <= testJob.pages[1]; page += 1) {
        console.error(`OCR Reading/Writing Cambridge ${job.book} Test ${testJob.test} page ${page}/${doc.numPages}`);
        const png = await renderPage(doc, page);
        const result = await worker.recognize(png);
        chunks.push(`--- Page ${page} ---\n${result.data.text}`);
      }
      paper = cleanText(chunks.join("\n\n"));
      fs.writeFileSync(textPath, `${paper}\n`, "utf8");
    }
    const { readingPaper, writingPaper } = splitReadingWriting(paper);
    attachToBank(
      bank,
      job.book,
      testJob.test,
      readingPaper || paper,
      writingPaper,
      path.relative(workspace, textPath).replace(/\\/g, "/"),
    );
    ocrAttached += 1;
    writeLoadedBanks();
  }
}

await worker.terminate();
writeLoadedBanks();

console.log({ textAttached, ocrAttached });
