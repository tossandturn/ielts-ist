import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 8100 + (process.pid % 100);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-exam-session-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: dbPath, SESSION_COOKIE_SECURE: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early (${child.exitCode}).\n${output}`);
    try {
      if ((await fetch(`${baseUrl}/api/tasks`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Exam session server did not start.\n${output}`);
}

await waitForServer();
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${baseUrl}/?test=exam-session-persistence#exam`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && state.data?.listeningTests?.length > 0);
  const deterministic = await page.evaluate(() => {
    const first = buildRandomBundle("persistence-regression-seed");
    const second = buildRandomBundle("persistence-regression-seed");
    const sources = (bundle) => ({
      listening: bundle?.examMetadata?.listeningSourceId,
      reading: bundle?.examMetadata?.readingSourceId,
      writing: bundle?.examMetadata?.writingSourceIds,
      speaking: bundle?.examMetadata?.speakingSourceId,
    });
    return {
      first: { id: first?.examMetadata?.examId, seed: first?.examMetadata?.seed, sources: sources(first) },
      second: { id: second?.examMetadata?.examId, seed: second?.examMetadata?.seed, sources: sources(second) },
    };
  });
  assert.deepEqual(deterministic.second, deterministic.first, "The same Random Exam seed must rebuild the same exam identity and every module source");
  await page.evaluate(() => {
    const seed = "persistence-regression-seed";
    const seedField = document.querySelector("#examSeed");
    if (seedField) seedField.value = seed;
    buildExam();
  });
  await page.waitForFunction(() => Boolean(state.exam?.examMetadata?.examId));
  await page.waitForFunction(() => {
    const binding = objectiveExamBinding(state.exam, "random-exam");
    return readObjectiveAttemptStore().exams[binding.key]?.status === "open";
  }, null, { timeout: 20_000 });

  const before = await page.evaluate(() => {
    state.examSeconds = state.examTotal - 37;
    startExamTimer();
    const input = document.querySelector('.answer-input[data-prefix="exam-listening"][data-qid]');
    if (!input) throw new Error("A Listening answer field is required");
    input.value = "session-preserved-answer";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    persistExamSession("exam");
    const binding = objectiveExamBinding(state.exam, "random-exam");
    const objective = readObjectiveAttemptStore().exams[binding.key];
    const stored = readExamSessionStore().exam;
    return {
      examId: state.exam.examMetadata.examId,
      seed: state.exam.examMetadata.seed,
      bankVersion: state.exam.examMetadata.bankVersion,
      generatorVersion: state.exam.examMetadata.generatorVersion,
      sources: {
        listening: state.exam.examMetadata.listeningSourceId,
        reading: state.exam.examMetadata.readingSourceId,
        writing: state.exam.examMetadata.writingSourceIds,
        speaking: state.exam.examMetadata.speakingSourceId,
      },
      seconds: state.examSeconds,
      answer: input.value,
      objectiveExamId: objective?.examId || "",
      saved: Boolean(stored?.bundle?.examMetadata?.examId),
    };
  });
  assert.equal(before.saved, true, "A generated exam must be persisted before it has a submitted answer");
  assert.equal(before.objectiveExamId.length > 0, true, "The persisted session must retain its server parent exam identity");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(state.exam?.examMetadata?.examId), null, { timeout: 20_000 });
  const after = await page.evaluate(() => {
    const input = document.querySelector('.answer-input[data-prefix="exam-listening"][data-qid]');
    const binding = objectiveExamBinding(state.exam, "random-exam");
    const objective = readObjectiveAttemptStore().exams[binding.key];
    return {
      examId: state.exam.examMetadata.examId,
      seed: state.exam.examMetadata.seed,
      bankVersion: state.exam.examMetadata.bankVersion,
      generatorVersion: state.exam.examMetadata.generatorVersion,
      sources: {
        listening: state.exam.examMetadata.listeningSourceId,
        reading: state.exam.examMetadata.readingSourceId,
        writing: state.exam.examMetadata.writingSourceIds,
        speaking: state.exam.examMetadata.speakingSourceId,
      },
      seconds: state.examSeconds,
      submitted: state.examSubmitted,
      timerRunning: Boolean(state.examTimerId),
      answer: input?.value || "",
      objectiveExamId: objective?.examId || "",
    };
  });
  assert.deepEqual(after.sources, before.sources, "Reload must preserve every module source ID");
  assert.equal(after.examId, before.examId, "Reload must preserve the generated exam identity");
  assert.equal(after.seed, before.seed, "Reload must preserve the random seed");
  assert.equal(after.bankVersion, before.bankVersion);
  assert.equal(after.generatorVersion, before.generatorVersion);
  assert.equal(after.objectiveExamId, before.objectiveExamId, "Reload must reuse the same server parent exam");
  assert.equal(after.submitted, false, "An open exam must remain open after reload");
  assert.equal(after.answer, before.answer, "Reload must restore answers even when the draft was initially empty");
  assert.ok(after.seconds <= before.seconds && after.seconds >= before.seconds - 8, `Timer drift is unexpected (${before.seconds} -> ${after.seconds})`);
  assert.equal(after.timerRunning, true, "A running exam timer must resume after reload");

  await page.goto(`${baseUrl}/?test=exam-session-persistence#sequence`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && state.data?.listeningTests?.length > 0);
  const unselected = await page.evaluate(() => ({
    book: document.querySelector("#sequenceBookFilter")?.value,
    test: document.querySelector("#sequenceTestFilter")?.value,
    status: document.querySelector("#sequenceSelectionStatus")?.textContent || "",
    paper: document.querySelector("#sequencePaper")?.textContent || "",
  }));
  assert.equal(unselected.book, "all", "Same Test must start with no Cambridge book selected");
  assert.equal(unselected.test, "all", "Same Test must start with no Cambridge test selected");
  assert.match(unselected.status, /Choose one Cambridge book and one test/i, "Same Test must state that no paper was chosen");
  assert.match(unselected.paper, /No paper has been selected/i, "Same Test must not silently choose a Cambridge set");

  const chosenSequence = await page.evaluate(() => {
    const set = sequenceSets()[0];
    if (!set) throw new Error("Expected a complete same-test fixture");
    const book = String(itemBook(set.listening));
    const test = String(itemTest(set.listening));
    const bookSelect = document.querySelector("#sequenceBookFilter");
    const testSelect = document.querySelector("#sequenceTestFilter");
    bookSelect.value = book;
    renderSequenceFilters();
    testSelect.value = test;
    buildSequence();
    return {
      book,
      test,
      metadata: { ...state.sequence.examMetadata },
      status: document.querySelector("#sequenceSelectionStatus")?.textContent || "",
      manifest: document.querySelector("#sequencePaper .exam-source-manifest")?.textContent || "",
    };
  });
  assert.equal(chosenSequence.metadata.context, "same-test");
  assert.equal(chosenSequence.metadata.sourceSetId.length > 0, true, "Same Test must persist its exact Cambridge source-set ID");
  assert.match(chosenSequence.status, new RegExp(`Ready: Cambridge ${chosenSequence.book} Test ${chosenSequence.test}`), "Same Test must preview the selected exact set");
  assert.match(chosenSequence.manifest, /Paper source[\s\S]*Listening[\s\S]*Reading[\s\S]*Writing Task 1[\s\S]*Writing Task 2[\s\S]*Speaking/, "Same Test must expose the full source manifest");

  console.log(`PASS random seed rebuild, random exam restore ${after.examId}, and explicit same-test source manifest.`);
} finally {
  await browser.close();
  if (child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
  await Promise.all([dbPath, `${dbPath}-shm`, `${dbPath}-wal`].map((file) => rm(file, { force: true }).catch(() => {})));
}
