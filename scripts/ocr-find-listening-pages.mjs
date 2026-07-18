import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = process.argv[2];
const startPage = Number(process.argv[3] || 1);
const endPageArg = Number(process.argv[4] || 0);
if (!pdfPath) throw new Error("Usage: node scripts/ocr-find-listening-pages.mjs <pdf> [start] [end]");

const data = new Uint8Array(fs.readFileSync(pdfPath));
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;
const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
const endPage = endPageArg || doc.numPages;
const worker = await createWorker("eng");

async function ocrPage(pageNumber, scale = 1.1) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  const png = await canvas.encode("png");
  const result = await worker.recognize(png);
  return result.data.text;
}

const hits = [];
for (let page = startPage; page <= Math.min(endPage, doc.numPages); page += 1) {
  const text = await ocrPage(page);
  const normalized = text.replace(/\s+/g, " ").trim();
  if (/\bLISTENING\b/i.test(normalized) || /\bSECTION\s+[1I]\b/i.test(normalized) || /\bREADING\b/i.test(normalized)) {
    hits.push({ page, text: normalized.slice(0, 260) });
    console.log(JSON.stringify(hits[hits.length - 1]));
  }
}

await worker.terminate();
console.error(`scanned=${endPage - startPage + 1} hits=${hits.length}`);
