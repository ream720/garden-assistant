# Engineering Backlog Index

Last updated: March 21, 2026 (events focused-pass findings added)

Use this file as the control-plane backlog. Detailed work lives in focused docs linked below.

## Now

- [x] Run Firebase Auth audit and capture quota-risk mitigations in release docs. See [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md).
- [ ] Run pre-invite shakedown with gate command log, including full emulator-backed Playwright runs. See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).
- [x] Complete remaining MVP E2E coverage gaps (note photos, profile/settings, auth edge cases, resilience/responsive smoke). See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).

Recent milestone (completed):

- [x] Emulator-first E2E workflow stabilized (startup/seed/auth bootstrap path) and documented in [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md).

## Next

- [ ] Notes backward-compatibility cleanup to align with cleaner Tasks query model. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).
- [ ] Define implementation plan for Plants/Spaces Notes/Tasks split-layout rework. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).
- [ ] Visually align Notes and Tasks layouts for consistent field placement and flow. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).
- [ ] Post-MVP lint hardening (`react/no-unescaped-entities` re-enable + escape cleanup). See [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).

Events focused-pass findings (March 21, 2026):

- [ ] Deduplicate Events task-filter predicates to remove drift risk between list filtering and status counts; add parity tests for context/scope/status/priority combinations. Primary touchpoint: `app/routes/events.tsx`.
- [ ] Add an in-flight guard around recurring occurrence selection/completion flows to prevent duplicate create/completion paths under rapid interaction. Primary touchpoints: `app/routes/events.tsx`, `app/lib/services/taskService.ts`.
- [ ] Expand Events route test coverage for currently weak paths: Notes CRUD dialogs, Notes/Tasks view-toggle URL sync, mobile details sheet behavior, photo modal open/close, and cleanup effect assertions. Primary touchpoint: `app/test/routes/events.test.tsx`.
- [ ] Plan incremental Events decomposition after gate-critical fixes: extract URL filter codec/state transitions, split filter/list panes into components, and move controller logic toward reducer-driven state handling.

Recently completed (March 16, 2026):

- [x] Guided dashboard walkthrough upgraded to actionable setup flow with resumable progress.
- [x] Onboarding flow stabilized for new signups by scoping dashboard data to current user context.
- [x] Rolled back dashboard `Spaces & Plants Snapshot` card pending redesign of a more visual spaces/plants experience.
- [x] Canonical gate artifacts created: [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md), [`PREINVITE_SHAKEDOWN.md`](./PREINVITE_SHAKEDOWN.md).
- [x] Made `Variety/Cultivar` optional in Add New Plant flow.

## Later

- [ ] Monetization foundation and billing rollout. See [`MONETIZATION_BACKLOG.md`](./MONETIZATION_BACKLOG.md).
- [ ] Timeline and space/plant visualization expansion work. See [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md).
- [ ] Evaluate long-term Events model direction: notes-first workflow with optional task conversion.

## Backlog Documents

- MVP launch product work: [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md)
- Test gates and release readiness: [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
- Monetization roadmap: [`MONETIZATION_BACKLOG.md`](./MONETIZATION_BACKLOG.md)
- Completed history archive: [`archive/COMPLETED_BACKLOG_2026_Q1.md`](./archive/COMPLETED_BACKLOG_2026_Q1.md)
