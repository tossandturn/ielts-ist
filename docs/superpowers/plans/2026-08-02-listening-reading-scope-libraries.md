# Listening and Reading Scope Libraries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent Full test, Section/Passage, Topic, and Review libraries to Listening and Reading while preserving every existing Cambridge source paper and legacy saved session.

**Architecture:** Extend the existing `/api/tasks` payload with truthful Listening question-type metadata parsed from the imported OCR paper. In the browser, derive stable virtual practice units from unchanged source papers, so each subset has its own ID, answers, timer, session, result, and recommendation history without duplicating Cambridge data or changing simulations.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Node.js HTTP server, existing Cambridge JSON/OCR imports, localStorage version-1 sessions, Playwright with installed Chrome.

---

## File map

- Modify `server.js`: shared objective question-type parser, Listening question metadata, slim task payload.
- Modify `public/app.js`: scope state, derived virtual units, backward-compatible persistence, scoped result identity, library rendering and controls.
- Modify `public/styles.css`: Focus Camp scope tabs, unit cards, pagination, empty states, responsive layouts.
- Modify `public/index.html`: asset cache version only.
- Create `scripts/test-listening-reading-scope-libraries.mjs`: API metadata, scope UI, virtual unit identity, subset content, refresh restoration, legacy restoration, multi-screen overflow.
- Modify `scripts/test-learning-flow.mjs`: static behavior contracts for the new scope helpers and simulation isolation.

### Task 1: Isolated worktree and clean baseline

**Files:**
- No production changes.

- [ ] **Step 1: Verify worktree location is ignored**

Run:

```powershell
git check-ignore .worktrees
git status -sb
```

Expected: `.worktrees` is ignored and `main` is clean at the design/plan commits.

- [ ] **Step 2: Create the feature worktree**

Run:

```powershell
git worktree add D:\CodexWork\ielts-trainer\.worktrees\lr-scope-libraries -b codex/lr-scope-libraries
```

Expected: a linked worktree on `codex/lr-scope-libraries`.

- [ ] **Step 3: Install and run baseline checks**

Run:

```powershell
npm install
node --check public\app.js
node --check server.js
node scripts\test-learning-flow.mjs
node scripts\test-learning-p0.mjs
node scripts\test-ipad-immersive-layout.mjs
```

Expected: 35/35 learning-flow checks, P0, and all iPad module layouts pass.

### Task 2: Scope-library acceptance contract — RED

**Files:**
- Create `scripts/test-listening-reading-scope-libraries.mjs`.

- [ ] **Step 1: Write the API metadata assertion**

Start `server.js` on a unique port, request `/api/tasks`, and assert that Listening has recognized types without losing any questions:

```js
const tasks = await (await fetch(`${baseUrl}/api/tasks`)).json();
assert.equal(tasks.listeningTests.length, 72);
assert.equal(tasks.readingTests.length, 72);
assert.ok(tasks.listeningTests.every((item) => item.questions.length === 40));
assert.ok(tasks.readingTests.every((item) => item.questions.length === 40));
assert.ok(tasks.listeningTests.flatMap((item) => item.questions).some((question) => question.type !== "unknown"));
```

- [ ] **Step 2: Write the browser library assertions**

For Listening and Reading at 1280x720 and 390x844, assert:

```js
assert.equal(await page.locator("[data-single-scope]").count(), 4);
await page.locator('[data-single-scope="section"]').click();
assert.ok(await page.locator('[data-practice-unit-scope="section"]').count() > 0);
await page.locator('[data-single-scope="topic"]').click();
assert.ok(await page.locator('[data-practice-unit-scope="topic"]').count() > 0);
```

The test starts `cam15-l-test1::section::1` and asserts Q1-Q10 plus one audio section; starts `cam15-r-test1::section::2` and asserts Q14-Q26; starts one recognized Topic unit and asserts every rendered answer input belongs to its declared `data-topic-type`.

- [ ] **Step 3: Write persistence and legacy assertions**

The test fills one scoped answer, reloads, and asserts the same virtual `itemId`, scope, timer, and answer restore. It then injects the old session shape:

```js
{
  version: 1,
  module: "listening",
  itemId: "cam15-l-test1",
  started: true,
  modes: { listening: "training" },
  sections: { listening: 2 },
  answers: { q11: "A" }
}
```

and asserts it restores as the Section 2 library without deleting the answer.

- [ ] **Step 4: Verify RED and commit**

Run:

```powershell
node scripts\test-listening-reading-scope-libraries.mjs
```

