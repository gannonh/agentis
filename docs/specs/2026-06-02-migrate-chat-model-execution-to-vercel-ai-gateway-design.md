# Migrate chat model execution to Vercel AI Gateway

## Status

Implemented

## Goal

Route normal Agentis chat/run model execution through Vercel AI Gateway so Agentis has one live provider boundary for model execution and native web search.

Source issue: [GitHub #396](https://github.com/gannonh/agentis/issues/396)

Target state:

```text
AI SDK -> Vercel AI Gateway -> AI_GATEWAY_API_KEY
```

## Current state

Agentis currently uses the AI SDK in two live provider paths:

- Chat/run execution uses the direct OpenAI provider in `apps/api/src/runtime/run-executor.ts` and depends on `OPENAI_API_KEY`.
- Native web search uses Vercel AI Gateway in `apps/api/src/research/vercel-gateway-web-search-provider.ts` and depends on `AI_GATEWAY_API_KEY`.

Runtime health, UI unavailable copy, `.env.example`, and local runtime docs still center chat execution on `OPENAI_API_KEY`. Native web search already treats Gateway credentials as provider availability.

Relevant current files:

- `apps/api/src/runtime/run-executor.ts`
- `apps/api/src/config.ts`
- `apps/api/src/routes/runtime.ts`
- `apps/api/src/research/vercel-gateway-web-search-provider.ts`
- `apps/web/src/components/thread/thread-prompt-composer.tsx`
- `packages/shared/src/schemas.ts`
- `.env.example`
- `README.md`

## Product and architecture direction

Use Vercel AI Gateway as the only normal live runtime credential path. `OPENAI_API_KEY` should leave normal runtime requirements, health checks, UI prompts, and setup docs.

Direct OpenAI fallback is out of scope. Provider BYOK remains a Vercel AI Gateway account configuration concern, not an Agentis runtime fallback.

The migration should keep the existing AI SDK streaming flow. `RunExecutor` should still call `streamText`, attach the same runtime tools, persist the same run-step timeline, honor abort signals, and keep the mock runtime path for local tests and E2E.

## Scope

Included:

- Replace direct OpenAI model construction for live chat/run execution with Gateway-backed model resolution.
- Make `AI_GATEWAY_API_KEY` the live runtime credential checked by runtime health.
- Keep mock runtime available without live credentials.
- Keep native web search on Gateway and backed by the same `AI_GATEWAY_API_KEY` setting.
- Update default model configuration and seeded model ids to Gateway-compatible ids.
- Normalize known legacy OpenAI model ids so existing local records such as `gpt-4o-mini` resolve to Gateway ids such as `openai/gpt-4o-mini`.
- Update UI unavailable copy, `.env.example`, and local runtime docs.
- Add focused tests for Gateway model execution setup and missing credential behavior.

Out of scope:

- Direct OpenAI fallback.
- New user-facing model picker work.
- BYOK setup UI.
- Provider routing policy UI.
- A broad model catalog migration.
- Changes to the native tool permission model.

## Acceptance criteria

1. Chat/run execution uses Vercel AI Gateway for live model calls and succeeds with `AI_GATEWAY_API_KEY` set and `OPENAI_API_KEY` unset.
2. Live runtime health reports unavailable with `reason: "missing_api_key"` when `AI_GATEWAY_API_KEY` is missing and mock runtime is disabled.
3. Mock runtime remains available without live credentials.
4. Native web search continues to use Vercel AI Gateway and remains available when `AI_GATEWAY_API_KEY` is configured.
5. Agent and thread model ids are Gateway-compatible ids, with default model config updated accordingly.
6. Existing streamed run behavior remains intact: assistant text streaming, tool calls, run-step persistence, abort handling, Composio tools, workspace tools, document tools, and web search tools.
7. UI runtime unavailable copy points users to `AI_GATEWAY_API_KEY`, not `OPENAI_API_KEY`.
8. `.env.example` and local runtime docs describe `AI_GATEWAY_API_KEY` as the single primary live model/search credential.
9. Tests cover Gateway-backed model resolution, missing Gateway credentials, runtime health, mock runtime availability, and model id defaults.

## Design

### Runtime provider boundary

Add a small Gateway model resolver for chat/run execution. The resolver should:

- Require `config.aiGatewayApiKey` in non-mock runtime.
- Construct a Gateway language model through the AI SDK Gateway API supported by the installed `ai` version.
- Accept Gateway model ids directly.
- Normalize known legacy OpenAI ids by prefixing `openai/` when needed.
- Fail loudly for empty or unsupported model ids.

Suggested location:

```text
apps/api/src/runtime/gateway-model.ts
```

Suggested responsibilities:

- `resolveGatewayModelId(modelId: string): string`
- `createGatewayLanguageModel(config: AppConfig, modelId: string): LanguageModel`

`RunExecutor` should use this helper for the live model path while keeping the existing mock `MockLanguageModelV2` path.

### Model ids

Update the default model from the OpenAI-only id to the Gateway id:

```text
openai/gpt-4o-mini
```

The Build phase should verify the current Gateway model list before implementation. If the current list no longer includes that id, use the closest current OpenAI Gateway chat model and document the choice in the implementation notes.

Existing records may contain OpenAI-only ids such as `gpt-4o-mini` or `gpt-4.1-mini`. The first migration slice should support those known ids at runtime by mapping them to `openai/<id>`. New threads, runs, agents, seed data, and tests should use Gateway-compatible ids.

A database backfill is optional for this slice because the runtime normalizer preserves existing local data. If Build chooses a backfill, it must also keep the runtime normalizer for defensive compatibility.

### Runtime health

`isRuntimeAvailable(config)` should return true when either:

- `config.mockRuntime` is true.
- `config.aiGatewayApiKey` is configured.

The `/api/runtime/health` response can keep the existing `reason: "missing_api_key"` enum value. The meaning becomes missing Gateway credentials for live runtime.

The health response model should expose the Gateway-compatible default model id.

### Native web search

Native web search already uses `createGateway` and `AI_GATEWAY_API_KEY`. Keep its provider implementation intact unless a small shared helper removes duplication without changing behavior.

Search provider availability should continue to report available when mock runtime is enabled or Gateway credentials are configured.

### UI copy

Update thread composer runtime unavailable copy from `OPENAI_API_KEY` to `AI_GATEWAY_API_KEY`.

The UI should not mention direct OpenAI setup as the normal live runtime path.

### Documentation and environment setup

Update `.env.example` so `AI_GATEWAY_API_KEY` is the primary live model/search credential near the top of the file. Remove `OPENAI_API_KEY` from the normal setup section.

Update local runtime docs to state:

- The API loads the repo root `.env` on startup.
- Set `AI_GATEWAY_API_KEY` for live chat/run execution and native web search.
- `AGENTIS_MOCK_RUNTIME=1` keeps mock runtime flows available without live credentials.

## Implementation phases

### Phase 1: Gateway runtime config and model resolution

Likely files:

- `apps/api/src/config.ts`
- `packages/shared/src/schemas.ts`
- `apps/api/src/runtime/gateway-model.ts`
- `apps/api/src/runtime/run-executor.ts`

Tasks:

- Change runtime availability to require Gateway credentials in live mode.
- Add Gateway model id normalization.
- Replace direct OpenAI model construction in `RunExecutor`.
- Keep mock runtime branching unchanged.

Acceptance criteria covered: 1, 2, 3, 5, 6.

### Phase 2: Defaults, seeds, and tests

Likely files:

- `packages/shared/src/schemas.ts`
- `apps/api/src/repositories/testing-seed-data.ts`
- `apps/api/src/config.test.ts`
- `apps/api/src/config.web-search.test.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/runtime/run-executor.test.ts`

Tasks:

- Update default model ids to Gateway-compatible ids.
- Update tests and seed data that assert or create default model ids.
- Add tests that live runtime fails without Gateway credentials and does not require `OPENAI_API_KEY`.
- Add tests that legacy OpenAI-only ids normalize to Gateway ids.

Acceptance criteria covered: 1, 2, 3, 4, 5, 9.

### Phase 3: UI and docs

Likely files:

- `apps/web/src/components/thread/thread-prompt-composer.tsx`
- `.env.example`
- `README.md`
- `AGENTS.md` if local runtime guidance needs alignment

Tasks:

- Update runtime unavailable copy.
- Update environment examples and local setup docs.
- Ensure docs describe one primary live auth path.

Acceptance criteria covered: 7, 8.

## Verification

Run focused checks first:

```bash
pnpm --filter api test -- src/config.test.ts src/config.web-search.test.ts src/app.test.ts src/runtime/run-executor.test.ts
```

Then run standard project checks:

```bash
pnpm typecheck && pnpm build && pnpm lint
pnpm test:coverage
```

Manual verification:

1. Start the app with `AI_GATEWAY_API_KEY` set and `OPENAI_API_KEY` unset.
2. Create a new thread and stream a basic response.
3. Run a web-search prompt with web search permitted and confirm the run timeline records the search tool result.
4. Start with both live keys unset and mock runtime disabled. Confirm runtime health is unavailable and the UI prompts for `AI_GATEWAY_API_KEY`.
5. Start with `AGENTIS_MOCK_RUNTIME=1` and no live keys. Confirm mock thread streaming still works.

## Risks and mitigations

- Legacy model ids in existing local records may fail through Gateway. Mitigation: normalize known OpenAI ids at runtime.
- Tests may rely on the old `DEFAULT_OPENAI_MODEL` name. Mitigation: update naming where practical, or keep a temporary alias only if needed for compatibility.
- Gateway API usage must match the installed AI SDK version. Mitigation: verify against installed `ai` package docs/source during Build before editing runtime code.
- Web search and chat execution could drift if they create Gateway clients separately. Mitigation: keep credential checks in config and only share client helpers when it reduces duplication without widening scope.

## Build handoff

Approved direction:

- Gateway only for normal live chat/run model execution.
- `AI_GATEWAY_API_KEY` is the single primary live credential for model execution and native web search.
- No direct OpenAI fallback.
- Preserve existing stream and tool behavior.

Build should implement the phases above, keep edits surgical, and verify the acceptance criteria with focused tests plus project quality commands. If the installed AI SDK Gateway API differs from this spec's suggested helper shape, Build may adjust the helper implementation while preserving the runtime boundary and acceptance criteria.

## Build completion report

- Spec path: `docs/specs/2026-06-02-migrate-chat-model-execution-to-vercel-ai-gateway-design.md`
- Base SHA: `9aa30b14a595d07ec993ff4f8cf0ea1921bc65be`
- Final implementation SHA: `cbc4490f03ade84d1ac1023e1fcd70419e7c7f66`
- Independent subagent review: used for spec compliance, code quality, and final whole-branch review.

### Tasks completed

1. Gateway runtime model execution
   - Added Gateway model resolution in `apps/api/src/runtime/gateway-model.ts`.
   - Replaced direct OpenAI provider construction in `RunExecutor`.
   - Runtime availability now depends on `AI_GATEWAY_API_KEY` or mock runtime.
   - Live model ids validate before run/message streaming state mutates.
   - Removed the direct `@ai-sdk/openai` dependency.
2. Defaults, seeds, and tests
   - Updated default, seed, migration, and agent setup model ids to `openai/gpt-4o-mini` or other Gateway-compatible ids.
   - Kept runtime normalization for known legacy ids: `gpt-4o-mini` and `gpt-4.1-mini`.
   - Added focused Gateway model, runtime health, missing credential, invalid model, and UI copy tests.
3. UI and docs
   - Updated thread composer missing-key copy to `AI_GATEWAY_API_KEY`.
   - Updated `.env.example`, `apps/api/.env.example`, `README.md`, `CONTRIBUTING.md`, and `AGENTS.md` for the Gateway credential path.
4. Review and verification
   - Spec compliance review passed.
   - Code quality review passed after fixing model validation order and agent setup model id consistency.
   - Final whole-branch review returned Ready.

### Files changed

- `apps/api/src/runtime/gateway-model.ts`
- `apps/api/src/runtime/gateway-model.test.ts`
- `apps/api/src/runtime/run-executor.ts`
- `apps/api/src/runtime/run-executor.test.ts`
- `apps/api/src/config.ts`
- `apps/api/src/config.test.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/test/setup.ts`
- `apps/api/src/repositories/testing-seed-data.ts`
- `apps/api/drizzle/0021_agent_workspaces.sql`
- `apps/api/package.json`
- `packages/shared/src/schemas.ts`
- `apps/web/src/components/thread/thread-prompt-composer.tsx`
- `apps/web/src/components/thread/thread-prompt-composer.test.tsx`
- `apps/web/src/components/agents/agent-setup-fields.tsx`
- `apps/web/src/routes/agent-create.tsx`
- `apps/web/src/routes/agent-create.test.tsx`
- `apps/web/src/routes/agent-detail.test.tsx`
- `apps/web/src/router.test.tsx`
- `.env.example`
- `apps/api/.env.example`
- `README.md`
- `CONTRIBUTING.md`
- `AGENTS.md`
- `pnpm-lock.yaml`

### Verification run

Passed:

```bash
pnpm --filter api test -- src/config.test.ts src/config.web-search.test.ts src/app.test.ts src/runtime/run-executor.test.ts src/runtime/gateway-model.test.ts
pnpm --filter web test -- src/components/thread/thread-prompt-composer.test.tsx src/routes/agent-create.test.tsx
pnpm --filter web test -- src/routes/agent-detail.test.tsx -t "shows comp-aligned editable agent tabs"
pnpm --filter web test -- src/router.test.tsx -t "updates category counts"
pnpm --filter api test -- src/db/migrations.test.ts
pnpm typecheck
pnpm build && pnpm lint && pnpm test:coverage
```

Notes:

- The first `pnpm test:coverage` attempt timed out in two existing long-running web tests under coverage. Both tests passed individually. Their per-test timeouts were raised from 10s to 30s, then `pnpm build && pnpm lint && pnpm test:coverage` passed.

### Approved deviations

None.

### Known follow-up issues

- `DEFAULT_OPENAI_MODEL` still carries its historical name while holding a Gateway-compatible id. This remains a naming cleanup, not a runtime fallback.