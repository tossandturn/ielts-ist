import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/10604/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const root = new URL("../", import.meta.url);
const port = 8700 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = join(tmpdir(), `ieltsist-semantic-controls-${process.pid}-${randomUUID()}.sqlite`);
const child = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), IELTSIST_DB_PATH: dbPath, SESSION_COOKIE_SECURE: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
child.stdout.on("data", (chunk) => { serverOutput += chunk; });
child.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Semantic controls server exited early (${child.exitCode}).\n${serverOutput}`);
    try { const response = await fetch(`${baseUrl}/api/tasks`); if (response.ok) return response; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Semantic controls server did not start.\n${serverOutput}`);
}

await waitForServer();
const publicTasks = await (await fetch(`${baseUrl}/api/tasks`)).json();
assert.doesNotMatch(JSON.stringify(publicTasks), /"answer"\s*:/, "Public task data must not expose an answer key");
const listening = publicTasks.listeningTests.find((item) => item.id === "cam15-l-test3");
assert.ok(listening, "Expected Cambridge 15 Test 3 Listening fixture");
assert.equal(listening.questions[10].type, "multiple_choice");
assert.equal(listening.questions[10].options.length, 3, "MCQ metadata must include paper options");
assert.equal(listening.questions[16].selectionLimit, 2, "Choose TWO metadata must preserve the selection limit");
assert.equal(listening.questions[16].optionGroupId, "q17-q18");
assert.equal(listening.questions[26].type, "matching");
assert.equal(listening.questions[26].options.length, 3, "Matching metadata must include paper options when OCR has them");
const fixedChoiceQuestion = [...publicTasks.listeningTests, ...publicTasks.readingTests]
  .flatMap((item) => item.questions || [])
  .find((question) => ["true_false_not_given", "yes_no_not_given"].includes(question.type));
assert.ok(fixedChoiceQuestion, "Expected at least one imported fixed-choice True/False/Not Given or Yes/No/Not Given question");
assert.deepEqual(
  fixedChoiceQuestion.options.map((option) => option.value),
  fixedChoiceQuestion.type === "true_false_not_given" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"],
  "Fixed-choice metadata must carry the canonical visible answer options",
);
const cambridge21Reading = publicTasks.readingTests.find((item) => item.id === "cam21-r-test4");
assert.ok(cambridge21Reading, "Expected Cambridge 21 Test 4 Reading fixture from the reported student flow");
const cambridge21Choice = cambridge21Reading.questions.find((question) => question.id === "q25");
assert.equal(cambridge21Choice?.type, "multiple_choice");
assert.equal(cambridge21Choice?.options?.length, 4, "Cambridge 21 Reading Q25 must retain its four visible options");

