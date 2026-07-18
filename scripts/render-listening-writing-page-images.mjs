import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localBankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const extractedTextDir = path.join(workspace, "data", "extracted-text");
const ocrListeningDir = path.join(workspace, "data", "ocr-listening");
const ocrReadingWritingDir = path.join(workspace, "data", "ocr-reading-writing");
const listeningRoot = path.join(workspace, "public", "generated", "listening-pages");
const writingRoot = path.join(workspace, "public", "generated", "writing-pages");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const localBank = loadJson(localBankPath);
const cambridge15Bank = loadJson(cambridge15BankPath);
const bankByPath = new Map([
  [localBankPath, localBank],
  [cambridge15BankPath, cambridge15Bank],
]);

const fallbackPdfByBook = new Map([
  [2, "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题2.pdf"],
  [15, "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15\\剑15.pdf"],
]);

const listeningTextRanges = new Map([
  [4, [[10, 17], [34, 41], [57, 64], [81, 88]]],
  [5, [[10, 15], [32, 37], [55, 60], [78, 83]]],
  [6, [[11, 17], [34, 40], [56, 62], [79, 85]]],
  [7, [[14, 21], [37, 43], [60, 68], [85, 92]]],
  [10, [[3, 9], [26, 34], [50, 57], [73, 81]]],
]);

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function pdfPathForBook(book) {
  const fallback = fallbackPdfByBook.get(book);
  if (fallback && fs.existsSync(fallback)) return fallback;
  const file = localBank.localFiles?.find((item) => item.id === `cam${book}-pdf`);
  return file?.path || "";
}

function ocrListeningRanges(book) {
  const files = fs.existsSync(ocrListeningDir)
    ? fs.readdirSync(ocrListeningDir).filter((file) => file.startsWith(`cam${book}-test`) && file.endsWith(".txt"))
    : [];
  return files
    .map((file) => {
      const match = file.match(/cam\d+-test(\d+)\.txt/);
      if (!match) return null;
      const pages = [...fs.readFileSync(path.join(ocrListeningDir, file), "utf8").matchAll(/--- Page (\d+) ---/g)].map((item) => Number(item[1]));
      if (!pages.length) return null;
      return { test: Number(match[1]), pages: range(pages[0], pages[pages.length - 1]) };
    })
    .filter(Boolean)
    .sort((a, b) => a.test - b.test);
}

function textListeningRanges(book) {
  const ranges = listeningTextRanges.get(book) || [];
  return ranges.map((pair, index) => ({ test: index + 1, pages: range(pair[0], pair[1]) }));
}

function pageHasTask(text, taskNumber) {
  const normalized = String(text || "").replace(/\s+/g, " ");
  return new RegExp(`WRITING TASK\\s+(?:${taskNumber}|${taskNumber === 1 ? "I" : "II"})`, "i").test(normalized);
}

function textWritingRanges(book) {
  const filePath = path.join(extractedTextDir, `cam${book}.txt`);
  if (!fs.existsSync(filePath)) return [];
  const pages = fs.readFileSync(filePath, "utf8").split("\f");
  const task1 = [];
  const task2 = [];
  pages.forEach((text, index) => {
    const page = index + 1;
    if (pageHasTask(text, 1)) task1.push(page);
    if (pageHasTask(text, 2)) task2.push(page);
  });
  return task1.slice(0, 4).flatMap((page, index) => [
    { test: index + 1, task: 1, pages: [page] },
    ...(task2[index] ? [{ test: index + 1, task: 2, pages: [task2[index]] }] : []),
  ]);
}

function ocrWritingRanges(book) {
  const files = fs.existsSync(ocrReadingWritingDir)
    ? fs.readdirSync(ocrReadingWritingDir).filter((file) => file.startsWith(`cam${book}-test`) && file.endsWith("-reading-writing.txt"))
    : [];
  return files.flatMap((file) => {
    const test = Number((file.match(/cam\d+-test(\d+)-/) || [])[1]);
    if (!test) return [];
    const text = fs.readFileSync(path.join(ocrReadingWritingDir, file), "utf8");
    const matches = [...text.matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n--- Page \d+ ---|$)/g)];
    const task1 = matches.find((match) => pageHasTask(match[2], 1));
    const task2 = matches.find((match) => pageHasTask(match[2], 2));
    return [
      ...(task1 ? [{ test, task: 1, pages: [Number(task1[1])] }] : []),
      ...(task2 ? [{ test, task: 2, pages: [Number(task2[1])] }] : []),
    ];
  }).sort((a, b) => a.test - b.test || a.task - b.task);
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

function attachListeningImages(bank, book, test, pages) {
  const item = bank.listeningTests.find((entry) => entry.id === `cam${book}-l-test${test}`);
  if (!item) return false;
  item.questionPageImages = pages.map((page) => ({
    page,
    url: `/generated/listening-pages/cam${book}/test${test}/page-${page}.webp`,
  }));
  return true;
}

