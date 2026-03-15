# Test Gates Backlog

Last updated: March 15, 2026 (post emulator startup/seed stabilization)

## Events Refactor Test Alignment

- [ ] Keep Events route unit/e2e assertions current as `/events` UX evolves.

## Release Gates (Pre-Invite / Pre-Launch)

- [ ] Firebase Auth audit: inventory app + test auth flows, verify provider/rules/session assumptions, and document quota risk points with mitigations.
- [ ] E2E auth stability: run full local/CI validation on emulator-backed suite and confirm no quota/rate-limit regressions.
- [ ] Shakedown runbook: log `npm run typecheck`, `npm run build`, `npm run test`, and targeted `npm run test:e2e` before invite waves.
  - Local status (2026-03-15): `typecheck`, `lint`, `test`, `build`, `emulators:start:test`, and `emulators:seed:test` pass.
  - Pending gate evidence: full emulator-backed Playwright run log attachment.

## High-Priority MVP Coverage Gaps

- [ ] Note photo upload E2E coverage.
- [ ] Profile + Settings E2E coverage.
- [ ] Auth edge-case E2E coverage (duplicate email, password mismatch, short password, reset flow, session persistence, remember-me).
- [ ] Error/resilience checks (offline behavior, friendly Firebase errors, empty states).
- [ ] Responsive smoke coverage (mobile nav, dashboard card stacking, form usability).

## Recently Completed

- [x] Unit test refactor for Events (`/events` model for notes/tasks route behavior and nav assertions).
- [x] E2E test refactor for Events (`e2e/notes.spec.ts`, `e2e/tasks.spec.ts`, `e2e/navigation.spec.ts`, deep links/redirects).
- [x] Auth test utility setup: standardized Playwright global auth bootstrap + Firebase Emulator seeding path (`e2e/global-setup.ts`, `scripts/seed-firebase-emulator.mjs`).
- [x] Emulator startup hardening: deterministic Firebase CLI launcher (`scripts/start-firebase-emulators.mjs`) + clearer missing-CLI errors.
- [x] Emulator readiness hardening: robust readiness checks (Auth 405 handling + Playwright health-check via Emulator Hub endpoint).
- [x] Emulator seed hardening under Firestore rules: authenticated token-backed writes for seeded user/space documents.
- [x] Emulator workflow documentation: created [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md).
- [x] Flaky plant-edit assertion stabilization in `e2e/plants.spec.ts`.
- [x] Overdue tasks UI validation (automated in `e2e/tasks.spec.ts`).
- [x] Dashboard quick actions E2E coverage (`e2e/dashboard-actions.spec.ts`).

## Additional Test Backlog

- [ ] Integration test audit for untested feature paths.
- [ ] Integration/Playwright coverage for "Create New Space" from Plant form.
- [ ] Broader Playwright expansion for critical user flows.
- [ ] Activity feed edge-case checks (long content, high volume scroll, deleted references, empty states, date labels).
- [ ] Garden stats edge-case checks (no harvests, no plants, missing harvest dates).

## Code Quality Gate Follow-Up

- [ ] Post-MVP lint hardening: re-enable `react/no-unescaped-entities` and clean JSX text escapes.

## References

- Backlog index: [`BACKLOG.md`](./BACKLOG.md)
- Gate docs: [`MVP_TEST_GATE.md`](./MVP_TEST_GATE.md), [`E2E_TESTING.md`](./E2E_TESTING.md), [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md), [`TEST_SUMMARY.md`](./TEST_SUMMARY.md)
