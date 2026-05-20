# Agentis

Agentis is an open-source, self-hosted agent workspace for teams that want long-running autonomous work, reusable agents, connected tools, and visible quality controls.

This repository is in **foundation work** (M01): a navigable app shell with mock data and no backend required.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/) 9.15.x (see `packageManager` in `package.json`)

## Quick start

```bash
git clone https://github.com/gannonh/agentis.git
cd agentis
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Press `d` to toggle light/dark theme.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Vite dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check (all packages) |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Vitest with coverage |
| `pnpm test:e2e` | Playwright shell route screenshots |

## Project structure

```
apps/web/          # Vite + React frontend
packages/ui/       # Shared shadcn/ui components and styles
docs/              # Product docs, roadmap, UI comps
```

## Documentation

- [MVP roadmap](docs/agentis-prd-roadmap.md)
- [Product overview](docs/overview.md)
- [Design system](DESIGN.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
