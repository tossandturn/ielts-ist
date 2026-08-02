# Site-wide Focus Camp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Focus Camp visual system across IELTS-ist, make personal goals editable for guests and members, and add a truthful four-skill radar profile without changing practice or scoring contracts.

**Architecture:** Keep the existing single-page application and large `public/app.js` / `public/styles.css` structure, adding narrowly named profile/radar helpers and a final shared visual-system CSS layer. Migrate page families through stable wrapper classes and existing component selectors. Use Playwright regression scripts to protect profile persistence, radar truthfulness, navigation, responsive layout, and the established practice flows.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Canvas 2D, Node.js, Playwright with installed Chrome, existing JSON/SQLite API.

---

## File map

- Modify `public/app.js`: effective profile, guest profile persistence, goal editor, radar data/rendering, shared view decoration hooks.
- Modify `public/index.html`: cache-busting version and stable Focus Camp classes on main page families.
- Modify `public/styles.css`: global tokens, shared components, goal dialog, radar, page-family migrations, responsive and reduced-motion rules.
- Create `scripts/test-homepage-goal-radar.mjs`: guest/member goal flows, resume coexistence, radar source contract, four viewport screenshots.
- Create `scripts/test-sitewide-focus-visual.mjs`: representative view styling, navigation, responsive overflow, and page screenshots.
- Modify `scripts/test-homepage-focus-camp.mjs`: radar and goal-entry expectations.
- Modify `scripts/test-learning-flow.mjs`: static contracts for the new goal/radar helpers and shared visual system.
- Modify `scripts/test-personal-dashboard-visual.mjs`: updated Scoreboard structure and goal entry.

### Task 1: Isolated workspace and baseline

**Files:**
- No production files.

- [ ] **Step 1: Detect isolation and create a named worktree**

Run:

```powershell
git rev-parse --git-dir
git rev-parse --git-common-dir
git branch --show-current
git worktree add D:\CodexWork\ielts-trainer-sitewide -b codex/sitewide-focus-camp
```

Expected: a clean worktree based on `main` at the checkpoint tag `focus-camp-v1` or its descendant.

- [ ] **Step 2: Install dependencies**

Run:

```powershell
npm install
```

Expected: dependency install completes without modifying tracked dependency metadata.

- [ ] **Step 3: Run the baseline contract suite**

Run:

```powershell
node --check public\app.js
node --check server.js
node scripts\test-homepage-focus-camp.mjs
node scripts\test-learning-flow.mjs
node scripts\test-writing-speaking-contract.mjs
node scripts\test-learning-p0.mjs
```

Expected: existing Focus Camp viewport checks, 35 learning-flow checks, Writing/Speaking contract, and P0 checks pass.

### Task 2: Goal and radar acceptance test — RED

**Files:**
- Create: `scripts/test-homepage-goal-radar.mjs`

- [ ] **Step 1: Write a browser contract that reproduces the goal bug**

Create a Playwright script that starts `server.js` on a unique port, opens the authenticated and guest homepage at 1280×720 and 390×844, and includes these assertions:

```js
assert.equal(await page.locator('[data-dashboard-goal="target"]').count(), 1);
await page.locator('[data-dashboard-goal="target"]').click();
await page.locator('#dashboardGoalDialog').waitFor({ state: 'visible' });
assert.equal(await page.locator('#dashboardGoalForm input, #dashboardGoalForm select').count(), 4);
assert.equal(await page.locator('.dashboard-skill-radar canvas').count(), 1);
assert.match(await page.locator('.dashboard-skill-radar').innerText(), /recorded|estimated/i);
```

The guest case fills current Band `6`, target Band `7.5`, exam date `2026-10-10`, and daily minutes `35`, submits, reloads, and asserts that the values survive in `ieltsistGuestLearningProfileV1` and the homepage badges.

The authenticated case intercepts `PATCH /api/learning/profile`, asserts the four submitted values, returns the saved profile, and verifies the dialog closes only after success.

The mixed-evidence fixture contains a recorded Speaking Band, a Reading `34/40` result with no Band, and missing Listening/Writing scores. It asserts the accessible radar list labels sources separately and the full-mock card still says `No full mock yet`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node scripts\test-homepage-goal-radar.mjs
```

Expected: FAIL because `[data-dashboard-goal]`, `#dashboardGoalDialog`, and `.dashboard-skill-radar` do not exist.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add scripts/test-homepage-goal-radar.mjs
git commit -m "test: define goal and radar homepage contract"
git push -u origin codex/sitewide-focus-camp
```

### Task 3: Effective profile and goal editor — GREEN

**Files:**
- Modify: `public/app.js` around storage constants, `dashboardPersonalSnapshot`, `renderDashboard`, `bindHomeControls`, and `refreshMineData`.
- Modify: `public/styles.css` in the Focus Camp layer.

- [ ] **Step 1: Add versioned guest-profile persistence**

Add the storage key and helpers:

```js
const guestLearningProfileStoreKey = "ieltsistGuestLearningProfileV1";

