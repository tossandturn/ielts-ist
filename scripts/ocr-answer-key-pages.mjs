import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(workspace, "data", "ocr-answer-keys");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const pdf = {
  8: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题8.pdf",
  9: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题9.pdf",
  10: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题10.pdf",
  11: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题11.pdf",
  12: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题12.pdf",
  13: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑1-13\\剑桥雅思真题13.pdf",
  14: "C:\\Users\\10604\\Desktop\\ap物理真题训练\\剑14\\剑14真题.pdf",
};

const jobs = [
  { book: 8, tests: [[1, 151, 152], [2, 153, 154], [3, 155, 156], [4, 157, 158]] },
  { book: 9, tests: [[1, 144, 145], [2, 146, 147], [3, 148, 149], [4, 150, 151]] },
  { book: 10, tests: [[1, 144, 145], [2, 146, 147], [3, 148, 149], [4, 150, 151]] },
  { book: 11, tests: [[1, 123, 124], [2, 125, 126], [3, 127, 128], [4, 129, 130]] },
  { book: 12, tests: [[5, 116, 117], [6, 118, 119], [7, 120, 121], [8, 122, 123]] },
  { book: 13, tests: [[1, 119, 120], [2, 121, 122], [3, 123, 124], [4, 125, 126]] },
  { book: 14, tests: [[1, 119, 120], [2, 121, 122], [3, 123, 124], [4, 125, 126]] },
];

async function renderPage(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2.2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.encode("png");
}

function clean(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

fs.mkdirSync(outDir, { recursive: true });
const worker = await createWorker("eng");
const targets = process.argv.slice(2).map(Number).filter(Boolean);
const selected = targets.length ? jobs.filter((job) => targets.includes(job.book)) : jobs;
const summary = [];

for (const job of selected) {
  if (!fs.existsSync(pdf[job.book])) {
    summary.push({ book: job.book, error: "missing pdf" });
    continue;
  }
  const data = new Uint8Array(fs.readFileSync(pdf[job.book]));
  const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
  for (const [test, start, end] of job.tests) {
    const outputPath = path.join(outDir, `cam${job.book}-test${test}.txt`);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      summary.push({ book: job.book, test, cached: true });
      continue;
    }
    const chunks = [];
    for (let page = start; page <= end; page += 1) {
      console.error(`OCR Cambridge ${job.book} Test ${test} answer page ${page}/${doc.numPages}`);
      const image = await renderPage(doc, page);
      const result = await worker.recognize(image);
      chunks.push(`--- Page ${page} ---\n${clean(result.data.text)}`);
    }
    fs.writeFileSync(outputPath, `${chunks.join("\n\n")}\n`, "utf8");
    summary.push({ book: job.book, test, pages: `${start}-${end}`, bytes: fs.statSync(outputPath).size });
  }
}

await worker.terminate();
console.log(JSON.stringify(summary, null, 2));
