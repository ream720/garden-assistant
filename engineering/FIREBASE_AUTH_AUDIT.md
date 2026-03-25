# Firebase Auth Audit

Last updated: March 25, 2026

## Scope and Goal

This audit inventories Grospace auth flows (app + tests), clarifies emulator and non-emulator assumptions, and defines quota/rate-limit mitigation policy for MVP launch gating.

## Auth Flow Inventory (App + Tests)

### App Flows

- Login: `/login` via [`LoginForm`](../app/components/auth/LoginForm.tsx), uses `useAuthStore.signIn(email, password, rememberMe)`.
- Register: `/register` via [`RegisterForm`](../app/components/auth/RegisterForm.tsx), uses `useAuthStore.signUp`.
- Reset password request: `/reset-password` via [`ResetPasswordForm`](../app/components/auth/ResetPasswordForm.tsx), uses `useAuthStore.resetPassword`.
- Session bootstrap: `initializeAuth()` in [`authStore`](../app/stores/authStore.ts) uses `onAuthStateChanged` with 10s timeout guard.
- Logout: sidebar/settings sign-out actions call `useAuthStore.signOut`.

### Test Flows

- E2E auth coverage in [`e2e/auth.spec.ts`](../e2e/auth.spec.ts): login/register/invalid creds/reset-link visibility/logout.
- E2E auth edge coverage in [`e2e/auth-edge.spec.ts`](../e2e/auth-edge.spec.ts): duplicate email, password mismatch/length checks, reset flow, session reload, remember-me interaction.
- E2E resilience coverage in [`e2e/responsive-resilience.spec.ts`](../e2e/responsive-resilience.spec.ts): offline login error messaging path.
- E2E session bootstrap: global auth setup in [`e2e/global-setup.ts`](../e2e/global-setup.ts) builds reusable storage state.
- Emulator auth seed path: [`scripts/seed-firebase-emulator.mjs`](../scripts/seed-firebase-emulator.mjs) creates deterministic test user and token-backed baseline documents.

## Emulator vs Non-Emulator Assumptions

### Emulator Mode

- Enabled in app runtime with `VITE_USE_FIREBASE_EMULATORS=true`.
- Auth/Firestore/Storage hosts configured by:
  - `VITE_FIREBASE_AUTH_EMULATOR_HOST`
  - `VITE_FIRESTORE_EMULATOR_HOST`
  - `VITE_FIREBASE_STORAGE_EMULATOR_HOST`
- Playwright emulator runs enabled by `PW_USE_FIREBASE_EMULATOR=true`.
- Seed credentials resolved from `PW_E2E_EMAIL/PW_E2E_PASSWORD` with fallback to `VITE_FIREBASE_LOGIN_USER/VITE_FIREBASE_LOGIN_PW`.

### Non-Emulator Mode

- App uses configured Firebase project (`VITE_FIREBASE_PROJECT_ID`, etc.).
- Login and reset calls can consume provider quota/rate limits.
- This mode is not the release-gate source of truth for launch validation.

## Quota / Rate-Limit Risk Points

- Repeated UI auth in E2E can hit Auth provider limits in non-emulator mode.
- Reset-password tests against non-emulator project can trigger anti-abuse thresholds.
- Flaky test reruns amplify auth request volume if storage-state reuse is not used.

## Mitigation Matrix

| Risk | Severity | Launch Blocking | Mitigation | Owner/Status |
| --- | --- | --- | --- | --- |
| Non-emulator auth quota exhaustion during E2E | High | Yes | Enforce emulator-first E2E gate path and seeded login state reuse | In place |
| Emulator seed writes denied by rules | High | Yes | Seed with authenticated token-backed Firestore writes | In place |
| Emulator startup instability (CLI/update checks) | Medium | Yes | Deterministic emulator launcher + skip update-check env + explicit errors | In place |
| Missing/ambiguous E2E credential env values | Medium | Yes | Standardize on `PW_E2E_*` defaults and document fallback contract | In place |
| Auth bootstrap regressions from onboarding/modal changes | Medium | Yes | Keep global-setup login path assertions and rerun targeted auth/navigation suites on auth-related UI changes | Active policy |
| CI/local drift in auth behavior | Medium | Yes | Require both local and CI evidence in pre-invite shakedown doc | Active policy |

## MVP Gate Decision

- Launch policy: **zero Playwright failures** on full emulator-backed run.
- Script policy: `npm run test:e2e` defaults to emulator mode; cloud-auth runs require explicit `test:e2e:cloud*` commands.
- Rules policy: run `npm run test:rules` to validate phase-1 and phase-2 ownership enforcement before auth/data model transitions.
- Evidence policy: both local and CI command evidence required in [`PREINVITE_SHAKEDOWN.md`](./PREINVITE_SHAKEDOWN.md).
- Current state (March 16, 2026): emulator bootstrap path is stabilized; full emulator Playwright evidence remains required in an unrestricted runner.

## References

- [`E2E_TESTING.md`](./E2E_TESTING.md)
- [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)
- [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
- [`MVP_TEST_GATE.md`](./MVP_TEST_GATE.md)
