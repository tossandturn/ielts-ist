# Unified Writing and Speaking Learning Loop Implementation Plan

> **For implementer:** Use TDD throughout. Write failing tests first and verify them before production edits.

**Goal:** Deliver the approved P0-P3 Writing and Speaking flow: Entry -> Setup -> Practice -> AI Feedback -> Evidence -> Improve -> Retest.

**Architecture:** Keep the current vanilla HTML/JS application and introduce shared practice-stage and result primitives. Preserve the existing realtime Speaking transport and Writing feedback endpoint, while replacing incorrect UI state and aggregation behavior at their source.

**Tech Stack:** Node.js, vanilla JavaScript, CSS, Playwright, existing Qwen writing and realtime speaking APIs.

---

### Task 1: P0 state and submission correctness

**Files:** `public/index.html`, `public/app.js`, `scripts/test-writing-speaking-unified.mjs`

1. Add failing tests for Writing load fallback, mode-preserving prompt collapse, active Task Coach context, disabled empty custom grading, dynamic Task target, running timer, separate Task scoring, weighted overall, and same-scale rewrite feedback.
2. Run the test and confirm each assertion fails for the expected current behavior.
3. Implement the minimal state and scoring corrections.
4. Run the target test and existing learning-flow tests.

### Task 2: Shared Entry and Setup stages

**Files:** `public/index.html`, `public/app.js`, `public/styles.css`, `scripts/test-writing-speaking-unified.mjs`

1. Add tests for shared entry cards, recent draft placement, Writing topic detail/set choice, Exam/Coach setup, and Speaking device checks before session start.
2. Implement shared stage markup and state helpers without changing realtime transport internals.
3. Verify entry-to-setup-to-practice transitions for both modules.

### Task 3: Shared Workspace and Result stages

**Files:** `public/app.js`, `public/styles.css`, `scripts/test-writing-speaking-unified.mjs`

1. Add tests for 36/64 workspace layout, no pre-result score column, deferred cue card, transcript mode behavior, four result tabs, evidence and history content, and visible first-screen action.
2. Replace Writing and Speaking result composition with shared Overview/Evidence/Improve/History tabs.
3. Preserve downloads under a More menu and keep primary improvement actions visible.

### Task 4: P2 evidence and contract normalization

**Files:** `public/app.js`, `server.js`, `scripts/test-writing-speaking-unified.mjs`

1. Add contract tests for attempt, score, highestImpact, evidence, nextAction, and retest.
2. Add Writing task-specific score/evidence ranges and Speaking timestamp/audio-evidence qualification.
3. Verify evidence is traceable to submitted text/transcript and pronunciation claims are qualified.

### Task 5: P3 visual system and responsive acceptance

**Files:** `public/styles.css`, `scripts/test-writing-speaking-unified.mjs`

1. Replace legacy gradients, score circles, radar, deep nested cards, oversized radii, and emoji controls in the touched flow.
2. Verify 1280x720, 1024x768, 768x1024, and 390x844: no horizontal overflow, mobile primary action in the first viewport, iPad portrait single-column Speaking, and compact result actions.
3. Run all relevant regression tests and inspect screenshots.

**Constraint:** Keep all work local. Do not commit or push Git.
