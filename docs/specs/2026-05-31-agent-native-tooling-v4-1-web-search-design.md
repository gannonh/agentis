# Agent native tooling V4.1: provider-neutral web search

## Goal

Add the first V4 capability parity slice by giving Agentis agents the native
web search tool. The runtime callable tool is `searchWeb`; the product term is
"web search" even when compact UI surfaces label it "Search". The tool should
let an agent retrieve current web information with cited, bounded source
evidence while keeping Agentis independent from any specific frontier model or
model provider.

V4.1 is a single-tool epic/PR. It proves the research-tool category without
adding browser automation, Exa deep research, persistent research datasets,
documents, tables, or media tooling.

## Source of truth

- Roadmap: `docs/agent-native-tooling.md`, especially V4 and the Hyperagent
  research inventory.
- Existing native runtime plumbing:
  - `apps/api/src/runtime/run-executor.ts`
  - `apps/api/src/native-tools/`
  - `apps/api/src/native-tools/native-tool-payload.ts`
  - `apps/web/src/components/thread/run-timeline.tsx`
- Vercel AI Gateway web search docs: provider-agnostic search tools such as
  Perplexity Search and Parallel Search can be used with models from any
  provider, while provider-specific native search remains available as an
  alternate path.

## Current state

V1 through V3 already provide the native tool path needed for this slice:

- Native tools are registered into the AI SDK `streamText` runtime tool map.
- Tool calls and results are persisted as message parts and run steps.
- Native run-step payloads are normalized before UI rendering.
- The run timeline renders native evidence, including workspace actions,
  approvals, changed files, command output, and errors.
- Mock-runtime branches exist for local/E2E coverage without live provider
  dependencies.

The current native payload type is workspace-file-tool-centered and requires
`workspaceId`. All Agentis runs are workspace-scoped, but tools are scoped to
agents. V4.1 should generalize native payload formatting enough to support
native tools that are not workspace file tools without weakening the existing
workspace evidence.

## Product scope

Implement one user-facing native tool permission:

### Web search

Native tool permission id: `webSearch`.
Runtime tool name: `searchWeb`.

Input:

```ts
type SearchWebInput = {
  query: string
  maxResults?: number
  domains?: string[]
  recency?: "day" | "week" | "month" | "year"
}
```

`query` is required and bounded. Optional filters are best-effort and should map
only to provider capabilities that are verified during Build.

Output:

```ts
type SearchWebOutput = {
  query: string
  provider: string
  results: Array<{
    title: string
    url: string
    snippet?: string
    source?: string
    publishedAt?: string
  }>
  resultCount: number
  truncated: boolean
  metadata?: Record<string, unknown>
}
```

The persisted run-step summary should include the query, provider, result count,
bounded source list, truncation flag, and error code when applicable. It should
not persist full page contents or unbounded excerpts.

## Architecture

V4.1 should use a provider-neutral boundary:

```ts
type WebSearchProvider = {
  name: string
  search(input: SearchWebInput): Promise<SearchWebOutput>
}
```

Agentis owns the `searchWeb` input/output schema and the timeline payload shape.
Provider-specific response details are normalized before the model, repository,
or web UI depends on them.

Tool ownership and execution context are separate axes:

- Tool permissions are agent-scoped and versioned with agent configuration.
- Tool execution happens within the run's workspace-scoped context.
- Integration grants remain separate from native tool permissions; Composio tools
  are integrations, not Agentis native tools.
- Tool permissions shape the model-visible tool list. If web search is not
  permitted for the bound agent configuration, `searchWeb` is not registered and
  the model is not told it exists.

Recommended files:

- `apps/api/src/native-tools/web-search-tools.ts`
- `apps/api/src/research/web-search-provider.ts`
- `apps/api/src/research/web-search-service.ts`
- `apps/api/src/research/vercel-gateway-web-search-provider.ts`
- `apps/api/src/research/mock-web-search-provider.ts`
- `apps/api/src/native-tools/tool-names.ts`
- `apps/api/src/native-tools/native-tool-payload.ts`
- `apps/api/src/runtime/run-executor.ts`
- `apps/web/src/components/thread/run-timeline.tsx`

