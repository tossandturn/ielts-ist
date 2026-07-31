# IELTSist AI Learning Loop P0

## Product loop

`Today's Plan -> Practice -> AI Feedback -> Review -> Retest`

The P0 must turn the existing module entry cards into a working learning loop without replacing the stable PDF, annotation, caption-cache, or realtime speaking implementations.

## Delivery slices

1. Keep the dashboard decision-first: one data-driven mission, one reason, time, output, Start Practice, Ask AI Coach, then compact skill and recent-asset entries.
2. Make single-module modes behavioral:
   - Listening Exam: complete paper, 40 questions, captions off by default.
   - Listening Training: one selected section, 10 questions, that section's audio and captions.
   - Listening Review: latest wrong answers for the same paper.
   - Reading modes change the active question range; portrait layouts expose Passage, Questions, and Answers as explicit views.
3. Render objective results as review items with student answer, correct answer, evidence prompt, weak-area save, and retest actions.
4. Add a real Writing rewrite editor and second scoring pass with before/after criteria.
5. Make Speaking result actions retain the current topic and weakest criterion for Part 2 and fluency retests.
6. Enrich the global AI Coach context with current answers, latest objective result, writing attempt/feedback, speaking transcript/report, and focused review question. Add Save vocabulary and Generate similar question actions.

## Regression boundaries

- Do not change listening ASR cache generation or caption timing.
- Do not change Cambridge page classification or question-number placement.
- Do not change Apple Pencil draw, erase, clear-paper, or multi-touch scrolling.
- Do not change realtime microphone transport, VAD, scoring, or disconnect behavior.
- Do not submit Git or synchronize the Singapore deployment in this iteration.

## Acceptance viewports

- Desktop: 1280x720.
- iPad landscape: 1024x768; Reading remains split.
- iPad portrait: 768x1024; the plan CTA is in the first viewport and Reading uses explicit pane controls.
- Mobile: 390x844; practice uses pane steps rather than squeezed columns.

## Required verification

- `node --check public/app.js`
- `node --check server.js`
- Browser click tests for dashboard Start, AI Coach, Listening Training, Listening Review, Reading portrait panes, Writing Rewrite, and Speaking result actions.
- Visual screenshots for all four acceptance viewports.
