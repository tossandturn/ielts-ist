import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import PDFDocument from "pdfkit";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = process.cwd();
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const root = "D:/Users/10604/Desktop/剑16-21";
const outRoot = path.join(workspace, "public", "generated", "module-pdfs");
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;

const pdfs = {
  16: `${root}/剑16真题.pdf`,
  17: `${root}/真题17（A类）.pdf`,
  18: `${root}/真题18.pdf`,
  19: `${root}/真题19.pdf`,
  20: `${root}/A20真题.pdf`,
  21: `${root}/剑21-A类.pdf`,
};

const ranges = {
  16: { l: [[10, 15], [32, 37], [55, 60], [76, 81]], r: [[16, 28], [38, 51], [61, 72], [82, 94]], w: [[29, 30], [52, 53], [73, 74], [95, 96]] },
  17: { l: [[10, 15], [31, 36], [53, 58], [75, 80]], r: [[16, 27], [37, 49], [59, 71], [81, 92]], w: [[28, 29], [50, 51], [72, 73], [93, 94]] },
  18: { l: [[12, 17], [34, 39], [57, 62], [80, 85]], r: [[18, 30], [40, 53], [63, 76], [86, 97]], w: [[31, 32], [54, 55], [77, 78], [98, 99]] },
  19: { l: [[12, 17], [35, 39], [57, 62], [80, 85]], r: [[18, 31], [40, 53], [63, 76], [86, 97]], w: [[32, 33], [54, 55], [77, 78], [98, 99]] },
  20: { l: [[12, 17], [34, 38], [55, 59], [77, 81]], r: [[18, 30], [39, 51], [60, 73], [82, 95]], w: [[31, 32], [52, 53], [74, 75], [96, 97]] },
  21: { l: [[11, 16], [33, 38], [55, 60], [76, 81]], r: [[17, 29], [39, 51], [61, 72], [82, 94]], w: [[30, 31], [52, 53], [73, 74], [95, 96]] },
};

function pages(pair) {
  return Array.from({ length: pair[1] - pair[0] + 1 }, (_, index) => pair[0] + index);
}

function upsertFile(id, filePath, contentType) {
  const relativePath = path.relative(workspace, filePath).replace(/\\/g, "/");
  const existing = bank.localFiles.find((file) => file.id === id);
  const record = { id, path: filePath, contentType, generated: true, relativePath };
  if (existing) Object.assign(existing, record);
  else bank.localFiles.push(record);
  return `/cambridge-local/file/${encodeURIComponent(id)}`;
}

async function renderPageToJpeg(doc, pageNumber) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.35 });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  await page.render({ canvasContext: context, viewport }).promise;
  return { buffer: await canvas.encode("jpeg", 82), width, height };
}

async function writeModulePdf(doc, pageNumbers, outPath) {
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) return;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await new Promise(async (resolve, reject) => {
    const pdf = new PDFDocument({ autoFirstPage: false, margin: 0 });
    const stream = fs.createWriteStream(outPath);
    pdf.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
    try {
      for (const pageNumber of pageNumbers) {
        const image = await renderPageToJpeg(doc, pageNumber);
        pdf.addPage({ size: [image.width, image.height], margin: 0 });
        pdf.image(image.buffer, 0, 0, { width: image.width, height: image.height });
      }
      pdf.end();
    } catch (error) {
      reject(error);
    }
  });
}

function setSourceUrl(collection, id, sourceUrl) {
  const item = collection.find((entry) => entry.id === id);
  if (!item) throw new Error(`Missing bank item: ${id}`);
  item.sourceUrl = sourceUrl;
  item.modulePdfUrl = sourceUrl;
}

let generated = 0;
for (const book of [16, 17, 18, 19, 20, 21]) {
  if (!fs.existsSync(pdfs[book])) throw new Error(`Missing source PDF for Cambridge ${book}: ${pdfs[book]}`);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(pdfs[book])), wasmUrl }).promise;
  for (let test = 1; test <= 4; test += 1) {
    const listeningPages = pages(ranges[book].l[test - 1]);
    const readingPages = pages(ranges[book].r[test - 1]);
    const writingPages = pages(ranges[book].w[test - 1]);

    const listeningPath = path.join(outRoot, `cam${book}`, `test${test}`, "listening.pdf");
    const readingPath = path.join(outRoot, `cam${book}`, `test${test}`, "reading.pdf");
    await writeModulePdf(doc, listeningPages, listeningPath);
    await writeModulePdf(doc, readingPages, readingPath);
    setSourceUrl(bank.listeningTests, `cam${book}-l-test${test}`, upsertFile(`cam${book}-l-test${test}-pdf`, listeningPath, "application/pdf"));
    setSourceUrl(bank.readingTests, `cam${book}-r-test${test}`, upsertFile(`cam${book}-r-test${test}-pdf`, readingPath, "application/pdf"));
    generated += 2;

    for (const task of [1, 2]) {
      const writingPath = path.join(outRoot, `cam${book}`, `test${test}`, `writing-task${task}.pdf`);
      await writeModulePdf(doc, [writingPages[task - 1]], writingPath);
      setSourceUrl(bank.writingTasks, `cam${book}-w-test${test}-task${task}`, upsertFile(`cam${book}-w-test${test}-task${task}-pdf`, writingPath, "application/pdf"));
      generated += 1;
    }
  }
}

fs.writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ generated, localFiles: bank.localFiles.length }, null, 2));