The Build phase should first inspect the installed AI SDK Gateway API in this
repo. If Vercel Gateway search tools can be registered directly while preserving
Agentis run-step normalization, use that path. If they cannot be invoked cleanly
from inside the Agentis wrapper, use a small gateway-backed internal AI SDK call
inside `WebSearchProvider.search()` and normalize its cited/search output. In
both cases, the external Agentis contract remains `searchWeb`.

OpenAI-native web search may be added later as a provider implementation, but it
must not be the product boundary or the default assumption for V4.1.

## Configuration

Add explicit web search config with conservative defaults:

- `AGENTIS_WEB_SEARCH_PROVIDER=vercel-gateway|mock`
- `AGENTIS_WEB_SEARCH_BACKEND=perplexity|parallel`
- `AGENTIS_WEB_SEARCH_MAX_RESULTS=5`
- `AGENTIS_WEB_SEARCH_MAX_SNIPPET_CHARS=500`

Credential configuration should follow the verified Vercel AI Gateway mechanism
for the installed SDK. The implementation should document the required env var
in `.env.example` once confirmed during Build.

Provider selection is platform-level MVP configuration, not a global enablement
toggle. Web search is an Agentis capability; if its configured provider is
unavailable, that is an operational fault to surface, not a normal disabled
state. Agent-level provider selection is deferred. In V4.1, an agent has a
binary web search permission: permitted or not permitted.

Default permission behavior:

- The built-in generic Agentis agent gets web search permitted when web search
  provider configuration is available.
- Custom agents must opt in explicitly.
- Existing custom agents should not silently gain web search permission during
  migration.

Agent configuration snapshots should store only permitted native tool ids, for
example `nativeToolsJson: ["webSearch"]`. Absence from the snapshot means the
agent is not permitted to use that tool and the runtime callable is not
registered. Do not store explicit false values for every known native tool.

Mock runtime should use the mock provider automatically so unit, E2E, and local
demo flows can prove tool wiring without live search credentials. When
`AGENTIS_MOCK_RUNTIME=1`, web search provider availability resolves to the mock
provider regardless of real gateway credentials. In non-mock runtime, missing
provider credentials is a preflight P1 failure for agents permitted to use web
search.

## Data flow

0. Before model execution, the run executor checks whether the bound agent
   configuration permits web search. If not, `searchWeb` is omitted from the
   model-visible tool list. If permitted, the run executor checks whether the
   configured provider is available. A permitted agent with unavailable web
   search provider config fails fast with visible run evidence instead of
   letting the model continue without the capability. Mock runtime resolves this
   check through the mock provider.
1. The model calls `searchWeb`.
2. The tool validates and bounds input.
3. `WebSearchService` selects the configured `WebSearchProvider`.
4. The provider executes gateway-backed search or mock search.
5. Raw provider output is normalized into `SearchWebOutput`.
6. The run executor persists the tool call and result as message parts.
7. Native payload formatting stores bounded search evidence in the run step.
8. The assistant summarizes the cited results in normal text.
9. `RunTimeline` renders the query, provider, result count, and source links.

## Error handling

Use explicit error codes:

- `web_search_unavailable`: required gateway/search credentials are missing.
- `web_search_provider_unsupported`: configured provider/backend is unsupported
  by the installed SDK or current config.
- `web_search_failed`: provider request failed, timed out, or rate-limited.
- `web_search_normalization_failed`: provider response could not be normalized.

For normal run execution, `web_search_unavailable` should be raised during
preflight when the bound agent configuration permits web search but the provider
is not operational. The tool/provider path should still map unavailable
credentials and mid-run provider failures to explicit web search errors for
direct tests, races, or degraded provider state after preflight.

Malformed or oversized individual results should be omitted or truncated when
the remaining response can still be safely normalized. The whole tool should
fail only when the provider response cannot produce a trustworthy bounded result.

## UI behavior

Extend `RunTimeline` native formatting for web search payloads:

- Show `Native · searchWeb`.
- Show query.
- Show provider/backend.
- Show result count and truncation state.
- Render bounded source links with titles and domains.
- Render error code and message on failure.

