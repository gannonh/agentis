# Agentis

Agentis is an early-stage SaaS product for configuring and deploying useful agents without requiring users to write code.

The project is currently in foundation work: researching the agent stack, validating runtime paths, and shaping the first implementation milestone.

## Architecture Direction

The current recommendation is a Cloudflare-first architecture for the commercial product and hosted runtime.

- Flue is the preferred first agent runtime and deployment harness.
- Cloudflare Workers, Durable Objects, R2, and Containers form the initial hosted platform path.
- Vercel AI SDK is the preferred chat and model UI layer inside the web app.
- Agentis owns product routing, Slack integration, persistence, tenancy, secrets, quotas, knowledge lifecycle, deployment state, and sandbox policy.
- Daytona remains the first fallback for remote sandbox workloads that exceed Cloudflare container fit.
- Mastra remains a backend comparison path if Flue blocks on deployment, memory, observability, channels, or workflow ergonomics.

See:

- `docs/research/agent-stack-matrix.md`
- `docs/research/agent-stack-validation.md`
- `docs/research/first-implementation-handoff.md`
- `docs/support-agent-mvp.md`

## Repository Structure

- `apps/web`: Vite React app for the Agentis web interface.
- `packages/ui`: Shared UI package, shadcn/ui components, styles, hooks, and helpers.
- `docs/research`: Architecture research and validation notes.
- `playwright.config.ts`: End-to-end test configuration.
- `turbo.json`: Monorepo task pipeline.
- `pnpm-workspace.yaml`: Workspace package configuration.

## Requirements

- Node.js 22 or newer
- pnpm 9.15.9

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Build all packages and apps:

```bash
pnpm build
```

Preview the web app after building:

```bash
pnpm --filter web preview
```

Run the support-agent Worker locally:

```bash
pnpm support-agent:worker:dev
pnpm support-agent:worker:check
```

Deploy, verify, and remove the Cloudflare preview Worker when hosted proof is needed:

```bash
pnpm support-agent:worker:deploy
pnpm support-agent:worker:acceptance
pnpm support-agent:worker:delete
```

The Worker root page links to `/support-agent/chat`, `/support-agent/status`, and `/health`.

## Testing And Quality

Run lint checks:

```bash
pnpm lint
```

Run type checks:

```bash
pnpm typecheck
```

Run unit tests:

```bash
pnpm test
```

Run coverage:

```bash
pnpm test:coverage
```

Run end-to-end tests:

```bash
pnpm test:e2e
```

Run the full CI check:

```bash
pnpm ci
```

## UI Components

Add shadcn/ui components from the repository root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Shared components live in `packages/ui/src/components` and are imported through the workspace UI package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Status

Agentis is in early development. The current codebase is a Vite and shadcn/ui monorepo with research-backed architecture direction. Product implementation, persistence, Slack integration, hosted agent deployment, and sandbox lifecycle work are still being defined.
