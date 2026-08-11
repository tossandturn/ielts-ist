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
      values: [...host.querySelectorAll("input[type='radio']")].map((input) => input.value),
    };
  }, fixedChoiceQuestion);
  assert.equal(fixedChoice.radioCount, 3, "True/False/Not Given and Yes/No/Not Given must render semantic radio controls");
  assert.deepEqual(fixedChoice.values, fixedChoiceQuestion.options.map((option) => option.value));

  const mcq = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q11'])");
  assert.equal(await mcq.locator("input[type='radio']").count(), 3, "MCQ must render radio controls");
  await mcq.locator("input[type='radio'][value='B']").check();
  const multi = page.locator(".objective-multiple-answer-group[data-objective-group-id='q17-q18']");
  assert.equal(await multi.locator("input[type='checkbox']").count(), 5, "Choose TWO must render one checkbox group");
  await multi.locator("input[type='checkbox'][value='D']").check();
  await multi.locator("input[type='checkbox'][value='B']").check();
  assert.equal(await multi.locator("input[type='checkbox'][value='A']").isDisabled(), true, "Choose TWO must prevent a third selection");
  const matching = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q27'])");
  assert.equal(await matching.locator("select").count(), 1, "Matching with real options must render a select");
  await matching.locator("select").selectOption("A");

  const first = await page.evaluate(() => {
    saveSingleAnswersToState();
    return { answers: collectAnswers("single"), stateAnswers: { ...state.singleAnswers } };
  });
  assert.deepEqual({ q11: first.answers.q11, q17: first.answers.q17, q18: first.answers.q18, q27: first.answers.q27 }, { q11: "B", q17: "B", q18: "D", q27: "A" });
  assert.deepEqual(first.stateAnswers, first.answers, "Visible controls must save through the existing single-session state");

  await page.evaluate(() => renderSingle());
  const restored = await page.evaluate(() => ({
    state: Object.fromEntries(Object.entries(state.singleAnswers || {}).filter(([qid]) => ["q11", "q17", "q18", "q27"].includes(qid))),
    proxies: Object.fromEntries([...document.querySelectorAll(".objective-answer-proxy")]
      .filter((proxy) => ["q11", "q17", "q18", "q27"].includes(proxy.dataset.qid))
      .map((proxy) => [proxy.dataset.qid, proxy.value])),
  }));
  assert.deepEqual(restored.state, { q11: "B", q17: "B", q18: "D", q27: "A" }, "Rerender must retain every objective answer in state");
  assert.deepEqual(restored.proxies, { q11: "B", q17: "B", q18: "D", q27: "A" }, "Rerender must hydrate objective answer proxies from the saved session");
  assert.equal(await mcq.locator("input[type='radio'][value='B']").isChecked(), true, "Radio selection must restore after rerender");
  assert.equal(await multi.locator("input[type='checkbox'][value='B']").isChecked(), true, "Checkbox selection must restore after rerender");
  assert.equal(await multi.locator("input[type='checkbox'][value='D']").isChecked(), true, "Checkbox selection must restore after rerender");
  assert.equal(await matching.locator("select").inputValue(), "A", "Matching select must restore after rerender");

  const scored = await page.evaluate(async () => {
    const item = state.activeSingle;
    setObjectiveProxyValue(document.querySelector(".objective-answer-proxy[data-qid='q17']"), "D");
    setObjectiveProxyValue(document.querySelector(".objective-answer-proxy[data-qid='q18']"), "B");
    const payload = await objectiveSubmissionPayload(item, "listening", "single", collectAnswers("single"));
    const response = await postJson("/api/listening/score", payload);
    return response.result.details.filter((detail) => detail.id === "q17" || detail.id === "q18");
  });
  assert.deepEqual(scored.map((detail) => detail.correct), [true, true], "Reversed multi-select values must score as the same option set");
  assert.equal(Object.hasOwn(scored[0], "canonicalAnswer"), false, "Score response must not leak canonical answers before dedicated review");
  assert.equal(pageErrors.length, 0, `Browser page errors: ${pageErrors.join(" | ")}`);
  console.log("PASS semantic objective controls: public metadata, radio, choose-two, matching, restore and strict review boundary.");
} finally {
  await browser.close();
  child.kill();
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
