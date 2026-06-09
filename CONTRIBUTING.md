# Contributing to Agentis

Thank you for your interest in contributing. Agentis is early-stage; we welcome focused PRs that match the current milestone.

## Development setup

1. Fork and clone the repository.
2. Install dependencies: `pnpm install`
3. Copy environment samples:
   - `cp .env.example .env` and set `AI_GATEWAY_API_KEY` at the repo root
   - `cp apps/web/.env.example apps/web/.env` (optional web overrides)
4. Optional: `apps/api/.env` for API-only overrides (otherwise root `.env` is used).
5. Start dev servers: `pnpm dev` (API on `:3101`, web on `:5177`)

## Quality checks

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test:coverage
pnpm test:e2e
```

Playwright tests compare UI screenshots for shell routes. If you change layout intentionally, update baselines with:

```bash
pnpm exec playwright test --update-snapshots
```

## Pull requests

- Keep changes scoped to the issue or milestone slice.
- Use clear commit messages in complete sentences.
- Link related issues when applicable.
- Do not commit secrets (`.env`, API keys, credentials).

## UI components

Shared components live in `packages/ui`. Add shadcn components from the web app:

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Follow [DESIGN.md](DESIGN.md) for visual and interaction conventions.

## Data boundaries

- **Thread sessions** (`/threads/new`, `/threads/:threadId`) use the API in `apps/api` and shared schemas in `packages/shared`.
- **Projects, Library artifacts, integrations, agents, and native workspace tools** are API-backed.
- **Command Center, Learning, and parts of the agent roster/detail experience** still use typed fixtures in `apps/web/src/fixtures/` until later milestones. These screens show a `DemoDataNotice` (`apps/web/src/components/shell/demo-data-notice.tsx`) — preserve or extend it when editing fixture-backed routes.
- Update fixture seed data when demo screens should reflect new product concepts outside the thread flow.
