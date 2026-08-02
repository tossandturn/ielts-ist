# Speaking Parts, Countdown, and Stable Examiner Plan

## Task 1: Finish Writing/Speaking completion UI

- Extend the existing RED browser contract for exact Writing Task 1/Task 2 and Speaking IDs.
- Add completion filtering, grouped `x/y completed`, row/card badges, and completed dates.
- Verify desktop, iPad, and 390px mobile geometry and page errors.
- Commit.

## Task 2: Stabilize scoring and examiner behavior

- Add RED tests for structured four-criterion normalization, server-calculated Overall, scoped evidence cautions, calm persona, one-question behavior, and recent/current duplicate ledgers.
- Require structured scoring output and normalize it server-side with a deterministic report.
- Persist a small identity-partitioned recent Speaking question ledger and include it in realtime instructions.
- Keep raw prompts hidden and preserve chronological dialogue scoring.
- Commit.

## Task 3: Add Part practice and automatic countdown

- Add RED tests for Full/Part 1/Part 2/Part 3 setup controls and 15:00/5:00/3:00/5:00 targets.
- Carry the selected scope into the realtime session and schedule only allowed Parts.
- Render remaining time, start automatically on Start, auto-score at zero with minimum speech evidence, and clear on disconnect.
- Verify Full exam stays 15 minutes and reconnect preserves original deadline/scope.
- Commit.

## Task 4: Final verification and delivery

- Run syntax, Speaking, completion, learning, layout, ASR, and source-preservation regressions.
- Review the final diff for prompt exposure, secrets, environment, database, and source-bank changes.
- Fast-forward main, push GitHub, restart only local preview, and verify local/GitHub HEAD equality.
- Do not deploy production.
