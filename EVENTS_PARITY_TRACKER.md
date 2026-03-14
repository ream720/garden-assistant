# Events Parity Tracker

Last updated: 2026-03-14

## Purpose

Track follow-up work needed to fully restore Notes + Tasks behavior after consolidating both features into `/events`.

## Status Key

- [x] Done
- [ ] Pending

## Task Workflows

- [x] Restore task completion in Events list/details using completion dialog (2026-03-06)
- [x] Add task creation flow in Events (2026-03-12)
- [x] Add task edit flow in Events (2026-03-12)
- [x] Add task delete flow in Events (2026-03-12)

## Task Filters, Grouping, and Tabs

- [x] Restore task status tabs parity (`All`, `Pending`, `Issues`, `Due Soon`, `Overdue`, `Completed`) (2026-03-12)
- [x] Restore due-date grouping option parity (2026-03-12)
- [x] Add explicit clear-filters action for task filters/search (2026-03-12)
- [x] Decide and implement URL-deep-link parity for task filters (matching Notes deep-link behavior) (2026-03-12)

## Notes Parity Polish

- [x] Review and align Notes list/detail polish against pre-Events experience (2026-03-12)
- [x] Fix replacement-character glyphs in Events note details metadata row (2026-03-12)
- [x] Validate empty-state and helper-copy parity in Events Notes mode (2026-03-12)
- [x] Try to align the filter experience / UX with Task filter experience / UX so that they are cohesive and consistent (2026-03-12)

## Remaining Non-Test Events UX Cleanup

- [x] Remove inert comment box/timeline UI from task details (2026-03-14)
- [x] Remove inert sidebar-collapse control in Events Tasks header (2026-03-14)
- [x] Expose `Issues` / `Due Soon` criteria in Events Tasks helper copy (2026-03-14)

## Deferred Post-MVP Follow-Up

- [ ] Add task action parity follow-up (for example, direct add-note affordance from task context) - moved to `BACKLOG.md` and no longer tracked as active Events parity closure work

## Test Migration and Coverage

- [x] Add Events route unit coverage for task completion actions + optional linked note (2026-03-06)
- [ ] Refactor `e2e/tasks.spec.ts` to assert Events tasks behavior (`/events?type=tasks`)
- [ ] Refactor `e2e/notes.spec.ts` to assert Events notes behavior (`/events?type=notes`)
- [ ] Update navigation/deep-link e2e checks for legacy `/tasks` and `/notes` redirects

## Change Log

- 2026-03-14: Completed Events parity audit and closure pass:
  - functional Notes/Tasks parity is complete for MVP scope in `/events`
  - moved task action parity follow-up out of active Events parity closure and into post-MVP backlog tracking
  - completed non-test Events UX quick wins:
    - removed inert task-details comment/timeline UI
    - removed inert sidebar-collapse button from Events Tasks header
    - added explicit Tasks helper-copy criteria:
      - `Issues` = pending high-priority or overdue tasks
      - `Due Soon` = pending tasks due in the today/tomorrow window
- 2026-03-12: Implemented Events task CRUD parity (create/edit/delete):
  - `Add Task` action now available directly in `/events?type=tasks`
  - shared task form dialog supports both creating and editing tasks in Events
  - task actions now include delete confirmation from both list and details context
- 2026-03-12: Added Events route unit coverage for task CRUD flows:
  - create task from Events Tasks header
  - edit task from Events task details actions
  - delete task from Events task details actions
- 2026-03-12: Implemented task filter/grouping parity in Events:
  - task status tabs restored (`All`, `Pending`, `Issues`, `Due Soon`, `Overdue`, `Completed`) with counts
  - due-date grouping option restored in task grouping controls
  - task filter/search clear action added
  - task filter state deep-linking added via URL params (`taskTab`, `taskPriority`, `taskSpaceId`, `taskPlantId`, `taskGroupBy`)
- 2026-03-12: Added Events route unit coverage for task filter parity:
  - task deep-link filter application + due-date grouping behavior
  - task tabs render + clear action removes task deep-link params
- 2026-03-12: Implemented Events notes parity polish:
  - aligned Notes helper copy and list/detail metadata polish with pre-Events notes experience
  - fixed replacement-character glyph in note details metadata row
  - updated Notes empty-state messaging to distinguish first-note vs filter-no-match scenarios
  - aligned Notes filter UX with Tasks using category tabs, context filters, and clear behavior
- 2026-03-12: Added Events route unit coverage for notes parity polish:
  - helper copy + first-note empty-state behavior
  - filter-empty-state guidance + clear action for note filter params
  - note metadata glyph regression guard
- 2026-03-06: Implemented Events task completion UX parity for pending tasks:
  - clickable task status bubble in the list opens completion dialog
  - explicit `Mark complete` button added to task details
  - completion flow supports optional linked note creation with task plant/space context