Thread transcript rendering can remain unchanged in V4.1. The assistant's final
text answer should carry the user-facing synthesis, while the timeline carries
evidence.

## Implementation phases

### Phase 1: Contract and config

- Add search input/output schemas and provider interface.
- Add config parsing and tests for search enablement, provider selection, max
  results, and snippet limits.
- Update `.env.example` with confirmed gateway credential and search settings.

### Phase 2: Provider implementation

- Inspect the installed AI SDK Gateway API.
- Implement a Vercel Gateway-backed provider using provider-agnostic search when
  feasible.
- Add a mock provider for deterministic tests and mock runtime.
- Normalize provider output into Agentis-owned search results.

### Phase 3: Runtime and persistence

- Register `searchWeb` with native runtime tools.
- Add versioned native tool permissions to agent configuration, with web search
  as the first permission.
- Register `searchWeb` only when the run's bound agent configuration permits it.
- Add run preflight that fails permitted web search runs when provider config is
  unavailable.
- Generalize native tool names and payload formatting to include native tools
  that are not workspace file tools.
- Add mock-runtime coverage that causes `searchWeb` to run for search-like
  prompts.
- Preserve existing workspace tool behavior.

### Phase 4: Timeline and docs

- Render web search evidence in `RunTimeline`.
- Add focused API and web tests.
- Update `docs/agent-native-tooling.md` to mark V4.1 as planned or implemented,
  depending on Build completion.

## Acceptance criteria

- A model run can call `searchWeb` and persist bounded cited web search evidence.
- The implementation does not hardcode Agentis to OpenAI or any specific model.
- Provider choice is behind an Agentis-owned `WebSearchProvider` boundary.
- Agent-level web search permission is versioned with agent configuration.
- Missing search provider config produces a clear failed native tool step and is
  treated as a P1 operational issue.
- A permitted web search run fails fast before model execution when provider
  config is unavailable.
- An agent configuration without web search permission does not expose
  `searchWeb` to the model.
- Timeline rendering shows query, provider, result count, and source links.
- Full page contents are not persisted in run-step evidence.
- Mock runtime can demonstrate the flow without live search credentials.
- Existing workspace read, edit, and execution native tool tests continue to
  pass.

## Verification

Automated checks:

```bash
pnpm --filter api test
pnpm --filter web test
pnpm typecheck && pnpm build && pnpm lint
```

Targeted tests:

- `searchWeb` input validation and limit handling.
- Config parsing for disabled, mock, and gateway-backed search.
- Provider normalization from representative gateway responses.
- Missing credential and unsupported provider error mapping.
- Run preflight failure when the bound agent configuration permits web search
  but provider config is unavailable.
- Mock runtime provider availability without live gateway credentials.
- Native run-step payload summary for search results.
- Run timeline rendering for query, provider, result count, source links,
  truncation, and failures.
- Mock-runtime run executor flow that persists a search tool call/result.

Manual/UAT evidence:

1. With mock runtime enabled, ask for current information and verify a
   `searchWeb` step appears with deterministic source links.
2. With real gateway credentials enabled, ask for a current event and verify the
   assistant cites bounded sources from the timeline evidence.
3. Remove or invalidate required search provider credentials and verify the
   failure is visible as `web_search_unavailable`.

## Explicitly deferred

- Browser automation, screenshots, page interaction, or persistent sessions.
- Exa-specific semantic search, Exa Answer, Exa Research, and Exa Websets.
- Thread search.
- Research tables, persistent documents, or shared datasets.
- Native tool grants/policy UI.
- Full page crawling or transcript rendering of full source content.
- OpenAI-native web search as the default product boundary.

## Build handoff

Approved scope: implement V4.1 as provider-neutral native web search with one
public Agentis tool, `searchWeb`, backed first by Vercel AI Gateway search if the
installed AI SDK supports it cleanly, with mock runtime support and bounded
timeline evidence.

Non-goals: do not add browser automation, Exa deep research, documents, tables,
media tools, or native tool grant UI in this slice.

First Build task: inspect the installed `ai` package and Gateway exports in this
repo, then choose the smallest gateway-backed provider path that preserves the
Agentis-owned `searchWeb` contract.
