# Agentis Project Agent Context

Agentis is an early-stage open-source product for configuring and deploying useful agents without requiring users to write code.

The project is currently in foundation work. Treat the architecture direction as research-backed and still evolving.

## Architecture Direction

- Use a Cloudflare-first path for the commercial SaaS interface and hosted agent runtime.
- Use Flue as the first agent runtime and deployment harness.
- Use Vercel AI SDK for chat UX patterns, model/provider abstraction, tool-call rendering, and message handling in the web app.
- Keep Slack integration, product routing, persistence, tenancy, secrets, quotas, knowledge lifecycle, deployment state, and sandbox policy in Agentis-owned code.
- Use Cloudflare Workers, Durable Objects, R2, and Containers as the initial hosted platform path.
- Keep Daytona as the first fallback for remote sandbox workloads.
- Keep Mastra as a backend comparison path if Flue blocks on deployment, memory, observability, channels, or workflow ergonomics.

Reference docs:

- `docs/research/agent-stack-matrix.md`
- `docs/research/agent-stack-validation.md`

## Repository Structure

- `apps/web`: Vite React app for the Agentis web interface.
- `packages/ui`: Shared UI package, shadcn/ui components, styles, hooks, and helpers.
- `docs/research`: Architecture research and validation notes.
- `playwright.config.ts`: End-to-end test configuration.
- `turbo.json`: Monorepo task pipeline.
- `pnpm-workspace.yaml`: Workspace package configuration.

## Local Commands

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Start dev server for in-app browser demos: `pnpm dev -- -- --host 127.0.0.1`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit tests: `pnpm test`
- Coverage: `pnpm test:coverage`
- End-to-end tests: `pnpm test:e2e`
- Full CI check: `pnpm ci`

## In-App Browser Demo Workflow

- Start the app with `pnpm dev -- -- --host 127.0.0.1` from the repo root and keep the server session running.
- Use the exact Vite `Local:` URL printed by the dev server; the port can change when the default is occupied.
- Open that URL in the Codex in-app browser.
- If Browser Use cannot attach to the integrated browser backend, keep the app server running and provide the exact local URL for the user to open.

## UI Components

Add shadcn/ui components from the repository root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Shared components live in `packages/ui/src/components` and are imported through the workspace UI package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Working Notes

- This codebase is in early development.
- Prefer small changes that keep the Vite monorepo, shared UI package, and research docs aligned.
- Do not assume implementation details for persistence, auth, billing, Slack installation, hosted deployment, or sandbox lifecycle until they are planned.
- When updating architecture or product direction, update the README and relevant research docs together when applicable.
