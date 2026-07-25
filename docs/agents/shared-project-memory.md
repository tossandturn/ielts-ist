# IELTS-ist Shared Project Memory

Use this memory before any role-specific work on IELTS-ist.

## Product

- Product name: IELTS-ist.
- Goal: Cambridge IELTS practice platform with single-module practice, same-test practice, random full mock exams, AI writing feedback, AI speaking examiner, report PDFs, user accounts, drafts, vocabulary notebook, and redemption-code membership.
- Primary users: IELTS students using desktop web, iPad, mobile browsers, WeChat browser, Safari, and Android browsers.
- Design principle: exam immersion first. Avoid UI that covers questions. Fixed headers and side rails must preserve working space.

## Local And Production

- Local project path: `D:\CodexWork\ielts-trainer`.
- Public URL: `https://ieltsist.com`.
- Singapore server: `ubuntu@43.156.76.217`.
- Production path: `/home/ubuntu/ielts-trainer`.
- Production route: DNSPod -> `43.156.76.217` -> Nginx HTTPS -> Node on `127.0.0.1:4321`.
- PM2 app name: `ieltsist`.
- Keep Windows local setup and Singapore production in sync when shipping user-visible fixes.
- GitHub remote: `https://github.com/tossandturn/ielts-ist.git`.
- Every project change should be synced to GitHub through Clash after verification. Use the configured Git HTTP/HTTPS proxy, normally `http://127.0.0.1:7897`, and push only the intended files. Do not commit secrets, local SQLite databases, certificate keys, generated bulk caches, or unrelated dirty files unless the user explicitly asks.

## Critical Safety

- Never print, commit, or expose API keys, Qwen keys, admin secrets, certificate keys, or student tokens.
- Secrets belong in `.env`, `.env.local`, or production environment variables.
- Do not replace real Cambridge imported materials with fake test data.
- Do not remove user changes or unrelated dirty worktree edits.

## Core Files

- Frontend: `public/index.html`, `public/app.js`, `public/styles.css`, `public/pcm-worklet.js`.
- Backend: `server.js`.
- Question/task data: `data/cambridge-local-bank.json`, `data/cambridge15-bank.json`, `data/speaking-bank.json`.
- Listening ASR cache: `data/listening-asr-cache.json`.
- Import/ASR scripts: `scripts/cache-listening-asr-timestamped.mjs`, `scripts/generate-speaking-bank.js`, `scripts/render-speaking-page-images.mjs`.
- Deployment docs/config: `deploy/ubuntu/README.md`, `deploy/ubuntu/ecosystem.config.cjs`, `deploy/ubuntu/nginx-ieltsist-tencent-cert.conf`.
- User database docs: `docs/ieltsist-user-db.md`.

## Listening Captions

- Fixed listening audio must use offline DashScope/Qwen file ASR cache, not realtime ASR.
- Cache entries must include `sentences`, `timedWords.start/end`, and `speaker`.
- Captions are played locally from cached timestamps.
- Speaker colors must be stable by current `prefix + listeningId + section`, seeded from ASR speaker order before rendering visible bubbles.
- Do not map raw speaker labels directly to colors by number without scoping.
- Verify local and public after caption changes.
- Use the `ieltsist-listening-asr-cache` skill first for listening subtitles, ASR cache, timing, speaker colors, or seek alignment.

## Speaking Examiner

- Speaking uses Qwen/DashScope realtime voice interaction, separate from listening ASR.
- Current target behavior: natural IELTS examiner, no repeated questions, no premature interruption, slower turn-taking, context-aware follow-up, automatic final speaking band fill after exam, goodbye and disconnect, recording download.
- Random full exam speaking should remain close to real exam; single/same-test speaking can show practice text and PDFs.
- Use the `ieltsist-realtime-speaking-examiner` skill first for microphone, WebRTC/websocket, Qwen realtime, speaking turn-taking, scoring, transcript display, recording download, and mobile compatibility.

## Writing And Reports

- Writing feedback must use Amber-style IELTS writing feedback behavior where applicable.
- Current writing AI model default in server: `qwen3.7-max` via environment fallback.
- Reports should be Chinese for feedback/download output unless a specific UI context requires English.
- PDF reports must avoid mojibake; verify generated PDF text and rendering.

## User System

- Current default DB: `data/ieltsist.sqlite`.
- Tables include users, sessions, memberships, redemption codes, redemption uses, drafts, vocabulary items.
- Username is the unique account key.
- Membership plans are day/week/month/year as product configuration evolves; redemption code workflows must preserve auditability.
- Mine view owns account, membership, drafts, vocabulary notebook, and redemption UI.

## Question Bank

- Imported Cambridge IELTS materials are the source of truth.
- Cambridge 1-3 are currently excluded when incomplete.
- Listening/reading modules must have complete 40-question sets before inclusion.
- Listening/reading PDFs are the primary student-facing material.
- Speaking topics should be synchronized from Cambridge speaking PDFs when OCR is stable; skip unstable pages.
- Random exam composes different Cambridge sets; same-test uses one complete Cambridge test.

## Frontend Layout Lessons

- Single module should be visible first on homepage.
- Immersive mode must maximize working area.
- Listening/reading PDFs and answer sheets must align and remain scrollable.
- Do not let captions, audio controls, help panels, draw toolbar, or fixed headers cover questions.
- On wide screens, listening caption rail may be a left column; on narrow/iPad portrait, avoid compressing the PDF to unusable width.
- Apple Pencil draw mode must allow drawing with one pointer while multi-touch can scroll the PDF.

## Verification Baseline

- Run `node --check public/app.js` and `node --check server.js` after JS/server edits.
- For public sync, upload changed files, restart PM2, then check `https://ieltsist.com` loads the new version query.
- For listening captions, test local and public at representative timestamps and verify no overlap, correct speaker colors, and seek alignment.

## Conversation-Derived Memory - 2026-07-25

Source scan: `C:\Users\10604\.codex\sessions\2026\07\13\rollout-2026-07-13T22-05-33-019f5bcc-259c-7da3-8d57-47e11ae9de38.jsonl` was scanned line-by-line with shared-read access, not via compacted summaries. Sanitized derived files:

- `docs/agents/derived/conversation-scan-stats-20260725.json`
- `docs/agents/derived/conversation-user-requests-redacted-20260725.md`

Durable rules from the full thread:

- Treat user screenshots and repeated corrections as regression requirements, not isolated UI comments.
- When the user says to self-test, verify as a student on local and public surfaces before finalizing.
- Keep local Windows RouteX/local setup and Singapore production both viable unless the user explicitly scopes one out.
- For Cambridge material work, never insert incomplete or unstable sets merely to increase coverage; complete, usable exams beat broad but broken imports.
- For UI work, the default bar is iPad/tablet usability with exam immersion: PDFs readable, answer areas reachable, fixed headers compact, no empty frames or controls covering questions.
- Help must understand the current exam context. Reading/listening explanations need access to question, answer, passage/audio context, OCR/screenshot text, and the student's typed question.
- All generated student-facing PDF reports and Chinese feedback must be rendered and checked for mojibake.
- If a command/tool fails for environment reasons, record the failure and switch approach instead of silently stopping.
- UI regression from 2026-07-25: a visual polish pass broke collapsed sidebar and Caption/Writing/Speaking immersive layouts because testing covered only one tablet state. Future UI work must verify ultra-wide, desktop, iPad portrait/landscape, collapsed/expanded sidebar, Listening Caption on, Writing immersive, Speaking immersive, local and public before finalizing.
