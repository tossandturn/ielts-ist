import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const port = 4600 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverStderr = "";
child.stderr.on("data", (chunk) => { serverStderr += chunk; });

async function waitForTasks() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/tasks`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Learning-flow test server did not start. ${serverStderr}`);
}

function functionSource(source, name) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = pattern.exec(source);
  assert.ok(match, `Expected function ${name}() to exist`);
  const start = match.index;
  const remaining = source.slice(start + match[0].length);
  const next = /\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/.exec(remaining);
  return source.slice(start, next ? start + match[0].length + next.index : source.length);
}

function writingSetKey(item) {
  return String(item?.id || "").replace(/-task[12]$/i, "");
}

function normalizeMessage(error) {
  return String(error?.message || error).replace(/\s+/g, " ").trim();
}

const checks = [];
function check(group, name, run) {
  checks.push({ group, name, run });
}

check("API", "Listening papers expose four sections and 40 questions", ({ tasks }) => {
  assert.ok(tasks.listeningTests.length >= 4, "Expected imported Listening papers");
  for (const paper of tasks.listeningTests) {
    assert.equal(paper.questions?.length, 40, `${paper.id} must expose Q1-Q40`);
    assert.equal(paper.audioUrls?.filter(Boolean).length, 4, `${paper.id} must expose four section audio files`);
  }
});

check("API", "Writing bank exposes paired Task 1 and Task 2 sets", ({ tasks }) => {
  assert.ok(tasks.writingTasks.length >= 2, "Expected imported Writing tasks");
  const sets = new Map();
  for (const task of tasks.writingTasks) {
    const key = writingSetKey(task);
    if (!sets.has(key)) sets.set(key, new Set());
    sets.get(key).add(String(task.type || "").toLowerCase());
  }
  for (const [key, types] of sets) {
    assert.ok(types.has("task 1"), `${key} is missing Task 1`);
    assert.ok(types.has("task 2"), `${key} is missing Task 2`);
  }
});

