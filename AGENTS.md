# AGENTS Operator Guide

This file is the project-level operator guide for planning and execution context.

## Project Snapshot

- Project: Grospace
- Stage: MVP pre-launch hardening
- Current focus: `/events` consolidation follow-through, test-gate stability, and final dashboard polish

## Canonical Documentation Map

All planning docs now live under [`engineering/`](./engineering/README.md).

Primary entrypoints:

- Backlog index: [`engineering/BACKLOG.md`](./engineering/BACKLOG.md)
- MVP product backlog: [`engineering/MVP_LAUNCH_BACKLOG.md`](./engineering/MVP_LAUNCH_BACKLOG.md)
- Test gates backlog: [`engineering/TEST_GATES_BACKLOG.md`](./engineering/TEST_GATES_BACKLOG.md)
- Monetization backlog: [`engineering/MONETIZATION_BACKLOG.md`](./engineering/MONETIZATION_BACKLOG.md)
- Long-form handbook: [`engineering/HANDBOOK.md`](./engineering/HANDBOOK.md)
- Completed archive: [`engineering/archive/COMPLETED_BACKLOG_2026_Q1.md`](./engineering/archive/COMPLETED_BACKLOG_2026_Q1.md)

Legacy docs moved from root:

- [`engineering/MVP_TEST_GATE.md`](./engineering/MVP_TEST_GATE.md)
- [`engineering/E2E_TESTING.md`](./engineering/E2E_TESTING.md)
- [`engineering/TEST_SUMMARY.md`](./engineering/TEST_SUMMARY.md)
- [`engineering/EVENTS_PARITY_TRACKER.md`](./engineering/EVENTS_PARITY_TRACKER.md)
- [`engineering/MONETIZATION_STRATEGY_AUDIT.md`](./engineering/MONETIZATION_STRATEGY_AUDIT.md)
- [`engineering/MONETIZATION_IMPLEMENTATION_PLAN.md`](./engineering/MONETIZATION_IMPLEMENTATION_PLAN.md)

## Documentation Workflow Rules

- Treat `/engineering/*` as source-of-truth for planning docs.
- Root-level planning markdown files were removed pre-launch; do not recreate legacy root planning docs.
- Keep active backlog files focused on open work.
- Move completed items into archive docs to keep active planning readable.
- Use repo-relative markdown links only (no machine-specific absolute paths).

## Backlog Update Rules

- Update `engineering/BACKLOG.md` for top-level Now/Next/Later priority shifts.
- Log product launch work in `engineering/MVP_LAUNCH_BACKLOG.md`.
- Log release-gate/testing work in `engineering/TEST_GATES_BACKLOG.md`.
- Log monetization work in `engineering/MONETIZATION_BACKLOG.md`.
- Archive completed work in `engineering/archive/`.

## Standard Validation Commands

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

## Release-Gate References

- [`engineering/MVP_TEST_GATE.md`](./engineering/MVP_TEST_GATE.md)
- [`engineering/E2E_TESTING.md`](./engineering/E2E_TESTING.md)
- [`engineering/TEST_SUMMARY.md`](./engineering/TEST_SUMMARY.md)

## Project Skills

- Installed project-scoped skills live in [`./.agents/skills/`](./.agents/skills/).
- Skill inventory and usage guidance live in [`SKILLS.md`](./SKILLS.md).
- Installed-skill lock state is tracked in [`skills-lock.json`](./skills-lock.json).
- After adding or updating skills, restart Codex/session to refresh skill discovery metadata.
