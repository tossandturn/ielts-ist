import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localBankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const extractedTextDir = path.join(workspace, "data", "extracted-text");
const ocrReadingWritingDir = path.join(workspace, "data", "ocr-reading-writing");
const imageRoot = path.join(workspace, "public", "generated", "reading-pages");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const textBooks = [1, 3, 4, 5, 6, 7, 10];
const ocrJobs = [
  { book: 8, tests: [1, 2, 3, 4] },
  { book: 9, tests: [1, 2, 3, 4] },
  { book: 11, tests: [1, 2, 3, 4] },
  { book: 12, tests: [5, 6, 7, 8] },
  { book: 13, tests: [1, 2, 3, 4] },
  { book: 14, tests: [1, 2, 3, 4] },
  { book: 15, tests: [1, 2, 3, 4], bankPath: cambridge15BankPath },
];

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const localBank = loadJson(localBankPath);
const cambridge15Bank = loadJson(cambridge15BankPath);
const bankByPath = new Map([
  [localBankPath, localBank],
  [cambridge15BankPath, cambridge15Bank],
]);

function pdfPathForBook(book) {
  if (book === 15) return "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15\\剑15.pdf";
  const file = localBank.localFiles?.find((item) => item.id === `cam${book}-pdf`);
  return file?.path || "";
}

function pageHasReadingStart(text) {
  return /\bREADING PASSAGE\s+1\b/i.test(text) || /^\s*READING\s*$/im.test(text);
}

function pageHasWritingStart(text) {
  return /\bWRITING TASK\s+(?:1|I)\b/i.test(text) || /^\s*WRITING\s*$/im.test(text);
}

function textBookRanges(book) {
  const filePath = path.join(extractedTextDir, `cam${book}.txt`);
  if (!fs.existsSync(filePath)) return [];
  const pages = fs.readFileSync(filePath, "utf8").split("\f");
  const readingPages = [];
  const writingPages = [];
  pages.forEach((text, index) => {
    const page = index + 1;
    if (/\bREADING PASSAGE\s+1\b/i.test(text)) readingPages.push(page);
    if (/\bWRITING TASK\s+(?:1|I)\b/i.test(text)) writingPages.push(page);
  });

  return writingPages.slice(0, 4).map((writingPage, index) => {
    const lowerBound = index === 0 ? 1 : writingPages[index - 1] + 1;
    const readingPage = readingPages.find((page) => page >= lowerBound && page < writingPage);
    if (!readingPage) return null;
    return { test: index + 1, pages: range(readingPage, writingPage - 1) };
  }).filter(Boolean);
}

function ocrBookRange(book, test) {
  const filePath = path.join(ocrReadingWritingDir, `cam${book}-test${test}-reading-writing.txt`);
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, "utf8");
  const matches = [...text.matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---|$)/g)];
  if (!matches.length) return null;
  const firstPage = Number(matches[0][1]);
  const writingMatch = matches.find((match) => pageHasWritingStart(match[2]));
  const lastReadingPage = writingMatch ? Number(writingMatch[1]) - 1 : Number(matches[matches.length - 1][1]);
  if (!firstPage || !lastReadingPage || lastReadingPage < firstPage) return null;
  return { test, pages: range(firstPage, lastReadingPage) };
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

async function renderPage(doc, pageNumber, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.45 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const bytes = await canvas.encode("webp");
  fs.writeFileSync(outputPath, bytes);
}

function attachImages(bank, book, test, pages) {
  const reading = bank.readingTests.find((item) => item.id === `cam${book}-r-test${test}`);
  if (!reading) return false;
  reading.readingPageImages = pages.map((page) => ({
    page,
    url: `/generated/reading-pages/cam${book}/test${test}/page-${page}.webp`,
  }));
  return true;
}

async function renderBook(book, ranges, bankPath = localBankPath) {
  const pdfPath = pdfPathForBook(book);
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.warn(`Missing PDF for Cambridge ${book}`);
    return { rendered: 0, attached: 0 };
  }
  const bank = bankByPath.get(bankPath);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
  let rendered = 0;
  let attached = 0;
  for (const item of ranges) {
    const dir = path.join(imageRoot, `cam${book}`, `test${item.test}`);
    fs.mkdirSync(dir, { recursive: true });
    for (const page of item.pages) {
      const outputPath = path.join(dir, `page-${page}.webp`);
      await renderPage(doc, page, outputPath);
      rendered += 1;
    }
    if (attachImages(bank, book, item.test, item.pages)) attached += 1;
  }
  return { rendered, attached };
}

fs.mkdirSync(imageRoot, { recursive: true });
const summary = [];
for (const book of textBooks) {
  const ranges = textBookRanges(book);
  summary.push({ book, ...(await renderBook(book, ranges)) });
}
for (const job of ocrJobs) {
  const ranges = job.tests.map((test) => ocrBookRange(job.book, test)).filter(Boolean);
  summary.push({ book: job.book, ...(await renderBook(job.book, ranges, job.bankPath || localBankPath)) });
}

for (const [filePath, bank] of bankByPath) {
  fs.writeFileSync(filePath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(summary, null, 2));
