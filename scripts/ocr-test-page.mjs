import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = process.argv[2];
const pageNumber = Number(process.argv[3] || 1);
if (!pdfPath) throw new Error("Usage: node scripts/ocr-test-page.mjs <pdf> <page>");

const data = new Uint8Array(fs.readFileSync(pdfPath));
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;
const doc = await pdfjsLib.getDocument({ data, wasmUrl }).promise;
const page = await doc.getPage(pageNumber);
const viewport = page.getViewport({ scale: 1.8 });
const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
const context = canvas.getContext("2d");
await page.render({ canvasContext: context, viewport }).promise;
const png = await canvas.encode("png");

const worker = await createWorker("eng");
const result = await worker.recognize(png);
await worker.terminate();

console.log(`pages=${doc.numPages} page=${pageNumber}`);
console.log(result.data.text.slice(0, 2000));
