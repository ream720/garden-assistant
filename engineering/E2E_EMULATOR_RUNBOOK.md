# E2E Emulator Runbook

Last updated: March 15, 2026

This runbook is the canonical process for running the Playwright E2E suite against local Firebase emulators.

## Scope

- Starts Auth/Firestore/Storage emulators.
- Seeds deterministic auth + Firestore baseline test data.
- Runs Playwright with emulator-backed app runtime.

## Prerequisites

Install once on your machine:

1. Node.js 20+ and npm
2. Java runtime (required by Firestore emulator)
3. Firebase CLI (`firebase-tools`) available as either:
   - local binary at `node_modules/.bin/firebase` (recommended), or
   - global `firebase` on PATH

Quick checks:

```bash
node --version
java -version
firebase --version
```

## Environment Contract

Keep these values in `.env` (or `.env.local`):

```bash
# App Firebase config
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Emulator hosts
VITE_USE_FIREBASE_EMULATORS=false
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
VITE_FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199

# E2E login credentials
PW_E2E_EMAIL=e2e@grospace.test
PW_E2E_PASSWORD=Password123!
```

Notes:

- `PW_E2E_*` is preferred for Playwright bootstrap login.
- `VITE_FIREBASE_LOGIN_USER` + `VITE_FIREBASE_LOGIN_PW` are fallback values.
- Do not keep conflicting duplicate credential entries in `.env`.

## Recommended Run (One Command)

```bash
npm run test:e2e:emulator
```

What this does:

1. Starts emulators via `npm run emulators:start:test`
2. Builds and serves the app with emulator wiring
3. Runs global setup (`e2e/global-setup.ts`) which seeds emulator data and saves auth storage state
4. Executes Playwright tests

## Manual Run (Debug-Friendly)

Use this flow when debugging startup/seed/login issues.

Terminal A:

```bash
npm run emulators:start:test
```

Terminal B:

```bash
npm run emulators:seed:test
npm run test:e2e:emulator -- --grep "login page renders with email and password fields"
npm run test:e2e:emulator
```

## Troubleshooting

### Java missing

Symptom:

```text
Error: Process `java -version` has exited with code 1
```

Fix:

- Install a JDK/JRE (example on macOS: `brew install --cask temurin`)
- Ensure `java -version` succeeds

### Firebase CLI not found

Symptom:

```text
[emulators] Firebase CLI not found
```

Fix:

```bash
npm i -D firebase-tools
# or
npm i -g firebase-tools
```

### Firestore `PERMISSION_DENIED` during seed

Symptom:

```text
Request failed (403) ... status: "PERMISSION_DENIED"
```

Checks:

1. Pull latest code with seeded writes using emulator auth token.
2. Confirm emulators are running before seeding.
3. Ensure `VITE_FIREBASE_PROJECT_ID` in `.env` matches the emulator project in use.

### Auth bootstrap fails in global setup

Symptom:

```text
Missing credentials for Playwright auth bootstrap
```

Fix:

- Set `PW_E2E_EMAIL` and `PW_E2E_PASSWORD` in `.env`
- Re-run `npm run emulators:seed:test` before tests

### Port conflicts

Default ports:

- Auth: `9099`
- Firestore: `8080`
- Storage: `9199`
- Emulator Hub: `4400`

If ports are busy, stop old emulator processes or update hosts/ports consistently across `.env`, `firebase.json`, and Playwright env.
