# Speaking Parts, Countdown, and Stable Examiner Design

**Date:** 2026-08-02

**Status:** Approved by the user's explicit instruction to continue autonomously.

## Goals

- Make realtime IELTS Speaking scoring more stable and evidence-based.
- Make the examiner calm, concise, human, context-aware, and non-repetitive.
- Add Full test, Part 1, Part 2, and Part 3 practice choices.
- Start a visible countdown automatically when every speaking session starts.
- Finish the existing completed/not-completed Writing and Speaking library work.

## Practice scopes and timing

The Speaking setup offers four scopes:

- Full test: 15:00, Part 1 → Part 2 → Part 3.
- Part 1: 5:00, familiar interview questions only.
- Part 2: 3:00, including one minute of preparation and up to two minutes speaking.
- Part 3: 5:00, abstract discussion only.

The timer displays time remaining, starts only after Start is clicked, and automatically enters final scoring at zero when enough candidate speech exists. Disconnect clears the timer. Full exam behavior remains a realistic 15-minute target.

## Examiner behavior

The examiner is professional, calm, neutral-warm, concise, and never overpraises. It asks one question at a time, waits for a natural pause, answers contextual clarification briefly, and then continues. It keeps the selected Part scope and does not leak questions from other parts.

Exact and near-duplicate questions are blocked against both the current-session ledger and a small identity-partitioned recent-question ledger. The chosen Cambridge set remains the source anchor, but follow-ups can develop the candidate's meaning without repeating a previous question.

## Stable scoring

Final scoring uses the chronological dialogue transcript, realtime examiner note, and MP3 evidence when the audio model actually accepts it. The model must return a structured four-criterion assessment:

- Fluency and Coherence;
- Lexical Resource;
- Grammatical Range and Accuracy;
- Pronunciation.

The server validates each score, rounds to 0.5, and calculates Overall from the four normalized criteria instead of trusting a free-form Overall line. Feedback reports criterion evidence, cautions, confidence, strengths, priorities, and drills. Part-only practice is explicitly labelled as a scoped estimate and cannot pretend to have full-test evidence.

## Completion and compatibility

- A speaking item is Completed only after final scoring succeeds.
- Part practice completion uses the same speaking set completion identity for now; it records the selected scope in the attempt metadata without inventing duplicate bank items.
- Existing Full speaking sessions, random exams, same-test exams, reconnect, recordings, and result downloads remain compatible.
- No production deployment, environment changes, or database migration are part of this change.

## Acceptance

- Writing and Speaking show completed/not-completed filters, grouped counts, row badges, and dates.
- Speaking setup exposes Full, Part 1, Part 2, and Part 3.
- Each scope schedules only its allowed Part(s).
- Each scope shows and automatically runs the correct countdown after Start.
- Zero time triggers scoring, but short/no-speech sessions do not fabricate a band.
- Examiner instructions include stable persona, current and recent question ledgers, one-question rule, and scope boundaries.
- Server scoring always derives Overall from four normalized criteria and preserves evidence cautions.
- Existing speaking regression, completion, learning-flow, iPad, and mobile tests pass.