Expected: FAIL because Listening types, `[data-single-scope]`, and virtual unit IDs do not exist.

Commit:

```powershell
git add scripts/test-listening-reading-scope-libraries.mjs
git commit -m "test: specify scoped listening and reading libraries"
git -c http.version=HTTP/1.1 push -u origin codex/lr-scope-libraries
```

### Task 3: Truthful objective question metadata — GREEN

**Files:**
- Modify `server.js` around `readingQuestionType`, `readingQuestionMetadata`, and `slimListeningTest`.

- [ ] **Step 1: Generalize the instruction classifier**

Replace the Reading-only classifier with a shared parser that retains all current Reading patterns and adds Listening patterns:

```js
function objectiveQuestionType(text) {
  const value = String(text || "").replace(/\s+/g, " ").toLowerCase();
  if (/true\s*\/\s*false\s*\/\s*not given|true if .*false if .*not given/i.test(value)) return ["true_false_not_given", "True / False / Not Given"];
  if (/yes\s*\/\s*no\s*\/\s*not given|yes if .*no if .*not given/i.test(value)) return ["yes_no_not_given", "Yes / No / Not Given"];
  if (/list of headings|choose the correct heading/i.test(value)) return ["matching_headings", "Matching headings"];
  if (/which paragraph contains|match each statement with the correct paragraph|information given in paragraphs/i.test(value)) return ["matching_information", "Matching information"];
  if (/match each statement|match each person|list of people|correct person|correct researcher|correct expert/i.test(value)) return ["matching_features", "Matching features"];
  if (/choose (?:two|three|four|five|six) letters|choose (?:two|three|four|five|six) answers/i.test(value)) return ["multiple_choice_multiple", "Multiple choice (multiple answers)"];
  if (/choose the correct (?:letter|answer)/i.test(value)) return ["multiple_choice", "Multiple choice"];
  if (/complete the form/i.test(value)) return ["form_completion", "Form completion"];
  if (/complete the summary/i.test(value)) return ["summary_completion", "Summary completion"];
  if (/complete the table/i.test(value)) return ["table_completion", "Table completion"];
  if (/complete the notes/i.test(value)) return ["note_completion", "Note completion"];
  if (/complete the sentences/i.test(value)) return ["sentence_completion", "Sentence completion"];
  if (/label the (?:map|plan)/i.test(value)) return ["map_plan_labelling", "Map / plan labelling"];
  if (/answer the questions/i.test(value)) return ["short_answer", "Short answer"];
  if (/complete the (?:flow-chart|flow chart|diagram)/i.test(value)) return ["diagram_completion", "Diagram completion"];
  if (/match each|which .* matches/i.test(value)) return ["matching", "Matching"];
  return ["unknown", "Question"];
}
```

- [ ] **Step 2: Parse Listening instruction ranges**

Add a metadata parser that scans `Questions 1-10`, `Questions 11-14`, and similar headings page by page, applies the nearest instruction block, and returns `type`, `typeLabel`, and `questionPage` for Q1-Q40.

```js
function listeningQuestionMetadata(paper) {
  return objectiveQuestionMetadataFromPaper(paper, { module: "listening" });
}
```

`slimListeningTest()` passes this map to `slimQuestions()` exactly as `slimReadingTest()` does.

- [ ] **Step 3: Verify metadata without content loss**

Run:

```powershell
node --check server.js
node scripts\test-listening-reading-scope-libraries.mjs
```

Expected: API assertions pass; UI still fails at the missing scope tabs.

- [ ] **Step 4: Commit metadata**

```powershell
git add server.js
git commit -m "feat: expose listening question types"
git -c http.version=HTTP/1.1 push
```

### Task 4: Derived practice units and backward-compatible state — GREEN

**Files:**
- Modify `public/app.js` near initial state, `singleSectionQuestionRange`, `paperImagesForQuestionSubset`, `singleOptions`, `findItemById`, timers, and session persistence.
- Modify `scripts/test-learning-flow.mjs`.

- [ ] **Step 1: Add scope state and compatibility maps**

Add:

```js
singlePracticeScopes: { listening: "paper", reading: "paper" },
singleScopePages: {
  listening: { section: 1, topic: 1 },
  reading: { section: 1, topic: 1 },
},
```

and helpers:

