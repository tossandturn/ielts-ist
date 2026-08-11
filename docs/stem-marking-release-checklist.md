# STEM Marking Release Checklist

This service is deployed by IELTSist first. Do not deploy the STEM client integration until
the IELTSist migration, shared-session CORS contract, and provider safety checks below pass.

## IELTSist First

1. Back up the IELTSist SQLite database and confirm the rollback revision before changing the service.
2. Configure `STEM_IDENTITY_SIGNING_KEY` and, when enabling marking, `STEM_MARKING_AI_API_KEY`, `STEM_MARKING_AI_BASE_URL`, and `STEM_MARKING_AI_MODEL` only in the IELTSist server environment. Never place these values in STEM, browser bundles, Git, or logs.
3. Deploy the IELTSist server code and restart it once. Startup creates the STEM marking tables and indexes with `CREATE TABLE IF NOT EXISTS`; verify migration success before accepting coursework.
4. Check `GET /healthz` over HTTPS.
5. From `https://stem.ieltsist.com`, verify identity and marking preflights return the exact origin, `Access-Control-Allow-Credentials: true`, and `x-stem-identity` in allowed headers. Confirm an untrusted origin receives `403` and never `Access-Control-Allow-Origin: *` for these routes.
6. Verify `GET /api/stem/marking/availability` returns only `enabled`, `modelConfigured`, `queueAvailable`, and `authenticationRequired`; it must not expose provider URL/key/token/raw error.
7. Verify the browser path using a real signed-in IELTSist session: cookie -> `GET /api/stem/identity` with `credentials: "include"` -> five-minute identity token -> availability -> one marking status request. Do not record or paste a real token in release evidence.
8. With `STEM_MARKING_AI_DISABLED=1` or no trusted manifest, verify availability is disabled and a valid create request returns `503 marking_unavailable` without a queued job. Then enable the configured manifest/provider and verify one question-level submission, reload recovery, retry behaviour, and no raw provider diagnostic in the result.
9. Verify authorization: a student can read only their own individual submission; a teacher/school account sees organization/classroom aggregate totals only, never other students' answer images, typed answers, or point evidence.

## AI Coach Gateway

1. Configure `AI_GATEWAY_BASE_URL`, `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL=gpt-5.5`, and `AI_GATEWAY_REASONING_EFFORT=xhigh` only in the IELTSist server environment. Do not copy the key to STEM, the browser, Git, or logs.
2. `/api/tasks` may report the configured Coach model/base URL/reasoning status, but never the key. The browser must call `/api/help/chat` on IELTSist; it must not call `ai.ieltsist.com` directly.
3. The gateway receives only the fixed Coach tool allowlist. Tool calls are local, bounded, audited without student content, and fall back to the safe local explanation when the provider or a tool times out/fails.
4. Verify valid Markdown links render as clickable safe links. Reject `javascript:`, `data:`, credential-bearing, and token-bearing destinations before the response reaches the student.

## STEM Second

1. Deploy STEM only after the IELTSist checks above pass.
2. Use `credentials: "include"` for the identity request and send the received token in `X-Stem-Identity` for marking calls.
3. Send canonical `questionPartId`, `availableMarks`, and paired `markSchemePoints` per question. Display `missing_metadata` as a data issue, `queued`/`processing` only after a `202` response, and `failed` as retryable when indicated.
4. Roll back or disable STEM marking if preflight, migration, provider availability, or authorization validation fails. Keep existing student submissions intact; never delete marking history as a rollback step.
