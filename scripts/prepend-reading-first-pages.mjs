import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localBankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const imageRoot = path.join(workspace, "public", "generated", "reading-pages");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const localBank = JSON.parse(fs.readFileSync(localBankPath, "utf8"));
const cambridge15Bank = JSON.parse(fs.readFileSync(cambridge15BankPath, "utf8"));
const pdfOverrides = new Map([
  [15, "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15\\剑15.pdf"],
]);

function pdfPathForBook(book) {
  const override = pdfOverrides.get(book);
  if (override && fs.existsSync(override)) return override;
  const file = localBank.localFiles?.find((item) => item.id === `cam${book}-pdf`);
  return file?.path || "";
}

function getBank(book) {
  return book === 15 ? cambridge15Bank : localBank;
}

function expectedTests(book) {
  if (book === 12) return [5, 6, 7, 8];
  return [1, 2, 3, 4];
}

async function renderPage(doc, pageNumber, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return false;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.45 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  fs.writeFileSync(outputPath, await canvas.encode("webp"));
  return true;
}

function prependPage(reading, book, test, firstPage) {
  const pages = reading.readingPageImages.map((image) => Number(image.page)).filter(Boolean);
  const previousPage = firstPage - 1;
  if (previousPage < 1 || pages.includes(previousPage)) return false;
  reading.readingPageImages = [previousPage, ...pages].map((page) => ({
    page,
    url: `/generated/reading-pages/cam${book}/test${test}/page-${page}.webp`,
  }));
  return true;
}

const booksWithOcrBoundaryIssue = [8, 9, 11, 12, 13, 14, 15];
const summary = [];

for (const book of booksWithOcrBoundaryIssue) {
  const pdfPath = pdfPathForBook(book);
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    summary.push({ book, error: "missing pdf" });
    continue;
  }
  const bank = getBank(book);
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
  let updated = 0;
  let rendered = 0;
  for (const test of expectedTests(book)) {
    const reading = bank.readingTests?.find((item) => item.id === `cam${book}-r-test${test}`);
    const firstPage = Number(reading?.readingPageImages?.[0]?.page || 0);
    if (!reading || !firstPage) continue;
    const pageToAdd = firstPage - 1;
    if (!prependPage(reading, book, test, firstPage)) continue;
    const dir = path.join(imageRoot, `cam${book}`, `test${test}`);
    fs.mkdirSync(dir, { recursive: true });
    if (await renderPage(doc, pageToAdd, path.join(dir, `page-${pageToAdd}.webp`))) rendered += 1;
    updated += 1;
  }
  summary.push({ book, updated, rendered });
}

fs.writeFileSync(localBankPath, `${JSON.stringify(localBank, null, 2)}\n`, "utf8");
fs.writeFileSync(cambridge15BankPath, `${JSON.stringify(cambridge15Bank, null, 2)}\n`, "utf8");

console.log(JSON.stringify(summary, null, 2));
