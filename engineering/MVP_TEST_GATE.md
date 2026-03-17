# MVP Test Gate

Last updated: March 16, 2026

This doc is the current gate summary. Historical static-audit details were archived during the engineering docs consolidation.

## Audit/Hardening Status

- Original audit items `A-01` through `A-12`: **implemented and closed**.
- Events consolidation parity: functional behavior is in `/events`; legacy `/notes` and `/tasks` are redirect paths.
- Dashboard KPI set locked for MVP: `Active Plants`, `Open Issues`, `Tasks Due`, `Total Harvests`.
- Firebase auth audit artifact completed: [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md).

## Current Gate Signals

- PASS: `npm run typecheck`
- PASS: `npm run lint`
- PASS: `npm run test` (`241` tests)
- PASS: `npm run build`
- PASS: E2E suite inventory expanded to `87` tests (`11` files), including auth-edge/profile-settings/resilience slices.
- PARTIAL: Playwright gate still requires attached full emulator-backed zero-failure run logs for release evidence.

## Gate Recommendation

MVP remains a **launch candidate with explicit caveats**:

1. Run and store full emulator-backed Playwright shakedown logs from unrestricted local and CI runners (use [`PREINVITE_SHAKEDOWN.md`](./PREINVITE_SHAKEDOWN.md)).
2. Maintain zero-failure policy for the full emulator-backed Playwright suite.
3. Keep release decisions tied to command-level gate logs, not historical doc snapshots.

## References

- E2E details: [`E2E_TESTING.md`](./E2E_TESTING.md)
- Emulator runbook: [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)
- Auth audit: [`FIREBASE_AUTH_AUDIT.md`](./FIREBASE_AUTH_AUDIT.md)
- Shakedown log: [`PREINVITE_SHAKEDOWN.md`](./PREINVITE_SHAKEDOWN.md)
- Test summary: [`TEST_SUMMARY.md`](./TEST_SUMMARY.md)
- Active gate backlog: [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
