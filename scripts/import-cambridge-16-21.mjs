import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const workspace = process.cwd();
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const root = "D:/Users/10604/Desktop/\u525116-21";
const wasmUrl = `${pathToFileURL(path.join(workspace, "node_modules", "pdfjs-dist", "wasm")).href}/`;
const pdfs = {
  16: `${root}/\u525116\u771f\u9898.pdf`,
  17: `${root}/\u771f\u989817\uff08A\u7c7b\uff09.pdf`,
  18: `${root}/\u771f\u989818.pdf`,
  19: `${root}/\u771f\u989819.pdf`,
  20: `${root}/A20\u771f\u9898.pdf`,
  21: `${root}/\u525121-A\u7c7b.pdf`,
};
const audioDirs = {
  16: `${root}/16\u97f3\u9891`,
  17: `${root}/17\u97f3\u9891`,
  18: `${root}/\u525118\u97f3\u9891`,
  19: `${root}/A19\u97f3\u9891/\u97f3\u9891`,
  20: `${root}/20\u97f3\u9891`,
  21: `${root}/21\u97f3\u9891`,
};
const ranges = {
  16: { l:[[10,15],[32,37],[55,60],[76,81]], r:[[16,28],[38,51],[61,72],[82,94]], w:[[29,30],[52,53],[73,74],[95,96]] },
  17: { l:[[10,15],[31,36],[53,58],[75,80]], r:[[16,27],[37,49],[59,71],[81,92]], w:[[28,29],[50,51],[72,73],[93,94]] },
  18: { l:[[12,17],[34,39],[57,62],[80,85]], r:[[18,30],[40,53],[63,76],[86,97]], w:[[31,32],[54,55],[77,78],[98,99]] },
  19: { l:[[12,17],[35,39],[57,62],[80,85]], r:[[18,31],[40,53],[63,76],[86,97]], w:[[32,33],[54,55],[77,78],[98,99]] },
  20: { l:[[12,17],[34,38],[55,59],[77,81]], r:[[18,30],[39,51],[60,73],[82,95]], w:[[31,32],[52,53],[74,75],[96,97]] },
  21: { l:[[11,16],[33,38],[55,60],[76,81]], r:[[17,29],[39,51],[61,72],[82,94]], w:[[30,31],[52,53],[73,74],[95,96]] },
};
function upsertFile(id, filePath, contentType) {
  if (!fs.existsSync(filePath)) return null;
  const existing = bank.localFiles.find((f) => f.id === id);
  if (existing) Object.assign(existing, { path: filePath, contentType });
  else bank.localFiles.push({ id, path: filePath, contentType });
  return `/cambridge-local/file/${encodeURIComponent(id)}`;
}
function placeholderQuestions(answers = []) {
  return Array.from({ length: 40 }, (_, index) => ({
    id: `q${index + 1}`,
    text: `Question ${index + 1}`,
    answer: answers[index] || "",
    answerAvailable: Boolean(answers[index]),
  }));
}
function pages(pair) { return Array.from({ length: pair[1] - pair[0] + 1 }, (_, i) => pair[0] + i); }
function pageTextFile(book) { return book === 17 ? path.join(workspace, "data", "extracted-text", "cam17-pages.txt") : path.join(workspace, "data", "ocr-cambridge-16-21", `cam${book}-pages.txt`); }
function pageMap(book) {
  const txt = fs.readFileSync(pageTextFile(book), "utf8");
  const map = new Map();
  for (const m of txt.matchAll(/--- Page (\d+) ---\n([\s\S]*?)(?=\n\n--- Page \d+ ---|$)/g)) map.set(Number(m[1]), m[2].trim());
  return map;
}
function paperFromPages(book, ps) {
  const map = pageMap(book);
  return ps.map((p) => `--- Page ${p} ---\n${map.get(p) || ""}`).join("\n\n").trim();
}
function splitWriting(book, pair) {
  const map = pageMap(book);
  return pages(pair).map((p) => ({ page:p, text:map.get(p)||"" }));
}
function audioFiles(book, test) {
  const dir = audioDirs[book];
  if (!fs.existsSync(dir)) return [];
  const all = fs.readdirSync(dir).filter((name) => /\.mp3$/i.test(name)).map((name) => path.join(dir, name));
  const patterns = {
    16: new RegExp(`IELTS16_test${test}_audio[1-4]`, "i"),
    17: new RegExp(`C17-T${test}-P[1-4]`, "i"),
    18: new RegExp(`18-${test}-[1-4]`, "i"),
    19: new RegExp(`Test${test} Part[1-4]`, "i"),
    20: new RegExp(`20T${test}S[1-4]`, "i"),
    21: new RegExp(`21Test${test}-Part[1-4]`, "i"),
  };
  return all.filter((file) => patterns[book].test(path.basename(file))).sort((a,b)=>a.localeCompare(b, undefined, { numeric:true }));
}
async function renderPage(doc, pageNumber, outPath) {
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) return;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.45 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, await canvas.encode("webp"));
}
function upsertById(collection, item) {
  const index = collection.findIndex((x) => x.id === item.id);
  if (index >= 0) collection[index] = { ...collection[index], ...item };
  else collection.push(item);
}
let entries = 0;
for (const book of [16,17,18,19,20,21]) {
  const pdfUrl = upsertFile(`cam${book}-pdf`, pdfs[book], "application/pdf");
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(pdfs[book])), wasmUrl }).promise;
  for (let test = 1; test <= 4; test++) {
    const lPages = pages(ranges[book].l[test-1]);
    const rPages = pages(ranges[book].r[test-1]);
    const wPages = pages(ranges[book].w[test-1]);
    for (const p of [...lPages, ...rPages, ...wPages]) {
      const kind = lPages.includes(p) ? "listening-pages" : rPages.includes(p) ? "reading-pages" : "writing-pages";
      const sub = kind === "writing-pages" ? `test${test}/page-${p}.webp` : `test${test}/page-${p}.webp`;
      await renderPage(doc, p, path.join(workspace, "public", "generated", kind, `cam${book}`, sub));
    }
    const aUrls = audioFiles(book,test).map((file, i) => upsertFile(`cam${book}-l-test${test}-audio${i+1}`, file, "audio/mpeg")).filter(Boolean);
    upsertById(bank.listeningTests, {
      id:`cam${book}-l-test${test}`, module:"listening", title:`Cambridge IELTS ${book} Academic - Test ${test} Listening`, source:`Cambridge IELTS ${book} local import`, period:`Cambridge ${book}`, minutes:30,
      audioUrls:aUrls, sourceUrl:pdfUrl, answerAvailable:false, transcript:`Use Cambridge IELTS ${book} Test ${test} audio and answer Questions 1-40.`, questions:placeholderQuestions(),
      questionPaper:paperFromPages(book,lPages), questionPaperSource:pageTextFile(book).replace(workspace+path.sep, "").replace(/\\/g,"/"),
      questionPageImages:lPages.map((p)=>({page:p,url:`/generated/listening-pages/cam${book}/test${test}/page-${p}.webp`})),
    });
    upsertById(bank.readingTests, {
      id:`cam${book}-r-test${test}`, module:"reading", title:`Cambridge IELTS ${book} Academic - Test ${test} Reading`, source:`Cambridge IELTS ${book} local import`, period:`Cambridge ${book}`, minutes:60,
      sourceUrl:pdfUrl, answerAvailable:false, passage:`Full Reading Test ${test} question paper is imported below.`, questions:placeholderQuestions(),
      readingPaper:paperFromPages(book,rPages), readingPaperSource:pageTextFile(book).replace(workspace+path.sep, "").replace(/\\/g,"/"),
      readingPageImages:rPages.map((p)=>({page:p,url:`/generated/reading-pages/cam${book}/test${test}/page-${p}.webp`})),
    });
    const wTexts = splitWriting(book, ranges[book].w[test-1]);
    for (const task of [1,2]) {
      const p = wPages[task-1];
      const prompt = wTexts[task-1]?.text || `Cambridge IELTS ${book} Test ${test} Writing Task ${task}`;
      upsertById(bank.writingTasks, { id:`cam${book}-w-test${test}-task${task}`, module:"writing", type:`Task ${task}`, minutes:task===1?20:40, source:`Cambridge IELTS ${book} local import`, period:`Cambridge ${book}`, title:`Cambridge IELTS ${book} Academic - Test ${test} Writing Task ${task}`, sourceUrl:pdfUrl, prompt, promptSource:pageTextFile(book).replace(workspace+path.sep, "").replace(/\\/g,"/"), writingPageImages:[{page:p,url:`/generated/writing-pages/cam${book}/test${test}/page-${p}.webp`}] });
    }
    entries += 1;
  }
}
fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2)+"\n", "utf8");
console.log(JSON.stringify({entries, localFiles:bank.localFiles.length, listening:bank.listeningTests.length, reading:bank.readingTests.length, writing:bank.writingTasks.length}, null, 2));
