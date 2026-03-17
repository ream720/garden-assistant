# Pre-Invite Shakedown Log

Last updated: March 16, 2026

Gate policy:

- Zero Playwright failures for full emulator-backed suite.
- Evidence required from both local and CI runs before launch sign-off.

## Command Matrix

| Command | Required | Local Status | CI Status |
| --- | --- | --- | --- |
| `npm run typecheck` | Yes | Pass | Pending |
| `npm run lint` | Yes | Pass | Pending |
| `npm run test` | Yes | Pass | Pending |
| `npm run build` | Yes | Pass | Pending |
| `npm run test:e2e:emulator` (full run) | Yes | Fail in restricted runner (`config.webServer` exit code 2; see open issue) | Pending |

## Local Run Evidence

Runner context:

- Date: March 16, 2026 (EDT)
- Workspace: `garden-assistant`
- Notes: This environment does not permit localhost emulator port binding, so full emulator Playwright execution cannot complete here.

### Local command log

| Time (EDT) | Command | Result | Evidence |
| --- | --- | --- | --- |
| 18:02:06 | `npm run typecheck` | Pass | Exit code 0 (`react-router typegen && tsc`) |
| 18:02:09 | `npm run lint` | Pass | Exit code 0 (`eslint . --ext ts,tsx`) |
| 18:02:11 | `npm run test` | Pass | Vitest passed: 25 files, 241 tests |
| 18:02:16 | `npm run build` | Pass | React Router/Vite build completed with exit code 0 |
| 18:02:19 | `npm run test:e2e:emulator` | Fail in this runner | Playwright failed during `config.webServer` startup (exit code 2) |

Supporting diagnostics:

- 18:02:41 `npm run emulators:start:test` -> Fail (`listen EPERM` on localhost port binding).
- 18:02:28 `npm run test:e2e:emulator -- --list` -> Pass (suite inventory resolves: 87 tests in 11 files).

## CI Run Evidence

Status: Pending

Required before launch sign-off:

1. Attach CI job links/artifacts for all required commands.
2. Confirm full `npm run test:e2e:emulator` passes with zero failures.
3. Record exact CI run timestamp and commit SHA.

## Open Issues (Must be Empty for Launch-Ready)

| ID | Description | Severity | Blocking | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| SHK-001 | Full emulator Playwright run cannot be validated in this restricted runner because Firebase emulators cannot bind required localhost ports (`listen EPERM`) | High | Yes | Engineering | Open |

Launch-ready criterion for this table: **zero open blocking issues**.

## References

- [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md)
- [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)
- [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
