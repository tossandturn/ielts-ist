import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
const wasmUrl=`${pathToFileURL(path.join(process.cwd(),"node_modules","pdfjs-dist","wasm")).href}/`;
const jobs=[
 {book:18,pdf:"D:/Users/10604/Desktop/\u525116-21/\u771f\u989818.pdf",pages:[128]},
 {book:19,pdf:"D:/Users/10604/Desktop/\u525116-21/\u771f\u989819.pdf",pages:[128]},
];
async function render(doc,p){const page=await doc.getPage(p); const vp=page.getViewport({scale:1.22}); const c=createCanvas(Math.ceil(vp.width),Math.ceil(vp.height)); const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height); await page.render({canvasContext:ctx,viewport:vp}).promise; return c.encode('png');}
const worker=await createWorker('eng');
for(const job of jobs){const file=`data/ocr-cambridge-16-21/cam${job.book}-pages.txt`; let txt=fs.readFileSync(file,'utf8').trim(); const doc=await pdfjsLib.getDocument({data:new Uint8Array(fs.readFileSync(job.pdf)),wasmUrl}).promise; for(const p of job.pages){ if(new RegExp(`--- Page ${p} ---`).test(txt)) continue; console.error(`OCR cam${job.book} page ${p}`); const res=await worker.recognize(await render(doc,p)); txt += `\n\n--- Page ${p} ---\n${res.data.text.trim()}`; fs.writeFileSync(file,txt+'\n','utf8'); }}
await worker.terminate();