```js
function singleModeFromScope(moduleName, scope) {
  const map = moduleName === "reading"
    ? { paper: "full", section: "evidence", topic: "type", review: "review" }
    : { paper: "exam", section: "training", topic: "topic", review: "review" };
  return map[scope] || map.paper;
}
function singleScopeFromMode(moduleName, mode) {
  const map = moduleName === "reading"
    ? { full: "paper", evidence: "section", type: "topic", review: "review" }
    : { exam: "paper", training: "section", topic: "topic", review: "review" };
  return map[mode] || "paper";
}
function currentSinglePracticeScope(moduleName) {
  return state.singlePracticeScopes?.[moduleName]
    || singleScopeFromMode(moduleName, state.singlePracticeModes?.[moduleName]);
}
```

- [ ] **Step 2: Derive immutable virtual units**

Implement:

```js
function deriveSinglePracticeUnits(moduleName, sourceItems, scope) {
  if (scope === "paper" || scope === "review") return sourceItems;
  if (scope === "section") return sourceItems.flatMap((item) => deriveSectionUnits(moduleName, item));
  if (scope === "topic") return sourceItems.flatMap((item) => deriveTopicUnits(moduleName, item));
  return sourceItems;
}
```

Each unit has `id`, `baseItemId`, `practiceScope`, `practiceSection` or `practiceTopic`, filtered `questions`, filtered media, truthful title, question count, and minutes. Do not mutate the source item.

- [ ] **Step 3: Resolve virtual IDs everywhere**

`singleOptions()` returns derived units for Listening/Reading. `findItemById()` recognizes `::section::` and `::topic::` IDs by loading the base paper then deriving the requested unit. Full-paper IDs continue through the current path.

- [ ] **Step 4: Make timer, answers, and result identity unit-specific**

`singleModuleTotal()` prefers `state.activeSingle.minutes`. `startSinglePractice()` compares the virtual item ID before retaining answers. `rememberObjectiveResult()` records `practiceScope`, `baseItemId`, `practiceSection`, and `practiceTopic`, while preserving the current latest-per-module record.

- [ ] **Step 5: Persist scopes and migrate old sessions in memory**

Add `scopes` to `savePracticeSession()` and remote state. During restore, derive a scope from old `modes`; for old Listening Training or Reading Evidence sessions, resolve the corresponding virtual Section/Passage ID in memory. Do not rewrite localStorage until the normal next save.

- [ ] **Step 6: Verify helpers and persistence**

Run:

```powershell
node --check public\app.js
node scripts\test-listening-reading-scope-libraries.mjs
node scripts\test-learning-flow.mjs
```

Expected: unit identity and persistence assertions pass; launch UI assertions may still fail.

- [ ] **Step 7: Commit unit model**

```powershell
git add public/app.js scripts/test-learning-flow.mjs
git commit -m "feat: derive scoped objective practice units"
git -c http.version=HTTP/1.1 push
```

### Task 5: Focus Camp scope libraries — GREEN

**Files:**
- Modify `public/app.js` around `renderSingleLaunch`, `startSinglePractice`, `bindDynamicControls`, and filters.
- Modify `public/styles.css`.

- [ ] **Step 1: Render accessible scope tabs**

Add a `role="tablist"` before the library content:

```html
<div class="single-scope-switch" role="tablist" aria-label="Listening practice library">
  <button role="tab" data-single-scope="paper">Full tests</button>
  <button role="tab" data-single-scope="section">Sections</button>
  <button role="tab" data-single-scope="topic">Topics</button>
  <button role="tab" data-single-scope="review">Review mistakes</button>
</div>
```

Reading changes only the second label to `Passages`.

- [ ] **Step 2: Keep the current Full-test launch**

For `paper`, reuse the existing AI-recommended and choose-yourself cards. Remove no copy, filter, action, or paper option from this path.

- [ ] **Step 3: Render Section/Passage and Topic cards**

Add `renderSingleScopeLibrary()` with 12 items per page. Each card includes source, title, question count, time, scope label, and a direct button:

```html
<article class="single-scope-card" data-practice-unit-scope="section" data-practice-unit-id="cam15-l-test1::section::1">
  <span>🎧 Section</span>
  <h4>Section 1 · Q1-10</h4>
  <p>Cambridge 15 · Test 1</p>
  <dl><div><dt>Questions</dt><dd>10</dd></div><div><dt>Time</dt><dd>10 min</dd></div></dl>
  <button type="button" data-start-practice-unit="cam15-l-test1::section::1">Choose →</button>
</article>
```

- [ ] **Step 4: Bind scope switching, unit start, and pagination**

