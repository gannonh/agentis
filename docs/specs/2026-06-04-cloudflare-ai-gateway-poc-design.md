# Cloudflare AI Gateway POC

## Status

Draft for review

## Goal

Prove whether Cloudflare AI Gateway is a viable replacement for Vercel AI Gateway in Agentis live development while keeping the Vercel AI SDK as the application integration layer.

The problem to solve is Vercel AI Gateway rate limiting on the free development tier. Current limits make live development impractical because normal completions can be limited to roughly one request per minute. Agentis needs a lower-friction live runtime path for development, and Cloudflare is also the likely long-term production platform direction.

This work is a proof of concept, not the production migration. It should produce evidence and a recommendation before Agentis changes its default runtime boundary.

Target question:

```text
Can Agentis use Vercel AI SDK -> Cloudflare AI Gateway for live chat and an acceptable native web search path?
```

## Current state

Agentis currently uses Vercel AI Gateway as the normal live runtime boundary:

- Chat/run execution constructs live language models in `apps/api/src/runtime/gateway-model.ts` using `createGateway` from the Vercel AI SDK package.
- Native web search uses `apps/api/src/research/vercel-gateway-web-search-provider.ts`, which depends on Vercel AI Gateway search tools such as Perplexity and Parallel search.
- Runtime availability, UI copy, local docs, and `.env.example` center on `AI_GATEWAY_API_KEY`.
- `docs/adr/0004-vercel-ai-gateway-runtime-boundary.md` records the current accepted Vercel AI Gateway runtime boundary.

The repo has a provider-neutral web search boundary through `WebSearchService` and `WebSearchProvider`, which gives the POC a safe place to test alternate search providers without changing agent-facing tool contracts.

The user has added `CLOUDFLARE_API_KEY` to the repo root `.env` and added AI Gateway permissions to that Cloudflare API key. Cloudflare does not use a separate AI Gateway API key in this setup. If the POC receives permission, authentication, account, gateway, or billing access errors, Build must stop and ask the user to update the required access. Build must not create or change Cloudflare account permissions.

The user has also commented out `AGENTIS_WEB_SEARCH_PROVIDER` and `AGENTIS_WEB_SEARCH_BACKEND` in `.env`. The POC should avoid silently relying on Vercel web search defaults when testing Cloudflare viability.

## Scope

Included:

- Add isolated POC code or scripts that exercise Cloudflare AI Gateway without replacing the production runtime path.
- Verify streamed chat completion through Cloudflare AI Gateway using the Vercel AI SDK.
- Discover the exact Cloudflare environment variables needed, including whether `CLOUDFLARE_ACCOUNT_ID` and gateway id/name are required alongside `CLOUDFLARE_API_KEY`.
- Verify whether Cloudflare-routed Perplexity or Parallel can support Agentis native `searchWeb` output needs.
- If Cloudflare-routed search is blocked or insufficient, try one direct external search provider candidate, preferably Exa, when credentials are available.
- Document a recommendation: migrate, migrate with a separate search provider, or stay on Vercel for now.
- Document a short Cloudflare production-hosting outlook with concrete blockers and likely next steps.

Out of scope:

- Replacing the production runtime boundary.
- Changing default runtime availability behavior.
- Cloudflare Workers deployment implementation.
- D1 database migration.
- R2 document storage migration.
- Replacing SQLite, local document storage, or sandbox execution.
- Building a model picker, BYOK UI, or provider routing UI.
- Changing Cloudflare account permissions, gateway configuration, billing settings, or provider credentials.

## Acceptance criteria

1. A local POC can make a streamed chat completion through Cloudflare AI Gateway using the Vercel AI SDK and `CLOUDFLARE_API_KEY`, or the POC records the exact blocker returned by Cloudflare.
2. The POC records whether Cloudflare requires `CLOUDFLARE_ACCOUNT_ID`, gateway id/name, or other non-secret identifiers in addition to `CLOUDFLARE_API_KEY`.
3. The POC verifies at least one Cloudflare-routed search path, preferably Perplexity or Parallel, and records whether it can populate the existing Agentis `SearchWebOutput` shape.
4. If Cloudflare-routed search is blocked, unavailable, or cannot produce acceptable `SearchWebOutput`, the POC verifies one direct external search provider candidate or records the missing credential as the blocker.
5. The POC does not replace Vercel AI Gateway as the production runtime path unless chat and native-search viability are both proven and the user explicitly approves a follow-up migration.
6. The POC fails closed on Cloudflare permission, authentication, account, gateway, or billing errors by stopping and asking the user for updated access instead of attempting account or permission changes.
7. The POC produces a written recommendation with one of these outcomes: migrate to Cloudflare AI Gateway, migrate to Cloudflare AI Gateway with a separate search provider, or stay on Vercel AI Gateway for now.
8. The POC includes a short Cloudflare production-hosting outlook that names concrete blockers and next steps for Workers, database, document storage, and sandbox execution.
9. Any committed POC code typechecks with the repo's TypeScript configuration or the spec records why no code was committed.

## Architecture

The POC should keep production runtime code isolated from experimental runtime behavior.

```text
Agentis API / POC script
  -> Vercel AI SDK streamText or generateText
  -> Cloudflare AI Gateway
  -> OpenAI, Anthropic, Workers AI, or another configured model

Agentis searchWeb POC
  -> WebSearchProvider boundary
  -> Cloudflare-routed Perplexity or Parallel
  -> normalized SearchWebOutput

Fallback search spike, if needed
  -> WebSearchProvider boundary
  -> direct Exa or comparable search provider
  -> normalized SearchWebOutput
```

The first implementation should prefer isolated scripts under `apps/api/src` or `scripts/` rather than wiring Cloudflare into `RunExecutor`. If Build chooses reusable provider helpers, those helpers should remain unused by the normal runtime until a later approved migration.

