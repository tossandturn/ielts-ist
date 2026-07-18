const fs = require("fs");
const path = require("path");

const workspace = path.resolve(__dirname, "..");
const outputPath = path.join(workspace, "data", "cambridge-local-bank.json");

const localRoot = "C:\\Users\\10604\\Desktop\\ap物理真题训练";
const cambridgeOneToThirteenRoot = path.join(localRoot, "剑1-13");
const cambridgeFourteenRoot = path.join(localRoot, "剑14");
const audioRoot = path.join(cambridgeOneToThirteenRoot, "雅思听力资料");
const analysisRoot = path.join(cambridgeOneToThirteenRoot, "雅思真题精讲");

const localFiles = [];
const listeningTests = [];
const readingTests = [];
const writingTasks = [];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function addFile(id, filePath, contentType) {
  if (!filePath || !exists(filePath)) return null;
  localFiles.push({ id, path: filePath, contentType });
  return `/cambridge-local/file/${encodeURIComponent(id)}`;
}

function placeholderQuestions() {
  return Array.from({ length: 40 }, (_, index) => ({
    id: `q${index + 1}`,
    text: `Question ${index + 1}`,
    answer: "",
    answerAvailable: false,
  }));
}

function walkFiles(dir, predicate, result = []) {
  if (!exists(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, predicate, result);
    else if (!predicate || predicate(fullPath, entry.name)) result.push(fullPath);
  }
  return result;
}

function detectBookNumber(text) {
  const match = String(text).match(/【(\d+)】|剑桥雅思(?:真题)?\s*(\d+)|剑\s*(\d+)/);
  return Number(match?.[1] || match?.[2] || match?.[3] || 0);
}

function detectTestNumber(text) {
  const value = String(text);
  const match =
    value.match(/(?:test|tst|tes)\s*[-_ ]?(\d+)/i) ||
    value.match(/(?:^|[\\/])t(\d+)s\d+/i);
  return Number(match?.[1] || 0);
}

function detectSectionNumber(text) {
  const value = String(text);
  const match =
    value.match(/section\s*[-_ ]?(\d+)/i) ||
    value.match(/(?:^|[\\/])test\d+-s(\d+)/i) ||
    value.match(/(?:^|[\\/])t\d+s(\d+)/i) ||
    value.match(/-s(\d+)/i);
  return Number(match?.[1] || 0);
}

function groupedAudioForBook(book, files) {
  const grouped = new Map();
  for (const filePath of files) {
    const rel = path.relative(audioRoot, filePath);
    const test = detectTestNumber(rel);
    if (!test) continue;
    if (!grouped.has(test)) grouped.set(test, []);
    grouped.get(test).push(filePath);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([test, filePaths]) => ({
      book,
      test,
      filePaths: filePaths.sort((a, b) => {
        const sectionA = detectSectionNumber(a) || 999;
        const sectionB = detectSectionNumber(b) || 999;
        return sectionA - sectionB || a.localeCompare(b, "zh-Hans-CN");
      }),
    }));
}

function addListeningEntry(book, test, filePaths, sourceUrl) {
  const audioUrls = filePaths
    .map((filePath, index) => {
      const id = `cam${book}-l-test${test}-audio${index + 1}`;
      return addFile(id, filePath, "audio/mpeg");
    })
    .filter(Boolean);
  if (!audioUrls.length) return;
  listeningTests.push({
    id: `cam${book}-l-test${test}`,
    module: "listening",
    title: `Cambridge IELTS ${book} Academic - Test ${test} Listening`,
    source: `Cambridge IELTS ${book} local import`,
    period: `Cambridge ${book}`,
    minutes: 30,
    audioUrls,
    sourceUrl,
    answerAvailable: false,
    transcript: `Questions are in the local Cambridge IELTS ${book} PDF. Use the audio above and answer Questions 1-40 below. Answers have not been imported yet.`,
    questions: placeholderQuestions(),
  });
}

function addReadingEntries(book, testNumbers, sourceUrl, analysisUrl) {
  if (!sourceUrl) return;
  for (const test of testNumbers) {
    readingTests.push({
      id: `cam${book}-r-test${test}`,
      module: "reading",
      title: `Cambridge IELTS ${book} Academic - Test ${test} Reading`,
      source: `Cambridge IELTS ${book} local import`,
      period: `Cambridge ${book}`,
      minutes: 60,
      sourceUrl,
      analysisUrl,
      answerAvailable: false,
      passage: `Open the local Cambridge IELTS ${book} PDF for Test ${test} Reading passages and questions. Answers have not been imported yet.`,
      questions: placeholderQuestions(),
    });
  }
}

