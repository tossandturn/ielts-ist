# Listening and Reading Scope Libraries Design

**Date:** 2026-08-02

**Status:** Approved through the user's repeated directive to add decoupled Section and Topic practice while preserving the existing content, together with the standing instruction to proceed without further questions.

## Goal

Turn Listening with AI and Reading with AI into four independent practice libraries:

1. Full tests;
2. Sections for Listening and Passages for Reading;
3. Topics, defined as IELTS question-type practice;
4. Review mistakes.

The change must preserve every existing Cambridge paper, the current full-test experience, captions, PDFs, evidence tools, scoring, saved sessions, history, Same Test, and Random Exam.

## Current product gap

The product already contains partial scoped behavior:

- Listening Training mode can filter one ten-question Section.
- Reading Evidence mode can filter one Passage.
- Reading Question Type mode can filter one recognized question type.
- Review mode can filter the latest wrong answers.

These behaviors are currently presented as modes attached to one paper selector. They share the same paper identity and answer/restoration state, so they are not independent libraries. Listening questions also reach the browser without question-type metadata, which prevents a truthful Listening Topic library.

## Chosen architecture

Use derived virtual practice units rather than copying Cambridge data or creating a second question bank.

Every virtual unit references one unchanged source paper and carries a stable ID:

```text
cam15-l-test1::section::1
cam15-l-test1::topic::multiple_choice
cam15-r-test1::section::2
cam15-r-test1::topic::matching_headings
```

The unit contains a filtered view of the original questions and media, while the source paper remains authoritative. Full-test units continue using their original IDs. Same Test and Random Exam continue consuming only original complete papers and never see virtual units.

This approach was selected over two alternatives:

- Materializing new JSON banks would duplicate copyrighted/imported content and create synchronization risk.
- Adding separate Section and Topic APIs would introduce unnecessary backend state for data that can be deterministically derived from the existing task payload.

## Practice scopes

### Full tests

- Listening: the current 40-question Exam mode, 30-minute timer, original four audio sections, PDFs, captions policy, submission, and score.
- Reading: the current 40-question split paper, 60-minute timer, passage/question panes, evidence tools, submission, and score.
- Original IDs, titles, filters, recommendations, and content stay unchanged.

### Sections and Passages

- Listening exposes four units per complete paper: Section 1 Q1-10, Section 2 Q11-20, Section 3 Q21-30, and Section 4 Q31-40.
- Reading exposes three units per complete paper: Passage 1 Q1-13, Passage 2 Q14-26, and Passage 3 Q27-40.
- Each unit keeps only its relevant question pages. Listening keeps only the relevant audio URL; Reading keeps the relevant passage/question pages.
- Listening Section timer is 10 minutes. Reading Passage timer is 20 minutes.
- A Section/Passage unit has its own stable selection, answers, saved session, score record, recommendation rotation, and review source.

### Topics

In this feature, Topic means an IELTS objective question type, not a guessed semantic subject. Examples include Multiple choice, Note completion, Map/plan labelling, Matching headings, True/False/Not Given, Summary completion, and Short answer.

- Server-side OCR instruction parsing attaches `type`, `typeLabel`, and `questionPage` metadata to Listening questions, matching the existing Reading metadata contract.
- Topic units are derived per source paper and contain only questions of one recognized type.
- Unrecognized questions remain available in Full tests and Sections/Passages. The product never invents a type merely to fill a card.
- Listening Topic timer is 10 minutes. Reading Topic timer is 20 minutes.
- A Topic unit has its own stable selection, answers, saved session, score record, and review source.

### Review mistakes

- The existing wrong-answer review remains available as a fourth library tab.
- Review resolves against the exact source unit that produced the attempt, so a Passage 2 result cannot overwrite a Full test or another Topic result.
- Legacy module-level results remain readable as a fallback for old Full-test sessions.

## State and persistence

Add these backward-compatible state concepts:

```js
singlePracticeScopes = { listening: "paper", reading: "paper" };
singleScopePages = { listening: { section: 1, topic: 1 }, reading: { section: 1, topic: 1 } };
```

The current legacy mode values map to scopes:

| Module | Legacy mode | New scope |
|---|---|---|
| Listening | `exam` | `paper` |
| Listening | `training` | `section` |
| Listening | `review` | `review` |
| Reading | `full` | `paper` |
| Reading | `evidence` | `section` |
| Reading | `type` | `topic` |
| Reading | `review` | `review` |

New sessions continue using the version-1 session envelope and add `scopes`. The unique virtual `itemId` becomes the answer and attempt identity. Old sessions with a base paper ID and legacy mode restore through the mapping above without migration writes.

Local objective history keeps the latest module result for existing dashboard consumers and adds an `objectiveScopes` map keyed by virtual unit ID. Server attempt records already accept arbitrary item IDs and will therefore preserve scoped attempts without a database migration.

## User interface

The existing Listening/Reading launch hero stays. Replace the current mode-card row with a four-tab library switch:

- Full tests;
- Sections or Passages;
- Topics;
- Review mistakes.

Full tests retain the current recommended and choose-yourself cards. Section/Passage and Topic libraries use Focus Camp compact cards with:

- module emoji and scope badge;
- Cambridge book/test source;
- section/passage or question-type title;
- question count and time;
- direct Choose action.

The libraries use the existing Cambridge book/test filters and 12-card pagination. Mobile uses one column and 44px controls; iPad and desktop use responsive card grids. Once a unit starts, the current immersive workspace remains dominant and no new rail or overlay is introduced.

## Scoring and truthful labels

- Scoped attempts score only the questions in the selected unit and display raw `correct/total`.
- A 10-question Section, 13-question Passage, or question-type subset never claims to be a 40-question IELTS Band.
- Full-test Band behavior remains unchanged where the existing scoring endpoint returns one.
- Dashboard skill cards may show the latest raw scoped result, but scoped results do not manufacture a Full Mock score.
- Same Test and Random Exam still require complete original 40-question papers.

## Error handling

- A Topic library with no recognized types shows an honest empty state and links back to Full tests or Sections.
- A restored virtual unit whose base paper no longer exists is rejected by the existing invalid-session path.
- A restored legacy Section/Passage session maps to the corresponding virtual unit when possible; otherwise it opens the original paper with the old subset behavior.
- Missing page metadata falls back to the original paper images rather than hiding the paper.

## Accessibility and responsive behavior

- Scope tabs use `role="tablist"`, real buttons, `aria-selected`, and visible focus rings.
- Unit cards expose module, scope, source, question count, and time in text.
- No information depends on emoji or color alone.
- Test at 1280x720, 1024x768, 768x1024, and 390x844.
- Preserve current iPad immersive geometry for PDF, audio, captions, evidence, answer sheet, and question navigation.

## Acceptance criteria

- Listening and Reading each show Full tests, Sections/Passages, Topics, and Review mistakes as separate entry libraries.
- Existing Full tests still expose the same 72 Listening and 72 Reading source papers and all 40 questions per paper.
- A Listening Section unit contains exactly its ten original questions and one matching audio section.
- A Reading Passage unit contains exactly Q1-13, Q14-26, or Q27-40 and the corresponding paper pages.
- Listening and Reading Topic units contain only one truthful OCR-derived question type.
- Switching scope or unit never reuses another unit's answers or result identity.
- New scoped sessions restore after refresh; old saved sessions still restore.
- Scoped results are raw subset scores and never create a Full Mock Band.
- Same Test, Random Exam, captions, Reading evidence, AI Coach, and existing history continue to work.
- No horizontal overflow or clipped primary controls at the four target viewports.

## Scope exclusions

- Do not alter Cambridge source JSON, PDFs, audio, ASR timestamps, answers, or OCR caches.
- Do not change objective scoring algorithms or official Band conversion.
- Do not combine questions from different papers into one submitted attempt.
- Do not deploy to production or change environment variables/database files during this task.