check("Listening", "Exam, Training and Review modes are explicit", ({ app }) => {
  const modes = functionSource(app, "singleModeOptions");
  assert.match(modes, /id:\s*["']exam["']/);
  assert.match(modes, /id:\s*["']training["']/);
  assert.match(modes, /id:\s*["']review["']/);
  assert.match(modes, /Real 40-question test/);
  assert.match(modes, /Section drill with captions/);
  assert.match(modes, /Wrong answers first/);
});

check("Listening", "Mode rules preserve the full exam and scope training/review", ({ app }) => {
  const modeRules = functionSource(app, "singlePracticeItemForMode");
  assert.match(modeRules, /mode\s*===\s*["']review["']/);
  assert.match(modeRules, /wrongQuestionIds/);
  assert.match(modeRules, /moduleName\s*===\s*["']listening["']\s*&&\s*mode\s*===\s*["']training["']/);
  assert.match(modeRules, /singleSectionQuestionRange/);
  assert.match(modeRules, /moduleName\s*===\s*["']listening["']\s*&&\s*mode\s*!==\s*["']exam["']/);
});

check("Listening", "Section progress maps to Q1-Q40 in four ten-question groups", ({ app }) => {
  const range = functionSource(app, "singleSectionQuestionRange");
  const groups = functionSource(app, "listeningAnswerGroups");
  assert.match(range, /\(safeSection\s*-\s*1\)\s*\*\s*10\s*\+\s*1/);
  assert.match(range, /safeSection\s*\*\s*10/);
  assert.match(groups, /Section\s+\$\{section\}\s+-\s+Q\$\{start\}-\$\{end\}/);
});

check("Listening", "Playback exposes loading, ready, playing, paused, error and ended states", ({ app }) => {
  const render = functionSource(app, "renderListening");
  const bind = functionSource(app, "bindListeningCaptionPlayers");
  assert.match(render, /listening-(?:playback-)?status/,
    "Listening needs a visible playback status element");
  assert.match(render, /aria-live=["']polite["']/,
    "Playback status must be announced accessibly");
  for (const eventName of ["loadstart", "canplay", "play", "pause", "error", "ended"]) {
    assert.match(bind, new RegExp(`addEventListener\\(["']${eventName}["']`),
      `Listening must handle the ${eventName} state`);
  }
  for (const label of ["Loading", "Ready to play", "Playing", "Paused", "Playback failed", "Finished"]) {
    assert.match(app, new RegExp(label, "i"), `Missing Listening state label: ${label}`);
  }
});

check("Listening", "Audio ended invokes the answer-review transition hook", ({ app }) => {
  const bind = functionSource(app, "bindListeningCaptionPlayers");
  const ended = bind.slice(bind.indexOf('addEventListener("ended"'));
  assert.match(
    ended,
    /(?:handle|enter|open|show|transition|advance)\w*(?:Listening)?(?:Review|Answers?)|singlePracticeModes\.listening\s*=\s*["']review["']/i,
    "The ended handler must call a review-transition hook instead of only stopping captions",
  );
});

check("Listening", "Exam audio advances through all four sections", ({ app }) => {
  const advance = functionSource(app, "advanceListeningExamSection");
  const bind = functionSource(app, "bindListeningCaptionPlayers");
  assert.match(advance, /listeningModeForPrefix\(prefix\)\s*!==\s*["']exam["']/);
  assert.match(advance, /players\[currentIndex\s*\+\s*1\]/);
  assert.match(advance, /next\.play\(\)/);
  assert.match(bind, /advanceListeningExamSection\(audio\)/);
});

check("Listening", "Inactive preload events cannot overwrite the current section", ({ app }) => {
  const bind = functionSource(app, "bindListeningCaptionPlayers");
  assert.match(bind, /record\.section/);
  assert.match(bind, /audio\.dataset\.section/);
  assert.match(bind, /setListeningPlaybackStatus\(audio,\s*["']loading["']/);
});

check("Writing", "Writing offers topic, custom and resumable draft entry paths", ({ app, html }) => {
  assert.match(html, /id=["']writingEntry["']/);
  assert.match(html, /id=["']writingWorkspace["'][^>]*hidden/);
  assert.match(html, /id=["']writingTopicList["']/);
  assert.match(html, /data-writing-topic-category=["']all["']/);
  assert.match(html, /id=["']openCustomWriting["']/);
  assert.match(html, /id=["']continueWritingDraft["']/);
  assert.doesNotMatch(html, /data-writing-library-task=/, "Writing scopes must not be gated by a Task 1 / Task 2 library switch");
  assert.match(html, /data-writing-scope=["']full["']/);
  assert.match(html, /data-writing-scope=["']topics["']/);
  assert.match(html, /data-writing-scope=["']review["']/);
  assert.match(html, /id=["']startRecommendedWriting["']/);
  assert.match(html, /id=["']startSelectedWriting["']/);
  assert.match(html, /id=["']uploadPrompt["']/);
  assert.match(html, /id=["']uploadEssay["']/);
  const transition = functionSource(app, "setWritingWorkspaceMode");
  assert.match(transition, /writingEntry/);
  assert.match(transition, /writingWorkspace/);
  assert.match(transition, /writingCustomWorkspace/);
  assert.match(transition, /writingSystemWorkspace/);
  const restoreLatest = functionSource(app, "continueLatestWritingDraft");
  const findLatest = functionSource(app, "latestWritingDraft");
  assert.match(restoreLatest, /restoreDraft/);
  assert.match(findLatest, /writing-upload/);
});

check("Writing", "Focused workspace excludes hidden entry fields from drafts", ({ app }) => {
  const snapshot = functionSource(app, "currentDraftSnapshot");
  const startSystem = functionSource(app, "startWritingSystemPractice");
  const restore = functionSource(app, "restoreWritingUploadSessionAfterData");
  assert.match(snapshot, /closest\(["']\[hidden\]["']\)/,
    "Draft snapshots must not mix hidden Custom and Cambridge fields");
  assert.match(startSystem, /setWritingWorkspaceMode\(["']cambridge["']/,
    "Starting an independent Writing task must enter the focused workspace");
  assert.match(restore, /startWritingSystemPractice/,
    "Refreshing an independent Writing draft must rebuild the task before field values");
});

check("Writing", "Task 1 and Task 2 display 150/250-word targets", ({ app }) => {
  const renderOne = functionSource(app, "renderWriting");
  const renderPair = functionSource(app, "renderWritingExamTwoColumn");
  const writingRenderers = `${renderOne}\n${renderPair}`;
  assert.match(writingRenderers, /(?:data-word-target|target\s*words?|word\s*target)/i,
    "Writing editors need a machine-readable or visible word target");
  assert.match(writingRenderers, /150/, "Task 1 must show a 150-word target");
  assert.match(writingRenderers, /250/, "Task 2 must show a 250-word target");
});

check("Writing", "Autosave has a visible Saving/Saved status", ({ app }) => {
  const autosave = functionSource(app, "scheduleDraftAutosave");
  assert.match(app, /writing-(?:draft-)?(?:autosave|save)-status|data-writing-(?:autosave|save)-status/i,
    "Writing needs a visible autosave status node");
  assert.match(`${autosave}\n${app}`, /Saving/i, "Autosave must expose a Saving state");
  assert.match(`${autosave}\n${app}`, /Saved/i, "Autosave must expose a Saved state");
});

check("Writing", "Active independent Writing task and autosaved text restore after refresh", ({ app }) => {
  assert.match(app, /writingUploadSessionStoreKey/,
    "Writing needs a small local pointer to the active task");
  const snapshot = functionSource(app, "currentDraftSnapshot");
  assert.match(snapshot, /writingTask1Id/);
  assert.match(snapshot, /writingTask2Id/,
    "Writing drafts must identify the independent Task 1 or Task 2 they belong to");
  const restore = functionSource(app, "restoreWritingUploadSessionAfterData");
  assert.match(restore, /startWritingSystemPractice/);
  assert.match(restore, /applyDraftValues/);
  const init = functionSource(app, "init");
  assert.match(init, /restoreWritingUploadSessionAfterData/,
    "Startup must rebuild an unfinished Writing set before the student continues");
});

check("Writing", "Feedback exposes rewrite and rescore actions", ({ app }) => {
  const report = functionSource(app, "renderWritingReportHtml");
  const actions = functionSource(app, "bindWritingResultActions");
  const rescore = functionSource(app, "scoreWritingRewrite");
  assert.match(report, /data-writing-result-action=["']rewrite["']/);
  assert.match(report, /data-writing-result-action=["']rescore["']/);
  assert.match(actions, /action\s*===\s*["']rewrite["']/);
  assert.match(actions, /action\s*===\s*["']rescore["']/);
  assert.match(rescore, /\/api\/writing\/rewrite\/score/);
  assert.match(rescore, /renderWritingRewriteComparison/);
  assert.match(rescore, /updatesIeltsBand:\s*false/,
    "A paragraph rewrite must not overwrite the canonical full Writing Band");
  assert.match(rescore, /parentAttemptId/);
});

check("Writing", "Task workspaces use one prompt-editor pair at a time", ({ app }) => {
  const renderPair = functionSource(app, "renderWritingExamTwoColumn");
  const bindTabs = functionSource(app, "bindWritingTaskTabs");
  assert.match(renderPair, /data-writing-task-tab/,
    "Writing needs explicit Task 1 and Task 2 tabs");
  assert.match(renderPair, /data-writing-task-panel/,
    "Each task needs one paired prompt and editor workspace");
  assert.match(renderPair, /writing-task-workspace/,
    "Prompt and editor must share one focused task workspace");
  assert.match(bindTabs, /aria-selected/,
    "Task switching must expose its selected state accessibly");
  assert.match(bindTabs, /panel\.hidden/,
    "Inactive Writing tasks must stay mounted for draft preservation but remain hidden");
});

check("Writing", "P2 feedback actions are executable learning-loop steps", ({ app }) => {
  const report = functionSource(app, "renderWritingReportHtml");
  const actions = functionSource(app, "bindWritingResultActions");
  const weakArea = functionSource(app, "saveWritingWeakArea");
  const targeted = functionSource(app, "startWritingTargetedPractice");
  const coach = functionSource(app, "openWritingCoachFromResult");
  assert.match(report, /writing-impact-panel/,
    "Writing report must surface one highest-impact issue and exact evidence");
  assert.match(report, /data-writing-result-action=["']save-weak["']/);
  assert.match(report, /data-writing-result-action=["']next-task["']/);
  assert.match(actions, /action\s*===\s*["']save-weak["']/);
  assert.match(actions, /action\s*===\s*["']next-task["']/);
  assert.match(weakArea, /syncWeakArea/,
    "Saving a Writing weakness must use the existing local/server weak-area contract");
  assert.match(weakArea, /sourceAttemptId/,
    "Saved Writing weakness must remain traceable to its grading attempt");
  assert.match(targeted, /setWritingWorkspaceMode\(["']custom["']\)/,
    "The next targeted task must open a real answerable Writing workspace");
  assert.match(coach, /sendHelpChatMessage\(/,
    "Writing Coach actions must execute immediately instead of only filling the input");
});

check("Writing", "New grading uses structured analysis instead of reparsing report prose", ({ app, server }) => {
  const scores = functionSource(app, "extractWritingScores");
  const report = functionSource(app, "renderWritingReportHtml");
  const submitCustom = functionSource(app, "submitUploadedWriting");
  const submitSystem = functionSource(app, "submitSystemWriting");
  const buildResult = functionSource(server, "buildWritingFeedbackResult");
  assert.equal((server.match(/function\s+writingSystemPrompt\s*\(/g) || []).length, 1,
    "Writing must have one canonical system prompt so an older declaration cannot override structured JSON grading");
  assert.match(scores, /analysis\?\.criteria/,
    "Score rendering must prefer the API's structured criterion array");
  assert.match(scores, /feedback:/,
    "Structured criterion feedback must survive score extraction");
  assert.match(report, /json\?\.analysis|json\.analysis/,
    "The report must consume structured impact and evidence fields");
  assert.match(report, /item\.feedback\s*\|\|\s*feedbackSnippetForLabel/,
    "Criterion cards must prefer structured feedback and only parse legacy reports as a fallback");
  assert.match(submitCustom, /analysis:\s*json\.analysis/);
  assert.match(submitSystem, /tasks\.length\s*!==\s*1/,
    "Writing with AI must submit one independent task at a time");
  assert.match(submitSystem, /runWritingFeedbackJob/);
  assert.match(submitSystem, /contract:\s*json\.contract/,
    "Independent Writing practice must preserve the backend single-task scoring contract");
  assert.match(buildResult, /analysis/);
  assert.match(buildResult, /normalizeWritingAnalysis/,
    "The Writing API must normalize one stable analysis contract");
});

check("Home", "Homepage exposes a resumable local practice session", ({ app }) => {
  const dashboard = functionSource(app, "renderDashboard");
  const restore = functionSource(app, "restorePracticeSessionAfterData");
  assert.match(restore, /readPracticeSession\(\)/);
  assert.match(restore, /state\.singleStarted\s*=\s*true/);
  assert.match(dashboard, /readPracticeSession\(\)|practiceSessionStoreKey/,
    "Dashboard must inspect the saved practice session");
  assert.match(dashboard, /Continue(?:\s+last)?\s+practice|Resume(?:\s+practice)?/i,
    "Dashboard must render an explicit Continue/Resume action");
  assert.match(dashboard, /resume-practice:\$\{resumableSession\.module\}:\$\{encodeURIComponent\(resumableSession\.itemId\)\}/,
    "The resume button must bind the same module and paper shown on its card");
  assert.match(restore, /hasExpectedTarget\s*&&\s*!sessionMatchesTarget/,
    "Resume must reject a stale saved session from another module");
  assert.match(restore, /session\.module\s*===\s*["']speaking["']/,
    "PDF practice must restore pane scroll without restoring a page offset under the sticky header");
});

check("Home", "Dashboard keeps one primary task and four learning layers", ({ app }) => {
  const dashboard = functionSource(app, "renderDashboard");
  const recent = functionSource(app, "renderLatestLearningFeedback");
  assert.doesNotMatch(dashboard, /Global AI Coach|AI Coach Reason|Next best actions|Your study system|Weak points/,
    "Dashboard must not repeat Coach, recommendation, progress or empty weak-area sections");
  assert.match(dashboard, /dashboard-focus-hero/,
    "Dashboard must render one current or recommended primary task");
  assert.match(dashboard, /dashboard-focus-skill-grid/,
    "Dashboard must expose the four skills as a compact scoreboard");
  assert.match(dashboard, /renderDashboardFocusMock/,
    "Dashboard must show a truthful full-mock score or explicit empty state");
  assert.match(dashboard, /renderDashboardFocusHistory/,
    "Dashboard must expose recent practice records near the skill scoreboard");
  assert.match(dashboard, /renderLatestLearningFeedback/,
    "Dashboard must expose one latest useful feedback item");
  assert.match(recent, /dashboard-latest-feedback/,
    "Latest feedback must use the compact single-item presentation");
  assert.equal((dashboard.match(/class=["']primary["']/g) || []).length, 1,
    "Dashboard markup must contain only one primary CTA");
  assert.match(recent, /find\(|return\s+["']{2}/,
    "Recent feedback must select a single real item and hide when none exists");
});

check("Home", "Dashboard keeps compact score and AI Coach history", ({ app }) => {
  const dashboard = functionSource(app, "renderDashboard");
  const history = functionSource(app, "renderDashboardHistory");
  const readThreads = functionSource(app, "readCoachHistoryThreads");
  const persistThread = functionSource(app, "persistCoachThread");
  const rebind = functionSource(app, "rebindCoachContext");
  assert.match(dashboard, /renderDashboardHistory\(/,
    "Dashboard must render the compact learning and Coach history section");
  assert.match(history, /mineLearningAttempts\(\)/,
    "Dashboard score history must reuse real archived attempts");
  assert.match(history, /readCoachHistoryThreads\(\)/,
    "Dashboard Coach history must come from persisted threads");
  assert.match(readThreads, /coachHistoryStoreKey/);
  assert.match(persistThread, /localStorage\.setItem\(coachHistoryStoreKey/,
    "Coach turns must survive refreshes");
  assert.match(rebind, /restoreCoachThread\(next\)/,
    "Switching context must restore the matching Coach thread");
});

check("Home", "Dashboard presents a personalized AI IELTS cockpit", ({ app }) => {
  const dashboard = functionSource(app, "renderDashboard");
  const snapshot = functionSource(app, "dashboardPersonalSnapshot");
  const effectiveProfile = functionSource(app, "dashboardEffectiveProfile");
  const radarProfile = functionSource(app, "dashboardRadarProfile");
  const controls = functionSource(app, "bindHomeControls");
  assert.match(dashboard, /dashboard-focus-header/,
    "Home must identify the learner and their personal plan before showing module shortcuts");
  assert.match(dashboard, /dashboard-focus-skills/,
    "Home must show the learner's real independent skill scores");
  assert.match(dashboard, /dashboard-focus-coach/,
    "AI Coach must be a first-class part of the Home page");
  assert.match(dashboard, /data-home-action=["']coach["']/,
    "Home must open the shared global AI Coach instead of creating another Coach store");
  assert.match(dashboard, /dashboardPersonalSnapshot\(/,
    "Personal labels must come from real profile, attempt and local-session data");
  assert.match(snapshot, /mineLearningAttempts\(\)/);
  assert.match(snapshot, /dashboardEffectiveProfile\(\)/,
    "Dashboard labels must use the effective guest-or-member profile");
  assert.match(effectiveProfile, /state\.learningState\?\.profile/);
  assert.match(effectiveProfile, /readGuestLearningProfile\(\)/);
  assert.match(radarProfile, /correct\s*\/\s*total/,
    "Radar estimates must derive only from objective accuracy when no Band exists");
  assert.match(dashboard, /renderDashboardRadar\(/);
  assert.match(snapshot, /state\.currentUser\?\.username/);
  assert.match(controls, /\/api\/learning\/profile/);
  assert.match(controls, /guestLearningProfileStoreKey/);
  assert.match(controls, /data-dashboard-coach-prompt/);
  assert.match(controls, /sendHelpChatMessage\(/,
    "Submitting the Home Coach composer must execute immediately");
});

check("Reading", "Question navigation is a top horizontal strip", ({ app }) => {
  const split = functionSource(app, "renderReadingSplitPages");
  const current = functionSource(app, "setReadingCurrentQuestion");
  assert.match(split, /reading-question-top-layout/,
    "Reading must place question navigation above the passage and question workspace");
  assert.match(current, /scrollTo\(\{\s*left:/,
    "Top question navigation must keep the current question visible horizontally");
  assert.doesNotMatch(current, /scrollTo\(\{\s*top:/,
    "Question navigation must not fall back to the old vertical rail behavior");
});

check("Reading", "Question navigation synchronizes passage, question paper and answer row", ({ app }) => {
  const split = functionSource(app, "renderReadingSplitPages");
  const answerGroup = functionSource(app, "renderAnswerGroup");
  const focus = functionSource(app, "focusReadingQuestion");
  assert.match(split, /readingPassagePageByQuestion/,
    "Reading split layout must map every question to its passage start page");
  assert.match(answerGroup, /data-reading-passage-page/,
    "Each answer row must carry its matching passage page");
  assert.match(focus, /\.reading-passage-pane/,
    "Question navigation must scroll the passage pane");
  assert.match(focus, /data\.readingPassagePage|dataset\.readingPassagePage/,
    "Question navigation must use the row's passage-page mapping");
  assert.match(focus, /\.reading-question-paper/,
    "Question navigation must continue to synchronize the question paper");
  assert.match(focus, /\.paper-answer-row\[data-question-number=/,
    "Question navigation must continue to synchronize the answer row");
});

check("Reading", "Hint actions hydrate the focused question and execute immediately", ({ app }) => {
  const hint = functionSource(app, "runReadingHint");
  const hydration = functionSource(app, "hydrateCoachEvidenceContext");
  assert.match(hint, /sendHelpChatMessage\(/,
    "Reading Hint must send immediately instead of only filling the Coach input");
  assert.doesNotMatch(hint, /input\.value\s*=/,
    "Reading Hint must not require a second Send click");
  assert.match(hydration, /question=\$\{encodeURIComponent\(/,
    "Evidence hydration must request OCR for the currently focused question");
  assert.match(hydration, /readingContextCache\[cacheKey\]/,
    "Question-specific Reading evidence must not reuse another passage's cache entry");
  assert.match(hydration, /payload\?\.questionText/,
    "Focused Reading hydration must consume the server's extracted question text");
  assert.match(hydration, /question:\s*hydratedQuestionText/,
    "Focused Reading hydration must replace a Question 1 placeholder before Coach submission");
  assert.ok(
    hint.indexOf("focusReadingQuestion(question.number)") < hint.indexOf("openGlobalCoachPanel()"),
    "Reading Hint must synchronize the matching passage before opening Coach",
  );
});

check("Reading", "Coach evidence uses a structured non-blocking highlight overlay", ({ app, css }) => {
  const send = functionSource(app, "sendHelpChatMessage");
  const focus = functionSource(app, "focusReadingEvidence");
  assert.match(send, /json\.readingEvidence/,
    "Coach responses must consume the backend's structured Reading evidence payload");
  assert.match(focus, /data-pdf-page/,
    "Structured evidence must target the exact PDF page instead of parsing the model's prose");
  assert.match(focus, /reading-evidence-highlight/,
    "Structured evidence must render a visible sentence overlay");
  assert.match(focus, /passagePane\.scrollTop\s*\+\s*targetTop\s*-\s*paneRect\.top/,
    "Evidence scrolling must use live scroll-container geometry rather than document-relative offsets");
  assert.doesNotMatch(focus, /pageNode\.offsetTop\s*\+\s*pageBody\.offsetTop/,
    "Evidence scrolling must not jump to the end by adding the page offset twice");
  assert.match(css, /\.reading-evidence-highlight\s*\{[^}]*pointer-events:\s*none/s,
    "Evidence highlighting must not block Apple Pencil or annotation interactions");
  assert.match(css, /\.pdf-annotation-canvas\s*\{[^}]*z-index:\s*3/s,
    "The annotation canvas must remain above the evidence overlay");
});

check("Reading", "Topic and Passage practice render only the selected passage", ({ app }) => {
  const scope = functionSource(app, "scopedPracticeUnit");
  const subset = functionSource(app, "readingPassageImagesForQuestionSubset");
  assert.match(scope, /readingPassageImagesForQuestionSubset/);
  assert.match(scope, /unit\.readingPassagePageImages\s*=\s*passageImages/);
  assert.match(scope, /unit\.readingPageImages\s*=\s*uniqueOrderedImages/);
  assert.match(subset, /selectedPassages\.size\s*>\s*1/,
    "Multi-passage review must retain all relevant source material");
  assert.match(subset, /page\s*>=\s*startPage\s*&&\s*page\s*<\s*nextPage/,
    "Single-passage practice must clip the left pane to that passage's page range");
});

check("Reading", "Coach rebuilds visual OCR paragraphs and corrects quoted evidence locations", async ({ server }) => {
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
    "parsedIndexedReadingSentences",
    "readingEvidenceSentenceScore",
    "readingAnswerEvidenceLocation",
    "correctReadingAnswerLocation",
    "ensureReadingHintLocation",
  ];
  const helpers = helperNames.map((name) => functionSource(server, name)).join("\n");
  const passage = [
    "--- Page 82 ---",
    "Reading",
    "READING PASSAGE 1",
    "You should spend about 20 minutes on Questions 1-13, which are based on Reading",
    "Passage 1 below.",
    "The problems and benefits created by the spread",
    "of the water hyacinth in Kenya",
    "Water hyacinth (Eichhornia crassipes), an aquatic plant native to South America, first",
    "appeared in countries in Africa in the early 1900s. Scientists there called it the ‘world's",
    "worst aquatic weed’, after it spread from the southernmost tip of Africa in the early",
    "1900s and started obstructing major dams and rivers.",
    "In east Africa the plant arrived with Belgian colonists in Rwanda, who liked the look of",
    "its glossy leaves and delicate purple flowers floating in their ponds. But by the 1980s, it",
    "had escaped out of the country via the Kagera river and made its way downstream to",
    "Lake Victoria. There, with no natural predators and perfect temperature conditions, the",
    "plant began spreading in the open water, blocking fishing routes and providing a new",
    "habitat for disease-carrying mosquitoes.",
    "For the women who smoke fish from the lake to sell it has meant declining income,",
    "as the boats that once brought the fish to shore by the hundreds struggle to navigate",
    "through the mass of plants.",
  ].join("\n");
  const result = runInNewContext(`${helpers}\n(() => {
    const paperText = ${JSON.stringify(passage)};
    const indexed = indexedReadingPassageText(paperText);
    const crossPage = readingParagraphSentenceEntries({
      page: 90,
      lines: [
        { page: 90, text: "A sentence starts and ends here." },
        { page: 91, text: "The next sentence belongs to the new page." },
      ],
    });
    const answer = correctReadingAnswerLocation(
      "位置：第2段，第4句\\n位置：第2段，第1-4句\\n原文：In east Africa the plant arrived with Belgian colonists in Rwanda, who liked the look of its glossy leaves and delicate purple flowers floating in their ponds.",
      { reading: { paperText } },
    );
    const hinted = ensureReadingHintLocation(
      "原文：In east Africa the plant arrived with Belgian colonists in Rwanda, who liked the look of its glossy leaves and delicate purple flowers floating in their ponds.",
      { reading: { paperText } },
      "Hint 1",
    );
    return { indexed, answer, hinted, crossPage };
  })()`);
  assert.match(result.indexed, /^\[P1 S1 Page 82\] Water hyacinth/m,
    "The passage title must not become paragraph 1");
  assert.match(result.indexed, /^\[P2 S1 Page 82\] In east Africa the plant arrived/m);
  assert.match(result.indexed, /^\[P2 S2 Page 82\] But by the 1980s/m);
  assert.doesNotMatch(result.indexed, /^\[P2 S4 Page 82\] In east Africa/m);
  assert.match(result.answer, /^位置：第2段，第1句/u,
    "Quoted source evidence must override a model's incorrect location number");
  assert.equal((result.answer.match(/位置：/gu) || []).length, 1,
    "Coach output must contain exactly one verified location line even if the model repeats a sentence range");
  assert.equal(result.crossPage[1]?.page, 91,
    "A paragraph continuing across a PDF page boundary must keep sentence-level page ownership");
  assert.match(result.hinted, /^位置：第2段，第1句/u,
    "A Hint without a location must receive the verified source location");
  const cambridgeBank = JSON.parse(await readFile(new URL("../data/cambridge-local-bank.json", import.meta.url), "utf8"));
  const cambridge21 = cambridgeBank.readingTests.find((paper) => paper.id === "cam21-r-test4");
  assert.ok(cambridge21?.readingPaper, "Cambridge 21 Reading Test 4 OCR must remain available");
  const actualIndexed = runInNewContext(`${helpers}\nindexedReadingPassageText(paperText)`, {
    paperText: cambridge21.readingPaper,
  });
  assert.match(
    actualIndexed,
    /^\[P2 S1 Page 82\] In east Africa the plant arrived with Belgian colonists in Rwanda/m,
    "The real Cambridge 21 Test 4 evidence must be indexed as paragraph 2, sentence 1",
  );
});

check("Writing", "Topic chooser shares the Reading emoji directory system", ({ app, html }) => {
  assert.match(html, /id="writingEntry"[^>]*class="[^"]*panel/,
    "Writing entry must share the Speaking panel shell");
  assert.match(html, /id="writingTopicList"[^>]*class="[^"]*speaking-topic-list/,
    "Writing must share the Speaking topic grid");
  assert.match(html, /data-writing-scope=["']full["']/);
  assert.match(html, /data-writing-scope=["']topics["']/);
  assert.match(html, /data-writing-scope=["']review["']/);
  assert.match(functionSource(app, "renderWritingTopicCard"), /objective-topic-card/,
    "Writing Topic cards must share the Reading emoji card structure");
  assert.match(functionSource(app, "renderWritingTopicCard"), /objective-topic-icon/,
    "Writing Topic cards must render semantic emoji icons");
  const hub = functionSource(app, "renderWritingUploadHub");
  assert.match(hub, /renderWritingFullBoard/);
  assert.match(hub, /renderWritingTopicBoard/);
  assert.match(hub, /renderWritingReviewBoard/);
  assert.match(hub, /scope\s*===\s*["']topics["'][\s\S]*writingLibraryTaskNumber\s*=\s*2/,
    "Writing Topics must stay Task 2-only");
  const review = functionSource(app, "writingReviewEntries");
  assert.match(review, /mineLearningAttempts\(\)/);
  assert.match(review, /mineWeakAreas\(\)/);
  assert.match(review, /!taskNumber\s*\|\|\s*writingAttemptTaskNumber\(attempt\)\s*===\s*taskNumber/,
    "Writing Review must support one combined Task 1 and Task 2 timeline plus optional filtering");
  assert.match(functionSource(app, "renderBankList"), /group\.emoji/,
    "Speaking Topic cards must use their semantic group emoji");
  assert.match(functionSource(app, "renderTopicSetChooser"), /group\.emoji/,
    "Speaking Topic chooser must preserve the selected group emoji");
});

check("Home", "Server resume and practice plans remain executable", ({ app }) => {
  const plan = functionSource(app, "buildTodayPracticePlan");
  const actions = functionSource(app, "runHomeAction");
  assert.match(plan, /remotePlan\?\.kind\s*===\s*["']resume["']/);
  assert.match(plan, /remotePlan\?\.kind\s*===\s*["']practice["']/);
  assert.match(plan, /primaryAction:\s*["']resume-practice["']/);
  assert.match(plan, /recommended:\$\{moduleName\}/);
  assert.match(actions, /action\.startsWith\(["']recommended:["']\)/);
});

check("Session", "Completed and retest sessions cannot return as ghost drafts", ({ app }) => {
  const complete = functionSource(app, "completeActivePracticeSession");
  const retry = functionSource(app, "retryPendingPracticeCompletion");
  const retest = functionSource(app, "bindObjectiveReviewActions");
  const finishSpeaking = functionSource(app, "finishQwenSpeaking");
  assert.match(complete, /pendingPracticeCompletionStoreKey/);
  assert.match(retry, /practiceSessionRemotePayload\(session,\s*["']completed["']\)/);
  assert.match(retest, /state\.practiceSessionCompleted\s*=\s*false/);
  assert.match(retest, /savePracticeSession\(\)/);
  assert.match(finishSpeaking, /completeActivePracticeSession\(\)/);
});

check("Speaking", "Realtime scoring archives one canonical attempt", ({ app }) => {
  const autoScore = functionSource(app, "qwenRunAutoScore");
  const render = functionSource(app, "renderSpeakingResultHtml");
  assert.match(autoScore, /canonicalJson\.attemptId\s*=\s*saved\.attemptId/);
  assert.match(render, /state\.latestSpeakingResult\?\.attemptId\s*!==\s*resultRecord\.attemptId/);
});

check("Profile", "Onboarding collects all four recommendation inputs", ({ app }) => {
  const dashboard = functionSource(app, "renderDashboard");
  const controls = functionSource(app, "bindHomeControls");
  for (const field of ["currentBand", "targetBand", "examDate", "dailyMinutes"]) {
    assert.match(dashboard, new RegExp(`name=["']${field}["']`), `Missing onboarding field: ${field}`);
    assert.match(controls, new RegExp(`${field}:`), `Profile submission must send ${field}`);
  }
});

check("Mine", "Learning assets expose weak areas, attempts and executable retests", ({ app }) => {
  const mine = functionSource(app, "renderMine");
  const assets = functionSource(app, "renderMineLearningAssets");
  const controls = functionSource(app, "bindMineLearningAssetControls");
  assert.match(mine, /renderMineLearningAssets/);
  assert.match(assets, /Weak areas/i);
  assert.match(assets, /Recent attempts/i);
  assert.match(assets, /wrong answer/i);
  assert.match(assets, /data-mine-learning-action=["']retest["']/);
  assert.match(controls, /runHomeAction|startSpeakingResultRetest/,
    "Mine retest actions must open a real practice path");
  assert.match(controls, /openGlobalCoachPanel/,
    "Mine report and attempt actions must carry context into AI Coach");
});

check("AI Coach", "Question explanations hydrate evidence without auto-navigating", ({ app }) => {
  const sendHelp = functionSource(app, "sendHelpChatMessage");
  const navigation = functionSource(app, "coachWantsNavigation");
  const navigationCases = runInNewContext(`${navigation}\n({
    explanation: coachWantsNavigation("Start from the question focus and explain this Reading answer."),
    openPractice: coachWantsNavigation("Open Reading practice."),
  })`);
  assert.match(sendHelp, /await\s+hydrateCoachEvidenceContext\s*\(/,
    "Global AI Coach must hydrate Reading OCR before sending a question");
  assert.equal(navigationCases.explanation, false,
    "Explanation wording must not auto-open another page");
  assert.equal(navigationCases.openPractice, true,
    "Explicit navigation requests must still open the requested practice");
  const coachContext = functionSource(app, "buildCoachHelpContext");
  assert.match(coachContext, /currentCoachBinding|focusedQuestion/,
    "The visible current question must be included in the Coach request context");
  const coachActions = functionSource(app, "renderGlobalCoachActions");
  assert.match(coachActions, /surface\.focusedQuestion\?\.number/,
    "Reading quick actions must read the visible current question number");
  assert.match(coachActions, /Explain\s+\$\{readingQuestionRef\}/,
    "The actual Coach prompt must include Q1/Q12 instead of an ambiguous current-question phrase");
  const hydration = functionSource(app, "hydrateCoachEvidenceContext");
  assert.match(hydration, /\/api\/listening\/scripts/,
    "Listening questions must hydrate cached audio evidence without requiring captions to be opened first");
  assert.match(hydration, /evidenceAvailable:\s*Boolean\(payload\?\.available\s*&&\s*payload\?\.text\)/);
});

check("AI Coach", "Hydrated Reading questions cannot be reported as missing", ({ server }) => {
  const helpChat = functionSource(server, "handleHelpChat");
  assert.match(helpChat, /hydrated focused Reading question text is present/i);
  assert.match(helpChat, /include a line beginning 题目： that quotes it before the explanation/i);
  assert.match(helpChat, /never claim the question text is missing or ask the student to upload it again/i);
});

check("AI Coach", "Coach context is bound to the active session and quick actions execute", ({ app }) => {
  const binding = functionSource(app, "currentCoachBinding");
  const rebind = functionSource(app, "rebindCoachContext");
  const send = functionSource(app, "sendHelpChatMessage");
  const actions = functionSource(app, "renderGlobalCoachActions");
  assert.match(binding, /sessionId/);
  assert.match(binding, /paperId/);
  assert.match(binding, /questionId/);
  assert.match(rebind, /restoreCoachThread\(next\)/,
    "Coach context changes must isolate and restore the matching thread");
  assert.match(send, /currentCoachBinding|rebindCoachContext/);
  assert.match(actions, /sendHelpChatMessage\(button\.dataset\.globalCoachPrompt/,
    "Coach quick actions must send directly without requiring a second Send click");
});

check("Navigation", "Page navigation resets scroll while practice can restore its own position", ({ app }) => {
  const activate = functionSource(app, "activateView");
  assert.match(activate, /preservePageScroll/);
  assert.match(activate, /window\.scrollTo/);
});

check("Layout", "Hidden panels cannot be reopened by responsive display rules", ({ css }) => {
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s,
    "The product needs one global hidden contract");
});

let tasks;
let app;
let html;
let css;
let server;
try {
  [tasks, app, html, css, server] = await Promise.all([
    waitForTasks(),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../server.js", import.meta.url), "utf8"),
  ]);
} finally {
  child.kill();
}

const results = [];
for (const item of checks) {
  try {
    await item.run({ tasks, app, html, css, server });
    results.push({ ...item, passed: true });
    console.log(`PASS [${item.group}] ${item.name}`);
  } catch (error) {
    results.push({ ...item, passed: false, error });
    console.error(`FAIL [${item.group}] ${item.name}`);
    console.error(`  ${normalizeMessage(error)}`);
  }
}

const failed = results.filter((item) => !item.passed);
console.log(`\nLearning-flow regression summary: ${results.length - failed.length}/${results.length} passed.`);
if (failed.length) {
  console.error("Missing behavior:");
  failed.forEach((item) => console.error(`- [${item.group}] ${item.name}`));
  process.exitCode = 1;
}
