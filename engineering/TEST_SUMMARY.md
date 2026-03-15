# Test Summary

Last updated: March 15, 2026

## Current Gate Snapshot

- PASS: `npm run typecheck`
- PASS: `npm run lint`
- PASS: `npm run test` (**241 passing tests**)
- PASS: `npm run build`
- PASS: emulator bootstrap path on local runner (`npm run emulators:start:test`, `npm run emulators:seed:test`)
- PARTIAL: full emulator-backed Playwright gate log still needs to be captured and attached.

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

- **71 Playwright tests** across 8 spec files.
- Notes/tasks E2E coverage now validates the consolidated `/events` flow.
- Dashboard quick-action and overdue-task gaps are now covered.

## Remaining Release-Gate Work

- Complete full emulator-backed Playwright run and attach logs for release records.
- Finish remaining MVP E2E gaps (photo upload, profile/settings, auth edge-cases, resilience, responsive smoke).
- Keep tracking in [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).
