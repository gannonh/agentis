# Configurable AI Gateway migration

## Status

Approved.

## Goal

Make Agentis live model execution configurable between Vercel AI Gateway and Cloudflare AI Gateway while keeping the Vercel AI SDK as the runtime integration layer. Add a configurable native web search path that can use either the existing Vercel Gateway search tools or Tavily keyless search for no-cost development.

This migration should let development run with Cloudflare AI Gateway and Tavily keyless search without requiring the Vercel paid tier, while preserving the current Vercel Gateway path for rollback and comparison.

Target runtime choices:

```text
AI_GATEWAY_PROVIDER=vercel     -> Vercel AI Gateway
AI_GATEWAY_PROVIDER=cloudflare -> Cloudflare AI Gateway

AGENTIS_WEB_SEARCH_PROVIDER=vercel-gateway -> Vercel Gateway search tools
AGENTIS_WEB_SEARCH_PROVIDER=tavily         -> Tavily search
```

## Current state

Agentis currently has one normal live model execution path:

- `apps/api/src/runtime/gateway-model.ts` constructs Vercel AI Gateway language models with `createGateway` from the AI SDK.
- `apps/api/src/config.ts` reads `AI_GATEWAY_API_KEY` into `config.aiGatewayApiKey`.
- Runtime availability, `/api/runtime/health`, UI copy, `.env.example`, README, AGENTS.md, and ADR 0004 describe `AI_GATEWAY_API_KEY` as the primary live runtime credential.
- Native web search uses `apps/api/src/research/vercel-gateway-web-search-provider.ts` and config values `AGENTIS_WEB_SEARCH_PROVIDER` plus `AGENTIS_WEB_SEARCH_BACKEND`.

The Cloudflare POC proved:

- Chat streaming works through Cloudflare AI Gateway using the Vercel AI SDK and `@ai-sdk/openai-compatible@1.0.39`.
- Cloudflare requires `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID` for the account-scoped REST AI Gateway path.
- Tavily keyless search works without a search API key and maps into Agentis `SearchWebOutput`.
- Cloudflare-routed Perplexity search was not proven through the tested OpenAI-compatible REST path.

Relevant POC files:

- `apps/api/src/poc/cloudflare-ai-gateway-poc.ts`
- `apps/api/src/poc/cloudflare-ai-gateway-poc.test.ts`
- `docs/specs/_done/2026-06-04-cloudflare-ai-gateway-poc-design.md`

## Scope

Included:

- Add runtime configuration for `AI_GATEWAY_PROVIDER=vercel | cloudflare`.
- Add explicit Vercel credential support with `VERCEL_AI_GATEWAY_API_KEY`.
- Keep `AI_GATEWAY_API_KEY` as a deprecated alias for `VERCEL_AI_GATEWAY_API_KEY` during migration.
- Add Cloudflare live model execution with `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, and optional `CLOUDFLARE_AI_GATEWAY_ID`.
- Keep current Vercel AI Gateway model execution behavior when `AI_GATEWAY_PROVIDER=vercel`.
- Add Tavily keyless native web search with `AGENTIS_WEB_SEARCH_PROVIDER=tavily` and `AGENTIS_WEB_SEARCH_BACKEND=keyless`.
- Keep current Vercel Gateway native web search behavior with `AGENTIS_WEB_SEARCH_PROVIDER=vercel-gateway` and `AGENTIS_WEB_SEARCH_BACKEND=perplexity | parallel`.
- Update runtime health, UI missing-credential copy, env examples, docs, and ADRs to describe configurable providers.
- Add focused tests for provider config, credential availability, model creation, search provider selection, Tavily normalization, and backward-compatible env aliases.

Out of scope:

- Cloudflare Workers hosting migration.
- D1, R2, or sandbox architecture changes.
- Removing Vercel AI Gateway support.
- Removing `AI_GATEWAY_API_KEY` alias.
- Production provider decision for Tavily API-key mode, Parallel, Exa, or Perplexity.
- Model picker or provider routing UI.
- Cloudflare account, billing, or permission changes.

## Environment contract

Preferred env shape:

```bash
# AI Gateway config
AI_GATEWAY_PROVIDER=cloudflare # cloudflare | vercel

