# Agentis Project Agent Context

Agentis is an early-stage open-source product for configuring and deploying useful agents without requiring users to write code.

The project is currently in foundation work. Treat the architecture direction as research-backed and still evolving.

## Agent skills

### Issue tracker

GitHub Issues on `gannonh/agentis` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map 1:1 to GitHub labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Frontend and API

- **App:** `apps/web` — Vite, React 19, React Router.
- **API:** `apps/api` — Hono, Drizzle SQLite, Vercel AI Gateway via Vercel AI SDK for thread/run lifecycle.
- **Shared types:** `packages/shared` — Zod schemas for threads, messages, runs, and API DTOs.
- **UI package:** `packages/ui` — shadcn/ui (`base-mira`), Tailwind 4, shared primitives. See [Component management](#component-management).
- **Thread UI:** official [AI Elements](https://elements.ai-sdk.dev) in `apps/web/src/components/ai-elements/`; thread session in `apps/web/src/hooks/use-thread-session.ts`. Transcript rendering uses `thread-message-content.tsx` with `native-tool-display.ts` for tool-result cards and `message-text.ts` (shared heuristic in `packages/shared`) to avoid raw provider JSON when tool-result parts exist.
- **Demo data:** `apps/web/src/fixtures/` — still used for Command Center, Agents, Integrations, and Learning (not thread sessions, projects, or Library). Fixture-backed routes render a restrained `DemoDataNotice` (`apps/web/src/components/shell/demo-data-notice.tsx`) on Command Center, Learning, Integrations, and preset agent detail so demo content is labeled in the UI.
- **Self-host golden path:** `docs/self-host/golden-path-research.md` — Cloudflare AI Gateway plus Tavily keyless search without a Vercel AI Gateway key; README quick start links here.
- **M04/V4 Library artifacts:** API-backed projects, project memories, project context on runs, local artifact storage (`AGENTIS_STORAGE_ROOT`), Artifact-backed Library upload/list/filter/detail/download, and type-specific workspaces. Markdown documents (`document`) use `/documents/:documentId` for viewing, editing, version history, and scope management. Static webpages and slides (`webpage`, `slides`) and interactive Apps (`app`) open at `/artifacts/:artifactId` with frozen HTML preview or sandboxed App runtime, respectively. Document, static artifact, and App runtime tools are API-backed.
- **Native workspace tooling:** V1 read-only file tools, V2 safe file edits, and V3 sandboxed command/script execution are API-backed. See [agent-native-tooling.md](docs/specs/agent-native-tooling.md).
- **Composio integrations:** API-backed featured toolkits (GitHub golden path first). Generic thread creation accepts optional `toolGrants` on `POST /api/threads`; the composer **Tools** picker on `/threads/new` and thread follow-ups grants connected toolkits per thread. Preflight remediation blocks runs with human sentences in the timeline (not machine codes). Grant resolution failures return a human-readable `error` plus machine `code`. Integration refresh syncs remote Composio accounts but does not retarget a granted `connectionId` to a different Composio account — stale granted connections are marked `expired` instead. UAT: [docs/uat/2026-06-08-composio-github-golden-path.md](docs/uat/2026-06-08-composio-github-golden-path.md).
- **MSW:** `apps/web/src/mocks/` — stubs non-thread `/api/*` routes in dev; thread routes proxy to `apps/api`.

## Routes

| Path                     | Screen                          |
| ------------------------ | ------------------------------- |
| `/threads/new`           | New thread home (default)       |
| `/threads/:threadId`     | Thread session (API-backed)     |
| `/command-center`        | Command Center                  |
| `/agents/:agentId`       | Agent detail                    |
| `/learning`              | Learning dashboard              |
| `/integrations`          | Integrations catalog            |
| `/projects/new`          | Create project (API-backed)     |
| `/projects/:projectId`   | Edit project, memories, archive |
| `/library`               | Artifact library (API-backed)   |
| `/artifacts/:artifactId` | Artifact workspace (API-backed; static webpages, slides, Apps) |
| `/documents/:documentId` | Document workspace (API-backed; markdown artifacts) |
| `/search`                | Search placeholder              |

## Commands

```bash
pnpm dev
pnpm typecheck && pnpm build && pnpm lint
pnpm test:coverage
pnpm test:e2e
```

## Component management

Agentis uses a **two-layer** UI setup. Do not duplicate primitives or hand-roll registry components when an install path exists.

| Layer                 | Location                      | Purpose                                                                                                                                |
| --------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Shared primitives     | `packages/ui/src/components/` | shadcn/ui building blocks used across the app (button, sidebar, dialog, input-group, …). Styles: `packages/ui/src/styles/globals.css`. |
| App &amp; AI surfaces | `apps/web/src/components/`    | Product-specific UI. **AI Elements** live under `apps/web/src/components/ai-elements/` (conversation, message, prompt-input).          |

**Config:** `[apps/web/components.json](apps/web/components.json)` drives installs. The `ui` alias points at `@workspace/ui/components`, so registry installs often **update `packages/ui`** (and sometimes `globals.css`), not only `apps/web`.

### Adding shadcn/ui primitives

Run from the repo root with the web app as the shadcn root:

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Use `-y` to skip prompts and `-o` when you intend to refresh an existing file (e.g. after a preset or registry upgrade).

### Adding AI Elements (thread / chat UI)

Prefer the **shadcn CLI + AI Elements registry URLs**, not a bare `ai-elements add` without flags — the dedicated CLI can block on interactive overwrite prompts (e.g. `button.tsx`).

```bash
cd apps/web
pnpm dlx shadcn@latest add -y -o \
  "https://elements.ai-sdk.dev/api/registry/conversation.json" \
  "https://elements.ai-sdk.dev/api/registry/message.json" \
  "https://elements.ai-sdk.dev/api/registry/prompt-input.json"
```

Replace `<component>` in the URL for others (`tool`, `reasoning`, etc.) from [elements.ai-sdk.dev](https://elements.ai-sdk.dev).

After install:

1. Check **both** `apps/web/package.json` and `packages/ui/package.json` for new dependencies (`streamdown`, `lucide-react`, `use-stick-to-bottom`, …).
2. Wire components in app code under `apps/web/src/` — do not copy-paste simplified stand-ins into `ai-elements/`.
3. Run `pnpm typecheck && pnpm build` — registry files may need small fixes if `@base-ui/react` types drift (see `prompt-input.tsx`).

### Icons and styling

- **App shell / product chrome:** Hugeicons (project default in `components.json`).
- **AI Elements registry files:** often **lucide-react** — keep both; do not mass-replace lucide icons inside generated `ai-elements/` without a deliberate design pass.
- **Design tokens:** follow [DESIGN.md](DESIGN.md). AI Elements user bubbles use registry styling; avoid stacking conflicting Tailwind on `Message`/`MessageContent` unless intentional.

### App integration notes

- `TooltipProvider` wraps the shell in `[apps/web/src/layouts/app-shell.tsx](apps/web/src/layouts/app-shell.tsx)`.
- Thread composer uses `PromptInput`’s `onSubmit({ text, files })` API via `[thread-prompt-composer.tsx](apps/web/src/components/thread/thread-prompt-composer.tsx)` — not a custom textarea-only form.
- Vite resolves `@/` to `apps/web/src`; shared UI imports use `@workspace/ui/components/...`.

## Local runtime

1. Set `AI_GATEWAY_PROVIDER` plus selected provider credentials in the repo root `.env` (see `.env.example`) for live model runs. Use `AI_GATEWAY_PROVIDER=vercel` with `VERCEL_AI_GATEWAY_API_KEY`, or `AI_GATEWAY_PROVIDER=cloudflare` with `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`. The API loads that file on startup; `apps/api/.env` is optional for overrides. For no-key dev search, use `AGENTIS_WEB_SEARCH_PROVIDER=tavily` and `AGENTIS_WEB_SEARCH_BACKEND=keyless`.
2. `pnpm dev` starts **api** (port 3101) and **web** (port 5177); Vite proxies `/api` to the API.
3. For E2E/CI without live Gateway credentials, Playwright starts the API with `AGENTIS_MOCK_RUNTIME=1`.

## Native workspace execution

- `runWorkspaceCommand` supports bounded shell commands and Python/Node scripts against the current workspace `files/` tree.
- `plan` mode records pending workspace actions and waits for approval; `agent` mode executes immediately under policy.
- `AGENTIS_SANDBOX_BACKEND=local-process` is the default local developer backend and is not a production isolation boundary.
- `AGENTIS_SANDBOX_BACKEND=local-container` uses the standard `docker` CLI/socket with the image from `AGENTIS_SANDBOX_CONTAINER_IMAGE`; verify it with `pnpm smoke:sandbox-container`.
- Sandbox output is truncated by config, changed files are summarized, and execution provenance is persisted in `workspace_executions`.

## Verification and UAT

- Do not use mock services for UAT or verification unless the user explicitly asks for mock-backed evidence.
- For real-service UAT, run with `AGENTIS_MOCK_RUNTIME=0` and `AGENTIS_MOCK_COMPOSIO=0`; report missing or invalid credentials as blockers instead of silently falling back to mocks.

## Design

Follow [DESIGN.md](DESIGN.md): restrained workbench UI, IBM Plex Sans, functional agent-blue accent only for active/selected states.

## Git

- Commit after each coherent change set or turn.
- Keep commits atomic: stage only files changed for the current change set and do not mix unrelated work.
- Use Conventional Commits syntax: `<type>(<scope>): <imperative summary>`.
- Never use `git push --no-verify` or other hook-skipping flags unless the user explicitly requests it. If a pre-push hook fails, fix the underlying issue and push again.

## Cursor Cloud specific instructions

### Services and ports

| Service | Dev (`pnpm dev`)            | Playwright (`pnpm test:e2e`)       |
| ------- | --------------------------- | ---------------------------------- |
| API     | `3101` (`AGENTIS_API_PORT`) | `3002` (started by Playwright)     |
| Web     | `5177` (`AGENTIS_WEB_PORT`) | `5175` (`dev:e2e` / `preview:e2e`) |

No separate database or Redis process: SQLite and document files are owned by the API.

### Environment files (one-time per VM)

If `/workspace/.env` is missing, copy samples before starting dev:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

For Cloud Agent verification **without** live AI Gateway credentials, append mock flags to root `.env` so thread runs work:

```bash
AGENTIS_MOCK_RUNTIME=1
AGENTIS_MOCK_COMPOSIO=1
```

Use `pnpm dev:live` only when selected AI Gateway credentials (and optionally Composio keys) are available.

### Running dev servers

`pnpm dev` is long-lived; start it in **tmux** (not a one-shot background shell):

```bash
SESSION_NAME="agentis-dev"
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c /workspace -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'pnpm dev' C-m
```

Health check: `curl -sf http://localhost:${AGENTIS_API_PORT:-3101}/api/health` → `{"ok":true}`; open the web app on port **5177** (see `AGENTIS_WEB_PORT`).

### Playwright

First run on a fresh VM may need Chromium: `pnpm exec playwright install chromium`.

E2E boots its **own** API/web pair on ports `3002`/`5175` with mocks; it does not require `pnpm dev` to be running (and parallel dev on `3101`/`5177` is fine).

### Quick API smoke (mock runtime)

```bash
curl -sf -X POST "http://localhost:${AGENTIS_API_PORT:-3101}/api/threads" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Say hello in one short sentence."}'
# Then POST /api/runs/<runId>/stream for SSE completion text.
```

### Quality commands

See [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md): `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test:coverage`, `pnpm test:e2e`.

### Docker sandbox (optional)

`AGENTIS_SANDBOX_BACKEND=local-container` needs a Docker daemon and `pnpm smoke:sandbox-container`. Default dev sandbox is `local-process` (no Docker).
