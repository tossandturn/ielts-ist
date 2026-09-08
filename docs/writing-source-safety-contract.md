# Writing Source Safety Contract

## Purpose

Cambridge Writing feedback must be bound to a reviewed server source. The imported bank and existing student records remain immutable historical evidence; reviewed corrections are applied as a separate overlay in `server/writingSourcePolicy.cjs`.

The eight Cambridge 7 Writing records (`Test 1` through `Test 4`, `Task 1` and `Task 2`) are currently isolated as `pending-review`. They must not be promoted to `ready` until the corrected prompt and source images have completed independent source review.

## Task Metadata

Every Cambridge Writing task returned by the legacy task bootstrap, native catalog index, or native task detail includes:

```json
{
  "sourceAvailability": "pending-review",
  "sourceRevision": "64 lowercase SHA-256 hex characters"
}
```

`sourceAvailability` is either `pending-review` or `ready`. The server is authoritative; a client flag is never accepted as proof of readiness. `sourceRevision` identifies the effective server prompt, visual/data fields, source URL, and writing-page image references. It is not an authentication or ownership token.

## Submission Shapes

A source-bound single-task request carries the revision next to `taskId`:

```json
{
  "taskId": "cam15-w-test1-task1",
  "sourceRevision": "<64 lowercase hex characters>",
  "prompt": "...",
  "essay": "..."
}
```

A paired/full Writing request carries one revision per item. A single top-level revision is not valid for two tasks:

```json
{
  "items": [
    { "id": "cam15-w-test1-task1", "sourceRevision": "<task-1 revision>", "prompt": "...", "essay": "..." },
    { "id": "cam15-w-test1-task2", "sourceRevision": "<task-2 revision>", "prompt": "...", "essay": "..." }
  ]
}
```

Same-Test requires Task 1 and Task 2 from the same Cambridge test. Random Exam may pair reviewed tasks from different tests. `/api/exam/report` validates its two Writing sources before objective-attempt mutation or provider use. Native full-exam validation uses the revision captured by each owned feedback job, not a client assertion, and native authentication runs first.

## Rejection Contract

A source awaiting review returns HTTP `409` before reading original question images, invoking an AI provider, or creating a feedback job:

```json
{
  "code": "writing_source_review_required",
  "error": "The selected Writing source is awaiting independent review. Your essay has been preserved and has not been graded.",
  "sourceTaskId": "cam7-w-test1-task1",
  "sourceAvailability": "pending-review",
  "sourceRevision": "<current server revision>"
}
```

A stale, invalid, or newly required-but-missing revision returns HTTP `409`:

```json
{
  "code": "writing_source_changed",
  "error": "The selected Writing source has changed since it was opened. Your essay has been preserved and has not been graded. Reload the task and review your response before submitting again.",
  "sourceTaskId": "cam7-w-test1-task1",
  "sourceAvailability": "ready",
  "sourceRevision": "<current server revision>"
}
```

The server does not echo the stale client revision.

## Backward Compatibility

- Unaffected `ready` Cambridge tasks accept an omitted revision from legacy web clients. The server still discards a client-forged prompt and binds the current canonical source.
- Any supplied revision must match exactly.
- A source present in the review manifest requires a revision after it becomes `ready`; this prevents an old draft from being silently graded against a corrected task.
- Free-input Writing without a Cambridge `taskId` remains available and does not require a source revision.
- Existing drafts, attempts, reports, and scores remain readable. This policy does not delete, rewrite, or automatically regrade them.

## Promoting a Reviewed Correction

For one review-manifest entry, add a `source` overlay containing only the independently verified replacement fields (for example `prompt` and `writingPageImages`). Corrected page images must use new immutable paths; never replace bytes at an existing historical image URL. Compute the effective task's full SHA-256 with `writingSourceRevision`, then set that exact value as `reviewedRevision` in the same change. The task becomes `ready` only when the computed revision and reviewed revision match; any later effective-source drift returns it to `pending-review` automatically.

Do not edit or remove the original imported bank record, and do not promote a revision based only on OCR or a single source.

## AI Coach Boundary

The current server-side Help normalization does not automatically inject the Writing task prompt into AI Coach; it retains structured Reading/Listening context only. No extra Coach mutation is required for this fix. If structured Writing context is added later, it must apply this same availability/revision policy before sending a Cambridge prompt to a provider.

## Verification

Run both focused regressions after changing the policy, a reviewed overlay, catalog projection, or Writing submission flow:

```powershell
node scripts/test-writing-source-safety.mjs
node scripts/test-writing-source-safety-http.mjs
```
