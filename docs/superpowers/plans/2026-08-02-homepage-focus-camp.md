# Homepage Focus Camp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dense Dashboard presentation with the approved energetic Focus Camp homepage while preserving every existing practice route and truthful score contract.

**Architecture:** Keep the existing single-page application and current Dashboard data sources. Add small pure helpers for emoji, per-skill attempt summaries, full-mock-only scores, and streaks; compose the new homepage from existing `data-home-action` routes. Use one final scoped CSS layer so the redesign does not disturb immersive practice screens.

**Tech Stack:** Vanilla JavaScript, HTML templates, CSS, Node.js assertions, Playwright with installed Chrome.

---

## File map

- `public/app.js`: Dashboard data helpers, Focus Camp markup, history and Coach composition.
- `public/styles.css`: Focus Camp visual system and responsive layout only.
- `public/index.html`: frontend asset query update.
- `scripts/test-homepage-focus-camp.mjs`: focused data-contract, interaction, and multi-viewport regression.
- `scripts/test-personal-dashboard-visual.mjs`: update legacy Dashboard expectations to the approved structure.

### Task 1: Lock the Focus Camp contract with a failing browser test

**Files:**
- Create: `scripts/test-homepage-focus-camp.mjs`

- [ ] **Step 1: Create a representative authenticated fixture**

The fixture must include four independent attempts, one valid completed simulation, a current recommendation, a weak area, Coach history, and a local resumable session. Use explicit `mode: "same-test"` only on the simulation attempt.

```js
const learningState = {
  profile: { targetBand: 7, examDate: "2026-09-13", dailyMinutes: 30, onboardingCompleted: true },
  attempts: [
    { attemptId: "mock-1", module: "exam", mode: "same-test", score: { band: 6.5 }, result: { overallBand: 6.5 }, submittedAt: "2026-08-01T08:00:00.000Z" },
    { attemptId: "listen-1", module: "listening", score: { correct: 30, total: 40 }, result: { correct: 30, total: 40 }, submittedAt: "2026-07-31T08:00:00.000Z" },
    { attemptId: "read-1", module: "reading", score: { correct: 34, total: 40 }, result: { correct: 34, total: 40 }, submittedAt: "2026-07-30T08:00:00.000Z" },
    { attemptId: "write-2", module: "writing", taskNumber: 2, score: { band: 6 }, result: { band: 6 }, submittedAt: "2026-07-29T08:00:00.000Z" },
    { attemptId: "speak-1", module: "speaking", score: { band: 6.5 }, result: { band: 6.5 }, submittedAt: "2026-07-28T08:00:00.000Z" },
  ],
  weakAreas: [{ id: "weak-1", module: "listening", summary: "Number and plural traps", status: "active" }],
  todayPlan: { kind: "retest", task: { module: "listening", mode: "review" }, reason: { text: "Retest number and plural traps.", sourceIds: ["listen-1"] } },
};
```

- [ ] **Step 2: Assert the approved semantic structure and score rules**

For `1280×720`, `1024×768`, `768×1024`, and `390×844`, assert:

```js
assert.equal(await page.locator(".dashboard-focus-camp").count(), 1);
assert.equal(await page.locator(".dashboard-focus-skill").count(), 4);
assert.match(await page.locator(".dashboard-focus-mock").innerText(), /Latest full mock[\s\S]*6\.5/i);
assert.match(await page.locator(".dashboard-focus-history").innerText(), /34\/40|Band 6\.0|Band 6\.5/);
assert.equal(await page.locator(".dashboard-focus-camp .primary").count(), 1);
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1);
```

Add a second fixture with independent Writing Task 1/Task 2 attempts and no simulation. Assert that `.dashboard-focus-mock` contains `No full mock yet` and does not display an invented overall Band.

- [ ] **Step 3: Assert interaction and responsive ordering**

Click the Focus Camp Coach action and verify `#helpChatPanel` becomes visible. On mobile, compare DOM rectangles so `.dashboard-focus-skills` appears before `.dashboard-focus-mock` and the primary CTA is within the first 844px.

- [ ] **Step 4: Run the test and verify RED**

Run:

```powershell
node scripts\test-homepage-focus-camp.mjs
```

Expected: FAIL because `.dashboard-focus-camp` and its approved children do not exist.

### Task 2: Add truthful homepage data helpers and Focus Camp markup

**Files:**
- Modify: `public/app.js:1593-2040`
- Test: `scripts/test-homepage-focus-camp.mjs`

- [ ] **Step 1: Add pure Dashboard helpers**

Implement:

```js
function dashboardModuleEmoji(moduleName) {
  return { listening: "🎧", reading: "📖", writing: "✍️", speaking: "🎙️", exam: "📝", coach: "🤖" }[moduleName] || "✨";
}

function dashboardFullMockAttempts(attempts = mineLearningAttempts()) {
  return attempts.filter((attempt) => /^(?:same-test|random-exam)$/i.test(String(attempt.mode || ""))
    && normalizeSpeakingBand(mineAttemptResult(attempt).overallBand || attempt.score?.band || ""));
}

function dashboardLatestSkillAttempt(moduleName, attempts = mineLearningAttempts()) {
  return attempts.find((attempt) => (attempt.module || mineAttemptResult(attempt).module) === moduleName) || null;
}
```

