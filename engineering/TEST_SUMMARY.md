# Test Summary

Last updated: March 16, 2026

## Current Gate Snapshot

- PASS: `npm run typecheck`
- PASS: `npm run lint`
- PASS: `npm run test` (**241 passing tests**)
- PASS: `npm run build`
- PASS: gate artifacts created (`FIREBASE_AUTH_AUDIT.md`, `PREINVITE_SHAKEDOWN.md`)
- PARTIAL: full emulator-backed Playwright gate log still needs to be captured and attached from unrestricted local/CI runners.

## Unit/Integration Coverage

- Vitest suite total: **241 tests** across services, stores, components, route behavior, and utility layers.
- Key risk areas covered by automated tests:
  - Date conversion and formatting safety.
  - Firestore payload cleaning and undefined-field guards.
  - Plant/task/note service behavior and validation paths.
  - Store-level CRUD + error/loading behavior.
  - `/events` route behavior for task/notes flows, filters, and deep-link state.

## E2E Coverage Summary

See [`E2E_TESTING.md`](./E2E_TESTING.md) for current per-spec detail.

Current suite footprint:

- **87 Playwright tests** across 11 spec files.
- Notes/tasks E2E coverage now validates the consolidated `/events` flow.
- Dashboard quick-action, overdue-task, note-photo, profile/settings, auth-edge, resilience/responsive, and new-signup onboarding visibility paths are covered in spec inventory.

## Remaining Release-Gate Work

- Complete full emulator-backed Playwright run and attach logs for release records.
- Confirm zero-failure stability for new E2E slices in unrestricted local + CI runners.
- Keep tracking in [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).
