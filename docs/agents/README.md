# IELTS-ist Agent Roles

This folder defines persistent project-specific sub-agent roles for IELTS-ist.

Every agent must first read:

1. `docs/agents/shared-project-memory.md`
2. Its own role file in this folder
3. `AGENTS.md`

Use these agents as role prompts for Codex sub-agents, code-review passes, planning, and implementation delegation.

## Agents

- `product-agent.md` - PRD, MVP scope, version planning.
- `ielts-curriculum-agent.md` - IELTS standards, tasks, scoring quality.
- `ux-agent.md` - practice flow, report experience, learning path.
- `frontend-agent.md` - UI, components, responsive layout, interaction.
- `backend-agent.md` - API, database, auth, user records.
- `ai-scoring-agent.md` - writing/speaking scoring logic, rubrics, prompt eval.
- `question-bank-agent.md` - bank schema, import, tags, material management.
- `qa-agent.md` - unit, integration, end-to-end, edge cases.
- `devops-security-agent.md` - deployment, env vars, monitoring, backup, security.

## Collaboration Rules

- Use the most relevant agent for the current task, not all agents by default.
- For large changes, Product Agent scopes first, then specialist agents implement/review.
- Frontend and UX must coordinate for visible flows.
- Backend, DevOps/Security, and AI Scoring must coordinate for any key, model, payment, auth, or realtime voice changes.
- QA Agent should verify local and public URLs before release when the change is user-facing.

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