Scope clicks update both `singlePracticeScopes[module]` and the legacy mode mapping, clear only the active launch selection, reset that scope's page, and rerender. Unit clicks resolve the virtual ID, reset answers when its identity changes, start the correct timer, enter the unchanged immersive workspace, and save immediately.

- [ ] **Step 5: Style all target sizes**

Use existing Focus Camp tokens. Desktop uses three cards per row, iPad portrait two, mobile one. Tabs can scroll horizontally on narrow screens but the page itself must not overflow. All buttons are at least 44px on touch layouts.

- [ ] **Step 6: Verify visual and functional GREEN**

Run:

```powershell
node scripts\test-listening-reading-scope-libraries.mjs
node scripts\test-sitewide-focus-visual.mjs
node scripts\test-recommendation-ux.mjs
```

Expected: all scope tabs, unit cards, start actions, and responsive checks pass.

- [ ] **Step 7: Commit UI**

```powershell
git add public/app.js public/styles.css
git commit -m "feat: add listening and reading scope libraries"
git -c http.version=HTTP/1.1 push
```

### Task 6: Scoring, review isolation, and simulation safety

**Files:**
- Modify `public/app.js` around learning-loop history, `latestObjectiveResult`, `rememberObjectiveResult`, review mode, and history labels.
- Modify `scripts/test-listening-reading-scope-libraries.mjs`.

- [ ] **Step 1: Store scoped objective results**

Extend local learning history with:

```js
objectiveScopes: {
  [result.itemId]: result,
}
```

Keep `objective[module] = result` for dashboard compatibility. `latestObjectiveResult()` first checks the exact virtual ID, then falls back to the legacy module result only for original Full-test IDs.

- [ ] **Step 2: Label subset results truthfully**

Result headers show `Section 1 · 8/10`, `Passage 2 · 10/13`, or `Matching headings · 5/7`. Subset results never render an overall Band label. Server history receives the virtual `itemId` and scope metadata in `result`.

- [ ] **Step 3: Prove simulations use complete source papers only**

Add assertions that `buildExam()` and `buildSequence()` still call `mergedItems()` directly and that generated Listening/Reading paper objects each contain 40 questions with original IDs lacking `::section::` and `::topic::`.

- [ ] **Step 4: Run scoring and simulation contracts**

Run:

```powershell
node scripts\test-listening-reading-scope-libraries.mjs
node scripts\test-writing-speaking-contract.mjs
node scripts\test-learning-p0.mjs
```

Expected: scoped scores remain raw subsets; Writing independence and simulation contracts remain unchanged.

- [ ] **Step 5: Commit result isolation**

```powershell
git add public/app.js scripts/test-listening-reading-scope-libraries.mjs
git commit -m "feat: isolate scoped objective results"
git -c http.version=HTTP/1.1 push
```

### Task 7: Final multi-screen and integration verification

**Files:**
- Modify `public/index.html` cache query.
- Modify only files required by confirmed failures.

- [ ] **Step 1: Update the asset cache version**

Set both asset queries to:

```html
/styles.css?v=20260802-lr-scope-libraries
/app.js?v=20260802-lr-scope-libraries
```

- [ ] **Step 2: Run the targeted full suite**

Run:

```powershell
node --check public\app.js
node --check server.js
node scripts\test-listening-reading-scope-libraries.mjs
node scripts\test-learning-flow.mjs
node scripts\test-learning-p0.mjs
node scripts\test-sitewide-focus-visual.mjs
node scripts\test-recommendation-ux.mjs
node scripts\test-reading-evidence-visual.mjs
node scripts\test-ipad-immersive-layout.mjs
node scripts\test-writing-speaking-contract.mjs
```

Expected: zero failures.

- [ ] **Step 3: Inspect current screenshots**

Regenerate and inspect Listening Full test/Section/Topic and Reading Full test/Passage/Topic at desktop, iPad landscape, iPad portrait, and mobile. Check hierarchy, empty states, card wrapping, filters, first-viewport primary action, and horizontal overflow.

- [ ] **Step 4: Commit and push the verified feature**

```powershell
git add public/index.html public/app.js public/styles.css server.js scripts/test-listening-reading-scope-libraries.mjs scripts/test-learning-flow.mjs
git commit -m "feat: decouple listening and reading practice scopes"
git -c http.version=HTTP/1.1 push
```

- [ ] **Step 5: Merge verified work into main**

Fast-forward `main`, rerun syntax, scope-library, learning-flow, and iPad immersive checks from the merged checkout, then push `main` through Clash. Do not deploy production or modify environment variables/database files.
