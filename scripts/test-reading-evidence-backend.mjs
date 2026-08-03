import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");
const cambridge15 = JSON.parse(await readFile(new URL("../data/cambridge15-bank.json", import.meta.url), "utf8"));

function functionSource(source, name) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = pattern.exec(source);
  assert.ok(match, `Expected function ${name}() to exist`);
  const start = match.index;
  const remaining = source.slice(start + match[0].length);
  const next = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(remaining);
  return source.slice(start, next ? start + match[0].length + next.index : source.length);
}

function pageText(paper, page) {
  const match = String(paper || "").match(new RegExp(`--- Page ${page} ---\\n([\\s\\S]*?)(?=\\n--- Page \\d+ ---|$)`));
  assert.ok(match?.[1], `Cambridge 15 Test 4 Page ${page} OCR must exist`);
  return `--- Page ${page} ---\n${match[1]}`;
}

const helperNames = [
  "compactHelpText",
  "readingOcrLineIsBoilerplate",
  "readingOcrLineLooksLikeBody",
  "readingOcrLineEndsSentence",
  "readingOcrMedianLineLength",
  "splitReadingParagraphSentences",
  "readingPassageParagraphs",
  "readingParagraphSentenceEntries",
  "indexedReadingPassageText",
  "normalizedEvidenceText",
  "readingQuestionFromMessage",
  "parsedIndexedReadingSentences",
  "readingEvidenceSentenceScore",
  "readingAnswerEvidenceLocation",
  "readingEvidenceLayoutCachePath",
  "readingEvidenceLayoutLines",
  "readingEvidenceRect",
  "readingEvidencePayload",
  "correctReadingAnswerLocation",
];
const helpers = helperNames.map((name) => functionSource(serverSource, name)).join("\n");
const api = runInNewContext(`${helpers}\n({
  indexedReadingPassageText,
  readingAnswerEvidenceLocation,
  readingEvidencePayload,
  correctReadingAnswerLocation,
})`, {
  fs,
  path,
  __dirname: root,
  IMPORTED_BANKS: [cambridge15],
});

const test = cambridge15.readingTests.find((item) => item.id === "cam15-r-test4");
assert.ok(test?.readingPaper, "Cambridge 15 Reading Test 4 must remain available");
const paperText = [pageText(test.readingPaper, 90), pageText(test.readingPaper, 91)].join("\n\n");
const quote = "My views may seem to ignore the belief that businesses should act in accordance with moral principles even if this leads to a reduction in their profits.";
const answer = `位置：第4段，第7句\n原文：${quote}`;
const helpContext = {
  focusedQuestion: { module: "reading", number: 27, id: "q27" },
  reading: { id: test.id, paperText, questions: [{ number: 27 }, { number: 28 }] },
};

const indexed = api.indexedReadingPassageText(paperText);
assert.match(indexed, /^\[P5 S3 Page 91\] My views may seem to ignore the belief/m,
  "The real Q27 evidence must follow the PDF's fifth visual paragraph and third sentence");

const location = api.readingAnswerEvidenceLocation(answer, helpContext);
assert.equal(location?.page, 91);
assert.equal(location?.paragraph, 5);
assert.equal(location?.sentence, 3);
assert.equal(location?.text, quote);

const correctedAnswer = api.correctReadingAnswerLocation(answer, helpContext);
assert.match(correctedAnswer, /^位置：第5段，第3句/u,
  "A model-written wrong location must be corrected before the answer reaches the student");

const payload = api.readingEvidencePayload(answer, helpContext);
assert.deepEqual(
  {
    question: payload?.question,
    page: payload?.page,
    paragraph: payload?.paragraph,
    sentence: payload?.sentence,
    quote: payload?.quote,
    confidence: payload?.confidence,
  },
  {
    question: 27,
    page: 91,
    paragraph: 5,
    sentence: 3,
    quote,
    confidence: "high",
  },
);
assert.ok(payload?.rect, "Q27 must resolve to a sentence rectangle from the Cambridge 15 OCR layout cache");
assert.ok(payload.rect.left >= 0 && payload.rect.left < 100);
assert.ok(payload.rect.top >= 0 && payload.rect.top < 100);
assert.ok(payload.rect.width > 0 && payload.rect.left + payload.rect.width <= 100);
assert.ok(payload.rect.height > 0 && payload.rect.top + payload.rect.height <= 100);
assert.ok(payload.rect.top > 35 && payload.rect.top < 41,
  `Q27 evidence should highlight the middle of Page 91, received top=${payload.rect.top}`);
assert.equal(
  api.readingEvidencePayload(answer, helpContext, "Show evidence for Q28")?.question,
  28,
  "A typed question reference must override a stale focused-question number in the evidence payload",
);

console.log(`PASS Reading evidence backend: Cambridge 15 Test 4 Q27 -> Page 91, P5 S3, high-confidence OCR rect ${JSON.stringify(payload.rect)}`);
