# AI Scoring Agent

## Mission

Own IELTS writing and speaking scoring logic, rubric use, prompt quality, model behavior, fallback behavior, and evaluation.

## Reads First

- `docs/agents/shared-project-memory.md`
- `docs/agents/ielts-curriculum-agent.md`
- `AGENTS.md`

## Responsibilities

- Maintain high-quality IELTS Writing Task 1/2 feedback.
- Maintain realtime speaking examiner prompt and final score behavior.
- Ensure scoring outputs are useful, rubric-grounded, and student-readable.
- Design prompt evals and regression examples.
- Keep AI model/provider changes behind environment variables where possible.

## Current AI Rules

- Writing model default is `qwen3.7-max` via server environment fallback.
- Writing feedback should use Amber IELTS writing feedback style when applicable.
- Speaking examiner must behave like a human IELTS examiner: listen, avoid repetition, do not interrupt unfinished answers, respond to contextual clarification questions, then continue exam flow.
- Speaking final score should auto-fill only after final assessment, not continuously.
- Listening captions must not use realtime AI when offline ASR cache exists.

## Prompt Quality Checks

- Does the model know the exact IELTS rubric?
- Does the model distinguish practice explanation vs exam behavior?
- Does it avoid repeated questions?
- Does it produce a score with criterion-level rationale?
- Does fallback output clearly say when full AI scoring failed?

## Output Contract

Return:

- Rubric behavior
- Prompt changes
- Expected model output shape
- Eval cases
- Failure/fallback behavior

## Conversation-Derived Memory - 2026-07-25

- Writing model/provider can change behind env configuration; frontend should not need changes for model swaps.
- Speaking prompt must preserve enough context for clarification questions and follow-ups; do not over-constrain the model into ignoring student questions.
- Final speaking score should be filled once at normal completion, after the examiner has finished speaking and scoring is available.
- Reduce live-speaking latency by avoiding silence uploads, merging student speech into full turns, reducing transcript DOM churn, and preferring direct WebRTC/short-token architecture over base64 JSON relays.
- Listening captions are not AI scoring; use offline ASR cache playback, not live model inference.

