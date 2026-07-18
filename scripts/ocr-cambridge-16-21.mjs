import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = process.cwd();
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;
const outDir = path.join(workspace, "data", "ocr-cambridge-16-21");
const jobs = [
  { book: 16, pdf: "D:/Users/10604/Desktop/\u525116-21/\u525116\u771f\u9898.pdf", start: 10, end: 128 },
  { book: 18, pdf: "D:/Users/10604/Desktop/\u525116-21/\u771f\u989818.pdf", start: 10, end: 127 },
  { book: 19, pdf: "D:/Users/10604/Desktop/\u525116-21/\u771f\u989819.pdf", start: 10, end: 127 },
  { book: 20, pdf: "D:/Users/10604/Desktop/\u525116-21/A20\u771f\u9898.pdf", start: 10, end: 127 },
  { book: 21, pdf: "D:/Users/10604/Desktop/\u525116-21/\u525121-A\u7c7b.pdf", start: 11, end: 125 },
];
fs.mkdirSync(outDir, { recursive: true });
async function render(doc, pageNumber, scale = 1.22) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.encode("png");
}
const worker = await createWorker("eng");
for (const job of jobs) {
  const outPath = path.join(outDir, `cam${job.book}-pages.txt`);
  const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  const existingPages = new Set([...existing.matchAll(/--- Page (\d+) ---/g)].map((m) => Number(m[1])));
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(job.pdf)), wasmUrl }).promise;
  const chunks = existing ? [existing.trim()] : [];
  for (let page = job.start; page <= Math.min(job.end, doc.numPages); page += 1) {
    if (existingPages.has(page)) continue;
    console.error(`OCR cam${job.book} page ${page}/${doc.numPages}`);
    const result = await worker.recognize(await render(doc, page));
    chunks.push(`--- Page ${page} ---\n${result.data.text.trim()}`);
    fs.writeFileSync(outPath, `${chunks.join("\n\n").trim()}\n`, "utf8");
  }
}
await worker.terminate();
