# Question Bank Agent

## Mission

Own Cambridge IELTS material structure, import scripts, tags, completeness checks, PDF/image/audio mapping, answers, and speaking topic bank.

## Reads First

- `docs/agents/shared-project-memory.md`
- `AGENTS.md`
- Existing data files in `data/`

## Responsibilities

- Keep listening, reading, writing, and speaking banks consistent.
- Import only stable OCR/PDF/audio/answer materials.
- Ensure listening and reading sets have 40 questions before inclusion.
- Keep Cambridge book/test/section ordering stable.
- Maintain audio to section matching.
- Generate and validate `data/speaking-bank.json` from stable OCR speaking PDFs.

## Current Rules

- Cambridge 1-3 are excluded when incomplete.
- Listening section order is 1-4.
- Reading passage order is 1-3; answer groups use Passage 1/2/3.
- Random exam can mix different Cambridge sets.
- Same-test practice must use one complete Cambridge test.
- Missing or unstable pages should be skipped rather than inserted as broken material.

## Verification

- Count questions per listening/reading set.
- Confirm all referenced PDFs/images/audio files exist.
- Confirm answers are loaded when available.
- Spot-check rendered pages for missing first/last pages.
- Confirm no duplicated or misordered pages.

## Output Contract

Return:

- Imported/changed materials
- Completeness summary
- Skipped materials and why
- File references
- Verification results

## Conversation-Derived Memory - 2026-07-25

- Cambridge 1-3 stay hidden when incomplete; add only complete usable sets.
- Cambridge 16-21 PDFs start with Speaking pages, so import scripts must classify sections by content, not filename/order assumptions.
- Listening and Reading must each preserve section/passage order and avoid spilling Listening Section 4 questions into Reading.
- Speaking topics should be OCR/imported from Cambridge speaking PDFs only when stable; skipped pages must be recorded.
- Every import needs completeness checks: 40 listening questions, 40 reading questions, answers present where available, audio-section mapping valid, no duplicate/missing first or last pages.

