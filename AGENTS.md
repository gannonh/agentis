# Agentis Project Agent Context

Agentis is an early-stage open-source product for configuring and deploying useful agents without requiring users to write code.

The project is currently in foundation work. Treat the architecture direction as research-backed and still evolving.

## Agent skills

### Issue tracker

GitHub Issues on `gannonh/agentis` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map 1:1 to GitHub labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` and `docs/adrs/`. See `docs/agents/domain.md`.

## Open Knowledge Format docs

This repository maintains an [OKF](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) bundle at `./docs`.

- Read `./docs/index.md` before substantial work to understand the current documentation map.
- Follow links into relevant specs, ADRs, runbooks, guides, and domain docs before changing related code.
- Keep `./docs/specs/index.md` current as the roadmap for active, planned, blocked, and completed work.
- Add or update ADRs in `./docs/adrs` for durable architecture decisions.
- After substantial work, PRs, behavior changes, architecture decisions, migrations, or documentation moves, update the OKF bundle and add concise entries to the relevant `log.md` files.
- Every non-reserved Markdown file under `./docs` should have OKF frontmatter with at least a non-empty `type` field. `index.md` and `log.md` are reserved navigation/history files.

## Frontend and API

- **App:** `apps/web` — Vite, React 19, React Router.
- **API:** `apps/api` — Hono, Drizzle SQLite, configurable Vercel or Cloudflare AI Gateway via Vercel AI SDK for thread/run lifecycle. Cloudflare transport routing: `apps/api/src/runtime/cloudflare-ai-gateway.ts` (ADR 0006).
- **Run cost observability:** runs persist `costUsd` and optional `costBreakdown`. `GET /api/agents/:agentId/usage` and fleet chart endpoints use UTC day-aligned period windows with dense ordered `daily` arrays; web chart helpers map those arrays in server order (no client-side date regeneration). Command Center reads live summary, roster, recent runs, needs-attention (`GET /api/command-center/needs-attention`), fleet score trends (`GET /api/command-center/score-trends`), and cost breakdown (`GET /api/command-center/cost-breakdown`) from the API.
- **Shared types:** `packages/shared` — Zod schemas for threads, messages, runs, and API DTOs.
- **UI package:** `packages/ui` — shadcn/ui (`base-mira`), Tailwind 4, shared primitives. See [Component management](#component-management).
- **Thread UI:** official [AI Elements](https://elements.ai-sdk.dev) in `apps/web/src/components/ai-elements/`; thread session in `apps/web/src/hooks/use-thread-session.ts`. Transcript rendering uses `thread-transcript.tsx` (turn grouping), `thread-message-content.tsx` with `native-tool-display.ts` for tool-result cards, and `message-text.ts` (shared heuristic in `packages/shared`) to avoid raw provider JSON when tool-result parts exist. List and home previews use `thread-preview.ts` (`threadListSummaryFromMessages`) to prefer the last assistant message, suppress raw tool JSON, and fall back to the last user prompt. **Working artifacts** rail on `/threads/:threadId` (`thread-durable-artifacts.tsx`): lists thread-scoped Library artifacts, inline document/static preview in the right rail, collapsed mobile bar above the transcript.
- **New thread home:** `/threads/new` (default route) loads `GET /api/threads` once, partitions demo threads (`seed_thread_*` ids) and recent threads (`partitionHomeThreads`), and shows one-line summaries on cards. Suggestion chips (`buildSuggestionChips`) prefill the composer from agent workflow prompts plus static prompts. Thread list and agent detail APIs batch message/run/document reads via `loadThreadListContext`.
- **Global search:** `GET /api/search?q=` returns grouped thread, artifact, agent, and project hits. The app shell exposes a ⌘K command palette (`global-search-dialog.tsx`) on any route; `/search` provides a browse page.
- **Learning API:** `/learning` reads API-backed summary, skills, memories, rubrics, and suggestions from `apps/api/src/routes/learning.ts`. Post-run heuristics create pending memory suggestions; users accept, edit, or dismiss in Learning, and accepted memories inject into subsequent run context. Accept persists the memory or skill before marking the suggestion accepted; write paths heal duplicate pending peers via `dismissDuplicatePendingSuggestions`. Read endpoints filter superseded pending rows with `filterVisiblePendingSuggestions` (no GET side effects). Command Center **Review** links deep-link to `/learning?status=pending&suggestionId=…`; Learning honors the `status` query when loading suggestions and scrolls/highlights via `use-learning-suggestion-focus.ts`. Rubric CRUD (`POST/PATCH/DELETE /api/learning/rubrics`) supports weighted criteria. Completed runs with agent rubrics receive deterministic evaluation scores (`run.evaluation`) via `apps/api/src/evaluation/run-evaluator.ts`. Command Center and agent detail surfaces show `avgScore` and per-run scores when evaluations exist.
- **Demo data:** `apps/web/src/fixtures/` — still used for preset agent profiles and some demo copy (not thread sessions, projects, Library, Command Center metrics, Learning read models, or the Integrations catalog). Demo thread cards on `/threads/new` are API-listed threads with `seed_thread_*` ids, not fixture-backed UI. Fixture-backed routes render a restrained `DemoDataNotice` (`apps/web/src/components/shell/demo-data-notice.tsx`) where demo content remains visible.
- **Self-host golden path:** `docs/self-host/golden-path-research.md` — Cloudflare AI Gateway plus Tavily keyless search without a Vercel AI Gateway key; README quick start links here.
- **M04/V4 Library artifacts:** API-backed projects, project memories, project context on runs, local artifact storage (`AGENTIS_STORAGE_ROOT`), Artifact-backed Library upload/list/filter/detail/download, and type-specific workspaces. Markdown documents (`document`) use `/documents/:documentId` for viewing, editing, version history, and scope management. Static webpages and slides (`webpage`, `slides`) and interactive Apps (`app`) open at `/artifacts/:artifactId` with frozen HTML preview or sandboxed App runtime, respectively. Slide deck HTML from agents is normalized in `static-artifact-service.ts` (bare `<section>` / `div.slide` parsing, page-marker splits, navigable deck template) before storage. Document, static artifact, and App runtime tools are API-backed.
- **Native workspace tooling:** V1 read-only file tools, V2 safe file edits, V3 sandboxed command/script execution, and V4 document/static/App artifacts are API-backed. See [agent-native-tooling.md](docs/specs/_done/agent-native-tooling.md).
- **Composio integrations:** API-backed catalog via `GET /api/integrations` (`q`, `category`, `featured` query params) with Composio toolkit metadata, local connection status, category list, and NATIVE/MCP badges. `/integrations` shows connected/in-use toolkits, browse/search with category chips, and a Custom MCP coming-soon card. `POST /api/integrations/refresh` syncs remote Composio accounts and returns the same list shape as GET (honors active filters). Connect/reset works for any catalog toolkit (not a hardcoded featured slug list). GitHub remains the golden-path toolkit for grants and tool execution. Generic thread creation accepts optional `toolGrants` on `POST /api/threads`; the composer **Tools** picker on `/threads/new` and thread follow-ups grants connected toolkits per thread. Preflight remediation blocks runs with human sentences in the timeline (not machine codes). Grant resolution failures return a human-readable `error` plus machine `code`. Integration refresh syncs remote Composio accounts but does not retarget a granted `connectionId` to a different Composio account — stale granted connections are marked `expired` instead. Mock mode uses `MOCK_COMPOSIO_TOOLKITS` when `AGENTIS_MOCK_COMPOSIO=1`. UAT: [docs/uat/2026-06-08-composio-github-golden-path.md](docs/uat/2026-06-08-composio-github-golden-path.md).
- **Scheduled invocations:** Worker-backed agent schedules (HA-GAP-13). Agent detail **Invocations** tab CRUD for API-backed agents; `GET/POST/PATCH/DELETE /api/agents/:agentId/schedules`; separate invocation worker (`pnpm dev:worker`). See [docs/guides/invocation-worker.md](docs/guides/invocation-worker.md).
- **Approved invocation spec:** HA-GAP-14 webhook invocation shipped in [docs/specs/_done/2026-06-15-webhook-agent-invocation-design.md](docs/specs/_done/2026-06-15-webhook-agent-invocation-design.md). Build reuses the shared invocation worker and keeps webhook run execution out of the HTTP request path.
- **MSW:** `apps/web/src/mocks/` — stubs non-thread `/api/*` routes in dev; thread routes proxy to `apps/api`.

## Routes

| Path                     | Screen                          |
| ------------------------ | ------------------------------- |
| `/threads/new`           | New thread home — composer, agent picker, suggestion chips, demo/recent thread cards with summaries |
| `/threads/:threadId`     | Thread session (API-backed)     |
| `/command-center`        | Command Center                  |
| `/agents/:agentId`       | Agent detail                    |
| `/learning`              | Learning dashboard              |
| `/integrations`          | Integrations catalog (Composio-backed search, categories, connect) |
| `/projects/new`          | Create project (API-backed)     |
| `/projects/:projectId`   | Edit project, memories, archive |
| `/library`               | Artifact library (API-backed)   |
| `/artifacts/:artifactId` | Artifact workspace (API-backed; static webpages, slides, Apps) |
| `/documents/:documentId` | Document workspace (API-backed; markdown artifacts) |
| `/search`                | Global search browse page (⌘K palette in app shell) |

## Commands

```bash
pnpm dev
pnpm dev:live
pnpm dev:worker
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
2. `pnpm dev` starts **api** (port 3101) and **web** (port 5177); Vite proxies `/api` to the API. Scheduled invocations also need `pnpm dev:worker` in a separate terminal.
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

### Environment files

**Cursor Cloud Agents:** Do **not** create or copy `.env` files (`cp .env.example .env`, `apps/web/.env`, or `apps/api/.env`) in this environment — a repo `.env` can shadow injected credentials. See `.env.example` for the variable reference only.

Cursor **should** inject runtime secrets from the Cloud console, but automation-launched agents often receive only `GH_TOKEN` (see [forum.cursor.com/t/163026](https://forum.cursor.com/t/automation-launched-cloud-agents-get-none-of-their-environments-secrets-env-vars-api-launches-into-the-same-environment-get-all-of-them-multi-repo-environments/163026)). Check with:

```bash
pnpm cloud:env-check
```

**Automatic bootstrap (repo fallback):** When `CURSOR_AGENT=1`, `pnpm dev` and `pnpm dev:worker` run `scripts/materialize-cloud-runtime-env.mjs` first. If live runtime vars are missing, the script reads GitHub Actions **variables** prefixed with `AGENTIS_RUNTIME_` using `GH_TOKEN` and writes `.env.cloud` (gitignored). `apps/api/src/load-env.ts` loads `.env.cloud` after the root `.env`.

**One-time setup for cloud sessions:**

1. Add runtime credentials to GitHub Actions **secrets** (same values as the Cursor Cloud console): `COMPOSIO_API_KEY`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, and any gateway aliases you use.
2. Run the **Sync cloud runtime env** workflow (`.github/workflows/sync-cloud-runtime-env.yml`) from the Actions tab. It copies those secrets into `AGENTIS_RUNTIME_*` variables that cloud agents can read.
3. Re-run `pnpm cloud:env-check` — tracked vars should show as set.

`pnpm dev` already uses `turbo dev --env-mode=loose` and `turbo.json` declares `globalPassThroughEnv` for runtime prefixes so Turbo does not strip injected or materialized secrets.

- `apps/api/src/load-env.ts` loads `apps/api/.env` with `override: true`, so an API-local `.env` clobbers injected secrets outright.
- The root `.env` re-applies `AGENTIS_MOCK_RUNTIME` / `AGENTIS_MOCK_COMPOSIO`, so a copied sample can silently flip the VM from live to mock mode (or vice versa).

**Local development (outside Cloud):** copy samples and fill in credentials:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
```

Use `pnpm dev:live` when live AI Gateway and Composio credentials are configured. E2E/CI uses `AGENTIS_MOCK_RUNTIME=1` via Playwright, not via a committed `.env`.

### Running dev servers

The dev servers are long-lived; start them in **tmux** (not a one-shot background shell):

```bash
SESSION_NAME="agentis-dev"
tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c /workspace -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'pnpm dev' C-m
```

Health check: `curl -sf http://localhost:${AGENTIS_API_PORT:-3101}/api/health` → `{"ok":true}`; open the web app on port **5177** (see `AGENTIS_WEB_PORT`). A live thread run can be smoke-tested via `POST /api/threads` then `POST /api/runs/<runId>/stream` (SSE).

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
