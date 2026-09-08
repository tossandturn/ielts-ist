# Source-backed Speaking restoration

The original imported Speaking bank contained 59 source rows. Cambridge 1–3 remain excluded by the existing curriculum policy, leaving 55 originally indexed source pages. Old cue-card parsing split relative clauses, omitted source bullets, and mixed the boxed card with the unboxed timing instructions. The original 59 records remain unchanged; 17 missing source-page records have now been appended, covering four actual Speaking pages for each Cambridge book 4–21 (72 eligible source pages total).

`server/speakingSourceRepairs.json` is a hash-bound correction layer over the source rows and images, not another PDF/question library. Each record binds the original row, exact source image, and two separately checkpointed source-reading receipts. Two disagreements additionally bind an explicit source-image adjudication. Both original readings remain unchanged in the local evidence workspace. The 17 added raw records contain only source metadata; they cannot become student-visible without the validated restoration layer. Source validation is AI-assisted; it is not a claim of teacher approval or formal-score authority.

During missing-page discovery, the recovery script's PDF.js renderer produced blank output for Cambridge 8 page 79, Cambridge 9 page 95 and Cambridge 13 page 97. An independent Poppler render recovered the complete source from the same original PDFs. Blank output was held by a pixel-content check and was never sent to students or counted as a recovered page. Both render evidence and the corrected raster hashes were retained.

Already published task identities remain unchanged. Recovered pages use `cam{book}-s-page{page}` because the old importer could incorrectly renumber tests after skipping an unreadable page. These records have `sameTestEligible=false` and `formalProgressEligible=false`. They are complete Speaking practice units, but must not be silently paired with another module's Test number. No student history or original attempts are rewritten.

The merge is fail-closed for changed source rows, missing/different images, conflicting IDs, missing independent receipts or incomplete content. Physical-page duplicates are excluded. A process-local verification marker, not a serialized client flag, permits source-confirmed titles that legitimately omit a full stop or end with a preposition. Original unreviewed OCR still passes the conservative quality checks.

The source-reading projection reflows wrapped lines and separates the exact final `and explain` clause from ordinary cue bullets. It never invents missing words. Bracketed examiner follow-ups such as `? [Why?]` are valid questions; malformed brackets or missing question marks remain rejected.

## Verification

- Source binding, duplicate rejection, no mutation, copy/flag spoofing, adjudication receipts and cue-field reflow: `node scripts/test-speaking-source-repairs.cjs`.
- Printed bracketed follow-up punctuation and genuinely incomplete negatives: `node scripts/test-speaking-source-punctuation.cjs`.
- With the original local content and page cache available, `npm run test:speaking-source-http` starts an isolated test database and verifies 72 unique source pages, four per book 4–21, 69 recovered units, 218 shared native Speaking tasks including 146 existing public topics, and every recovered native detail and image hash. It preserves the three prior published IDs. No live AI calls or real student records are used in this HTTP test.

The source-page corpus for Cambridge 4–21 is now locally complete at 72 pages. Exact cross-module same-test bindings are a separate check: restored pages remain ineligible for automatic same-test pairing until their exam ordinal is proved. Production publication of each wave and hardware acceptance must be reported from their own evidence.

The first 55-page wave was published as backend overlay `5558b7c7006634314ded8dbc85a51cfc4792310e`. Production origin and native-simulator public-network checks passed at 201 total Speaking items, and the original source bank hash was unchanged for that wave. The 17-page extension must have its own production receipt; it is not covered by the first-wave certificate.