function addWritingEntries(book, testNumbers, sourceUrl) {
  if (!sourceUrl) return;
  for (const test of testNumbers) {
    for (const task of [1, 2]) {
      writingTasks.push({
        id: `cam${book}-w-test${test}-task${task}`,
        module: "writing",
        type: `Task ${task}`,
        minutes: task === 1 ? 20 : 40,
        source: `Cambridge IELTS ${book} local import`,
        period: `Cambridge ${book}`,
        title: `Cambridge IELTS ${book} Academic - Test ${test} Writing Task ${task}`,
        sourceUrl,
        prompt: `Open the local Cambridge IELTS ${book} PDF and use Test ${test} Writing Task ${task}. Paste or type the exact task prompt here before submitting if you want AI feedback to judge task response precisely.`,
      });
    }
  }
}

function findPdfForBook(book) {
  if (book === 14) return path.join(cambridgeFourteenRoot, "剑14真题.pdf");
  const pdfPath = path.join(cambridgeOneToThirteenRoot, `剑桥雅思真题${book}.pdf`);
  return exists(pdfPath) ? pdfPath : null;
}

function findAnalysisForBook(book) {
  if (book === 14) return path.join(cambridgeFourteenRoot, "14A类解析  雅思UP.pdf");
  if (!exists(analysisRoot)) return null;
  const files = fs.readdirSync(analysisRoot).map((name) => path.join(analysisRoot, name));
  if ([4, 5, 6].includes(book)) return files.find((file) => /456合辑/.test(path.basename(file))) || null;
  return files.find((file) => new RegExp(`【${book}】`).test(path.basename(file))) || null;
}

function addBook(book, testNumbers, audioGroups = []) {
  const sourceUrl = addFile(`cam${book}-pdf`, findPdfForBook(book), "application/pdf");
  const analysisUrl = addFile(`cam${book}-analysis`, findAnalysisForBook(book), "application/pdf");
  for (const group of audioGroups) addListeningEntry(book, group.test, group.filePaths, sourceUrl);
  addReadingEntries(book, testNumbers, sourceUrl, analysisUrl);
  addWritingEntries(book, testNumbers, sourceUrl);
}

const audioByBook = new Map();
if (exists(audioRoot)) {
  for (const dirent of fs.readdirSync(audioRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const book = detectBookNumber(dirent.name);
    if (!book) continue;
    const files = walkFiles(path.join(audioRoot, dirent.name), (filePath) => /\.mp3$/i.test(filePath));
    audioByBook.set(book, groupedAudioForBook(book, files));
  }
}

for (let book = 1; book <= 13; book += 1) {
  const groups = audioByBook.get(book) || [];
  const tests = groups.length ? groups.map((group) => group.test) : [1, 2, 3, 4];
  addBook(book, tests, groups);
}

const cam14AudioFiles = walkFiles(path.join(cambridgeFourteenRoot, "剑14音频"), (filePath) => /\.mp3$/i.test(filePath));
const cam14Groups = new Map();
for (const filePath of cam14AudioFiles) {
  const test = detectTestNumber(filePath);
  if (!test) continue;
  if (!cam14Groups.has(test)) cam14Groups.set(test, []);
  cam14Groups.get(test).push(filePath);
}
addBook(
  14,
  [1, 2, 3, 4],
  [...cam14Groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([test, filePaths]) => ({
      book: 14,
      test,
      filePaths: filePaths.sort((a, b) => (detectSectionNumber(a) || 999) - (detectSectionNumber(b) || 999) || a.localeCompare(b, "zh-Hans-CN")),
    })),
);

const bank = {
  generatedAt: new Date().toISOString(),
  localFiles,
  listeningTests,
  readingTests,
  writingTasks,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(bank, null, 2)}\n`, "utf8");

console.log(`Wrote ${outputPath}`);
console.log(`Files: ${localFiles.length}`);
console.log(`Listening: ${listeningTests.length}`);
console.log(`Reading: ${readingTests.length}`);
console.log(`Writing: ${writingTasks.length}`);
