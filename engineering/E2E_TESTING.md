# Grospace E2E Test Suite

Last updated: March 25, 2026

## Status

- Suite size: **88 tests across 12 spec files** (includes opt-in seeded-account smoke spec).
- Framework: [Playwright](https://playwright.dev/) (Chromium).
- Route model: Notes/Tasks coverage now validates the consolidated `/events` workflow.
- Auth model: Playwright global auth bootstrap + storage-state reuse is enabled via `e2e/global-setup.ts`.
- Emulator model: Firebase emulator seeding is wired via `scripts/seed-firebase-emulator.mjs`.

## Primary Commands

Detailed emulator workflow and troubleshooting:

- [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)

```bash
# Default runs (emulator-backed; recommended)
npm run test:e2e
npm run test:e2e:emulator:headed
npm run test:e2e:emulator:ui

# Emulator-backed runs (recommended for gate stability)
npm run test:e2e:emulator
npm run test:e2e:emulator:headed
npm run test:e2e:emulator:ui

# Cloud-auth runs (explicit opt-in only)
npm run test:e2e:cloud
npm run test:e2e:cloud:headed
npm run test:e2e:cloud:ui

# One-off utilities
npm run emulators:start:test
npm run emulators:seed:test
npm run seed:account:dry
npm run seed:account
npm run backfill:auth-users:dry
npm run backfill:auth-users
npm run migrate:firestore:user-subcollections:dry
npm run migrate:firestore:user-subcollections
npm run migrate:firestore:user-subcollections:verify
npm run migrate:firestore:user-subcollections:finalize:dry
npm run migrate:firestore:user-subcollections:finalize
npm run test:rules
npm run test:rules:phase1
npm run test:rules:phase2
npm run test:e2e:seed-smoke
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

### Cloud append-only seeded account mode (manual UI dataset fill)

- Use this mode when you want realistic-looking data in a dedicated test account.
- The account seeder is append-only and **does not delete existing records**.
- It uses:
  - `VITE_FIREBASE_LOGIN_USER`
  - `VITE_FIREBASE_LOGIN_PW`
- Supported dataset sizes:
  - `light`: 2 spaces, 8 plants, 20 notes, 15 tasks
  - `medium` (default): 4 spaces, 20 plants, 60 notes, 40 tasks
  - `heavy`: 8 spaces, 60 plants, 180 notes, 120 tasks
- Every seeded document includes metadata:
  - `seedBatchId`
  - `seedRecordSource`
  - `seededAt`

Recommended one-off flow:

```bash
# Preview only (no network writes)
npm run seed:account:dry

# Append a realistic medium dataset
npm run seed:account

# Optional: change volume
node scripts/seed-firebase-account.mjs --size=heavy

# Verify seeded UI shape with the opt-in smoke spec
npm run test:e2e:seed-smoke
```

Notes:

- `test:e2e:seed-smoke` is opt-in and does not affect default release-gate runs.
- For optional cleanup later, filter by `seedBatchId` in Firestore and remove that batch's docs.

## Current Coverage Snapshot

- `auth.spec.ts` (9): login/register/reset/auth errors/basic auth flows
- `auth-edge.spec.ts` (7): duplicate-email, mismatch/short password validation, reset flow, session reload, remember-me interaction, and first-run onboarding visibility for new signups
- `navigation.spec.ts` (21): public/protected routing, Events IA nav, legacy `/notes` + `/tasks` redirects
- `dashboard.spec.ts` (7): dashboard shell/stat cards/section visibility
- `dashboard-actions.spec.ts` (4): dashboard quick-action create flows + dashboard mark-complete flow
- `spaces.spec.ts` (5): spaces CRUD basics + space detail navigation
- `plants.spec.ts` (13): plants CRUD + detail actions + status/move/harvest dialogs
- `tasks.spec.ts` (7): Events tasks create/edit/delete/complete/filter + overdue status coverage
- `notes.spec.ts` (6): Events notes create/edit/delete/filter + note-photo upload coverage
- `profile-settings.spec.ts` (4): profile and settings smoke/update/theme/sign-out coverage
- `responsive-resilience.spec.ts` (4): offline friendly-error flow + mobile navigation/dashboard/settings smoke

## Remaining High-Priority Gaps

- Full-run stability validation for the new slices in unrestricted emulator runners (local + CI evidence).

## Execution Caveats

- In restricted environments, Playwright webServer startup may fail due local port restrictions.
- Emulator mode requires a preinstalled Firebase CLI (`firebase-tools`) available via local `node_modules/.bin/firebase` or global `firebase`.
