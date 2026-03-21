# Project Skills

This document tracks project-scoped skills installed in [`./.agents/skills/`](./.agents/skills/).

## Firebase Skills

### `firebase-local-env-setup`

- Path: [`./.agents/skills/firebase-local-env-setup/SKILL.md`](./.agents/skills/firebase-local-env-setup/SKILL.md)
- Source: `firebase/agent-skills`
- Use when: preparing local agent environment for Firebase (`node >= 20`, Firebase CLI access/login, MCP setup).

### `firebase-basics`

- Path: [`./.agents/skills/firebase-basics/SKILL.md`](./.agents/skills/firebase-basics/SKILL.md)
- Source: `firebase/agent-skills`
- Use when: initializing Firebase projects, running CLI workflows, and basic Firebase setup tasks.

### `firebase-auth-basics`

- Path: [`./.agents/skills/firebase-auth-basics/SKILL.md`](./.agents/skills/firebase-auth-basics/SKILL.md)
- Source: `firebase/agent-skills`
- Use when: implementing or auditing Firebase Authentication flows, providers, and auth-based rules usage.

## Frontend/Product UI Skills

### `frontend-design`

- Path: [`./.agents/skills/frontend-design/SKILL.md`](./.agents/skills/frontend-design/SKILL.md)
- Source: `anthropics/skills`
- Use when: building or polishing UI with strong visual direction (pages, components, layouts, styling, interaction quality).

### `vercel-react-best-practices`

- Path: [`./.agents/skills/vercel-react-best-practices/SKILL.md`](./.agents/skills/vercel-react-best-practices/SKILL.md)
- Source: `vercel-labs/agent-skills`
- Use when: writing/reviewing/refactoring React or Next.js for performance, bundle size, rendering efficiency, and data-fetching quality.

## Video Generation Skills

### `gemini-veo-video`

- Path: [`./.agents/skills/gemini-veo-video/SKILL.md`](./.agents/skills/gemini-veo-video/SKILL.md)
- Source: `project-local`
- Use when: generating or extending Veo videos via Gemini API, choosing Veo model/parameter combinations, building prompt+audio direction, and handling long-running operation polling/downloading.

## Notes

- Installed skill versions/hashes are tracked in [`skills-lock.json`](./skills-lock.json).
- If a newly installed skill does not appear in a running session, restart Codex/session in this workspace.