The full-mock helper must not accept `practice`, `writing`, `task1`, or `task2` modes.

- [ ] **Step 2: Replace the current Dashboard markup**

Update `renderDashboard()` to produce these top-level units:

```html
<section class="dashboard-focus-camp">
  <header class="dashboard-focus-header">...</header>
  <div class="dashboard-focus-priority">
    <section class="dashboard-focus-hero">...</section>
    <aside class="dashboard-focus-mock">...</aside>
  </div>
  <section class="dashboard-focus-skills">...</section>
  <div class="dashboard-focus-lower">
    <section class="dashboard-focus-history">...</section>
    <aside class="dashboard-focus-coach">...</aside>
  </div>
  ...existing extended history...
</section>
```

Retain `learningProfileForm`, the existing primary/secondary `data-home-action` values, `bindHomeControls`, `bindDashboardHistoryControls`, and Lucide refresh.

- [ ] **Step 3: Keep one Coach state**

Use `data-home-action="coach"` and `data-dashboard-coach-prompt` buttons only. Do not add a second chat log or store. Keep `renderCoach()` as the single global Coach renderer.

- [ ] **Step 4: Run syntax and focused test**

Run:

```powershell
node --check public\app.js
node scripts\test-homepage-focus-camp.mjs
```

Expected: syntax exit 0 and the focused test proceeds past semantic assertions; visual assertions may still fail until CSS exists.

### Task 3: Implement the Focus Camp visual system and responsive layout

**Files:**
- Modify: `public/styles.css` after the current final Dashboard layer
- Modify: `public/index.html:7,408`
- Test: `scripts/test-homepage-focus-camp.mjs`

- [ ] **Step 1: Add one scoped source-order CSS layer**

All new selectors must be rooted at `.dashboard-focus-camp` or use the `dashboard-focus-*` prefix. Define:

- deep navy navigation-compatible ink;
- indigo-purple task hero;
- cyan/green/amber/pink module accents;
- 14–22px radii and restrained shadows;
- emoji marks with text labels;
- desktop hero/mock two-column row;
- four skill cards;
- history/Coach two-column row.

- [ ] **Step 2: Add responsive ordering**

At `max-width: 1024px`, reduce the mock column and keep the hero dominant. At `max-width: 820px`, stack hero and mock and use two skill columns. At `max-width: 560px`, set `.dashboard-focus-priority` and `.dashboard-focus-lower` to `display: contents` so their children participate in the root Dashboard grid, then use this order:

```css
.dashboard-focus-hero { order: 1; }
.dashboard-focus-skills { order: 2; }
.dashboard-focus-mock { order: 3; }
.dashboard-focus-history { order: 4; }
.dashboard-focus-coach { order: 5; }
```

Keep tap targets at least 44px high and hide only secondary explanatory copy, not actions or scores.

- [ ] **Step 3: Update mutable asset query**

Change both `styles.css` and `app.js` query strings in `public/index.html` to one new shared `20260802-focus-camp` value.

- [ ] **Step 4: Run focused RED-to-GREEN verification**

Run:

```powershell
node scripts\test-homepage-focus-camp.mjs
```

Expected: four viewport PASS lines plus empty-state and Coach interaction PASS lines; screenshots written under `artifacts/homepage-focus-camp/`.

### Task 4: Update legacy Dashboard tests and run the regression matrix

**Files:**
- Modify: `scripts/test-personal-dashboard-visual.mjs`
- Test: existing Dashboard and unified-practice suites

- [ ] **Step 1: Replace obsolete AI Memory and inline Coach-form assertions**

Assert `.dashboard-focus-mock`, `.dashboard-focus-skills`, `.dashboard-focus-history`, and `.dashboard-focus-coach`; retain four skills, one primary CTA, horizontal overflow, and Coach drawer checks.

- [ ] **Step 2: Run the homepage and adjacent regression suites**

Run:

```powershell
node scripts\test-homepage-focus-camp.mjs
node scripts\test-personal-dashboard-visual.mjs
node scripts\test-dashboard-history-visual.mjs
node scripts\test-recommendation-ux.mjs
node scripts\test-ipad-immersive-layout.mjs
node scripts\test-writing-speaking-unified.mjs
node --check public\app.js
node --check server.js
```

Expected: every command exits 0 and every viewport reports no horizontal overflow.

- [ ] **Step 3: Inspect fresh screenshots**

Review the new timestamp/current images for:

- 1280×720 desktop with sidebar expanded and collapsed;
- 1024×768 iPad landscape;
- 768×1024 iPad portrait;
- 390×844 mobile;
- guest/empty state and resume state;
- current task CTA visibility;
- score/history readability;
- no text clipping or duplicate Coach surface.

- [ ] **Step 4: Commit and push verified implementation**

Stage only the intended frontend, test, and plan files. Commit with:

```powershell
git commit -m "Redesign homepage as IELTS focus camp"
git push origin main
```

Do not deploy to the Singapore server in this task.
