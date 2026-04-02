# Pre-Invite Shakedown Log

Last updated: March 25, 2026 (EDT)

Gate policy:

- Zero Playwright failures for the full emulator-backed suite.
- Capture local command evidence with timestamps before invite-wave sign-off.
- Capture CI evidence before launch sign-off.

## Command Matrix

| Command | Required | Local Status | CI Status |
| --- | --- | --- | --- |
| `npm run typecheck` | Yes | Pass (2026-03-25 22:43 EDT) | Pending |
| `npm run lint` | Yes | Pass (2026-03-25 22:43 EDT) | Pending |
| `npm run test` | Yes | Pass (2026-03-25 22:43 EDT) | Pending |
| `npm run build` | Yes | Pass (2026-03-25 22:43 EDT) | Pending |
| `npm run test:rules` | Yes | Pass (2026-03-25 22:43 EDT) | Pending |
| `npm run test:e2e` (full emulator run) | Yes | Pass (`87 passed`, `1 skipped`, `0 failed`; completed 2026-03-25 22:52 EDT) | Pending |

## Local Run Evidence

Runner context:

- Date: March 25, 2026 (EDT)
- Workspace: `garden-assistant`
- Emulator mode: `PW_USE_FIREBASE_EMULATOR=true` (default for `npm run test:e2e`)

### Local command log

| Time (EDT) | Command | Result | Evidence |
| --- | --- | --- | --- |
| 22:43:02 | `npm run typecheck` | Pass | `react-router typegen && tsc` succeeded |
| 22:43:05 | `npm run lint` | Pass | `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0` succeeded |
| 22:43:07 | `npm run test` | Pass | Vitest: `28` files, `264` tests passed |
| 22:43:13 | `npm run build` | Pass | React Router/Vite client+SSR build succeeded |
| 22:43:15 | `npm run test:rules` | Pass | Phase 2 rules assertions passed (`[rules phase2] all assertions passed`) |
| 22:43:59 | `npm run test:e2e` | Pass after stabilization rerun | Full suite result: `87 passed`, `1 skipped`, `0 failed`; completed 22:52:18 |

### Migration closeout evidence (cloud project `grospace-d7a36`)

Credential context for these commands:

- `GOOGLE_APPLICATION_CREDENTIALS=<absolute-local-path-to-service-account-json>`
- Use a local shell export or CI secret; do not commit credential file paths or key material to the repository.

| Time (EDT) | Command | Result | Evidence |
| --- | --- | --- | --- |
| 22:41:35 | `npm run migrate:firestore:user-subcollections:finalize:dry` | Pass | `verified_users=9 mismatches=0` |
| 22:42:01 | `npm run migrate:firestore:user-subcollections:finalize` | Pass | `finalize stripped_userId=302 deleted_legacy_docs=0` |
| 22:42:34 | `npm run migrate:firestore:user-subcollections:verify` | Pass | `verified_users=9 mismatches=0` |

Note:

- `extras=30` entries were reported in finalize/verify as non-blocking subcollection-only records (expected post-finalize in this migration script design).

## CI Run Evidence

Status: Pending

Required before launch sign-off:

1. Attach CI job links/artifacts for all required commands.
2. Confirm CI full `npm run test:e2e` pass with zero failures.
3. Record CI timestamp and commit SHA.

## Open Issues (Must be Empty for Launch-Ready)

No open blocking shakedown issues.

## References

- [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md)
- [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)
- [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
