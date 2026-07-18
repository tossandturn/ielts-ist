import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const outDir = path.join(workspace, "data", "ocr-listening");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const jobs = [
  {
    book: 8,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题8.pdf",
    tests: [
      { test: 1, pages: [9, 15] },
      { test: 2, pages: [32, 38] },
      { test: 3, pages: [55, 63] },
      { test: 4, pages: [80, 86] },
    ],
  },
  {
    book: 9,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题9.pdf",
    tests: [
      { test: 1, pages: [2, 8] },
      { test: 2, pages: [25, 31] },
      { test: 3, pages: [48, 54] },
      { test: 4, pages: [71, 77] },
    ],
  },
  {
    book: 11,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题11.pdf",
    tests: [
      { test: 1, pages: [7, 13] },
      { test: 2, pages: [32, 38] },
      { test: 3, pages: [56, 62] },
      { test: 4, pages: [79, 85] },
    ],
  },
  {
    book: 12,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题12.pdf",
    tests: [
      { test: 5, pages: [10, 16] },
      { test: 6, pages: [30, 36] },
      { test: 7, pages: [53, 59] },
      { test: 8, pages: [74, 80] },
    ],
  },
  {
    book: 13,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题13.pdf",
    tests: [
      { test: 1, pages: [11, 17] },
      { test: 2, pages: [33, 39] },
      { test: 3, pages: [55, 61] },
      { test: 4, pages: [77, 83] },
    ],
  },
  {
    book: 15,
    bankPath: cambridge15BankPath,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑15\\剑15.pdf",
    tests: [
      { test: 1, pages: [12, 18] },
      { test: 2, pages: [33, 39] },
      { test: 3, pages: [54, 60] },
      { test: 4, pages: [76, 82] },
    ],
  },
  {
    book: 14,
    pdf: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑14\\剑14真题.pdf",
    tests: [
      { test: 1, pages: [10, 16] },
      { test: 2, pages: [32, 37] },
      { test: 3, pages: [53, 59] },
      { test: 4, pages: [75, 81] },
    ],
  },
];

function cleanOcr(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function renderPage(doc, pageNumber, scale = 1.7) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvas.encode("png");
}

fs.mkdirSync(outDir, { recursive: true });
const banks = new Map();
function loadBank(filePath) {
  if (!banks.has(filePath)) banks.set(filePath, JSON.parse(fs.readFileSync(filePath, "utf8")));
  return banks.get(filePath);
}
const worker = await createWorker("eng");
let attached = 0;

for (const job of jobs) {
  const targetBankPath = job.bankPath || bankPath;
  const bank = loadBank(targetBankPath);
  const data = new Uint8Array(fs.readFileSync(job.pdf));
  const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
  for (const testJob of job.tests) {
    const chunks = [];
    for (let page = testJob.pages[0]; page <= testJob.pages[1]; page += 1) {
      console.error(`OCR Cambridge ${job.book} Test ${testJob.test} page ${page}/${doc.numPages}`);
      const png = await renderPage(doc, page);
      const result = await worker.recognize(png);
      chunks.push(`--- Page ${page} ---\n${result.data.text}`);
    }
    const paper = cleanOcr(chunks.join("\n\n"));
    const textPath = path.join(outDir, `cam${job.book}-test${testJob.test}.txt`);
    fs.writeFileSync(textPath, `${paper}\n`, "utf8");
    const item = bank.listeningTests.find((entry) => entry.id === `cam${job.book}-l-test${testJob.test}`);
    if (!item) continue;
    item.questionPaper = paper;
    item.questionPaperSource = path.relative(workspace, textPath).replace(/\\/g, "/");
    item.transcript = "Full listening question paper was OCR'd from the local PDF. Use the audio sections above and answer Questions 1-40.";
    attached += 1;
  }
}

await worker.terminate();
for (const [filePath, bank] of banks) {
  fs.writeFileSync(filePath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
}
console.log({ attached });
