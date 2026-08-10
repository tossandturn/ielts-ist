# STEM Structured Marking API

Base URL: `https://ieltsist.com`

This API is owned by IELTSist and uses the existing IELTSist account. It does not create a STEM-local account or expose AI provider information.

## Authentication

From STEM, first obtain the existing short-lived shared identity token:

```http
GET /api/stem/identity
Origin: https://stem.ieltsist.com
Cookie: ieltsist_session=...
```

Send the returned `accessToken` on marking requests:

```http
X-Stem-Identity: <accessToken>
Content-Type: application/json
```

The token is valid for five minutes. A signed-in IELTSist session cookie is also accepted for same-site requests. STEM must use `credentials: "include"` when requesting the identity token. CORS accepts only the production STEM origin and configured local STEM origins.

## Cross-Origin Contract

STEM requests this API with `credentials: "include"`. Before a cross-origin identity or
marking request, the browser sends an `OPTIONS` preflight. For an allowed STEM origin,
IELTSist responds with:

```http
Access-Control-Allow-Origin: https://stem.ieltsist.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: content-type, authorization, x-stem-identity
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Vary: Origin
```

The allow-origin value is the exact request origin, never `*`. Origins outside the configured
STEM allowlist receive `403`, including preflight requests. The identity request uses the
signed IELTSist session cookie, then marking uses the returned five-minute
`X-Stem-Identity` token. STEM must not treat a local session or cached token as permanent.

## Provider Configuration And Safe Availability State

Configure these server-only IELTSist environment variables before enabling marking:

- `STEM_MARKING_AI_API_KEY`
- `STEM_MARKING_AI_BASE_URL`
- `STEM_MARKING_AI_MODEL`

When an explicit STEM variable is absent, the service may use the configured AI Coach provider
values. Set `STEM_MARKING_AI_DISABLED=1` during rollout, maintenance, or an incident to
disable that fallback deliberately. In either disabled or unconfigured state,
`POST /api/stem/marking/submissions` returns HTTP `503`:

```json
{ "error": "Structured STEM marking is not configured.", "code": "marking_unavailable" }
```

It does not persist a submission or claim it is `queued` or `processing`. Provider failures
after a server-accepted job are persisted as `failed` with a sanitized failure code; provider
URLs, keys, tokens, and raw responses never appear in the student response.

## Availability

Before rendering a submit action, STEM may call `GET /api/stem/marking/availability` with the
shared identity. The response is deliberately limited to safe booleans:

```json
{"enabled":true,"modelConfigured":true,"queueAvailable":true,"authenticationRequired":false}
```

It never returns a provider URL, key, token, raw error, or queue diagnostics. `enabled` is true
only when the caller is authenticated, server-only model configuration is complete, the trusted
question manifest is loaded, and queueing is not disabled.

## Trusted question manifest

Canonical mark allocation and mark points come from the server-side
`STEM_MARKING_TRUSTED_MANIFEST_PATH` JSON manifest (`stem-marking-manifest.v1`). It stores
qualification, route/specification/paper IDs, questionPartId, prompt, available marks, canonical
point IDs/marks/text, and source asset checksums. Client-provided prompt/marks/points are checked
against that entry and never overwrite it. Missing or mismatched entries are `missing_metadata`
and are not queued.

Every request includes `qualification` such as `IGCSE` or `A-Level`. Provider context uses the
trusted qualification/specification/paper and states that marking is AI-assisted formative
feedback, not an official Cambridge result.

## Create Submission

```http
POST /api/stem/marking/submissions
```

```json
{
  "submissionId": "stem-submission-2026-0001",
  "idempotencyKey": "stem-attempt-2026-0001-v1",
  "routeId": "alevel-physics-mechanics",
  "specificationVersion": "A-Level STEM 2026",
  "paperId": "edexcel-math-p1-mar-2025",
  "attemptId": "attempt-7c6c2a",
  "organizationId": "school-alpha",
  "classroomId": "class-11a",
  "questions": [
    {
      "questionPartId": "edexcel-math-p1-mar-2025-q1a",
      "prompt": "State the relationship between force, mass and acceleration.",
      "availableMarks": 2,
      "assets": [
        {
          "assetId": "question-page-2",
          "kind": "pdf-page",
          "label": "Question page",
          "checksum": "sha256:...",
          "imageDataUrl": "data:image/png;base64,..."
        }
      ],
      "markSchemePoints": [
        {
          "pointId": "q1a-m1",
          "maxMarks": 2,
          "text": "States F = ma",
          "sourceEvidence": { "page": 2, "quote": "F = ma" }
        }
      ],
      "answer": {
        "typedText": "F = ma",
        "handwritingImageDataUrl": "data:image/png;base64,..."
      }
    }
  ]
}
```