# Native web search config
AGENTIS_WEB_SEARCH_PROVIDER=tavily # tavily | vercel-gateway
AGENTIS_WEB_SEARCH_BACKEND=keyless # keyless | perplexity | parallel

# AI Gateway secrets
VERCEL_AI_GATEWAY_API_KEY="vck_***"
CLOUDFLARE_API_KEY="cfat_***"
CLOUDFLARE_ACCOUNT_ID="<cloudflare-account-id>"
# CLOUDFLARE_AI_GATEWAY_ID=default
```

Compatibility:

```bash
# Deprecated alias, still accepted for Vercel during migration.
AI_GATEWAY_API_KEY="vck_***"
```

Rules:

- `AI_GATEWAY_PROVIDER` defaults to `vercel` when unset to preserve current behavior.
- `AI_GATEWAY_PROVIDER=vercel` requires `VERCEL_AI_GATEWAY_API_KEY` or deprecated `AI_GATEWAY_API_KEY`, unless mock runtime is enabled.
- `AI_GATEWAY_PROVIDER=cloudflare` requires `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`, unless mock runtime is enabled.
- `AGENTIS_WEB_SEARCH_PROVIDER` defaults to `vercel-gateway` when unset to preserve current behavior.
- `AGENTIS_WEB_SEARCH_PROVIDER=tavily` requires `AGENTIS_WEB_SEARCH_BACKEND=keyless` for this slice.
- `AGENTIS_WEB_SEARCH_PROVIDER=vercel-gateway` supports existing `perplexity | parallel` backends.
- Tavily keyless must not require or read a Tavily API key in this slice.

## Acceptance criteria

1. `AI_GATEWAY_PROVIDER=vercel` preserves current live chat/run execution through Vercel AI Gateway and uses `VERCEL_AI_GATEWAY_API_KEY` when set.
2. Existing envs that only set `AI_GATEWAY_API_KEY` continue to work for `AI_GATEWAY_PROVIDER=vercel` as a deprecated alias.
3. `AI_GATEWAY_PROVIDER=cloudflare` routes live chat/run execution through Cloudflare AI Gateway using `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`.
4. Runtime health reports available when the selected provider has required credentials or mock runtime is enabled, and unavailable with `reason: "missing_api_key"` when selected-provider credentials are missing.
5. Runtime health and thread composer missing-credential copy identify the selected provider's required env vars without printing secret values.
6. Mock runtime remains available without Vercel, Cloudflare, or Tavily credentials.
7. `AGENTIS_WEB_SEARCH_PROVIDER=vercel-gateway` preserves the existing Vercel Gateway native search behavior for `perplexity` and `parallel` backends.
8. `AGENTIS_WEB_SEARCH_PROVIDER=tavily` with `AGENTIS_WEB_SEARCH_BACKEND=keyless` uses Tavily keyless search and returns normalized `SearchWebOutput` with title, URL, snippet, result count, and request metadata when available.
9. Unsupported provider/backend combinations fail loudly during provider resolution, with actionable messages.
10. `.env.example`, `apps/api/.env.example`, README, AGENTS.md, and relevant ADR documentation describe the configurable provider setup and mark `AI_GATEWAY_API_KEY` as a deprecated Vercel alias.
11. Tests cover config parsing, credential availability, Vercel alias compatibility, Cloudflare provider setup, Tavily keyless normalization, unsupported combinations, and mock runtime availability.
12. Standard verification passes: focused API tests, `pnpm --filter api typecheck`, and any changed web tests for runtime-unavailable UI copy.

## Architecture

### Config model

Extend `AppConfig` with provider-specific fields instead of overloading the existing `aiGatewayApiKey` name:

```text
aiGatewayProvider: "vercel" | "cloudflare"
vercelAiGatewayApiKey?: string
cloudflareApiKey?: string
cloudflareAccountId?: string
cloudflareAiGatewayId?: string
```

The existing `aiGatewayApiKey` field can remain temporarily if needed to reduce churn, but new runtime code should read provider-specific fields.

Config parsing should keep provider selection small and explicit. Invalid values should fall back only when the env is unset. If a value is set to an unsupported provider, fail loudly in provider resolution or expose unavailable health rather than silently choosing a different live provider.

### Model execution

Refactor `apps/api/src/runtime/gateway-model.ts` into a provider-neutral live model resolver.

Suggested responsibilities:

- Resolve provider-prefixed model ids exactly as today.
- Keep legacy OpenAI id normalization for existing local records.
- For Vercel:
  - require Vercel credentials.
  - use `createGateway({ apiKey })` from `ai`.
- For Cloudflare:
  - require Cloudflare token and account id.
  - use `createOpenAICompatible` from `@ai-sdk/openai-compatible`.
  - base URL: `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`.
  - pass optional `cf-aig-gateway-id` header when `CLOUDFLARE_AI_GATEWAY_ID` is configured.

`RunExecutor` should continue to call one helper to get a `LanguageModel`. Mock runtime branching should remain unchanged.

### Runtime health and UI copy

`isRuntimeAvailable(config)` should become selected-provider aware:

```text
mockRuntime -> available
vercel -> Vercel credential present
cloudflare -> Cloudflare token and account id present
```

The health response can keep `reason: "missing_api_key"`, but it should include enough model/provider context for UI copy to name the selected provider and required env vars.

Thread composer copy should remain concise:

- Vercel selected: `Add VERCEL_AI_GATEWAY_API_KEY to the repo root .env to enable model execution.`
- Cloudflare selected: `Add CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID to the repo root .env to enable model execution.`

### Native web search

Keep the existing `WebSearchService` boundary.

Add a Tavily provider implementation:

```text
apps/api/src/research/tavily-web-search-provider.ts
```

Responsibilities:

- Support only `backend=keyless` in this slice.
- POST to `https://api.tavily.com/search` with `X-Tavily-Access-Mode: keyless`.
- Send bounded query and result count.
- Normalize Tavily `results[].title`, `url`, `content`, `score`, `request_id`, and `usage.credits` into `SearchWebOutput`.
- Map non-2xx responses to `WebSearchError` with clear codes.

