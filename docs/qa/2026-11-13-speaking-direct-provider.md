# Speaking text-scoring provider repair

## Provenance and scope

The isolated worktree starts at `56a3afdf29bd3c23063dca3ccdff2a9e4a39308a`.
That commit's `server.js` is byte-identical to the captured live baseline:
SHA256 `d56fba9fe42e9a1e2656aee7a24a62b207cc447126e44574d03fae38aeab71ec`.
The older canonical checkout's HEAD is not the production baseline.

The final candidate source is SHA256
`8d746b889d171f004abd39a0d95245cf4f54229f084a9946666b0173b7c08511`.
Only two regions of `server.js` change:

- `callOpenAI` accepts optional answer-token and completion requirements. Existing
  Writing and generic callers retain byte-identical request bodies when these
  options are absent.
- `handleSpeaking` explicitly reuses the configured direct Writing provider,
  enables bounded thinking (1024), bounds the final answer (1280), disallows the
  legacy Responses fallback, and verifies a complete four-criterion assessment.

The 25-second Speaking timeout is unchanged. The full supplied transcript is
preserved. This is not a claim that every problem completes within that deadline.
No environment value, provider configuration, database schema, dependency,
frontend, realtime transport or microphone code is changed.

The affected mini-program page is `pages/ielts/speaking.js`, calling
`/api/speaking/feedback`; its existing 60-second client timeout remains compatible
with the unchanged 25-second backend provider deadline. A separate caller audit
found older web-only `legacyWriting`, `speakingTurn` and legacy full-exam paths
still using the generic provider. They are not repaired or represented as passing
by this change. The native full-exam path sends `x-stemist-native` and uses the
existing early `preparedWriting` result from weighted Writing jobs rather than
those legacy provider calls. Do not extend this single-route patch implicitly.

## Failure and evidence contracts

A non-`stop` finish reason, malformed JSON, missing or duplicate criterion,
invalid score, or empty evidence/feedback/rationale cannot be normalized into an
apparent AI success. Provider failure remains an explicitly local estimate with
review required and a sanitized warning.

The criteria remain Fluency and Coherence, Lexical Resource, Grammatical Range
and Accuracy, and Pronunciation. Transcript-only output still requires review;
it does not claim measured pronunciation. Successful audio scoring is unchanged.
An audio-provider failure may use text fallback but never claims the MP3 was
analysed. Empty transcripts reject before provider calls.

## Local verification

`node scripts/test-speaking-direct-provider.mjs --baseline` reproduces the
missing explicit thinking/provider policy (RED). The same command without that
flag passes eight groups and eight negative cases (GREEN). It compares against
the pinned baseline Git object, so that object must be available locally.
All network, audio and PDF boundaries in this test are synthetic; no key, real
student data, environment file or live provider is used.

Additional checks passed:

```text
node --check server.js
node --check public/app.js
node --check public/pcm-worklet.js
node scripts/test-speaking-regressions.mjs
node scripts/test-writing-speaking-contract.mjs
node scripts/test-speaking-parts-stability.mjs
node scripts/test-speaking-reconnect-state.mjs
node scripts/test-speaking-webrtc-transport.mjs
```

These are source/VM regressions, not browser or physical-device tests.

## Separate real-provider candidate evidence

The root-operated isolated candidate test used these exact candidate bytes with
the original runtime dependencies, synthetic input and fenced scratch storage.
It completed one text-scoring case in 21.628 seconds: `mode: ai`, four criteria,
review required, no audio used. The configured direct `qwen3.7-max` provider
returned HTTP 200; owned scratch cleanup succeeded. Evidence SHA256:
`e3dbf448fe39972acfa7d8065b000a3ac5424c2a57c17230854e67414b20a983`.

The preceding baseline proxy failure and first candidate timeout remain failed
evidence; this result does not rewrite them. One real synthetic case is not score
calibration, full-exam acceptance, public production deployment, native SSO,
microphone, recording, WebRTC handshake, mobile or Apple Pencil verification.

## Release boundary

Only the reviewed `server.js` byte payload is in the production patch. Root
completed the independently gated single-file installation and one IELTS restart
on 2026-11-13, after STEM B's functional acceptance. Installed source SHA256 is
`8d746b889d171f004abd39a0d95245cf4f54229f084a9946666b0173b7c08511`.
The observed IELTS process changed from PID 1367866 / restart count 39 to
PID 1688728 / restart count 40. STEM remained at PID 1664613 / count 120 during
this release. These are the release-time snapshots, not promises about future
process IDs. Before/installed/stable-post resource and service gates passed.

