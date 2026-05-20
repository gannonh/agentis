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

## Cloudflare Worker Development

- Agentis proved the support-agent Worker can run on Cloudflare, but production hardening is not ready. Do not leave public deployments running with model credentials unless auth, rate limits, quotas, and abuse monitoring are in place.
- Do hosted runtime work primarily against the local Cloudflare Workers runtime, not ad hoc Node harnesses.
- Use Vite dev for the product UI/configuration flow, and Wrangler dev for `/`, `/health`, `/support-agent/chat`, `/support-agent/status`, and `/api/support-agent/respond` behavior.
- Support-agent Worker entrypoint: `apps/web/src/worker/support-agent-worker.ts`.
- Worker config: `apps/web/wrangler.toml`, env `preview`, Worker name `agentis-support-agent-preview`, `workers_dev = true`.
- Cloudflare secrets are already expected to exist for preview: `SUPPORT_AGENT_OPENAI_API_KEY` and `SUPPORT_AGENT_DEPLOYMENT_SECRET`. Do not ask the user to recreate them unless `wrangler secret list` or `/support-agent/status` shows they are missing.
- Root `.env` is the local source for Cloudflare auth and Worker URL metadata: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `AGENTIS_SUPPORT_WORKER_NAME`, `WORKERS_DEV_SUBDOMAIN`, `WORKERS_URL`, plus local support-agent secrets. Do not commit `.env`, `.dev.vars`, or raw provider keys.
- Prefer the package scripts over raw Wrangler commands because they load root `.env` consistently.
- Hosted `/support-agent/chat` and `/api/support-agent/respond` require a derived preview access token in the `x-agentis-access-token` header, not the raw deployment secret. Run `pnpm support-agent:access-token` after loading root `.env`, or set `SUPPORT_AGENT_ACCESS_TOKEN` for a static token.
- Wrangler local dev writes `apps/web/.wrangler/`; it is gitignored and should not be committed.
- Use local Wrangler for normal hosted-runtime validation:

```bash
pnpm support-agent:worker:dev
pnpm support-agent:worker:check
pnpm support-agent:worker:ai-search-check
pnpm support-agent:access-token
```

- Use the real Cloudflare preview only when hosted proof is explicitly needed:

```bash
pnpm support-agent:worker:deploy
pnpm support-agent:worker:acceptance
```

- `support-agent:acceptance` and `support-agent:worker:acceptance` load `.env`, `apps/web/.env`, and `apps/web/.dev.vars`. They resolve the hosted URL from `--deployment-url`, `SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL`, `WORKERS_URL`, or `AGENTIS_SUPPORT_WORKER_NAME` plus `WORKERS_DEV_SUBDOMAIN`.
- If hosted acceptance reaches `WORKERS_URL` but `/support-agent/status` returns 404, the deployed Worker is stale or not the support-agent Worker. Redeploy the preview Worker before debugging application code.
- Remove the preview deployment after hosted proof when requested:

```bash
pnpm support-agent:worker:delete
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

## Working Notes

- This codebase is in early development.
- Prefer small changes that keep the Vite monorepo, shared UI package, and research docs aligned.
- Do not assume implementation details for persistence, auth, billing, Slack installation, hosted deployment, or sandbox lifecycle until they are planned.
- When updating architecture or product direction, update the README and relevant research docs together when applicable.

## Cursor Cloud specific instructions

- The update script runs `pnpm install` and `npx playwright install --with-deps chromium` on every VM startup. Dependencies and Playwright browsers are ready when the agent session begins.
- The Vite dev server (started via `pnpm dev -- -- --host 127.0.0.1`) listens on `localhost:5173` by default. If port 5173 is occupied, Vite picks the next available port — always use the URL printed in the terminal output.
- The Turbo `dev` task uses a TUI. When capturing dev server output, use `curl` against the expected port rather than parsing the tmux pane.
- No API keys are required for local UI development or testing. Without `OPENAI_API_KEY`, the support-agent endpoint returns a typed demo-mode failure (`SUPPORT_AGENT_PROVIDER_CONFIG_MISSING`), which is expected and testable.
- The pre-push hook runs `pnpm lint` and `pnpm test:coverage`. Both must pass before pushing.
- E2E tests (`pnpm test:e2e`) build the web app first, then start `vite preview` on port 4173 and run Playwright against it. They do not require an API key.
- All standard commands are listed in the Local Commands section above — refer there instead of memorizing them.