Update `WebSearchService.resolveProvider()` to select:

- mock provider for mock runtime or explicit mock.
- Vercel provider for `vercel-gateway`.
- Tavily provider for `tavily`.

## Implementation phases

### Phase 1: Config and model provider resolution

Likely files:

- `apps/api/src/config.ts`
- `apps/api/src/config.test.ts`
- `apps/api/src/runtime/gateway-model.ts`
- `apps/api/src/runtime/gateway-model.test.ts`
- `apps/api/src/runtime/run-executor.ts`
- `apps/api/package.json`

Tasks:

- Add provider-specific config fields.
- Parse `AI_GATEWAY_PROVIDER`.
- Parse `VERCEL_AI_GATEWAY_API_KEY`, deprecated `AI_GATEWAY_API_KEY`, and Cloudflare envs.
- Add Cloudflare language model creation through `@ai-sdk/openai-compatible@1.0.39`.
- Preserve Vercel helper behavior.
- Add tests for selected-provider credential requirements and model construction.

Acceptance criteria covered: 1, 2, 3, 4, 6, 9, 11.

### Phase 2: Tavily keyless web search provider

Likely files:

- `apps/api/src/config.ts`
- `apps/api/src/config.web-search.test.ts`
- `apps/api/src/research/tavily-web-search-provider.ts`
- `apps/api/src/research/tavily-web-search-provider.test.ts`
- `apps/api/src/research/web-search-service.ts`

Tasks:

- Add `tavily` to web search provider config.
- Add `keyless` as the Tavily backend.
- Implement Tavily keyless provider with bounded inputs and normalized output.
- Preserve existing Vercel Gateway provider behavior.
- Add tests for successful normalization, provider selection, unsupported combinations, and non-2xx error mapping.

