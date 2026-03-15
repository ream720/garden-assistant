# Engineering Backlog Index

Last updated: March 15, 2026 (post emulator stabilization + runbook pass)

Use this file as the control-plane backlog. Detailed work lives in focused docs linked below.

## Now

- [ ] Run Firebase Auth audit and capture quota-risk mitigations in release docs. See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).
- [ ] Run pre-invite shakedown with gate command log, including full emulator-backed Playwright runs. See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).
- [ ] Complete remaining MVP E2E coverage gaps (note photos, profile/settings, auth edge cases, resilience/responsive smoke). See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).

Recent milestone (completed):

- [x] Emulator-first E2E workflow stabilized (startup/seed/auth bootstrap path) and documented in [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md).

## Next

- [ ] Improve dashboard UX for visualizing spaces and plants together. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).
- [ ] Notes backward-compatibility cleanup to align with cleaner Tasks query model. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).
- [ ] Post-MVP lint hardening (`react/no-unescaped-entities` re-enable + escape cleanup). See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).

## Later

- [ ] Monetization foundation and billing rollout. See [`MONETIZATION_BACKLOG.md`](./MONETIZATION_BACKLOG.md).
- [ ] Timeline and space/plant visualization expansion work. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).

## Backlog Documents

- MVP launch product work: [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md)
- Test gates and release readiness: [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
- Monetization roadmap: [`MONETIZATION_BACKLOG.md`](./MONETIZATION_BACKLOG.md)
- Completed history archive: [`archive/COMPLETED_BACKLOG_2026_Q1.md`](./archive/COMPLETED_BACKLOG_2026_Q1.md)
