import fs from "fs";
import path from "path";
import { createWorker } from "tesseract.js";

const workspace = process.cwd();
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const cacheDir = path.join(workspace, "data", "ocr-layout-cache");
const booksArg = process.argv.find((arg) => arg.startsWith("--books="))?.split("=")[1] || "";
const wantedBooks = new Set(
  booksArg
    .split(",")
    .map((book) => Number(book.trim()))
    .filter(Boolean),
);

function localImagePath(url) {
  const clean = String(url || "").replace(/^\//, "").replace(/\//g, path.sep);
  return path.join(workspace, "public", clean);
}

function cachePath(url) {
  const key = String(url || "")
    .replace(/^\/+/, "")
    .replace(/[\\/:*?"<>|]+/g, "__")
    .replace(/\.(webp|png|jpg|jpeg)$/i, ".json");
  return path.join(cacheDir, key);
}

function parseTsv(tsv) {
  const rows = String(tsv || "").trim().split(/\r?\n/).map((line) => line.split("\t"));
  const page = rows.find((row) => row[0] === "1");
  const pageWidth = Number(page?.[8] || 1);
  const pageHeight = Number(page?.[9] || 1);
  const groups = new Map();
  for (const row of rows) {
    if (row[0] !== "5") continue;
    const text = row.slice(11).join("\t").trim();
    if (!text) continue;
    const key = [row[2], row[3], row[4]].join(".");
    const left = Number(row[6]);
    const top = Number(row[7]);
    const width = Number(row[8]);
    const height = Number(row[9]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      text,
      left: (left / pageWidth) * 100,
      top: (top / pageHeight) * 100,
      width: (width / pageWidth) * 100,
      height: (height / pageHeight) * 100,
    });
  }
  return [...groups.values()]
    .map((words) => {
      const left = Math.min(...words.map((word) => word.left));
      const top = Math.min(...words.map((word) => word.top));
      const right = Math.max(...words.map((word) => word.left + word.width));
      const bottom = Math.max(...words.map((word) => word.top + word.height));
      return {
        text: words.map((word) => word.text).join(" "),
        left,
        top,
        width: right - left,
        height: bottom - top,
        words,
      };
    })
    .sort((a, b) => a.top - b.top || a.left - b.left);
}

async function getLayout(worker, image) {
  if (!image?.url) return null;
  const file = localImagePath(image.url);
  if (!fs.existsSync(file)) return null;
  const cache = cachePath(image.url);
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));
  const result = await worker.recognize(file, {}, { tsv: true });
  const layout = parseTsv(result.data.tsv);
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(cache, JSON.stringify(layout), "utf8");
  return layout;
}

function itemBook(item) {
  const match = String(item?.id || "").match(/^cam(\d+)-/i);
  return match ? Number(match[1]) : null;
}

function allImageItems() {
  return [
    ...bank.listeningTests.flatMap((item) => (item.questionPageImages || []).map((image) => ({ item, image }))),
    ...bank.readingTests.flatMap((item) => (item.readingPageImages || []).map((image) => ({ item, image }))),
  ];
}

const jobs = allImageItems()
  .filter(({ image, item }) => image?.url && (!wantedBooks.size || wantedBooks.has(itemBook(item))));
const worker = await createWorker("eng");
let done = 0;
for (const { image } of jobs) {
  image.layoutLines = await getLayout(worker, image);
  done += 1;
  console.log(`layout ${done}/${jobs.length} ${image.url}`);
}
await worker.terminate();

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ pages: jobs.length, cacheDir }, null, 2));