Acceptance criteria covered: 7, 8, 9, 11.

### Phase 3: Runtime health, UI copy, docs, and ADR

Likely files:

- `apps/api/src/routes/runtime.ts`
- `apps/api/src/app.test.ts`
- `apps/web/src/components/thread/thread-prompt-composer.tsx`
- `apps/web/src/components/thread/thread-prompt-composer.test.tsx`
- `.env.example`
- `apps/api/.env.example`
- `README.md`
- `AGENTS.md`
- `docs/adr/0004-vercel-ai-gateway-runtime-boundary.md` or a new ADR superseding it

Tasks:

- Include selected provider and missing credential guidance in runtime health.
- Update thread composer unavailable copy.
- Update environment examples and local runtime docs.
- Update ADR documentation to describe configurable AI Gateway providers and Tavily keyless dev search.

Acceptance criteria covered: 4, 5, 10, 12.

### Phase 4: Verification and live smoke

Tasks:

- Run focused tests for config, runtime model resolution, web search provider selection, Tavily provider, and UI copy.
- Run API typecheck.
- With env set to Cloudflare and Tavily keyless, run one live chat smoke and one live search smoke.
- With env set to Vercel, run a non-live unit-level verification or live smoke if credentials are present.
- Record any blocked live smoke separately from code correctness.

Acceptance criteria covered: 1, 3, 8, 12.

## Verification

Focused commands:

```bash
pnpm --filter api test -- \
  src/config.test.ts \
  src/config.web-search.test.ts \
  src/runtime/gateway-model.test.ts \
  src/research/tavily-web-search-provider.test.ts \
  src/app.test.ts

pnpm --filter web test -- src/components/thread/thread-prompt-composer.test.tsx
```

Standard checks:

```bash
pnpm --filter api typecheck
pnpm typecheck
```

Live smoke, when credentials are present:

1. `AI_GATEWAY_PROVIDER=cloudflare`, `AGENTIS_WEB_SEARCH_PROVIDER=tavily`, `AGENTIS_WEB_SEARCH_BACKEND=keyless`.
2. Confirm runtime health is available.
3. Stream one short chat completion through Cloudflare.
4. Run one Tavily keyless search and verify normalized results.
5. Switch `AI_GATEWAY_PROVIDER=vercel` with Vercel credentials when available and verify the Vercel model helper still constructs the expected Gateway model.

## Risks and mitigations

- Existing environments may only have `AI_GATEWAY_API_KEY`. Mitigation: keep it as a deprecated alias for Vercel.
- Cloudflare provider package versions can drift. Mitigation: pin the AI SDK 5-compatible `@ai-sdk/openai-compatible@1.0.39` line until the repo upgrades AI SDK major versions.
- Tavily keyless limits may be lower than production needs. Mitigation: use keyless for dev only and plan API-key or Parallel evaluation before production.
- Provider/backend config could become ambiguous. Mitigation: validate combinations and fail loudly.
- Vercel and Cloudflare model catalogs may differ. Mitigation: keep provider-prefixed model ids and rely on live smoke or provider errors to surface unsupported models.

## Build handoff

Approved direction:

- Add configurable `AI_GATEWAY_PROVIDER=vercel | cloudflare`.
- Preserve Vercel AI Gateway as the default and rollback path.
- Add Cloudflare AI Gateway as an alternate live model provider.
- Add `AGENTIS_WEB_SEARCH_PROVIDER=tavily` with `AGENTIS_WEB_SEARCH_BACKEND=keyless` for no-cost development native search.
- Keep existing Vercel Gateway web search behavior.
- Keep mock runtime unchanged.

Build should implement this in the phases above using TDD. Do not remove Vercel support or the deprecated `AI_GATEWAY_API_KEY` alias in this slice. Do not make Cloudflare hosting changes. Stop and ask if provider package APIs or live credentials contradict the plan.