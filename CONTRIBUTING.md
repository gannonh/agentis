# Contributing to Agentis

Thank you for your interest in contributing. Agentis is early-stage; we welcome focused PRs that match the current milestone.

## Development setup

1. Fork and clone the repository.
2. Install dependencies: `pnpm install`
3. Copy environment sample: `cp apps/web/.env.example apps/web/.env`
4. Start the dev server: `pnpm dev`

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

## Mock data

Until M02, the frontend uses typed fixtures in `apps/web/src/fixtures/`. Update seed data there when demo screens should reflect new product concepts.