## POC phases

### Phase 1: Cloudflare chat streaming spike

Likely files:

- `apps/api/package.json`
- `apps/api/src/runtime/` or `scripts/`
- Optional focused test or smoke script

Tasks:

- Inspect the installed Vercel AI SDK version and Cloudflare's current Vercel AI SDK integration guidance.
- Choose the smallest provider integration that supports streaming through the AI SDK. Current Cloudflare docs point to `ai-gateway-provider`; OpenAI-compatible integration may also be viable through the AI SDK openai-compatible provider if verified against current docs and installed types.
- Read `CLOUDFLARE_API_KEY` from config or the process environment. Do not introduce a separate Cloudflare AI Gateway key name.
- Determine the required account and gateway identifiers.
- Execute one streamed completion with a small prompt.
- Record model id, endpoint/provider package, required env vars, response success or exact blocker, and whether the stream shape fits Agentis `streamText` usage.

Acceptance criteria covered: 1, 2, 6, 9.

### Phase 2: Cloudflare-routed native search spike

Likely files:

- `apps/api/src/research/`
- `apps/api/src/research/*test.ts` or a smoke script
- POC report/spec updates

Tasks:

- Test whether Perplexity through Cloudflare AI Gateway can return current web-grounded answers, citations, URLs, or result-like data that can map into `SearchWebOutput`.
- Test Parallel through Cloudflare AI Gateway when a Parallel credential is available. If no credential exists, record it as blocked rather than inventing a fallback.
- Normalize any successful provider output into the current `SearchWebOutput` structure:
  - query
  - provider
  - results with title, url, snippet, and optional publishedAt
  - metadata with provider request identifiers when available
- Compare the result against the current `searchWeb` tool needs in `apps/api/src/native-tools/web-search-tools.ts`.

Acceptance criteria covered: 3, 6, 9.

### Phase 3: Direct search provider fallback spike

Run this phase only if Cloudflare-routed search is blocked or insufficient.

Likely files:

- `apps/api/src/research/`
- `.env.example` only if adding a documented optional credential after user approval
- POC report/spec updates

Tasks:

- Prefer Exa as the first candidate because it is strong for semantic research search.
- If Exa credentials are not configured, record the missing credential and stop this phase.
- Implement only enough direct provider code or script logic to prove result normalization into `SearchWebOutput`.
- Keep the existing Agentis `WebSearchProvider` boundary so a future production migration can swap providers without changing the public `searchWeb` native tool contract.

Acceptance criteria covered: 4, 7, 9.

### Phase 4: Recommendation and hosting outlook

Likely files:

- `docs/specs/2026-06-04-cloudflare-ai-gateway-poc-design.md` or a follow-up report file
- Optional ADR draft only if the POC recommends a migration and the user approves documenting the decision

Tasks:

- Summarize POC results and blockers.
- Recommend one outcome:
  - Migrate to Cloudflare AI Gateway.
  - Migrate to Cloudflare AI Gateway with a separate search provider.
  - Stay on Vercel AI Gateway for now.
- Include a concise production-hosting outlook:
  - API entrypoint currently uses `@hono/node-server`; Workers would need a Worker-compatible entrypoint.
  - Database currently uses `better-sqlite3`; Workers hosting would require D1, Hyperdrive/Postgres, or another Worker-compatible persistence plan.
  - Document storage currently uses the local filesystem; Cloudflare production likely needs R2 or another object store.
  - Native workspace command execution uses local-process/local-container assumptions; production needs a separate sandbox execution architecture.
  - Drizzle schema and repositories need adapter review before a D1 or remote SQL migration.

Acceptance criteria covered: 7, 8.

## Verification

Focused verification should run before any recommendation:

```bash
pnpm --filter api typecheck
```

If Build adds tests:

```bash
pnpm --filter api test -- <focused test files>
```

Manual/live verification steps:

1. Confirm required Cloudflare env vars are present without printing secret values.
2. Run the Cloudflare chat streaming POC.
3. Run the Cloudflare-routed search POC or record the exact access/credential blocker.
4. If needed and credentials exist, run the direct search fallback POC.
5. Update the POC report with exact pass/fail/blocked evidence.

Do not report live success unless the request completed against Cloudflare with mock runtime disabled. Do not use mock services as viability evidence.

## Risks and mitigations

- Cloudflare API key permissions may be incomplete. Mitigation: stop on permission or access errors and ask the user to update the key or permissions.
- Cloudflare may require account id, gateway id/name, provider credentials, or unified billing setup beyond `CLOUDFLARE_API_KEY`. Mitigation: record the exact missing requirement and pause.
- Cloudflare-routed search may not expose result-level data suitable for Agentis `searchWeb`. Mitigation: test output shape before migration and evaluate a direct search provider fallback.
- Parallel and Perplexity may require their own provider credentials through Cloudflare provider-native routes. Mitigation: treat missing provider credentials as a blocker, not a reason to change account settings.
- POC code could leak into production runtime. Mitigation: keep scripts/helpers isolated and avoid changing `RunExecutor` until a later approved Build phase.
- Current ADR 0004 names Vercel AI Gateway as accepted. Mitigation: do not change the ADR during the POC unless the user approves a follow-up decision after evidence exists.

## Build handoff

Build should implement the POC in small, reversible slices. The first slice must prove or block Cloudflare chat streaming. The second slice must prove or block native search viability. Build must stop on Cloudflare permission, authentication, account, gateway, or billing errors and ask the user for updated access.

Build should not migrate the production runtime boundary, update ADR 0004, or make Cloudflare the default runtime during this POC. The output is evidence and a recommendation, not a default runtime change.
