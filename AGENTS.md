# Agentis Project Agent Context

Agentis is an early-stage open-source product for configuring and deploying useful agents without requiring users to write code.

The project is currently in foundation work. Treat the architecture direction as research-backed and still evolving.

## Frontend and API

- **App:** `apps/web` — Vite, React 19, React Router.
- **API:** `apps/api` — Hono, Drizzle SQLite, OpenAI via Vercel AI SDK for thread/run lifecycle.
- **Shared types:** `packages/shared` — Zod schemas for threads, messages, runs, and API DTOs.
- **UI package:** `packages/ui` — shadcn/ui (`base-mira`), Tailwind 4, shared primitives. See [Component management](#component-management).
- **Thread UI:** official [AI Elements](https://elements.ai-sdk.dev) in `apps/web/src/components/ai-elements/`; thread session in `apps/web/src/hooks/use-thread-session.ts`.
- **Demo data:** `apps/web/src/fixtures/` — still used for Command Center, Agents, Integrations, and Learning (not thread sessions, projects, or Library).
- **M04:** API-backed projects, project memories, project context on runs, local artifact storage (`AGENTIS_STORAGE_ROOT`), and Library upload/list/download.
- **Native workspace tooling:** V1 read-only file tools, V2 safe file edits, and V3 sandboxed command/script execution are API-backed. See [agent-native-tooling.md](docs/agent-native-tooling.md).
- **MSW:** `apps/web/src/mocks/` — stubs non-thread `/api/*` routes in dev; thread routes proxy to `apps/api`.

## Routes

| Path | Screen |
| ------------------ | ------------------------- |
| `/threads/new` | New thread home (default) |
| `/threads/:threadId` | Thread session (API-backed) |
| `/command-center` | Command Center |
| `/agents/:agentId` | Agent detail |
| `/learning` | Learning dashboard |
| `/integrations` | Integrations catalog |
| `/projects/new` | Create project (API-backed) |
| `/projects/:projectId` | Edit project, memories, archive |
| `/library` | Artifact library (API-backed) |
| `/search` | Search placeholder |

## Commands

```bash
pnpm dev
pnpm typecheck && pnpm build && pnpm lint
pnpm test:coverage
pnpm test:e2e
```

## Component management

Agentis uses a **two-layer** UI setup. Do not duplicate primitives or hand-roll registry components when an install path exists.

| Layer | Location | Purpose |
| ----- | -------- | ------- |
| Shared primitives | `packages/ui/src/components/` | shadcn/ui building blocks used across the app (button, sidebar, dialog, input-group, …). Styles: `packages/ui/src/styles/globals.css`. |
| App & AI surfaces | `apps/web/src/components/` | Product-specific UI. **AI Elements** live under `apps/web/src/components/ai-elements/` (conversation, message, prompt-input). |

**Config:** [`apps/web/components.json`](apps/web/components.json) drives installs. The `ui` alias points at `@workspace/ui/components`, so registry installs often **update `packages/ui`** (and sometimes `globals.css`), not only `apps/web`.

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

- `TooltipProvider` wraps the shell in [`apps/web/src/layouts/app-shell.tsx`](apps/web/src/layouts/app-shell.tsx).
- Thread composer uses `PromptInput`’s `onSubmit({ text, files })` API via [`thread-prompt-composer.tsx`](apps/web/src/components/thread/thread-prompt-composer.tsx) — not a custom textarea-only form.
- Vite resolves `@/` to `apps/web/src`; shared UI imports use `@workspace/ui/components/...`.

## M02 local runtime

1. Set `OPENAI_API_KEY` in the repo root `.env` (see `.env.example`). The API loads that file on startup; `apps/api/.env` is optional for overrides.
2. `pnpm dev` starts **api** (port 3101) and **web** (port 5177); Vite proxies `/api` to the API.
3. For E2E/CI without OpenAI, Playwright starts the API with `AGENTIS_MOCK_RUNTIME=1`.

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