Stable shared fields are `routeId`, `specificationVersion`, `paperId`, `questionPartId`, `attemptId`, and `submissionId`. `assets` are provenance metadata; IELTSist does not fetch arbitrary external asset URLs. Inline handwriting is an optional PNG/JPEG/WebP data URL and is retained privately for retry processing.

IELTSist batches AI work by `questionPartId`, never by flattening a full paper's images into one provider request. Each inline question asset is immediately preceded by `[questionPartId=...][role=question_asset]`; handwriting is immediately preceded by `[questionPartId=...][role=student_handwriting]`. This keeps source diagrams and answer images attributable even for an 11-slot paper. The service permits up to eight source images plus one handwriting image per question, then records partial question results before moving to the next batch.

An empty answer slot is valid exam behaviour, not missing metadata: it receives deterministic `0/maxMarks`, retains canonical mark points with zero awards, and is not sent to the provider. Other answered questions continue normally. If one question batch fails, the submission is `failed` with completed question batches preserved; retry only requeues the failed/pending question batches.

`202 Accepted` means the server validated complete mark metadata, stored the append-only submission record, and accepted it for processing. The initial status is exactly `queued`.

`422 Unprocessable Entity` with `status: "missing_metadata"` means the server stored the submission but did not queue any AI work. Typical `metadataIssues` are `mark_scheme_missing`, `available_marks_missing`, and `mark_allocation_mismatch`. STEM must display the missing-metadata state, not a processing state.

Repeating the same `submissionId` or `idempotencyKey` for the same student returns `200` with `idempotent: true` and never makes another provider request.

## Read Status and Result

```http
GET /api/stem/marking/submissions/:submissionId
```

Only the submitting student can read an individual submission. A completed response has this canonical shape:

```json
{
  "submission": {
    "submissionId": "stem-submission-2026-0001",
    "status": "completed",
    "retryable": false,
    "result": {
      "schemaVersion": "stem-marking.v1",
      "status": "completed",
      "awardedMarks": 2,
      "maxMarks": 2,
      "confidence": 0.92,
      "reviewRequired": false,
      "questions": [
        {
          "questionPartId": "edexcel-math-p1-mar-2025-q1a",
          "awardedMarks": 2,
          "maxMarks": 2,
          "markPoints": [
            {
              "pointId": "q1a-m1",
              "awardedMarks": 2,
              "maxMarks": 2,
              "studentEvidence": { "quote": "F = ma" },
              "sourceEvidence": { "page": 2, "quote": "F = ma" },
              "confidence": 0.92,
              "reviewRequired": false
            }
          ]
        }
      ]
    }
  }
}
```

Statuses are `queued`, `processing`, `completed`, `failed`, and `missing_metadata`. Provider failures return `failed`, `failureCode: "provider_unavailable"`, and no raw provider body, endpoint, key, or token. `missing_metadata` is never retried automatically.

## Retry

```http
POST /api/stem/marking/submissions/:submissionId/retry
```

Only the submitting student can retry a `failed` submission. The response is `202` and moves it back to `queued`. Completed, queued, and processing submissions are idempotent. Correct missing metadata by posting a new submission/idempotency pair.

## Classroom / School Aggregates

```http
GET /api/stem/marking/organizations/:organizationId/summary?classroomId=class-11a
```

Teachers, school admins, and school owners must have a matching IELTSist organization membership. The result contains aggregate counts by status and total awarded/max marks, never another student's handwriting, typed answer, or mark-point evidence.

Membership provisioning is restricted to a global `school_owner`/`school_admin`/`staff` role or a matching organization admin:

```http
PUT /api/stem/marking/organizations/:organizationId/members/:ieltsUserId
Content-Type: application/json

{ "classroomId": "class-11a", "role": "teacher" }
```

Valid organization roles are `student`, `teacher`, `school_admin`, and `school_owner`.
