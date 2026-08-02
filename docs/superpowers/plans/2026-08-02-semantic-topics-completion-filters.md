# Semantic Topics and Practice Completion Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace question-type Topic practice with semantic content topics and add completed/uncompleted markers and filters to all four IELTS module libraries.

**Architecture:** Generate a small, committed Listening/Reading semantic-topic cache offline from unchanged ASR/OCR content, then surface the same canonical Section/Passage units through both number and Topic views. Project submitted attempts into one additive, user-partitioned completion index and server learning state, and use that index for status badges and filtering without treating drafts or opened sessions as completed.

**Tech Stack:** Vanilla JavaScript, CSS, Node.js HTTP server, SQLite practice attempts, existing Cambridge JSON/OCR data, localStorage learning-loop history, Playwright with installed Chrome.

---

## File map

- Create `scripts/generate-objective-semantic-topics.mjs`: validated ASR/OCR semantic-topic cache generator.
- Create `data/objective-semantic-topics.json`: small generated topic catalog keyed by canonical Section/Passage ID.
- Modify `server.js`: load semantic topic payloads and project complete items from `practice_attempts`.
- Modify `public/index.html`: completion filter controls for single, Writing, and Speaking libraries; asset version.
- Modify `public/app.js`: canonical completion keys/index, semantic Topic virtual units, filters, badges, and submission recording.
- Modify `public/styles.css`: compact status badges and responsive filter controls.
- Modify `scripts/test-listening-reading-scope-libraries.mjs`: semantic topic and Section/Passage filter contract.
- Create `scripts/test-practice-completion-filters.mjs`: four-module completion truth, filters, persistence, and responsive contract.
- Modify `docs/superpowers/specs/2026-08-02-listening-reading-scope-libraries-design.md`: supersede the earlier question-type Topic definition.

### Task 1: Semantic-topic API contract — RED/GREEN

**Files:**
- Modify: `scripts/test-listening-reading-scope-libraries.mjs`
- Create: `scripts/generate-objective-semantic-topics.mjs`
- Create: `data/objective-semantic-topics.json`
- Modify: `server.js`

- [ ] **Step 1: Write failing semantic metadata assertions**

Assert that `cam15-l-test1.contentTopics[1]` describes recruitment as Work, Section 2 holidays as Travel, Section 4 eucalyptus as Nature/Environment, and that `cam15-r-test1.contentTopics[1]` has a semantic key/title. Assert no content topic key equals a question type such as `note_completion` or `matching`.

```js
assert.equal(listeningPaper.contentTopics["1"].key, "work");
assert.equal(listeningPaper.contentTopics["2"].key, "travel");
assert.ok(["nature", "environment"].includes(listeningPaper.contentTopics["4"].key));
assert.ok(readingPaper.contentTopics["1"].key);
assert.ok(!listeningTypes.has(listeningPaper.contentTopics["1"].key));
```

- [ ] **Step 2: Run the contract and verify expected RED**

Run `node scripts/test-listening-reading-scope-libraries.mjs`.

Expected: failure because `contentTopics` is absent.

- [ ] **Step 3: Implement deterministic content metadata**

Generate and commit `data/objective-semantic-topics.json` offline. Validate Listening Section markers/question ranges, use explicit overrides for known cache mismatches (including Cambridge 9 Test 4 Sections 3/4), and keep runtime `/api/tasks` loading the compact catalog instead of reparsing the ASR/OCR corpus.

Add a catalog whose entries contain `key`, `label`, `emoji`, and weighted keywords. Split Listening OCR by `PART/SECTION 1–4`, split Reading OCR by `READING PASSAGE 1–3`, extract the first content heading after IELTS instructions, and classify only semantic text. Return:

```js
contentTopics: {
  1: { key: "work", label: "Work", emoji: "💼", title: "Bankside Recruitment Agency" }
}
```

Use `{ key: "general", label: "General interest", emoji: "✨", title }` when no category has reliable evidence.

- [ ] **Step 4: Re-run and commit**

Run `node --check server.js` and the scope-library test. Commit as `feat: expose semantic listening and reading topics`.

### Task 2: Canonical completion index — RED/GREEN

**Files:**
- Create: `scripts/test-practice-completion-filters.mjs`
- Modify: `public/app.js`
- Modify: `server.js`

- [ ] **Step 1: Write the completion truth contract**

Seed a local in-progress session and assert the item is Not completed. Seed/submission history and assert it becomes Completed. Cover canonical keys:

```js
[
  "listening:cam15-l-test1::section::1",
  "reading:cam15-r-test1::section::2",
  "writing:cam15-w-test1-task1",
  "speaking:cam15-s-test1"
]
```

Also assert the learning-state API returns distinct completed item IDs beyond its 20-attempt display limit.

- [ ] **Step 2: Verify RED**

Run `node scripts/test-practice-completion-filters.mjs`.

Expected: failure because no shared completion index or API projection exists.

- [ ] **Step 3: Implement completion helpers**

Persist exact local completions in a user-partitioned `ieltsistCompletedItemsV1` index and queue failed remote archival in `ieltsistPendingLearningAttemptsV1`. Migrate legacy history only when an exact canonical item ID exists.

Add helpers with these contracts:

