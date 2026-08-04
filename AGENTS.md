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
- For UI, visual design, art direction, layout polish, motion, prototype-like interactions, or product-grade design reviews, read and use `figma-generate-design` and `hyperframes` before editing code. If a Figma file or Figma context is involved, also read `figma-use`.
- Keep the Writing selector structurally aligned with the Speaking topic library: shared panel, toolbar, concise cards, pagination, and direct Choose-to-practice flow. `Full test` groups the original Task 1 and Task 2 from one Cambridge test in a 60-minute workspace and returns the official Task 1:Task 2 = 1:2 weighted score. `Topics` groups both Task 1 and Task 2 by the real content subject; choosing a topic still opens exactly one independent task with its own 20/40-minute timer, draft, restoration, submission, completion status, and score. Public Writing topics remain Task 2-only. Same test and Random exam simulations may also use the paired score contract. Retain regression coverage for Full test pairing and both independent Topic flows.
- In Listening and Reading libraries, “Topic” always means the semantic subject of the audio or passage (for example Education, Environment, Work, Health, Travel, Science, Culture, or Society). Keep IELTS question type as separate metadata for feedback/review; never use question type as the Topic taxonomy.
- Use subject-specific icons on Listening/Reading Topic directory cards. Once a Topic is selected, do not repeat a generic compass or other universal Topic glyph on every Section/Passage card; the real topic emoji and label are the useful identity.
- Listening captions use offline DashScope file ASR caches with `sentences`, `timedWords.start/end`, and `speaker`; do not use realtime ASR for fixed listening audio.
- Speaking uses realtime voice interaction; keep it separate from listening caption ASR. Optimize for natural turn-taking, no repeated questions, no premature interruption, automatic final score fill, and recording download.
- AI Coach text and screenshot explanations use the configured DashScope/Qwen channel by default through `COACH_AI_*` (falling back to `DASHSCOPE_*`). When a Qwen key is configured, do not retry Coach requests through the legacy `OPENAI_*` gateway. Never return raw provider errors, balance messages, response bodies, endpoints, or credentials to students.
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

