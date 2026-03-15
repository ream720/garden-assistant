# MVP Test Gate

Last updated: March 15, 2026

This doc is the current gate summary. Historical static-audit details were archived during the engineering docs consolidation.

## Audit/Hardening Status

- Original audit items `A-01` through `A-12`: **implemented and closed**.
- Events consolidation parity: functional behavior is in `/events`; legacy `/notes` and `/tasks` are redirect paths.
- Dashboard KPI set locked for MVP: `Active Plants`, `Open Issues`, `Tasks Due`, `Total Harvests`.

## Current Gate Signals

- PASS: `npm run typecheck`
- PASS: `npm run lint`
- PASS: `npm run test` (`241` tests)
- PASS: `npm run build`
- PASS: emulator bootstrap path (`npm run emulators:start:test`, `npm run emulators:seed:test`) on local runner
- PARTIAL: Playwright gate still requires attached full emulator-backed run logs for release evidence.

## Gate Recommendation

MVP remains a **launch candidate with explicit caveats**:

1. Run and store a full emulator-backed Playwright shakedown log (use [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)).
2. Complete remaining high-priority E2E gaps tracked in [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md).
3. Keep release decisions tied to command-level gate logs, not historical doc snapshots.

## References

- E2E details: [`E2E_TESTING.md`](./E2E_TESTING.md)
- Emulator runbook: [`E2E_EMULATOR_RUNBOOK.md`](./E2E_EMULATOR_RUNBOOK.md)
- Test summary: [`TEST_SUMMARY.md`](./TEST_SUMMARY.md)
- Active gate backlog: [`TEST_GATES_BACKLOG.md`](./TEST_GATES_BACKLOG.md)
