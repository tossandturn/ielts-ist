# IELTS-ist Homepage Focus Camp Design

**Date:** 2026-08-02

**Status:** Approved from the browser mockup after the user requested more energy, more emoji, visible scores, and visible practice history.

## Goal

Turn the existing functional Dashboard into an energetic IELTS student training home that makes the next practice obvious while keeping scores, recent attempts, streaks, the four independent skills, and AI Coach easy to scan.

## Product hierarchy

The homepage order is:

1. Personal greeting, target Band, exam countdown, and study streak.
2. One dominant current task: resume an unfinished session, complete onboarding, or start today's recommendation.
3. A full-mock summary sourced only from Same Test or Random Exam results.
4. Four skill cards with each skill's own latest result and state.
5. Recent practice history with date, source, result, and direct review action.
6. One compact AI Coach card that opens the existing global Coach drawer.
7. Existing saved Coach conversations and longer history remain reachable below the primary dashboard.

The current action remains the strongest object. Scores support the decision but do not compete with it.

## Visual direction

Use the approved “Focus Camp” direction:

- Deep navy navigation, bright indigo-to-purple current-task card, warm near-white content canvas.
- Emoji identifies navigation groups, practice types, task metadata, streaks, history, and Coach actions.
- Emoji supplements text and is never the only accessible label.
- Large sentence-case headings replace excessive small uppercase labels.
- Cards use 14–22px radii, quiet borders, and limited shadows.
- Listening uses cyan, Reading green, Writing amber, and Speaking pink.
- Native or bundled icon fallbacks remain available where emoji rendering is monochrome.

## Data and scoring contracts

The redesign does not invent scores.

- Listening and Reading show their latest objective result, such as `36/40`, and may show a Band only when the existing result already contains a normalized Band.
- Writing Task 1 and Task 2 remain independent attempts with independent Bands.
- Speaking shows the backend-canonical Band when available.
- A homepage overall Band appears only from a completed Same Test or Random Exam simulation. Independent practice attempts are never averaged into an overall Band.
- If no full mock exists, the summary card becomes an empty state that invites the student to run a diagnostic or full mock.
- Recent history is sourced from `mineLearningAttempts()` and existing Coach history. Empty history becomes a compact invitation rather than a blank panel.

## Component structure

### Personal header

Shows greeting, student name when signed in, target Band, exam countdown, and streak. Guest state uses a neutral greeting and retains login/account access.

### Current task hero

Reuses the existing current-task object and existing `data-home-action` routes. It includes:

- module emoji and task label;
- title and concise source;
- short “Why this now” explanation;
- time, completion, and next-output chips;
- primary action and optional secondary action.

Onboarding retains its goal form inside the hero. Resume retains saved progress and answer count.

### Full-mock summary

Shows the latest valid complete simulation overall Band and a compact trend when full-mock history exists. It never derives a value from unrelated independent attempts.

### Skill cards

Listening, Reading, Writing, and Speaking each show:

- emoji and module name;
- independent current status;
- latest valid score or diagnostic state;
- direct action using existing practice routes.

Writing copy explicitly indicates that Task 1 and Task 2 are independent.

### Recent practice

Displays up to four recent attempts. Each row contains module emoji, task/source, date, score, review count or score change where available, and an existing review/open action. A “View full history” action leads to the existing history surface.

### AI Coach

The homepage uses a compact Coach card with suggested prompts and one action that opens the existing global Coach drawer. It does not create a second chat history or a second Coach state.

## Responsive behavior

### Desktop, 1280px and wider

- Sidebar may be expanded or collapsed.
- Current task and full-mock summary share the first content row.
- Four skill cards form one row.
- Recent practice and Coach form a two-column lower row.

### iPad landscape, 1024×768

- Current task remains wider than the score summary.
- Four skill cards remain one compact row if readable; otherwise use two columns.
- Primary task CTA remains in the first viewport.

### iPad portrait, 768×1024

- Current task and mock summary stack so no fixed 238px rail compresses the task.
- Skills use two columns.
- Recent history appears before Coach.

### Mobile, 390×844

- Order is greeting, current task, skill cards, valid score summary, recent history, Coach, then extended history.
- Skill cards use two columns.
- Buttons are at least 44px high and no content causes horizontal overflow.
- Detailed history text truncates safely while score and action remain visible.

## States

- Guest: neutral greeting, goal/login cues, no fabricated score or streak.
- Onboarding: goal form remains the primary task.
- Recommended: today's recommendation is primary.
- Resume: saved session and progress are primary.
- No scores: skill cards show “Needs diagnostic”; full-mock card offers a full mock.
- No history: recent-practice panel offers the first diagnostic.
- Offline or unavailable learning data: existing local attempts remain visible and the task remains usable.

## Scope and safety

- Modify only homepage rendering, homepage helpers, homepage CSS, the frontend cache query, and targeted regression tests.
- Preserve practice routes, timers, drafts, scoring, AI calls, database contracts, and server environment variables.
- Do not deploy to production as part of this implementation unless separately requested.
- Commit and push the verified frontend changes to GitHub through the configured Clash proxy.

## Acceptance checks

- The current-task primary CTA is visible in the first viewport at 1280×720, 1024×768, 768×1024, and 390×844.
- Desktop and tablet show scores without allowing them to dominate the current task.
- Mobile shows the four skill choices before the full history area.
- No independent Writing attempt is combined into an overall score.
- Guest and empty states contain no invented Band, trend, streak, or history data.
- Sidebar-expanded and sidebar-collapsed layouts have no overlap or horizontal overflow.
- The homepage Coach action opens the one global Coach drawer.
- Existing Writing, Speaking, Listening, Reading, Same Test, and Random Exam routes remain intact.
