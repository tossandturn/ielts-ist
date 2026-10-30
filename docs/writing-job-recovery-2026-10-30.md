# Full Mini Program QA: Writing job recovery

Live synthetic typed-essay acceptance returned a local estimate after about 28 seconds, with no reliable band or four-criterion feedback. It was correctly not counted as successful AI grading. The native report downloader worked, but downloading a PDF does not prove AI completion.

Root causes verified in source and an HTTP regression:

- Background full-rubric grading inherited the synchronous 25-second provider/body deadline.
- The job deduplicator reused any non-error job, including a completed local fallback or low-confidence result. A deliberate retry of the same essay could never reach the provider again until expiry.

The background job now has its own bounded 120-second default (configurable within 1–180 seconds). Existing synchronous fallback behavior, provider/model selection, scoring prompt, source revision guards and photo budgets are unchanged. Failed background AI calls become retryable error jobs, not completed local estimates. Pending work and reliable successful results remain idempotent; failed and review-required results can be retried.

Deployment acceptance then showed that a full typed essay could still exceed 120 seconds under the provider's default thinking budget; a tiny connectivity probe succeeded. An isolated same-model, same-rubric streaming benchmark with thinking **enabled** and a 2048-token thinking budget completed in 75.299 seconds. All four integer criteria, four verbatim evidence excerpts, arithmetic overall band, five original paragraphs and the model-answer section were retained. This is one synthetic benchmark, not a general accuracy or latency guarantee.

Only asynchronous typed Qwen 3.5–3.8 writing grading now receives that bounded thinking budget. It does not cap final answer length, disable reasoning, change the IELTS model, affect synchronous writing, photograph grading, speaking or STEM Coach. Qwen-only parameters are not sent to unrelated models. Official parameter reference: [Alibaba Cloud thinking mode and budget](https://www.alibabacloud.com/help/en/model-studio/deep-thinking).

Verification: `npm run test:writing-jobs` includes a local fake-provider HTTP sequence: provider slower than short request budget, duplicate pending request, completed result reuse, timeout, identical-content retry, and low-confidence retry. Existing photo transcription/source binding and scoring-result safety remain covered. Provider errors are reduced to bounded public error codes and do not include request text or credentials.

Deployment contract: pin a clean commit; transfer only `server.js`; its baseline Git blob SHA must match the deployed file. Back up that exact file, run syntax checks and fresh readiness gates before/after each step, restart only `ieltsist`, and preserve STEM, payments, databases, uploads, environment and rollback coverage. Re-run the same synthetic native essay after activation. No real payment or model configuration change is authorized by this test.