```js
practiceCompletionKey(moduleName, item) -> `${moduleName}:${canonicalId}`
readPracticeCompletionIndex() -> { [key]: { completedAt, attemptId } }
rememberPracticeCompletion(moduleName, item, result) -> updated index
practiceCompletionStatus(moduleName, item) -> { completed, completedAt }
```

Canonicalize semantic Topic units to their Section/Passage IDs. Merge local `completedItems`, legacy objective/Writing/Speaking histories, and `state.learningState.completedItems` at read time.

- [ ] **Step 4: Project every remote completion**

In learning state, query distinct non-empty `(module, item_id)` rows ordered by latest submission and return:

```js
completedItems: [{ module, itemId, completedAt, attemptId }]
```

Do not change the database schema.

- [ ] **Step 5: Record all four modules**

A completed full Listening/Reading paper marks its contained Sections/Passages completed; completing one unit never marks the full paper completed.

Call `rememberPracticeCompletion` from objective, Writing, and Speaking result persistence. Ensure new Writing records include the exact task ID and Speaking records use `topicId`.

- [ ] **Step 6: Re-run and commit**

Run the completion contract plus `node scripts/test-learning-api.mjs`. Commit as `feat: track canonical practice completion`.

### Task 3: Listening and Reading semantic libraries and filters — RED/GREEN

**Files:**
- Modify: `scripts/test-listening-reading-scope-libraries.mjs`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Replace old Topic assertions with semantic-unit assertions**

Assert Topic cards expose `data-content-topic`, use complete Section/Passage question ranges, and never expose `data-topic-type`. Assert filters can combine Cambridge 15, Section 2/Passage 2, semantic topic, and completion status.

- [ ] **Step 2: Verify RED**

Run the scope-library test and confirm it fails because Topic still groups by question type and filter controls are absent.

- [ ] **Step 3: Derive semantic Topic views**

Build Topic options from four Listening Sections or three Reading Passages using `paper.contentTopics[number]`. Keep the canonical Section/Passage completion key while setting `libraryScope: "topic"` for navigation and session restore. Preserve old `::topic::<question-type>` lookup only for legacy saved sessions.

- [ ] **Step 4: Add filter controls**

Add `singleUnitFilter`, `singleTopicFilter`, and `singleCompletionFilter`. Populate unit values from scope/module and topic values from visible content metadata. Apply filters after Cambridge book/test filtering and before rendering cards.

- [ ] **Step 5: Add status labels**

Render `✓ Completed` or `○ Not completed` on every unit card. Append status text to full-paper selector options and recommended paper cards.

- [ ] **Step 6: Re-run and commit**

Run scope-library, mobile, iPad immersive, and ASR-cache regression tests. Commit as `feat: add semantic topic and progress filters`.

### Task 4: Writing and Speaking completion UI — RED/GREEN

**Files:**
- Modify: `scripts/test-practice-completion-filters.mjs`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] **Step 1: Write failing four-module UI assertions**

Assert Writing and Speaking toolbars expose All/Not completed/Completed. Seed one completed and one untouched item per module, select each filter, and assert the correct cards/rows remain.

- [ ] **Step 2: Verify RED**

Run `node scripts/test-practice-completion-filters.mjs` and confirm missing filters/badges.

- [ ] **Step 3: Implement Writing status**

Add `writingCompletionFilter`. Individual Task 1 cards show their task status. Task 2 group cards show `x/y completed`, and every question row in the chooser shows the individual status. Filter groups if at least one contained question matches, then filter rows again in the chooser.

- [ ] **Step 4: Implement Speaking status**

Add `bankCompletionFilter`. Topic group cards show `x/y completed`; set chooser rows show individual status. Completed/uncompleted filters operate on the contained set IDs.

- [ ] **Step 5: Re-run and commit**

Run completion, Writing/Speaking unified, recommendation UX, and speaking regression tests. Commit as `feat: show completion across writing and speaking`.

### Task 5: Responsive polish, compatibility, and final verification

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `docs/superpowers/specs/2026-08-02-listening-reading-scope-libraries-design.md`

- [ ] **Step 1: Add responsive status/filter styles**

Keep controls at least 44px, wrap filter rows without horizontal overflow, use green Completed and neutral Not completed badges with visible text, and preserve bounded card-library scrolling.

- [ ] **Step 2: Update asset cache version and superseded docs**

Set both frontend asset queries to `20260802-semantic-topics-completion`. Add a note to the earlier scope-library design that its question-type Topic definition is superseded by the semantic-topic specification.

- [ ] **Step 3: Run full verification**

Run:

```powershell
node --check public/app.js
node --check server.js
node scripts/test-listening-reading-scope-libraries.mjs
node scripts/test-practice-completion-filters.mjs
node scripts/test-learning-flow.mjs
node scripts/test-learning-p0.mjs
node scripts/test-learning-api.mjs
node scripts/test-writing-speaking-unified.mjs
node scripts/test-speaking-regressions.mjs
node scripts/test-ipad-immersive-layout.mjs
node scripts/test-sitewide-focus-visual.mjs
```

Expected: all contracts pass, no desktop/iPad/mobile overflow, no ASR or full-exam regression.

- [ ] **Step 4: Commit, merge, and push**

Commit as `feat: complete semantic practice tracking`, fast-forward `main`, push through the configured Git proxy, restart only the local 4321 preview, and verify GitHub `main` equals local HEAD. Do not deploy production.
