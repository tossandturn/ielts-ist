const fs = require("fs");
const path = require("path");

const workspace = path.resolve(__dirname, "..");
const bankPath = path.join(workspace, "data", "cambridge-local-bank.json");
const textDir = path.join(workspace, "data", "extracted-text");

function compact(line) {
  return String(line || "").replace(/\s+/g, "").replace(/[—–一]/g, "-");
}

function isSectionOneStart(line) {
  const value = compact(line).toUpperCase();
  return /SECTION(?:1|I)QUESTIONS?1[-+]?10/.test(value);
}

function isReadingStart(line) {
  return /^\s*READING\s*$/i.test(line) || /^\s*READING PASSAGE\s+1/i.test(line);
}

function isLikelyListeningBlock(lines, start) {
  const lookahead = lines.slice(start, start + 220).join("\n").toUpperCase();
  return /SECTION\s*4|S\s*E\s*C\s*T\s*I\s*O\s*N\s*4/i.test(lookahead) && /40/.test(lookahead);
}

function cleanPaper(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\f/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function extractBookPapers(book) {
  const filePath = path.join(textDir, `cam${book}.txt`);
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").replace(/\r/g, "").split("\n");
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (isSectionOneStart(lines[index]) && isLikelyListeningBlock(lines, index)) starts.push(index);
  }

  const papers = [];
  const seenStarts = new Set();
  for (const sectionStart of starts) {
    let start = sectionStart;
    for (let line = sectionStart; line >= Math.max(0, sectionStart - 30); line -= 1) {
      if (/LISTENING/i.test(lines[line]) || /\b(Test|Practice Test)\s+\d+\b/i.test(lines[line])) {
        start = line;
      }
    }
    if (seenStarts.has(start)) continue;
    seenStarts.add(start);

    let end = lines.length;
    for (let line = sectionStart + 20; line < lines.length; line += 1) {
      if (isReadingStart(lines[line])) {
        end = line;
        break;
      }
    }

    const raw = cleanPaper(lines.slice(start, end).join("\n"));
    if (!raw || raw.length < 500) continue;
    const heading = lines.slice(Math.max(0, start - 8), sectionStart + 1).join("\n");
    const test = Number((heading.match(/\b(?:Practice\s+)?Test\s+(\d+)\b/i) || [])[1] || papers.length + 1);
    papers.push({ test, paper: raw });
  }
  return papers.slice(0, 4);
}

const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
let attached = 0;
const summary = [];

for (const book of [1, 3, 4, 5, 6, 7, 10]) {
  const papers = extractBookPapers(book);
  summary.push({ book, papers: papers.length });
  for (const item of bank.listeningTests.filter((entry) => entry.id.startsWith(`cam${book}-l-test`))) {
    delete item.questionPaper;
    delete item.questionPaperSource;
  }
  papers.forEach(({ test, paper }) => {
    const item = bank.listeningTests.find((entry) => entry.id === `cam${book}-l-test${test}`);
    if (!item) return;
    item.questionPaper = paper;
    item.questionPaperSource = `pdftotext:${path.join("data", "extracted-text", `cam${book}.txt`)}`;
    item.transcript = `Full listening question paper is shown below. Use the audio sections above and answer Questions 1-40. Some characters may reflect the original PDF encoding.`;
    attached += 1;
  });
}

fs.writeFileSync(bankPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");
console.log({ attached, summary });
