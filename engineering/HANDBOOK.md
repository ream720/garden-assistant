# Engineering Handbook (Seed)

Last updated: March 16, 2026

This is a seeded long-form handbook for implementation context. Keep this concise and evolve it as architecture and release workflows mature.

## Product Intent and MVP Focus

Grospace helps growers track spaces, plants, tasks, and notes/history with a fast, reliable MVP.

Current MVP focus:

- Consolidated `/events` workflow for notes + tasks.
- Reliable core CRUD + linked-history behaviors (task completion notes, harvest notes).
- Dashboard usability, onboarding clarity, and per-space visibility.
- Stable release gates (build/lint/test/e2e readiness).

## Architecture Overview

### Frontend and Routing

- React Router app with route-first UI structure under `app/routes`.
- Core user-facing flows: dashboard, spaces, plants, events, profile, settings, auth routes.

### State and Data Flow

- Zustand stores in `app/stores` for auth, spaces, plants, tasks, notes.
- Service layer in `app/lib/services` encapsulates Firestore/storage behavior and domain operations.
- Routes/components consume store actions and render reactive UI state.

### Persistence and Platform

- Firebase Auth + Firestore + Storage.
- Rules and indexes at repo root (`firestore.rules`, `storage.rules`, `firestore.indexes.json`).

### Testing Stack

- Unit/integration: Vitest + Testing Library.
- E2E: Playwright.
- Release gates rely on command-level checks and shakedown logging.

## Delivery Workflow and Documentation Rules

- Canonical planning docs live in `/engineering`.
- Root planning markdown files were removed pre-launch; keep planning docs in `/engineering` only.
- Use focused backlog docs for active work:
  - MVP product: [`MVP_LAUNCH_BACKLOG.md`](./MVP_LAUNCH_BACKLOG.md)
  - Testing/release gates: [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
  - Monetization: [`MONETIZATION_BACKLOG.md`](./MONETIZATION_BACKLOG.md)
- Move completed backlog work into archive docs to keep active planning readable.
- Keep docs link-safe (repo-relative links, no machine-specific absolute paths).

## Standard Validation Commands

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e:emulator` (full gate run; keep zero-failure policy)

## Known Risks and Deferred Areas

- Emulator startup/seed/auth-bootstrap workflow is stabilized; release confidence still depends on attaching full emulator-backed Playwright gate logs.
- Post-MVP lint hardening still pending.
- Dashboard timeline expansion remains deferred post-MVP.
- Monetization remains planned but not yet implemented in production flows.

## Reference Docs

- Docs index: [`README.md`](./README.md)
- Backlog index: [`BACKLOG.md`](./BACKLOG.md)
- Test gate docs: [`MVP_TEST_GATE.md`](./MVP_TEST_GATE.md), [`E2E_TESTING.md`](./E2E_TESTING.md), [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md), [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md), [`PREINVITE_SHAKEDOWN.md`](./PREINVITE_SHAKEDOWN.md), [`TEST_SUMMARY.md`](./TEST_SUMMARY.md)
