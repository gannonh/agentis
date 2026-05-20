# Agentis Project Agent Context

Agentis is an early-stage open-source product for configuring and deploying useful agents without requiring users to write code.

The project is currently in foundation work. Treat the architecture direction as research-backed and still evolving.

## Frontend (M01)

- **App:** `apps/web` — Vite, React 19, React Router, mock fixtures only (no backend until M02).
- **UI package:** `packages/ui` — shadcn/ui (`base-mira`), Tailwind 4, shared components.
- **Demo data:** `apps/web/src/fixtures/` — zod schemas and `demo-workspace.ts` seed aligned with `docs/comps/`.
- **MSW:** `apps/web/src/mocks/` — handlers stub future `/api/*` routes; optional in dev.

## Routes

| Path               | Screen                    |
| ------------------ | ------------------------- |
| `/threads/new`     | New thread home (default) |
| `/command-center`  | Command Center            |
| `/agents/:agentId` | Agent detail              |
| `/learning`        | Learning dashboard        |
| `/integrations`    | Integrations catalog      |
| `/projects/new`    | Create project            |
| `/library`         | Artifact library          |
| `/search`          | Search placeholder        |

## Commands

```bash
pnpm dev
pnpm typecheck && pnpm build && pnpm lint
pnpm test:coverage
pnpm test:e2e
```

## Design

Follow [DESIGN.md](DESIGN.md): restrained workbench UI, IBM Plex Sans, functional agent-blue accent only for active/selected states.

## Git

- Commit after each coherent change set or turn.
- Keep commits atomic: stage only files changed for the current change set and do not mix unrelated work.
- Use Conventional Commits syntax: `<type>(<scope>): <imperative summary>`.
- Never use `git push --no-verify` or other hook-skipping flags unless the user explicitly requests it. If a pre-push hook fails, fix the underlying issue and push again.
