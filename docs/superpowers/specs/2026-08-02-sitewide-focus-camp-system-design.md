# IELTS-ist Site-wide Focus Camp Design System

**Date:** 2026-08-02

**Status:** Approved by the user with “都干”.

## Goal

Extend the approved homepage Focus Camp direction across IELTS-ist so the product feels like one coherent IELTS training system instead of a collection of separately styled pages. At the same time, make personal goals editable, add a four-skill radar profile, and preserve the low-distraction behavior of immersive exam workspaces.

The redesign must improve visual consistency without changing practice content, timers, scoring contracts, saved drafts, AI behavior, databases, or server environment variables.

## Current findings

The site already contains several strong page-specific systems, but they do not share one visual foundation:

- The homepage uses the new energetic indigo Focus Camp language.
- Listening and Reading launch screens use newer unified setup cards but retain older blue tokens and page framing.
- Speaking and Writing topic libraries use a clean card library with a different visual density and accent treatment.
- Mine, Vocabulary, Subscription, Same Test, and Random Exam use additional generations of cards, headings, and controls.
- Immersive practice layouts are functionally strong and should not inherit decorative homepage density.

The goal-setting defect has two confirmed causes:

1. `Set goal` is rendered as definition text inside a `<dl>`, not as an interactive control.
2. The onboarding form is hidden whenever a resumable local practice session takes priority, leaving no alternate goal-setting route.

## Design strategy

Use a layered migration rather than a global cosmetic override.

### Layer 1: shared design tokens

Promote the Focus Camp palette and component measurements into global tokens. The implementation uses these initial values unless an existing high-contrast exam control requires a stronger value:

- Canvas: `#f5f6fb`; raised canvas: `#eef0f8`; surface: `#ffffff`.
- Primary ink: `#18213d`; muted text: `#6f7892`; border: `#e4e7f0`.
- Brand: `#7357e8`; dark brand: `#5638c3`; soft brand: `#f0ecff`. A restrained brand gradient is reserved for primary moments.
- Module accents: Listening `#7657e8`, Reading `#3a9d85`, Writing `#f19a3e`, Speaking `#ed6486`.
- Radii: 12px controls, 16–20px cards, 24px hero surfaces.
- Borders: quiet cool gray with stronger indigo focus states.
- Shadows: one soft card shadow and one elevated overlay shadow.
- Typography: sentence case, compact labels, strong page titles, and no decorative uppercase paragraphs.
- Motion: 160–200ms hover/focus transitions; no motion that shifts answer content.

The existing CSS variables remain the compatibility layer. Their values and a small set of new semantic variables become the source of truth, so legacy surfaces improve before their markup is migrated.

### Layer 2: shared product components

Standardize these reusable visual patterns:

- application sidebar and active navigation;
- page intro/header with eyebrow, title, explanation, and optional actions;
- primary, secondary, quiet, and destructive buttons;
- text input, select, search, textarea, and field help/error states;
- metric badge, filter chip, status pill, and module badge;
- surface card, recommended card, mode card, topic card, pricing card, and empty state;
- setup shell, result shell, history row, and Coach entry;
- modal/drawer shell for focused settings such as IELTS goals.

Emoji may add energy to student-facing labels, but every interactive control keeps a text label and accessible name. Functional toolbars continue using the bundled icon system.

### Layer 3: page migrations

Migrate by workflow, not by isolated selector:

1. Homepage, goal editor, radar profile, and shared shell.
2. Listening and Reading setup/selection screens.
3. Writing and Speaking topic libraries and setup screens.
4. Vocabulary, Mine/history, and Subscription.
5. Same Test and Random Exam setup/report surfaces.
6. Immersive practice chrome and result surfaces.

Each phase must pass its own responsive and functional checks before the next phase begins.

## Personal goal editor

### Entry points

The homepage Target and Exam badges become real buttons. Both open the same focused goal editor. A small edit affordance appears on hover/focus, but the full badge remains the click target.

The editor contains:

- current Band;
- target Band;
- exam date;
- daily study minutes.

It uses the existing valid ranges and the existing server profile contract.

### Authenticated behavior

For signed-in users, Save sends the existing `PATCH /api/learning/profile` request, refreshes the today plan, updates the homepage immediately, and closes the editor only after a successful response. Failure keeps the editor open and shows an inline error without destroying entered values.

### Guest behavior

Guests can save the same four fields locally under a versioned guest-profile key. The local profile updates the target badge, countdown, daily plan, and radar estimate immediately. The editor explains that signing in is required for cross-device sync.

After sign-in, the server profile is authoritative. If it is incomplete, the editor may prefill missing fields from the local guest profile; the user still explicitly saves before anything is written to the account.

### Resume behavior

A resumable practice session continues to own the main task hero, but it no longer suppresses goal editing because goal editing has an independent entry point.

## Four-skill radar profile

### Placement

On desktop, the Scoreboard becomes a two-column overview: a radar card on the left and four skill cards in a 2×2 grid on the right. On iPad portrait and mobile, the radar card stacks above the skill cards. The full-mock card remains separate and keeps its official-score contract.

### Data hierarchy

Each Listening, Reading, Writing, and Speaking axis receives one value on a 0–9 strength scale:

