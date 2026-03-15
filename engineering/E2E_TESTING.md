# Grospace E2E Test Suite

Last updated: March 15, 2026

## Status

- Suite size: **71 tests across 8 spec files**.
- Framework: [Playwright](https://playwright.dev/) (Chromium).
- Route model: Notes/Tasks coverage now validates the consolidated `/events` workflow.
- Auth model: Playwright global auth bootstrap + storage-state reuse is enabled via `e2e/global-setup.ts`.
- Emulator model: Firebase emulator seeding is wired via `scripts/seed-firebase-emulator.mjs`.

## Primary Commands

Detailed emulator workflow and troubleshooting:

- [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)

```bash
# Default runs
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui

# Emulator-backed runs (recommended for gate stability)
npm run test:e2e:emulator
npm run test:e2e:emulator:headed
npm run test:e2e:emulator:ui

# One-off utilities
npm run emulators:start:test
npm run emulators:seed:test
npx playwright test --list
```

## Setup Notes

### Environment variables

Required in `.env`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Recommended for deterministic auth bootstrap:

- `PW_E2E_EMAIL`
- `PW_E2E_PASSWORD`

Fallback values if `PW_*` vars are not set:

- `VITE_FIREBASE_LOGIN_USER`
- `VITE_FIREBASE_LOGIN_PW`

### Emulator mode

- Enable with `PW_USE_FIREBASE_EMULATOR=true` (already wired in npm scripts).
- App Firebase SDK emulator toggles are controlled by:
  - `VITE_USE_FIREBASE_EMULATORS`
  - `VITE_FIREBASE_AUTH_EMULATOR_HOST`
  - `VITE_FIRESTORE_EMULATOR_HOST`
  - `VITE_FIREBASE_STORAGE_EMULATOR_HOST`
- Seeding script resets auth + firestore and creates:
  - deterministic test user
  - baseline seeded space for note/task flows

## Current Coverage Snapshot

- `auth.spec.ts` (9): login/register/reset/auth errors/basic auth flows
- `navigation.spec.ts` (21): public/protected routing, Events IA nav, legacy `/notes` + `/tasks` redirects
- `dashboard.spec.ts` (7): dashboard shell/stat cards/section visibility
- `dashboard-actions.spec.ts` (4): dashboard quick-action create flows + dashboard mark-complete flow
- `spaces.spec.ts` (5): spaces CRUD basics + space detail navigation
- `plants.spec.ts` (13): plants CRUD + detail actions + status/move/harvest dialogs
- `tasks.spec.ts` (7): Events tasks create/edit/delete/complete/filter + overdue status coverage
- `notes.spec.ts` (5): Events notes create/edit/delete/filter coverage

## Remaining High-Priority Gaps

- Note photo upload E2E coverage.
- Profile + Settings E2E coverage.
- Auth edge-case E2E coverage (duplicate email, password mismatch, short password, reset flow, session persistence, remember-me).
- Error/resilience coverage (offline/friendly errors/empty-state behavior).
- Responsive smoke coverage.

## Execution Caveats

- In restricted environments, Playwright webServer startup may fail due local port restrictions.
- Emulator mode requires a preinstalled Firebase CLI (`firebase-tools`) available via local `node_modules/.bin/firebase` or global `firebase`.
