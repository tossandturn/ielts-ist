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
      labels: [...host.querySelectorAll("fieldset > label")].map((label) => ({
        text: label.innerText.trim(),
        ariaLabel: label.getAttribute("aria-label"),
      })),
    };
  }, fixedChoiceQuestion);
  assert.equal(fixedChoice.radioCount, 3, "True/False/Not Given and Yes/No/Not Given must render semantic radio controls");
  assert.deepEqual(fixedChoice.values, fixedChoiceQuestion.options.map((option) => option.value));
  assert.deepEqual(fixedChoice.labels.map((label) => label.text), fixedChoiceQuestion.options.map((option) => option.value),
    "The answer card must show only response labels; question wording remains on the paper");
  assert.ok(fixedChoice.labels.every((label) => /^Question 1, choose /i.test(label.ariaLabel || "")),
    "Compact answer-card controls must retain an accessible question-and-choice label");

  const mcq = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q11'])");
  assert.equal(await mcq.locator("input[type='radio']").count(), 3, "MCQ must render radio controls");
  assert.deepEqual((await mcq.locator("fieldset > label").allTextContents()).map((text) => text.trim()), ["A", "B", "C"],
    "Listening answer cards must not duplicate option wording from the paper");
  await mcq.locator("input[type='radio'][value='B']").check();
  const multi = page.locator(".objective-multiple-answer-group[data-objective-group-id='q17-q18']");
  assert.equal(await multi.locator("input[type='checkbox']").count(), 5, "Choose TWO must render one checkbox group");
  await multi.locator("input[type='checkbox'][value='D']").check();
  await multi.locator("input[type='checkbox'][value='B']").check();
  assert.equal(await multi.locator("input[type='checkbox'][value='A']").isDisabled(), true, "Choose TWO must prevent a third selection");
  const matching = page.locator(".objective-answer-shell:has(.objective-answer-proxy[data-qid='q27'])");
  assert.equal(await matching.locator("select").count(), 1, "Matching with real options must render a select");
  assert.ok((await matching.locator("select option").allTextContents()).every((text) => /^(?:Choose a letter|[A-I])$/.test(text.trim())),
    "Matching answer cards must expose only option letters, not repeated source text");
  await matching.locator("select").selectOption("A");

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
  assert.equal(fallbackAnswerCard.placeholder, "Answer from paper");

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
    if (viewport.width <= 820 && viewport.height > viewport.width) {
      await page.locator('[data-reading-pane-target="questions"]').click();
    }
    const q25 = page.locator('.paper-answer-row[data-question-number="25"] .objective-answer-radio');
    await q25.waitFor({ state: "visible" });
    const layout = await q25.evaluate((host) => {
      const rect = (node) => {
        const value = node.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      };
      const sheet = host.closest(".reading-answer-sheet");
      return {
        host: rect(host),
        sheet: sheet ? rect(sheet) : null,
        options: [...host.querySelectorAll("fieldset > label")].map((label) => ({
          text: label.innerText.trim(),
          ariaLabel: label.getAttribute("aria-label"),
          display: getComputedStyle(label).display,
          columns: getComputedStyle(label).gridTemplateColumns,
          rect: rect(label),
        })),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    assert.equal(layout.options.length, 4, `${viewport.name}: Q25 must show all four answer choices`);
    assert.ok(layout.sheet, `${viewport.name}: Q25 is outside its answer sheet`);
    assert.ok(layout.overflow <= 1, `${viewport.name}: Q25 creates ${layout.overflow}px horizontal page overflow`);
    layout.options.forEach((option, index) => {
      assert.equal(option.display, "grid", `${viewport.name}: Q25 option ${index + 1} is not a readable grid row`);
      assert.notEqual(option.columns, "none", `${viewport.name}: Q25 option ${index + 1} lost its option columns`);
      assert.equal(option.text, ["A", "B", "C", "D"][index],
        `${viewport.name}: Q25 answer card must show only the source-paper letter`);
      assert.match(option.ariaLabel || "", new RegExp(`Question 25, choose ${["A", "B", "C", "D"][index]}`, "i"),
        `${viewport.name}: Q25 option ${index + 1} needs an accessible question-and-choice label`);
      assert.ok(option.rect.width >= 70, `${viewport.name}: Q25 option ${index + 1} is compressed to ${option.rect.width}px`);
      assert.ok(option.rect.left >= layout.sheet.left - 1 && option.rect.right <= layout.sheet.right + 1,
        `${viewport.name}: Q25 option ${index + 1} exceeds the answer sheet`);
    });
    for (let index = 1; index < layout.options.length; index += 1) {
      const previous = layout.options[index - 1].rect;
      const current = layout.options[index].rect;
      assert.ok(previous.bottom <= current.top + 1 || current.bottom <= previous.top + 1,
        `${viewport.name}: Q25 options ${index} and ${index + 1} overlap`);
    }
    const q25Choice = q25.locator('input[type="radio"][value="B"]');
    await q25Choice.check();
    await page.evaluate(() => renderSingle());
    assert.equal(await page.locator('.paper-answer-row[data-question-number="25"] input[type="radio"][value="B"]').isChecked(), true,
      `${viewport.name}: Q25 selection is lost after rerender`);
  }
  assert.equal(pageErrors.length, 0, `Browser page errors: ${pageErrors.join(" | ")}`);
  console.log("PASS semantic objective controls: public metadata, radio, choose-two, matching, restore, Cambridge 21 Q25 layout, and strict review boundary.");
} finally {
  await browser.close();
  child.kill();
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 2_000))]);
  await Promise.all(["", "-shm", "-wal"].map((suffix) => rm(`${dbPath}${suffix}`, { force: true }).catch(() => {})));
}