const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/#single`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => state.localDataOwnerResolved && state.data?.listeningTests?.length > 0);
  await page.evaluate(() => {
    const item = normalizeItem(state.data.listeningTests.find((candidate) => candidate.id === "cam15-l-test3"));
    state.activeModule = "listening";
    state.activeSingle = item;
    state.singleStarted = true;
    state.singlePracticeModes.listening = "exam";
    state.singlePracticeScopes.listening = "paper";
    state.singleAnswers = {};
    state.singleAnswerItemId = item.id;
    state.practiceSessionCompleted = false;
    resetSingleTimer("listening");
    renderSingle();
  });

  const fixedChoice = await page.evaluate((question) => {
    const host = document.createElement("div");
    host.id = "semantic-fixed-choice-fixture";
    host.innerHTML = renderObjectiveAnswerControl(question, "fixture", 1);
    document.body.append(host);
    bindObjectiveAnswerControls();
    return {
      radioCount: host.querySelectorAll("input[type='radio']").length,
      checkboxCount: host.querySelectorAll("input[type='checkbox']").length,
      selectCount: host.querySelectorAll("select").length,
      textCount: host.querySelectorAll("input.objective-answer-control[type='text']").length,
      placeholder: host.querySelector("input.objective-answer-control")?.getAttribute("placeholder"),
    };
  }, fixedChoiceQuestion);
  assert.deepEqual(fixedChoice, { radioCount: 0, checkboxCount: 0, selectCount: 0, textCount: 1, placeholder: "Answer" },
    "Every objective question type must render one plain answer textbox");

  await page.locator('.answer-group-open[data-answer-group-section="2"][data-answer-group-prefix="single"]').click();
  const mcq = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q11'])");
  assert.equal(await mcq.locator("input[type='radio'], input[type='checkbox'], select").count(), 0, "MCQ answer cards must not render options");
  await mcq.locator("input.objective-answer-control[type='text']").fill("B");
  assert.equal(await page.locator(".objective-multiple-answer-group").count(), 0, "Choose TWO must render separate textboxes, not a checkbox group");
  const multi17 = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q17']) input.objective-answer-control[type='text']");
  const multi18 = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q18']) input.objective-answer-control[type='text']");
  await multi17.fill("B");
  await multi18.fill("D");
  await page.locator('.answer-group-open[data-answer-group-section="3"][data-answer-group-prefix="single"]').click();
  const matching = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q27'])");
  assert.equal(await matching.locator("select, input[type='radio'], input[type='checkbox']").count(), 0, "Matching answer cards must not render options");
  await matching.locator("input.objective-answer-control[type='text']").fill("A");

  const fallbackAnswerCard = await page.evaluate(() => {
    const host = document.createElement("div");
    host.innerHTML = renderObjectiveAnswerControl({ id: "q-fallback", type: "multiple_choice", options: [] }, "fixture", 99);
    document.body.append(host);
    return {
      hintCount: host.querySelectorAll(".objective-content-gap").length,
      placeholder: host.querySelector("input")?.getAttribute("placeholder"),
    };
  });
  assert.equal(fallbackAnswerCard.hintCount, 0,
    "Answer cards with unavailable imported options must not render question-copy text");
  assert.equal(fallbackAnswerCard.placeholder, "Answer");

  const first = await page.evaluate(() => {
    saveSingleAnswersToState();
    return { answers: collectAnswers("single"), stateAnswers: { ...state.singleAnswers } };
  });
  assert.deepEqual({ q11: first.answers.q11, q17: first.answers.q17, q18: first.answers.q18, q27: first.answers.q27 }, { q11: "B", q17: "B", q18: "D", q27: "A" });
  assert.deepEqual(first.stateAnswers, { q11: "B", q17: "B", q18: "D", q27: "A" }, "Single-session responseMap must persist only actual answers, never 36 empty placeholders");

  await page.evaluate(() => renderSingle());
  const restored = await page.evaluate(() => ({
    state: Object.fromEntries(Object.entries(state.singleAnswers || {}).filter(([qid]) => ["q11", "q17", "q18", "q27"].includes(qid))),
    proxies: Object.fromEntries([...document.querySelectorAll(".objective-answer-proxy")]
      .filter((proxy) => ["q11", "q17", "q18", "q27"].includes(proxy.dataset.qid))
      .map((proxy) => [proxy.dataset.qid, proxy.value])),
  }));
  assert.deepEqual(restored.state, { q11: "B", q17: "B", q18: "D", q27: "A" }, "Rerender must retain every objective answer in state");
  assert.deepEqual(restored.proxies, { q27: "A" }, "Rerender must hydrate the active section without recreating every off-screen control");
  await page.locator('.answer-group-open[data-answer-group-section="2"][data-answer-group-prefix="single"]').click();
  assert.equal(await mcq.locator("input.objective-answer-control[type='text']").inputValue(), "B", "MCQ text answer must restore after rerender");
  assert.equal(await multi17.inputValue(), "B", "First Choose TWO textbox must restore after rerender");
  assert.equal(await multi18.inputValue(), "D", "Second Choose TWO textbox must restore after rerender");
  await page.locator('.answer-group-open[data-answer-group-section="3"][data-answer-group-prefix="single"]').click();
  assert.equal(await matching.locator("input.objective-answer-control[type='text']").inputValue(), "A", "Matching text answer must restore after rerender");

  const scored = await page.evaluate(async () => {
    const item = state.activeSingle;
    state.singlePracticeSections.listening = 2;
    renderSingle();
    setObjectiveProxyValue(document.querySelector(".objective-answer-proxy[data-qid='q17']"), "D");
    setObjectiveProxyValue(document.querySelector(".objective-answer-proxy[data-qid='q18']"), "B");
    const payload = await objectiveSubmissionPayload(item, "listening", "single", collectAnswers("single"));
    const response = await postJson("/api/listening/score", payload);
    return response.result.details.filter((detail) => detail.id === "q17" || detail.id === "q18");
  });
  assert.deepEqual(scored.map((detail) => detail.correct), [true, true], "Reversed multi-select values must score as the same option set");
  assert.equal(Object.hasOwn(scored[0], "canonicalAnswer"), false, "Score response must not leak canonical answers before dedicated review");

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "ipad-landscape", width: 1024, height: 768 },
    { name: "ipad-portrait", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.evaluate(() => {
      stopSingleTimer();
      const item = normalizeItem(state.data.readingTests.find((candidate) => candidate.id === "cam21-r-test4"));
      state.activeModule = "reading";
      state.activeSingle = item;
      state.singleStarted = true;
      state.singlePracticeModes.reading = "full";
      state.singlePracticeScopes.reading = "paper";
      state.singleAnswers = {};
      state.practiceSessionCompleted = false;
      state.readingMobilePane = "passage";
      resetSingleTimer("reading");
      renderSingle();
      setSingleImmersive("reading");
    });
    await page.locator('[data-reading-question-nav="25"]').click();
    const q25 = page.locator('.paper-answer-row[data-question-number="25"] .objective-answer-shell');
    await q25.waitFor({ state: "visible" });
    const layout = await q25.evaluate((host) => {
      const rect = (node) => {
        const value = node.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      };
      const sheet = host.closest(".reading-answer-sheet");
      const input = host.querySelector("input.objective-answer-control[type='text']");
      return {
        host: rect(host),
        sheet: sheet ? rect(sheet) : null,
        input: input ? rect(input) : null,
        placeholder: input?.getAttribute("placeholder") || "",
        optionControls: host.querySelectorAll("input[type='radio'], input[type='checkbox'], select").length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.equal(layout.optionControls, 0, `${viewport.name}: Q25 must not render answer options`);
    assert.ok(layout.input, `${viewport.name}: Q25 must render one text answer field`);
    assert.ok(layout.sheet, `${viewport.name}: Q25 is outside its answer sheet`);
    assert.ok(layout.overflow <= 1, `${viewport.name}: Q25 creates ${layout.overflow}px horizontal page overflow`);
    assert.equal(layout.placeholder, "Answer", `${viewport.name}: Q25 needs the standard answer placeholder`);
    assert.ok(layout.input.width >= 44 && layout.input.height >= 44, `${viewport.name}: Q25 textbox is below the touch minimum`);
    assert.ok(layout.input.left >= layout.sheet.left - 1 && layout.input.right <= layout.sheet.right + 1,
      `${viewport.name}: Q25 textbox exceeds the answer sheet`);
    const q25Choice = q25.locator('input.objective-answer-control[type="text"]');
    await q25Choice.fill("B");
    await page.evaluate(() => renderSingle());
    assert.equal(await page.locator('.paper-answer-row[data-question-number="25"] input.objective-answer-control[type="text"]').inputValue(), "B",
      `${viewport.name}: Q25 text answer is lost after rerender`);
  }
  assert.equal(pageErrors.length, 0, `Browser page errors: ${pageErrors.join(" | ")}`);
  console.log("PASS text-only objective controls: public metadata, MCQ, choose-two, matching, restore, Cambridge 21 Q25 layout, and strict review boundary.");
} finally {
  await browser.close();
  child.kill();
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
