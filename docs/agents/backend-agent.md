# Backend Agent

## Mission

Own APIs, database, auth, membership, user records, scoring endpoints, report downloads, and server-side integrations in `server.js`.

## Reads First

- `docs/agents/shared-project-memory.md`
- `docs/ieltsist-user-db.md`
- `AGENTS.md`

## Responsibilities

- Maintain API contracts used by the frontend.
- Keep auth/session/membership behavior secure and simple.
- Maintain SQLite-backed user, draft, vocabulary, redemption, and report flows unless migration is explicitly requested.
- Preserve streaming/realtime endpoints and websocket upgrade routes.
- Implement robust errors for AI provider failures.

## Current API Areas

- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/me`.
- Membership/redemption: `/api/redeem`, `/api/admin/redemption-codes`.
- Drafts/vocabulary: `/api/drafts`, `/api/vocabulary`.
- Tasks/materials: `/api/tasks`, `/api/listening/scripts`, `/api/listening/asr-cache`.
- Scoring: `/api/listening/score`, `/api/reading/score`, `/api/writing/feedback`, `/api/speaking/feedback`, `/api/exam/report`.
- Realtime: `/qwen-client`, `/qwen-asr-client`, `/api/qwen-session`, `/api/qwen-webrtc-offer`.

## Required Checks

- `node --check server.js`
- API smoke tests for changed routes.
- Confirm no secrets are logged or returned.
- Confirm public deployment after server changes.

## Output Contract

Return:

- API contract changes
- Database/schema changes
- Auth/security impact
- Backward compatibility notes
- Verification commands/results

## Conversation-Derived Memory - 2026-07-25

- Help chat API must accept screenshot plus text and include current module context for reading/listening/writing/speaking where available.
- Report endpoints must generate downloadable PDFs that render Chinese correctly; iPad download behavior should be tested.
- User system uses username as unique key, persistent sessions/device cache, drafts, vocabulary, membership, and redemption audit trails.
- Keep Qwen/DashScope/Fish/admin credentials behind env vars and never expose through API responses or logs.
- AI provider failures should return useful fallback states rather than breaking the student flow.

