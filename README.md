# Agentis

Agentis is an open-source, self-hosted agent workspace for teams that want long-running autonomous work, reusable agents, connected tools, and visible quality controls.

This repository ships **M01 shell surfaces** with fixture data plus **M02 thread sessions** backed by a local API runtime.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/) 9.15.x (see `packageManager` in `package.json`)

## Quick start

```bash
git clone https://github.com/gannonh/agentis.git
cd agentis
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
# Set OPENAI_API_KEY in .env at the repo root for live model runs
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to the API on port 3001. Press `d` to toggle light/dark theme.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + web dev servers (Turborepo) |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check (all packages) |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm test:e2e` | Playwright shell + thread lifecycle tests |

## Project structure

```text
apps/web/          # Vite + React frontend
apps/api/          # Hono API, Drizzle SQLite, run executor
packages/ui/       # Shared shadcn/ui components and styles
packages/shared/   # Shared Zod schemas and API types
docs/              # Product docs, roadmap, UI comps
```

## Documentation

- [MVP roadmap](docs/agentis-prd-roadmap.md)
- [Product overview](docs/overview.md)
- [Design system](DESIGN.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