Original source bytes and metadata were retained for rollback. The install
preserved mode 0644, UID 1000 and GID 1001. No server build, dependency install,
environment change or database schema change occurred. The authenticated checks
created short-lived sessions via the normal exchange and revoked only those test
sessions; this is not a claim that no session rows were ever written.

## Production acceptance and diagnostic sequence

The following evidence is preserved separately. Later success does not rewrite
an earlier failure or establish its cause.

1. Initial authenticated production text-scoring acceptance: **FAIL** after
   18.757 seconds. Session exchange succeeded and the new session was revoked in
   `finally`. The old checker emitted only a generic `speaking-score` assertion;
   the exact returned mode, provider failure class and failed field were not
   retained. This failure is **not retrospectively explained**.
2. One instrumented authenticated call to the actual mini-program
   `/api/speaking/feedback` endpoint: **PASS**, 9.317 seconds for scoring. HTTP
   200, `mode: ai`, provenance `qwen3.7-max`, four distinct complete criteria,
   valid matching `scoring.v2` contract and evidence references, review required,
   and no audio-use claim. Its only warning was that no audio was submitted.
   The temporary test session was revoked and subsequently returned 401.
3. One separately gated exact-function provider diagnostic: **AI_COMPLETE** in
   10.426 seconds, exactly one provider request, HTTP 200, finish reason `stop`,
   and all four raw rubric entries complete. Reported usage was 942 prompt tokens,
   1145 completion tokens and 492 reasoning tokens (2087 total). The original
   request parameters remained thinking budget 1024 and `max_tokens: 1280`.
   These counters are recorded as returned, not converted into a latency or
   remaining-capacity guarantee. This diagnostic used the exact deployed
   functions and existing provider configuration in an isolated VM, fixed
   synthetic input and a PDF stub; it created no student session and did not
   access a database. Its durable one-shot guard prevents another run.

The authenticated tests used the existing, explicitly authorised tester and
original synthetic text, not a newly created student. Existing practice,
membership orders, payments and other sessions were not read or changed. Tokens,
keys, profiles, request messages, raw provider responses and feedback text were
not recorded in these diagnostic reports. No additional ordinary score call or
provider probe was repeated after the bounded diagnostic sequence.

Private evidence identifiers and SHA256 digests (retained outside this repo):

| Evidence | SHA256 |
| --- | --- |
| Original production FAIL | `d8cb8e374105427475a213c21897c5f8cc6c0ea62cd93bae6a58361cf0706c8e` |
| Instrumented production PASS | `5f066a4e6e73c1789d8721ed3466a4bcb434b75a9488bb77ab8dc0acc5dec35e` |
| One-shot exact-provider diagnostic | `ffb4b609f28ffa000617c68c6dca85a13e830d5f28dda161f08d1579ee8b1aff` |
| Single-file install receipt | `eb409d0d9e5862b38ca54c20a38cebac5375c983cb89ccbc95dce6b3ad0f0efc` |
| Single-restart receipt | `1357385372b8657f0a6e0cd376310aac953f864d128acea2771bb28aa8f9e51d` |

Root accepts this exact functional source scope with the above reliability
limitation. The first production failure remains unresolved historical evidence;
neither later success proves a stable success rate nor establishes a latency SLO.
No claim is made about a real phone/iPad UI, microphone, native realtime handshake,
recording, measured pronunciation, Apple Pencil, long-answer scoring accuracy or
all students' network conditions. Future safe error-category observability may
help distinguish cutoff, malformed rubric, timeout, authentication and rate-limit
failures, but no speculative business-logic change was made for this incident.

## Recovery after a later STEM rollout

The original IELTS operators deliberately pin the release-time protected STEM
snapshot. After the independently scheduled STEM voice update changes that
snapshot, those operators must refuse a rollback; never edit their original
manifest, backup receipt or gate evidence to make the old pins appear current.
Retain the immutable original source/metadata backup and its verification chain.

If IELTS recovery is then required, perform a new bounded read-only readiness
gate against the actual current IELTS and protected STEM state. A separately
reviewed recovery plan must bind that new snapshot to the original immutable
backup/manifest/receipt hashes, verify the current IELTS source has not drifted,
restore only the exact original `server.js` bytes and metadata, and restart only
IELTS once with a new one-attempt recovery receipt. Recheck resources, source,
unchanged STEM, health and the affected student path afterward. Do not roll back
STEM, its catalog/readers, environment, dependencies or databases. A new snapshot
has not been guessed or embedded into an unbound recovery executor.

Parameter references used by the candidate design: Alibaba Cloud
[deep thinking](https://www.alibabacloud.com/help/en/model-studio/deep-thinking.md),
[Chat Completions parameters](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions),
and [error compatibility notes](https://www.alibabacloud.com/help/en/model-studio/error-code).
