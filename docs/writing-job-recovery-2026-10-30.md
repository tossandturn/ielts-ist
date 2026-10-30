# Full Mini Program QA: Writing job recovery

Live synthetic typed-essay acceptance returned a local estimate after about 28 seconds, with no reliable band or four-criterion feedback. It was correctly not counted as successful AI grading. The native report downloader worked, but downloading a PDF does not prove AI completion.

Root causes verified in source and an HTTP regression:

- Background full-rubric grading inherited the synchronous 25-second provider/body deadline.
- The job deduplicator reused any non-error job, including a completed local fallback or low-confidence result. A deliberate retry of the same essay could never reach the provider again until expiry.

The background job now has its own bounded 120-second default (configurable within 1–180 seconds). Existing synchronous fallback behavior, provider/model selection, thinking settings, scoring prompt, source revision guards and photo budgets are unchanged. Failed background AI calls become retryable error jobs, not completed local estimates. Pending work and reliable successful results remain idempotent; failed and review-required results can be retried.

Verification: `npm run test:writing-jobs` includes a local fake-provider HTTP sequence: provider slower than short request budget, duplicate pending request, completed result reuse, timeout, identical-content retry, and low-confidence retry. Existing photo transcription/source binding and scoring-result safety remain covered. Provider errors are reduced to bounded public error codes and do not include request text or credentials.

Deployment contract: pin a clean commit; transfer only `server.js`; its baseline Git blob SHA must match the deployed file. Back up that exact file, run syntax checks and fresh readiness gates before/after each step, restart only `ieltsist`, and preserve STEM, payments, databases, uploads, environment and rollback coverage. Re-run the same synthetic native essay after activation. No real payment or model configuration change is authorized by this test.
