# Agentis

Agentis is an open-source, self-hosted agent workspace for teams that want long-running autonomous work, reusable agents, connected tools, and visible quality controls.

This repository ships the Agentis workbench: API-backed thread sessions, projects, Library artifacts, integration grants, reusable agents, and native workspace tooling.

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
# For a no-Vercel live research setup, use Cloudflare AI Gateway plus Tavily keyless search:
# docs/self-host/golden-path-research.md
# Otherwise set AI_GATEWAY_PROVIDER plus the selected provider credentials in the repo root .env.
pnpm dev
```

Open [http://localhost:5177](http://localhost:5177). The Vite dev server proxies `/api` to the API on port 3101. Press `d` to toggle light/dark theme.

## Scripts

| Command                        | Description                                                           |
| ------------------------------ | --------------------------------------------------------------------- |
| `pnpm dev`                     | Start API + web dev servers (Turborepo)                               |
| `pnpm build`                   | Production build                                                      |
| `pnpm typecheck`               | TypeScript check (all packages)                                       |
| `pnpm lint`                    | ESLint                                                                |
| `pnpm test`                    | Vitest unit tests                                                     |
| `pnpm test:coverage`           | Vitest with coverage                                                  |
| `pnpm test:e2e`                | Playwright shell + thread lifecycle tests                             |
| `pnpm smoke:sandbox-container` | Build and smoke-test the optional Docker-compatible workspace sandbox |

## Project structure

```text
apps/web/          # Vite + React frontend
apps/api/          # Hono API, Drizzle SQLite, run executor, workspace sandbox
packages/ui/       # Shared shadcn/ui components and styles
packages/shared/   # Shared Zod schemas and API types
docs/              # Product docs, roadmap, UI comps
```

## Documentation

- [MVP roadmap](docs/specs/agentis-prd-roadmap.md)
- [Product overview](docs/overview.md)
- [Agent native tooling](docs/specs/agent-native-tooling.md)
- [Document workspace](docs/specs/_done/2026-06-01-document-workspace-design.md)
- [Static artifacts (webpages and slides)](docs/specs/_done/2026-06-04-agent-native-tooling-v4-static-artifacts-design.md)
- [App artifact runtime](docs/specs/2026-06-04-agent-native-tooling-v4-apps-design.md)
- [Artifact Library primitive (ADR 0005)](docs/adr/0005-use-artifact-as-library-primitive.md)
- [Architecture decisions](docs/adr/)
- [Self-host research golden path](docs/self-host/golden-path-research.md)
- [Design system](DESIGN.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