function readGuestLearningProfile() {
  try {
    const value = JSON.parse(localStorage.getItem(guestLearningProfileStoreKey) || "null");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function effectiveLearningProfile() {
  const remote = state.learningState?.profile;
  return remote && typeof remote === "object" ? remote : readGuestLearningProfile();
}
```

Use `effectiveLearningProfile()` everywhere the dashboard reads current Band, target Band, exam date, or daily minutes.

- [ ] **Step 2: Render real goal buttons and one dialog**

Change Target and Exam badges from passive `<div>` blocks to buttons:

```html
<button type="button" data-dashboard-goal="target" data-home-action="goal-editor">
  <span>🎯 Target</span><strong>Band 7.5</strong><em>Edit</em>
</button>
```

Append one dialog to the dashboard markup:

```html
<dialog id="dashboardGoalDialog" class="dashboard-goal-dialog" aria-labelledby="dashboardGoalTitle">
  <form id="dashboardGoalForm" method="dialog">
    <header><span>🎯 Personal plan</span><h2 id="dashboardGoalTitle">Set your IELTS goal</h2></header>
    <!-- currentBand, targetBand, examDate, dailyMinutes -->
    <p id="dashboardGoalMessage" aria-live="polite"></p>
    <footer><button type="button" data-goal-close>Cancel</button><button class="primary" type="submit">Save goal</button></footer>
  </form>
</dialog>
```

The four field ranges must match the existing onboarding form.

- [ ] **Step 3: Bind guest and authenticated saves**

Add `runHomeAction("goal-editor")` to call `showModal()` and retain the opening button. The submit handler must:

```js
const profile = {
  currentBand: Number(values.get("currentBand")),
  targetBand: Number(values.get("targetBand")),
  examDate: String(values.get("examDate") || ""),
  dailyMinutes: Number(values.get("dailyMinutes")),
  onboardingCompleted: true,
};
```

For guests, persist locally, close, and rerender. For members, PATCH the existing endpoint, fetch the today plan, update `state.learningState`, close, and rerender. On failure, keep the dialog open and render the error in `#dashboardGoalMessage`.

- [ ] **Step 4: Style the editor and interactive goal badges**

Add keyboard-visible focus rings, 44px touch targets, desktop centered dialog, mobile bottom-sheet behavior, inline errors, and `::backdrop`. Respect `prefers-reduced-motion`.

- [ ] **Step 5: Run the focused test**

Run:

```powershell
node scripts\test-homepage-goal-radar.mjs
```

Expected: goal-flow assertions pass; radar assertions still fail because the chart is not implemented.

### Task 4: Truthful radar profile — GREEN

**Files:**
- Modify: `public/app.js` near existing dashboard score helpers and `renderDashboard`.
- Modify: `public/styles.css` near `.dashboard-focus-skills`.

- [ ] **Step 1: Add deterministic radar data helpers**

Implement:

```js
function roundDashboardStrength(value) {
  return Math.round(Math.max(3, Math.min(9, Number(value) || 0)) * 2) / 2;
}

function dashboardRadarProfile(attempts = mineLearningAttempts(), profile = effectiveLearningProfile()) {
  // Return [{ module, label, value, source, recorded, display }]
  // Canonical Band -> recorded.
  // correct/total -> roundDashboardStrength(correct / total * 9), source "accuracy estimate".
  // missing -> currentBand, mean evidence, or 5.5, source "profile estimate".
}
```

Do not expose the derived strength as an official Band. Keep raw skill-card labels unchanged.

- [ ] **Step 2: Add radar markup and accessible text**

Render a card before the skill grid:

```html
<article class="dashboard-skill-radar" aria-labelledby="skillRadarTitle">
  <header><div><span>SKILL PROFILE</span><h3 id="skillRadarTitle">Your IELTS shape</h3></div><em>1 recorded · 3 estimated</em></header>
  <canvas width="320" height="260" aria-hidden="true"></canvas>
  <ul class="dashboard-radar-summary"><li>Listening · 6.0 · profile estimate</li></ul>
  <p>Estimated values guide practice only and never change an official Band.</p>
</article>
```

- [ ] **Step 3: Draw a responsive high-DPI canvas**

Implement `drawDashboardRadar(canvas, profile)` using five grid polygons, four axes, a translucent brand fill, filled recorded markers, and hollow estimated markers. Size from `canvas.getBoundingClientRect()`, multiply the backing store by `devicePixelRatio`, and redraw through `ResizeObserver` or a single debounced window-resize listener.

- [ ] **Step 4: Restructure Scoreboard layout**

Add `.dashboard-focus-scoreboard-grid` with a 300–340px radar column and a 2×2 skill-card grid. Stack on iPad portrait/mobile. Keep the full-mock card outside this grid.

- [ ] **Step 5: Verify GREEN and preserve score contracts**

Run:

```powershell
node scripts\test-homepage-goal-radar.mjs
node scripts\test-homepage-focus-camp.mjs
node scripts\test-writing-speaking-contract.mjs
```

Expected: all pass, including the independent Writing/no-full-mock contract.

- [ ] **Step 6: Commit and push Phase 1**

```powershell
git add public/app.js public/styles.css scripts/test-homepage-goal-radar.mjs scripts/test-homepage-focus-camp.mjs
git commit -m "Add editable goals and skill radar"
git push
```

### Task 5: Shared visual system contract — RED/GREEN

**Files:**
- Create: `scripts/test-sitewide-focus-visual.mjs`
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js` only if a stable view-decoration hook is required.

- [ ] **Step 1: Write the site-wide visual contract**

Create a Playwright script that starts a unique server, covers `home`, Listening, Reading, Writing, Speaking, Vocabulary, Mine, Subscription, Same Test, and Random Exam at 1280×720 and 390×844, and asserts:

```js
assert.equal(await page.locator('body.focus-camp-system').count(), 1);
assert.ok(metrics.overflow <= 1);
assert.ok(metrics.minInteractiveHeight >= 44 || metrics.viewportWidth > 600);
assert.match(metrics.primaryColor, /115, 87, 232|37, 99, 235/);
```

Capture one desktop and one mobile screenshot per page family under `artifacts/sitewide-focus-camp/`.

- [ ] **Step 2: Verify RED**

Run `node scripts\test-sitewide-focus-visual.mjs`.

Expected: FAIL because `body.focus-camp-system` and shared page-family styling do not exist.

- [ ] **Step 3: Promote the design tokens**

Update `:root` to the approved canvas, ink, muted, line, brand, brand-dark, brand-soft, module accent, radius, and shadow values. Add compatibility aliases so existing selectors continue to work:

```css
:root {
  --bg: #f5f6fb;
  --surface: #fff;
  --text: #18213d;
  --muted: #6f7892;
  --line: #e4e7f0;
  --accent: #7357e8;
  --accent-dark: #5638c3;
  --accent-soft: #f0ecff;
  --radius-control: 12px;
  --radius-card: 18px;
  --shadow-card: 0 12px 30px rgba(42, 31, 89, .07);
}
```

- [ ] **Step 4: Add stable page-family classes**

Add `class="focus-camp-system"` to `<body>` and classes such as `focus-page focus-page-simulation`, `focus-page-practice`, `focus-page-library`, and `focus-page-account` to existing view sections. Do not create new routes or duplicate content.

- [ ] **Step 5: Standardize shared controls and surfaces**

Add final-layer rules for sidebar navigation, `.view-head`, `.panel`, `.primary`, `.secondary`, `.icon-btn`, `.text-input`, `select`, `textarea`, `.topic-category-pill`, `.mode-pill`, `.feedback`, `.empty-list`, `.unified-practice-setup`, and `.unified-result-shell`. Use shared token values and module accents; keep selectors scoped under `body.focus-camp-system`.

- [ ] **Step 6: Run the contract**

Run `node scripts\test-sitewide-focus-visual.mjs`.

Expected: all page families load, have no horizontal overflow, and expose the shared system marker.

### Task 6: Learning entry surfaces

**Files:**
- Modify: `public/styles.css` selectors for Single, Writing, Speaking, and unified setup.
- Modify: `public/app.js` only for semantic wrapper classes emitted by `renderSingleLaunch`, `renderWritingUploadHub`, and `renderBankList`.

- [ ] **Step 1: Migrate Listening and Reading launch surfaces**

Unify the page intro, three mode cards, recommended/manual selection cards, reason block, select controls, and start actions. Apply module accents through `data-setup-module` / `data-module` rather than hardcoded duplicated colors.

- [ ] **Step 2: Migrate Writing and Speaking libraries**

Give both libraries the same toolbar height, category pills, card padding, topic metadata, Choose action, pagination, setup shell, and empty state. Preserve Task 1/Task 2 tabs and their independent selection state.

- [ ] **Step 3: Verify navigation and responsive layout**

Run:

```powershell
node scripts\test-sitewide-focus-visual.mjs
node scripts\test-writing-visual.mjs
node scripts\test-writing-speaking-unified.mjs
node scripts\test-recommendation-ux.mjs
```

Expected: all pass at desktop/iPad/mobile sizes.

- [ ] **Step 4: Commit and push Phase 2**

```powershell
git add public/app.js public/styles.css public/index.html scripts/test-sitewide-focus-visual.mjs
git commit -m "Unify IELTS practice entry surfaces"
git push
```

### Task 7: Supporting and account surfaces

**Files:**
- Modify: `public/styles.css` selectors for Vocabulary, Mine/auth/history, Subscription, and Coach.
- Modify: `public/app.js` only if renderers need stable semantic classes.

- [ ] **Step 1: Align Vocabulary and history surfaces**

Use the shared page intro, metric badges, cards, rows, empty states, controls, and module accents. Preserve flashcard behavior, attempt actions, weak-area retests, and saved Coach conversations.

- [ ] **Step 2: Align guest/member Mine states**

Use the shared form, panel, plan, quick-action, and history patterns. Preserve device drafts for guests, login/register, logout, redemption, sync, and member data.

- [ ] **Step 3: Align Subscription and Coach**

Keep the three-plan layout, make Pro the single featured card, normalize button hierarchy, and align mobile stacking. Restyle the global Coach drawer with the same tokens without creating another Coach surface.

- [ ] **Step 4: Verify supporting flows**

Run:

```powershell
node scripts\test-sitewide-focus-visual.mjs
node scripts\test-dashboard-history-visual.mjs
node scripts\test-learning-api.mjs
```

Expected: visual, history, auth-learning API, and Coach-history checks pass.

- [ ] **Step 5: Commit and push Phase 3**

```powershell
git add public/app.js public/styles.css
git commit -m "Unify account and support surfaces"
git push
```

### Task 8: Simulations and immersive chrome

**Files:**
- Modify: `public/styles.css` selectors for `#exam`, `#sequence`, `.exam-quick-nav`, immersive toolbars, answer/review/result shells.
- Modify: `public/index.html` only for stable simulation wrapper classes already defined in Task 5.

- [ ] **Step 1: Align simulation setup and reports**

Apply shared intros, filters, timers, setup actions, notices, report cards, result tabs, and download actions to Same Test and Random Exam.

- [ ] **Step 2: Align immersive chrome without changing paper geometry**

Restyle only toolbars, sticky timer, back/submit, Coach/annotation controls, answer action bars, and result shells. Do not change Reading split ratios, PDF page sizing, Listening caption placement, question rails, or timer behavior.

- [ ] **Step 3: Verify P0–P3 and score isolation**

Run:

```powershell
node scripts\test-ipad-immersive-layout.mjs
node scripts\test-reading-evidence-visual.mjs
node scripts\test-speaking-regressions.mjs
node scripts\test-writing-speaking-contract.mjs
node scripts\test-learning-p0.mjs
```

Expected: all immersive, evidence, speaking, Writing weighting, and P0 checks pass.

- [ ] **Step 4: Commit and push Phase 4**

```powershell
git add public/styles.css public/index.html
git commit -m "Align simulation and immersive practice chrome"
git push
```

### Task 9: Final visual comparison and integration

**Files:**
- Modify only files required by confirmed visual or functional failures.

- [ ] **Step 1: Run syntax and full targeted regression matrix**

Run:

```powershell
node --check public\app.js
node --check server.js
node scripts\test-homepage-goal-radar.mjs
node scripts\test-homepage-focus-camp.mjs
node scripts\test-sitewide-focus-visual.mjs
node scripts\test-personal-dashboard-visual.mjs
node scripts\test-dashboard-history-visual.mjs
node scripts\test-learning-flow.mjs
node scripts\test-recommendation-ux.mjs
node scripts\test-writing-speaking-contract.mjs
node scripts\test-learning-p0.mjs
node scripts\test-ipad-immersive-layout.mjs
```

Expected: zero failures.

- [ ] **Step 2: Compare before/after screenshots**

At 1280×720 and 390×844, compare the saved checkpoint screenshots or `focus-camp-v1` browser render against the new screenshots for Home, Single launch, topic library, Subscription, and an immersive Reading workspace. Fix only visible inconsistencies: cropping, overlap, density, spacing, typography, borders, radii, or incorrect hierarchy.

- [ ] **Step 3: Update cache query and rerun critical checks**

Change both stylesheet and script query strings in `public/index.html` to `20260802-sitewide-focus-camp`, then rerun syntax, goal/radar, sitewide visual, and iPad immersive tests.

- [ ] **Step 4: Merge and push**

After verification, use the finishing-development workflow to merge `codex/sitewide-focus-camp` into `main`, rerun the critical suite on merged `main`, and push `main` through the configured Clash proxy. Do not deploy production or alter environment variables/database files.

