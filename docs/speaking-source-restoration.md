# Source-backed Speaking restoration

The original imported Speaking bank contains 59 source rows. Cambridge 1–3 remain excluded by the existing curriculum policy, leaving 55 source pages in scope. Old cue-card parsing split relative clauses, omitted source bullets, and mixed the boxed card with the unboxed timing instructions. The original bank and page images are preserved.

`server/speakingSourceRepairs.json` is a hash-bound correction layer over those existing rows and images, not another PDF/question library. Each record binds the original row, exact source image, and two separately checkpointed source-reading receipts. Two disagreements additionally bind an explicit source-image adjudication. Both original readings remain unchanged in the local evidence workspace. Source validation is AI-assisted; it is not a claim of teacher approval or formal-score authority.

Already published task identities remain unchanged. Recovered pages use `cam{book}-s-page{page}` because the old importer could incorrectly renumber tests after skipping an unreadable page. These records have `sameTestEligible=false` and `formalProgressEligible=false`. They are complete Speaking practice units, but must not be silently paired with another module's Test number. No student history or original attempts are rewritten.

The merge is fail-closed for changed source rows, missing/different images, conflicting IDs, missing independent receipts or incomplete content. Physical-page duplicates are excluded. A process-local verification marker, not a serialized client flag, permits source-confirmed titles that legitimately omit a full stop or end with a preposition. Original unreviewed OCR still passes the conservative quality checks.

The source-reading projection reflows wrapped lines and separates the exact final `and explain` clause from ordinary cue bullets. It never invents missing words. Bracketed examiner follow-ups such as `? [Why?]` are valid questions; malformed brackets or missing question marks remain rejected.

## Verification

- Source binding, duplicate rejection, no mutation, copy/flag spoofing, adjudication receipts and cue-field reflow: `node scripts/test-speaking-source-repairs.cjs`.
- Printed bracketed follow-up punctuation and genuinely incomplete negatives: `node scripts/test-speaking-source-punctuation.cjs`.
- With the original local content and page cache available, `npm run test:speaking-source-http` starts an isolated test database and verifies 55 unique source pages, 52 additional recovered units, 201 shared native Speaking tasks including 146 existing public topics, and every recovered native detail. It preserves the three prior published IDs. No live AI calls or real student records are used in this HTTP test.

This restores the 55 currently indexed eligible source pages; it does not assert that every missing Cambridge 4–21 page has already been discovered, bound, or imported. Full-corpus discovery and same-test binding are separate completion checks. Production publication and hardware acceptance must be reported from their own evidence.
