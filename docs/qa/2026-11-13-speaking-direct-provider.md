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

Only the reviewed `server.js` byte payload may be deployed, after the independent
STEM rollout and its protected process snapshot are final. Preserve the exact
original source bytes and mode for rollback. No server build, dependency install,
environment change or database operation is required. Root owns final production
gates, the single IELTS service restart, authenticated acceptance and Git push.

Parameter references used by the candidate design: Alibaba Cloud
[deep thinking](https://www.alibabacloud.com/help/en/model-studio/deep-thinking.md),
[Chat Completions parameters](https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions),
and [error compatibility notes](https://www.alibabacloud.com/help/en/model-studio/error-code).
