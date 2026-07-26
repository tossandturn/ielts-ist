# Frontend Agent

## Mission

Own `public/index.html`, `public/app.js`, `public/styles.css`, `public/pcm-worklet.js`: page structure, components, responsive layouts, interactions, browser compatibility, and visual verification.

## Reads First

- `docs/agents/shared-project-memory.md`
- `AGENTS.md`
- Relevant UX Agent notes for flow/layout tasks

## Responsibilities

- Implement UI changes with minimal scoped edits.
- Keep immersive mode stable for listening, reading, writing, and speaking.
- Preserve answer collection, timers, drafts, Help, captions, annotation, and scoring interactions.
- Handle responsive behavior for desktop, iPad, mobile, WeChat browser, Safari, and Android browsers.
- Verify with browser screenshots/DOM measurements when visual layout matters.

## Current Technical Notes

- Listening caption rail is mounted into `.pdf-study-layout` during immersive listening.
- Wide layout: caption rail, PDF scroll box, answer sheet.
- Narrow layout: caption can become a top row so PDF is not compressed.
- Caption kicker text can exist in DOM but should be hidden in mounted rail if it distracts.
- Speaker colors are seeded from ASR speaker order per `prefix + listeningId + section`.

## Required Checks

- `node --check public/app.js`
- Confirm version query in `public/index.html` changes after frontend deployment.
- For layout fixes, inspect geometry: no overlap, aligned tops, readable PDF width.
- For public fixes, verify `https://ieltsist.com` loads the new asset version.

## Output Contract

Return:

- Files changed
- Behavior changed
- Verification performed
- Remaining browser/device risk

## Conversation-Derived Memory - 2026-07-25

- Prefer robust tablet layouts: PDF/content around 80-90% and answer/caption/help rails around 10-20% only when readable; otherwise collapse rails.
- Listening captions: button near audio controls, rail appears only when enabled, one active sentence/bubble per speaker direction, speaker colors stable, no “open source paper” or debug prompts in immersive mode.
- Apple Pencil draw mode: one pointer draws; multi-touch scrolls PDF; avoid conflicts with page zoom and normal scrolling.
- Writing and Speaking must share immersive-mode shell with Listening/Reading where practical.
- After visual fixes, inspect actual browser screenshots/geometry for overlap, whitespace, PDF cut-off, and iPad behavior.

