# IELTS-ist Project Notes

- Project-specific sub-agent roles live in `docs/agents/`. Before role-based planning, implementation, review, or delegation, read `docs/agents/shared-project-memory.md` and the relevant role file.
- Available role files:
  - Product Agent: `docs/agents/product-agent.md`
  - IELTS Curriculum Agent: `docs/agents/ielts-curriculum-agent.md`
  - UX Agent: `docs/agents/ux-agent.md`
  - Frontend Agent: `docs/agents/frontend-agent.md`
  - Backend Agent: `docs/agents/backend-agent.md`
  - AI Scoring Agent: `docs/agents/ai-scoring-agent.md`
  - Question Bank Agent: `docs/agents/question-bank-agent.md`
  - QA Agent: `docs/agents/qa-agent.md`
  - DevOps/Security Agent: `docs/agents/devops-security-agent.md`
- For new Cambridge IELTS listening audio, missing captions, stuck captions, speaker color bugs, or subtitle/audio seek misalignment, use the `ieltsist-listening-asr-cache` skill first.
- For realtime speaking examiner work, Qwen/DashScope WebRTC, microphone bugs, turn-taking, scoring, transcript display, recording download, or mobile speaking compatibility, use the `ieltsist-realtime-speaking-examiner` skill first.
- Listening captions use offline DashScope file ASR caches with `sentences`, `timedWords.start/end`, and `speaker`; do not use realtime ASR for fixed listening audio.
- Speaking uses realtime voice interaction; keep it separate from listening caption ASR. Optimize for natural turn-taking, no repeated questions, no premature interruption, automatic final score fill, and recording download.
- After ASR cache changes, verify local and public deployments, including monotonic timestamps and speaker-colored bubbles.
- Keep secrets in `.env.local`; never print or commit API keys.
- GitHub sync rule: after every code, data, docs, or deployment-facing change, sync the changed files to GitHub through Clash. Use the configured Git proxy (`http.proxy` / `https.proxy`, currently expected to point at Clash such as `http://127.0.0.1:7897`) and push only the intended files; never include secrets, local databases, generated caches, or unrelated dirty worktree changes unless explicitly requested.

## Sub-Agent Invocation Protocol - 2026-07-25

When the user explicitly asks for subagents, role agents, or a cross-role project memory update, use `multi_agent_v1.spawn_agent` for bounded sidecar work. The main agent keeps the critical path and delegates only independent checks or disjoint implementation scopes.

Role routing:

- Product Agent: PRD, MVP, scope, version sequencing, release/rollback criteria.
- IELTS Curriculum Agent: IELTS rubrics, task validity, feedback quality, speaking examiner behavior.
- UX Agent: student flow, immersion, report experience, learning path.
- Frontend Agent: UI/layout/responsive interactions and browser compatibility.
- Backend Agent: APIs, database, auth, membership, report/scoring contracts.
- AI Scoring Agent: writing/speaking prompts, rubric evals, fallback behavior.
- Question Bank Agent: Cambridge imports, completeness, OCR/PDF/audio/answer mapping.
- QA Agent: local/public regression checks, browser screenshots, student-perspective acceptance.
- DevOps/Security Agent: env vars, HTTPS/DNS/Nginx/PM2, backups, logs, secrets.

Do not spawn every role by default. For large changes, Product scopes first, specialists work/review, QA verifies, DevOps/Security deploys or reviews production risk.

