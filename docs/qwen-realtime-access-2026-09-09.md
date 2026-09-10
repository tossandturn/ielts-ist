# Qwen realtime access gate — 2026-09-09

This patch gates all three realtime entry transports used by the native Mini Program and existing browser: `/qwen-client`, `/api/qwen-session` and `/api/qwen-webrtc-offer`.

## Contract

- `/qwen-client` rejects anonymous upgrades before a WebSocket connection event or provider setup.
- Existing same-origin browser sessions authenticate with the `ieltsist_session` HttpOnly cookie.
- Native clients first call authenticated `POST /api/speaking/realtime-ticket`, then pass the opaque ticket in `X-STEMist-Realtime-Ticket` during `wx.connectSocket`.
- Browser HTTP fallback sessions and WebRTC SDP exchange require the same formal account session before session creation or provider contact. HTTP session send/events/delete calls are bound to both the issuing user and exact session token, so another account or another login cannot use a leaked session ID.
- A native ticket lives for at most 20 seconds, is bound to the issuing account session and `qwen-speaking` purpose, is stored server-side only as a digest, and is consumed once even when validation fails.
- Tickets never appear in URLs or application logs. Ticket responses use `Cache-Control: no-store`.
- Logout/session expiry invalidates an unconsumed ticket. Replayed tickets fail with HTTP 401 before provider setup.

## Abuse limits

- One WebSocket can initialize at most one realtime provider connection.
- At most two concurrent realtime connections per account, twenty per source IP and one hundred per process are accepted.
- WebRTC offer exchange is limited to six attempts per account and sixty per source IP per minute.
- Server-relayed WebSocket/HTTP sessions are capped at 20 minutes, 48 MiB of accepted PCM audio, 80 audio commits, 90 response requests and 512 KiB per client message.
- Parsed client messages must be JSON objects with an allowlisted string `type`; null, arrays, scalars, missing types and non-string types are rejected as controlled client errors before provider setup. A malformed authenticated WebSocket message closes only that connection and cannot terminate the service.
- On server-relayed transports, the server chooses the configured Qwen model and region, the Ethan voice, manual turn detection and fixed IELTS examiner instructions. Client data is bounded and labelled as untrusted context. The authenticated direct-WebRTC exchange fixes the server-selected model/region but its encrypted provider data channel remains a distinct browser path.
- The fixed policy retains a real Part 2 path: one minute of preparation and one to two minutes of speaking, within the full 15-minute practice target.

## Examiner turn policy update — 2026-09-11

- The examiner is calm and neutral-warm, but does not coach, score, or praise a live answer. Generic reactions such as `Great`, `Excellent`, `Good answer`, and `That is interesting` are explicitly disallowed.
- Short, contextually complete answers such as `Yes` or `No` remain valid. The backend does not classify an answer by word count.
- When the latest audio is an unclear fragment, playback echo, or inaudible, the examiner makes one brief neutral repair and returns to the same current question. It must not count the turn as a completed answer, advance the question schedule, or change IELTS Part.
- A genuine contextual clarification receives one short answer followed by a paraphrase of the same current question; it does not consume that question or advance the Part.
- Part progression follows the latest elapsed practice time and the IELTS Part 1/2/3 structure. Running out of imported questions never ends the practice; deeper non-repeating Part 3 follow-ups continue until the existing 15-minute product minimum is reached.
- The reusable direct-session `responses.next` template contains no session-mint elapsed value. The native client appends the current elapsed practice time to each turn, and that newest value supersedes session-start or recovery context. This changes no direct-session request field.

The structure and task sequence follow the official [IELTS Academic Speaking format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking). IELTS documents an 11–14 minute test; IELTSist retains its established 15-minute full-practice completion gate as a product constraint.

## Local verification

```powershell
node --check server.js
node scripts/test-qwen-realtime-access.mjs
node scripts/test-qwen-direct-session.mjs
node scripts/test-qwen-websocket-auth.mjs
node scripts/test-qwen-realtime-http-auth.mjs
node scripts/test-wechat-mini-auth.mjs
```

The tests use a temporary local SQLite database, explicitly empty Qwen credentials and a loopback-only SDP provider counter. They make no live provider request. They assert anonymous, forged-debug, invalid, replayed and revoked access is rejected; native ticket and existing browser-cookie paths are accepted; HTTP session ownership prevents IDOR; and unauthorized provider initialization remains zero.

Production deployment, Nginx header forwarding, configured Mini Program socket domain and real phone microphone/Part 2 behavior remain separate acceptance gates.
