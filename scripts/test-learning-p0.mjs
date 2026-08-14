import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const port = 4399;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`P0 test server did not start. ${stderr}`);
}

try {
  const [tasks, appSource, cssSource, serverSource] = await Promise.all([
    waitForServer(),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../server.js", import.meta.url), "utf8"),
  ]);
  const reading = tasks.readingTests.find((item) => item.id === "cam16-r-test1");
  assert.ok(reading, "Cambridge 16 Reading Test 1 must be available");
  assert.deepEqual(reading.readingPassagePageImages.map((item) => item.page), [16, 17, 20, 21, 22, 24, 25]);
  assert.deepEqual(reading.readingQuestionPageImages.map((item) => item.page), [18, 19, 20, 23, 26, 27, 28]);
  assert.equal(reading.questions.length, 40);
  assert.equal(reading.questions.find((item) => item.id === "q14")?.type, "matching_headings");
  assert.equal(reading.questions.find((item) => item.id === "q31")?.type, "summary_completion");
  const readingContextResponse = await fetch(`${baseUrl}/api/reading/context?id=cam16-r-test1`);
  assert.equal(readingContextResponse.status, 200);
  const readingContext = await readingContextResponse.json();
  assert.equal(readingContext.evidenceAvailable, true);
  assert.match(readingContext.paperText, /READING PASSAGE\s+1/i);
  const focusedReadingContextResponse = await fetch(`${baseUrl}/api/reading/context?id=cam21-r-test4&question=1`);
  assert.equal(focusedReadingContextResponse.status, 200);
  const focusedReadingContext = await focusedReadingContextResponse.json();
  assert.equal(
    focusedReadingContext.questionText,
    "Water hyacinth was introduced as a decorative plant in east Africa",
    "Focused Reading hydration must return the real Cambridge question instead of the imported Question 1 placeholder",
  );
  assert.equal(focusedReadingContext.questionPage, 84);
  assert.match(focusedReadingContext.paperText, /Water hyacinth was introduced as a decorative plant in east Africa/i);
  const summaryReadingContext = await (await fetch(`${baseUrl}/api/reading/context?id=cam21-r-test4&question=14`)).json();
  assert.match(summaryReadingContext.questionText, /The city of Delhi has a 14/i);
  assert.match(summaryReadingContext.questionText, /(?:I|1) dense population/i,
    "Focused summary questions must retain their shared A-J options");
  const choiceReadingContext = await (await fetch(`${baseUrl}/api/reading/context?id=cam21-r-test4&question=24`)).json();
  assert.match(choiceReadingContext.questionText, /What point does the writer make about primary schools in India/i);
  assert.match(choiceReadingContext.questionText, /C Poor children may be disadvantaged further/i,
    "Focused multiple-choice questions must retain their answer options");
  const unsupportedEvidenceResponse = await fetch(`${baseUrl}/api/help/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "Explain the current Reading question and show the passage evidence.",
      contextText: "",
      history: [],
      helpContext: {
        activeModule: "reading",
        coach: { focusedQuestion: { module: "reading", number: 1, id: "q1" } },
        reading: {
          id: "cam15-r-test1",
          title: "Cambridge IELTS 15 Academic - Test 1 Reading",
          paperText: "The Dutch controlled the Banda Islands and the nutmeg trade.",
          questions: [{
            number: 1,
            question: "leaves are dark green and ___ in shape",
            type: "note_completion",
            expectedAnswer: "oval",
            studentAnswer: "",
          }],
        },
      },
    }),
  });
  assert.equal(unsupportedEvidenceResponse.status, 200);
  const unsupportedEvidence = await unsupportedEvidenceResponse.json();
  assert.equal(
    unsupportedEvidence.mode,
    "evidence-required",
    "Coach must not ask the model to infer a Reading answer when the current question has no source evidence",
  );
  assert.doesNotMatch(
    unsupportedEvidence.answer,
    /\boval\b/i,
    "Missing-evidence guidance must not leak or justify the answer-key value",
  );
  const flattenedReading = tasks.readingTests.find((item) => item.id === "cam17-r-test1");
  assert.deepEqual(flattenedReading.readingPassagePageImages.map((item) => item.page), [16, 17, 20, 21, 24, 25]);
  assert.deepEqual(flattenedReading.readingQuestionPageImages.map((item) => item.page), [18, 19, 22, 23, 26, 27]);
  const listening = tasks.listeningTests.find((item) => item.id === "cam15-l-test1") || tasks.listeningTests[0];
  const listeningContextResponse = await fetch(`${baseUrl}/api/listening/scripts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: listening.id, pageImageUrls: [], allowOcr: false }),
  });
  assert.equal(listeningContextResponse.status, 200);
  const listeningContext = await listeningContextResponse.json();
  assert.ok(listeningContext.questionPaper, "Listening Coach hydration must include the matching question paper");

  assert.match(appSource, /\["passage",\s*"questions"\]/, "Reading mobile workspace must use two tabs");
  assert.doesNotMatch(appSource, /reading-question-view-toggle/, "Reading Questions must not add a second paper/answer toggle");
  assert.doesNotMatch(appSource, /data-reading-question-view/, "Reading Questions must keep the real question and answer in one view");
  assert.match(appSource, /renderPaperAnswerPanel\(prefix,\s*activeQuestions,\s*questionAssignments/, "Reading Questions must render the active Passage's answer inputs beside the question paper");
  assert.match(appSource, /data-listening-start/, "Listening must expose one coordinated start action");
  assert.match(appSource, /currentSinglePracticeMode\(["']listening["']\)\s*!==\s*["']exam["'][^}]*stopSingleTimer\(\)/s,
    "Training and Review timers must pause with native audio controls");
  assert.doesNotMatch(appSource, /Play audio to generate ASR captions/,
    "Listening captions must never promise browser-side live ASR");
  assert.match(appSource, /data-reading-scroll-pane=["']questionPaper["']/,
    "Reading must persist the real question-paper scroll container");
  assert.match(appSource, /scrollKey:\s*["']answers["']/,
    "Reading must persist the real answer-list scroll container");
  assert.match(appSource, /rect\.bottom\s*>\s*visibleBottom[\s\S]*window\.scrollBy/,
    "Reading question navigation must reveal the focused answer in the viewport");
  assert.doesNotMatch(appSource, /renderBankPracticeTopic\(topic,\s*\{\s*autoStart:\s*true\s*\}\)/, "Speaking topic Practice must not auto-start the microphone");
  assert.match(appSource, /practiceSessionStoreKey/, "Practice session persistence must be implemented");
  assert.match(appSource, /hydrateCoachEvidenceContext/, "Coach must load Reading evidence on demand");
  assert.match(appSource, /scheduleAnnotationCanvasSave/, "PDF annotations must persist even when a browser misses pointerup");
  assert.match(appSource, /aria-pressed["'],\s*drawingActive/, "Draw mode must expose a persistent selected state");
  assert.match(appSource, /位置：第X段，第Y句/, "Reading hints must request an exact paragraph and sentence location");
  assert.match(serverSource, /function indexedReadingPassageText\(/, "Reading Coach context must index passage paragraphs and sentences");
  assert.match(serverSource, /\[P# S#\]/, "Reading Hint instructions must use the indexed passage location labels");
  assert.match(serverSource, /function ensureReadingHintLocation\(/, "Reading Hint responses must always expose a paragraph and sentence location status");
  assert.match(serverSource, /function callCoachAI\(/, "AI Coach must use its dedicated provider route");
  assert.match(serverSource, /COACH_AI_API_KEY[\s\S]*DASHSCOPE_API_KEY/, "AI Coach must default to the configured Qwen key");
  assert.doesNotMatch(serverSource.match(/function localHelpExplanation\([\s\S]*?\n\}/)?.[0] || "", /Local note:/,
    "AI Coach fallback text must not expose raw provider errors");
  assert.match(appSource, /function coachRequestFailureMessage\(/, "Coach network failures must use a student-safe message");
  assert.doesNotMatch(appSource, /Coach failed:\s*\$\{error\.message\}|AI Coach failed:\s*\$\{error\.message\}/,
    "Coach UI must not render raw request errors");
  assert.match(appSource, /const firstControl = \[\.\.\.toolbarHost\.children\]\.find\(\(child\) => child !== toolbar\) \|\| null;/,
    "PDF annotation tools must use the fixed practice header control row instead of covering answers");
  assert.match(appSource, /toolbarHost\.insertBefore\(toolbar,\s*firstControl\)/,
    "PDF annotation tools must sit at the top-left of the fixed practice header");
  assert.match(appSource, /resizeAnnotationCanvas\(canvas, img\);\s*updateAnnotationToolbarAvailability\(\);/s,
    "PDF annotation controls must refresh after each image has a measurable size");
  assert.match(cssSource, /coach-dock-open/, "Desktop Coach must reserve content width when docked");
  assert.match(cssSource, /min-width:\s*900px\)\s*and\s*\(orientation:\s*landscape\)/,
    "iPad landscape must use a non-overlapping Coach dock");
  assert.match(cssSource, /\.help-chat-panel\s*\{[\s\S]*position:\s*fixed/s,
    "iPad Coach must be fixed to the viewport instead of scrolling the practice page");
  assert.match(cssSource, /@media \(min-width:\s*601px\) and \(max-width:\s*1100px\)[\s\S]*\.help-chat-panel\s*\{[\s\S]*width:\s*min\(390px,\s*46vw\)/s,
    "iPad Coach must use a bounded drawer width");
  assert.match(cssSource, /max-height:\s*calc\(100dvh\s*-\s*16px\)/,
    "iPad Coach must stay inside the visible viewport");
  assert.match(cssSource, /body\.coach-dock-open\s*\{[\s\S]*overflow:\s*hidden/s,
    "Opening Coach on iPad must scroll-lock the background practice page");
  assert.match(cssSource, /\.help-chat-log\s*\{[\s\S]*overflow:\s*auto/s,
    "Coach conversation must scroll independently on iPad");
  assert.match(cssSource, /\.pdf-page-body\s*\{[^}]*position:\s*relative/s,
    "The annotation canvas must be positioned against its PDF image container");
  assert.match(cssSource, /reading-question-pane/, "Reading Questions pane must have a dedicated layout");
  console.log("Learning P0 regression checks passed.");
} finally {
  child.kill();
}
