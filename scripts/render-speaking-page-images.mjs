import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const speakingBankPath = path.join(workspace, "data", "speaking-bank.json");
const localBankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const cambridge15BankPath = path.join(workspace, "data", "cambridge15-bank.json");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;
const outRoot = path.join(workspace, "public", "generated", "speaking-pages");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadBankFiles() {
  const files = [];
  for (const bankPath of [localBankPath, cambridge15BankPath]) {
    if (!fs.existsSync(bankPath)) continue;
    const bank = loadJson(bankPath);
    for (const file of bank.localFiles || []) files.push(file);
  }
  return files;
}

function findPdfByName(rootDirs, matcher, maxDepth = 5) {
  const stack = rootDirs.map((root) => ({ dir: root, depth: 0 }));
  while (stack.length) {
    const { dir, depth } = stack.pop();
    if (!fs.existsSync(dir) || depth > maxDepth) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
        continue;
      }
      if (matcher(full, entry.name) && fs.existsSync(full)) return full;
    }
  }
  return "";
}

function pdfPathForBook(book, files) {
  const id = `cam${book}-pdf`;
  const local = files.find((file) => file.id === id);
  if (local?.path && fs.existsSync(local.path)) return local.path;
  if (book === 15) {
    const match = findPdfByName(
      ["C:/Users/10604/Desktop", "D:/Users/10604/Desktop"],
      (full, name) => /剑15/i.test(full) && /\.pdf$/i.test(name),
    );
    if (match) return match;
  }
  return "";
}

async function renderPage(doc, pageNumber, outputPath) {
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, await canvas.encode("webp"));
}

async function main() {
  const bank = loadJson(speakingBankPath);
  const files = loadBankFiles();
  const pdfCache = new Map();
  const summary = [];

  for (const entry of bank.speakingSets || []) {
    const book = Number(entry.book);
    const test = Number(entry.test);
    const page = Number(entry.page);
    if (!book || !test || !page) continue;

    const pdfPath = pdfPathForBook(book, files);
    if (!pdfPath) {
      summary.push({ book, test, page, status: "missing-pdf" });
      continue;
    }

    let doc = pdfCache.get(book);
    if (!doc) {
      doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)), wasmUrl }).promise;
      pdfCache.set(book, doc);
    }

    const imagePath = path.join(outRoot, `cam${book}`, `test${test}`, `page-${page}.webp`);
    await renderPage(doc, page, imagePath);
    entry.speakingPageImages = [{ page, url: `/generated/speaking-pages/cam${book}/test${test}/page-${page}.webp` }];
    const pdfFile = files.find((file) => file.id === `cam${book}-pdf`);
    if (pdfFile) entry.sourceUrl = `/cambridge-local/file/${encodeURIComponent(pdfFile.id)}`;
    if (book === 15) entry.sourceUrl = "/cambridge15/pdf";
    summary.push({ book, test, page, status: "rendered" });
  }

  fs.writeFileSync(speakingBankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
  for (const doc of pdfCache.values()) {
    if (doc?.destroy) await doc.destroy().catch(() => {});
  }
  console.log(JSON.stringify({
    speakingSets: (bank.speakingSets || []).length,
    rendered: summary.filter((item) => item.status === "rendered").length,
    missingPdf: summary.filter((item) => item.status === "missing-pdf").length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