function attachWritingImages(bank, book, test, task, pages) {
  const item = bank.writingTasks.find((entry) => entry.id === `cam${book}-w-test${test}-task${task}`);
  if (!item) return false;
  item.writingPageImages = pages.map((page) => ({
    page,
    url: `/generated/writing-pages/cam${book}/test${test}/task${task}/page-${page}.webp`,
  }));
  return true;
}

async function withPdf(book, callback) {
  const pdfPath = pdfPathForBook(book);
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.warn(`Missing PDF for Cambridge ${book}`);
    return null;
  }
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
  return callback(doc);
}

async function renderListeningBook(book, ranges, bankPath = localBankPath) {
  const bank = bankByPath.get(bankPath);
  if (!ranges.length) return { listeningRendered: 0, listeningAttached: 0 };
  return withPdf(book, async (doc) => {
    let listeningRendered = 0;
    let listeningAttached = 0;
    for (const item of ranges) {
      const dir = path.join(listeningRoot, `cam${book}`, `test${item.test}`);
      fs.mkdirSync(dir, { recursive: true });
      for (const page of item.pages) {
        await renderPage(doc, page, path.join(dir, `page-${page}.webp`));
        listeningRendered += 1;
      }
      if (attachListeningImages(bank, book, item.test, item.pages)) listeningAttached += 1;
    }
    return { listeningRendered, listeningAttached };
  }) || { listeningRendered: 0, listeningAttached: 0 };
}

async function renderWritingBook(book, ranges, bankPath = localBankPath) {
  const bank = bankByPath.get(bankPath);
  if (!ranges.length) return { writingRendered: 0, writingAttached: 0 };
  return withPdf(book, async (doc) => {
    let writingRendered = 0;
    let writingAttached = 0;
    for (const item of ranges) {
      const dir = path.join(writingRoot, `cam${book}`, `test${item.test}`, `task${item.task}`);
      fs.mkdirSync(dir, { recursive: true });
      for (const page of item.pages) {
        await renderPage(doc, page, path.join(dir, `page-${page}.webp`));
        writingRendered += 1;
      }
      if (attachWritingImages(bank, book, item.test, item.task, item.pages)) writingAttached += 1;
    }
    return { writingRendered, writingAttached };
  }) || { writingRendered: 0, writingAttached: 0 };
}

fs.mkdirSync(listeningRoot, { recursive: true });
fs.mkdirSync(writingRoot, { recursive: true });

const summary = [];
for (const book of [2, 4, 5, 6, 7, 10]) {
  const listening = await renderListeningBook(book, textListeningRanges(book));
  summary.push({ book, ...listening });
}
for (const book of [8, 9, 11, 12, 13, 14]) {
  const listening = await renderListeningBook(book, ocrListeningRanges(book));
  summary.push({ book, ...listening });
}
summary.push({ book: 15, ...(await renderListeningBook(15, ocrListeningRanges(15), cambridge15BankPath)) });

for (const book of [1, 3, 4, 5, 6, 7, 10]) {
  const writing = await renderWritingBook(book, textWritingRanges(book));
  const item = summary.find((entry) => entry.book === book) || { book };
  Object.assign(item, writing);
  if (!summary.includes(item)) summary.push(item);
}
for (const book of [8, 9, 11, 12, 13, 14]) {
  const writing = await renderWritingBook(book, ocrWritingRanges(book));
  const item = summary.find((entry) => entry.book === book) || { book };
  Object.assign(item, writing);
  if (!summary.includes(item)) summary.push(item);
}
{
  const writing = await renderWritingBook(15, ocrWritingRanges(15), cambridge15BankPath);
  const item = summary.find((entry) => entry.book === 15) || { book: 15 };
  Object.assign(item, writing);
  if (!summary.includes(item)) summary.push(item);
}

for (const [filePath, bank] of bankByPath) {
  fs.writeFileSync(filePath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
}

const allLocalListening = localBank.listeningTests.length;
const allCam15Listening = cambridge15Bank.listeningTests.length;
const allLocalWriting = localBank.writingTasks.length;
const allCam15Writing = cambridge15Bank.writingTasks.length;
console.log(JSON.stringify({
  summary,
  listeningWithImages: localBank.listeningTests.filter((item) => item.questionPageImages?.length).length + cambridge15Bank.listeningTests.filter((item) => item.questionPageImages?.length).length,
  listeningTotal: allLocalListening + allCam15Listening,
  writingWithImages: localBank.writingTasks.filter((item) => item.writingPageImages?.length).length + cambridge15Bank.writingTasks.filter((item) => item.writingPageImages?.length).length,
  writingTotal: allLocalWriting + allCam15Writing,
}, null, 2));