1. A canonical stored Band is recorded evidence and uses that value directly.
2. An objective `correct/total` result without a stored Band becomes an estimated strength value using `roundToHalf(clamp(3, 9, correct / total * 9))`. It is never labeled as an official Band or IELTS conversion.
3. A missing skill uses the saved current Band when available.
4. If current Band is missing but other skills contain evidence, use the mean of available skill values.
5. If no evidence or profile exists, use a neutral 5.5 starter estimate.

The chart is a learning profile, not an overall IELTS result. It must never feed scoring, recommendations, history, or Same Test / Random Exam overall Bands.

### Truthful presentation

- The card shows `X recorded · Y estimated`.
- Recorded vertices use filled markers; estimated vertices use hollow markers.
- The accessible text list names every skill, source, and value.
- A short note states that estimated values guide practice only.
- Skill cards continue to show raw results such as `34/40` or independent Writing Task Bands.

The chart is rendered programmatically with a responsive high-DPI canvas and an equivalent accessible text summary. It must not require a new external chart dependency.

## Page-specific visual behavior

### Homepage

Keep the approved hierarchy. Add the goal editor and radar without weakening the current-task hero. The primary practice CTA remains the only primary button above the fold.

### Listening and Reading

Unify page intros, mode selectors, recommended practice, manual selection, and start actions. Once a paper opens, maintain the current split workspace, answer navigation, captions, evidence tools, and sticky controls.

### Writing and Speaking

Preserve independent Writing Task 1 / Task 2 libraries and the shared topic-library pattern. Standardize search, filters, category chips, topic cards, setup cards, timers, and result actions. Do not merge Writing tasks outside simulations.

### Vocabulary and Mine

Use the same page intro, metric badges, history rows, empty states, and action hierarchy. Preserve local drafts for guests and authenticated server data for members.

### Subscription

Keep the three-plan structure but align card radii, spacing, accent hierarchy, buttons, and responsive stacking with the shared system. The recommended plan remains visually strongest without creating a second brand palette.

### Same Test and Random Exam

Unify setup controls and reports. During an active simulation, use restrained colors and compact controls so the paper remains dominant. Combined Writing scoring remains available only here.

### AI Coach

Maintain one global Coach drawer and one conversation store. Page cards may open it with context, but no page creates a second composer or history implementation.

## Responsive behavior

The regression matrix covers 1280×720, 1024×768, 768×1024, and 390×844, with expanded and collapsed sidebar states where applicable.

- Desktop: balanced content widths, one clear primary action, no oversized empty canvas.
- iPad landscape: compact shell, readable two-column setup cards, no Coach rail compression.
- iPad portrait: stacked page sections, two-column card grids when readable, sticky tools remain reachable.
- Mobile: one-column page framing, two-column compact skill cards where proven, 44px controls, safe text wrapping, and no horizontal overflow.
- Immersive layouts: paper, audio, answer sheet, and question navigation retain their tested viewport behavior.

## Accessibility

- Goal badges are real buttons with visible focus states.
- The goal editor traps focus, exposes a title and description, supports Escape, and returns focus to its opener.
- Form errors are associated with fields or an `aria-live` summary.
- Radar information has a complete textual equivalent and does not rely on color alone.
- Module color and emoji always accompany text.
- Controls remain at least 44px on touch layouts.
- Reduced-motion preferences disable nonessential hover movement.

## Implementation phases

### Phase 1: foundation, goals, and radar

- Add shared semantic tokens and component primitives.
- Add effective guest/authenticated profile helpers.
- Add the goal editor and working badge entry points.
- Add radar data helpers, canvas rendering, and accessible summary.
- Update homepage regression fixtures and tests.

### Phase 2: learning entry surfaces

- Migrate Listening and Reading setup/selection.
- Migrate Writing and Speaking topic/setup surfaces.
- Preserve all existing selection, timer, draft, and recommendation behavior.

### Phase 3: account and supporting surfaces

- Migrate Vocabulary, Mine/history/auth, and Subscription.
- Verify guest and authenticated states.

### Phase 4: simulations and immersive chrome

- Migrate Same Test and Random Exam setup/report surfaces.
- Align toolbars, controls, results, and Coach entry in immersive practice.
- Re-run the existing iPad P0–P3 layout matrix.

## Safety and scope

- Do not change question banks, PDF assets, audio, scoring algorithms, AI prompts, databases, environment variables, or deployment configuration.
- Do not manufacture official Bands or combine independent Writing results.
- Do not replace the functioning split Reading layout, Listening caption system, Writing timers, Speaking examiner, or global Coach drawer.
- Do not deploy to production unless the user separately requests it.
- Commit and push verified phases to GitHub through the configured Clash proxy.

## Acceptance checks

- Target and Exam badges are keyboard- and pointer-operable.
- A guest can save and reload a local goal; a signed-in user can save and reload the server profile.
- Resume state no longer blocks goal editing.
- Radar renders four axes at every supported viewport and labels recorded versus estimated values.
- Radar estimates never appear in official result history or overall Band calculations.
- Shared tokens and components visibly align every main navigation surface with Focus Camp.
- Practice setup actions, topic selection, filters, history, authentication, subscription, and Coach routes still work.
- Independent Writing Task 1 and Task 2 contracts remain unchanged.
- Same Test and Random Exam combined scoring contracts remain unchanged.
- No horizontal overflow or clipped primary controls at the four target viewports.
- Existing learning-flow, recommendation, history, Writing/Speaking, Reading evidence, and iPad immersive tests pass.
