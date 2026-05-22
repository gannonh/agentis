# M03 Composio Integrations and Tool Access Design

## Status
Approved

## Goal
Ship a thread-first Composio integration slice: users can connect an external tool, grant that connection to a thread, run a prompt that uses the granted tool, and inspect the tool call in the run timeline.

## Scope
M03 covers:

- API-backed Integrations catalog for Slack, Gmail, Google Drive, GitHub, and Airtable.
- Composio connection flow from the Integrations screen.
- SQLite persistence for toolkit metadata, connection state, and tool access grants.
- Thread composer tool picker and visible granted-tool chips.
- Runtime bridge that exposes granted connected Composio tools to thread runs.
- Timeline logging for Composio tool inputs, outputs, duration, errors, and remediation.
- Explicit mock Composio mode for tests and local demos.

M03 does not cover:

- Agent-facing tool grant UI.
- API-backed agent creation or configuration.
- Slack, webhook, or scheduled invocations.
- Full Composio catalog coverage.
- Advanced per-action policies, approval gates, or audit exports.
- Project context, artifacts, promotion, evaluations, or self-host packaging.

Grant storage should support future `agent` scope, but M03 exposes only thread grants because thread sessions already exist and API-backed agents are part of M05.

## Architecture
Use a thread-first vertical slice with future-ready grant records.

Backend units:

- `IntegrationService`: owns toolkit catalog, connection flow, callback handling, and status refresh.
- `ToolAccessService`: owns grant creation, revocation, listing, and permission checks.
- `ComposioClient`: wraps live Composio SDK calls behind an internal interface.
- `MockComposioClient`: provides deterministic connections and tool execution for tests and local demos.
- `ToolExecutionService`: maps curated Agentis runtime tools to Composio tool calls, re-checks grants, sanitizes payloads, measures duration, and produces timeline payloads.
- `RunExecutor`: builds available runtime tools for the current thread and preserves existing M02 streaming and abort behavior.

Frontend units:

- Integrations page API hooks for catalog, connect, and refresh.
- Integration card states for not connected, pending, connected, expired, error, and unavailable.
- Thread tool picker for grant and revoke actions.
- Composer chips for granted connected integrations.
- Run timeline rendering for Composio tool calls, results, errors, and remediation actions.

## User workflow
1. User opens `/integrations`.
2. Web loads `GET /api/integrations`.
3. User searches or filters the featured catalog.
4. User clicks Connect on a supported toolkit.
5. Web calls `POST /api/integrations/:toolkitSlug/connect`.
6. Live mode returns a Composio redirect URL. Mock mode completes a deterministic local connection.
7. Composio callback or manual refresh updates connection status in SQLite.
8. User opens or creates a thread.
9. Composer Tools control loads available connected integrations and existing thread grants.
10. User grants a connected integration to the thread.
11. Composer shows a chip for the granted integration.
12. User sends a prompt that uses the granted tool.
13. Runtime exposes only tools backed by the thread grants.
14. Tool execution re-checks the grant and connected account immediately before calling Composio.
15. Timeline records the tool call, result, duration, and any error.
16. Reload preserves connection and grant state.

## Data model
Add three SQLite-backed concepts:

### Integration toolkits
Seeded metadata for the five M03 apps.

Fields:

- `slug`
- `name`
- `description`
- `category`
- `featured`
- optional Composio auth config id
- created and updated timestamps

### Integration connections
Local records for Composio connected accounts and pending connection requests.

Fields:

- local id
- local user id
- toolkit slug
- Composio connected account id
- Composio connection request id
- status: `not_connected`, `pending`, `connected`, `expired`, or `error`
- account label
- scopes or permissions when available
- safe error code and message
- created and updated timestamps

### Tool access grants
Permission records for a thread or future agent to use a connected account.

Fields:

- grant id
- scope type: `thread` or `agent`
- scope id
- toolkit slug
- connection id
- created timestamp

M03 UI creates only `thread` grants. The shared shape avoids a later grant migration when M05 introduces API-backed agents.

## API design
Add shared schemas in `packages/shared` for integration toolkits, connections, grants, runtime health, and route DTOs.

Routes:

- `GET /api/integrations`: list supported toolkits with connection status and account counts.
- `POST /api/integrations/:toolkitSlug/connect`: start or mock a Composio connection.
- `GET /api/integrations/callback`: handle Composio redirect and update the pending connection.
- `POST /api/integrations/refresh`: refresh connection statuses from Composio.
- `GET /api/threads/:threadId/tool-grants`: list current grants and grantable connected integrations.
- `POST /api/threads/:threadId/tool-grants`: grant a connected toolkit/account to the thread.
- `DELETE /api/threads/:threadId/tool-grants/:grantId`: revoke a thread grant.

Runtime health should report model readiness and Composio readiness separately so the UI can explain which capability is unavailable.

## Composio integration
Use server-only Composio configuration:

- `COMPOSIO_API_KEY`
- `COMPOSIO_REDIRECT_BASE_URL`
- `COMPOSIO_USER_ID`, defaulting to a deterministic local user id
- optional pinned toolkit versions
- `AGENTIS_MOCK_COMPOSIO=1` for deterministic mock mode

The live adapter must verify installed `@composio/core` typings before using SDK calls. The intended flow is:

- Start hosted authorization for a toolkit.
- Store local pending connection metadata.
- Refresh connected account state after callback or refresh.
- Execute curated tool calls with the local Composio user id and connected account id.

Curate a small set of read-oriented tools for M03. GitHub should be the main end-to-end acceptance path because it supports low-risk read operations. Other featured toolkits can be connectable even if a stable runtime tool is unavailable; the UI should show a specific unavailable reason.

## Permission model
Runtime permission checks happen in two places:

1. Preflight guard: if the latest user prompt explicitly names a supported toolkit that is disconnected or ungranted, stop before model execution and create a remediation step.
2. Execution guard: immediately before a Composio call, re-check the grant and connected account.

If either check fails, the run should surface a typed remediation path such as connect the toolkit, re-authenticate, or grant the toolkit to the thread.

Runtime only registers tools for granted and connected toolkits. Ungranted tools should not appear in the model tool list.

## Error handling
- Missing Composio API key disables live connection actions with setup copy.
- Missing redirect base URL disables live OAuth with local setup copy.
- Mock mode must be explicit and visible in runtime health.
- OAuth cancel leaves the connection pending or error with Retry available.
- Unknown callback request redirects to the Integrations page with a safe error.
- SDK/API failures store safe error details and never silently switch to mock mode.
- Expired connections block grants and execution until reconnected.
- Revoked grants block future tool calls and fail in-flight execution checks.
- Tool payloads are sanitized and truncated before display or persistence.
- Abort preserves partial assistant output and prevents a late tool result from marking the run completed.

## Testing
API tests:

- Toolkit seeding is deterministic and idempotent.
- Connections persist across SQLite restart.
- Grants can be created, listed, and revoked.
- Connection routes handle mock success, missing config, callback refresh, and errors.
- Permission checks block disconnected and ungranted toolkits.
- Tool execution logs successful calls, failures, duration, and sanitized payloads.
- Abort behavior remains correct around tool execution.

Web tests:

- Integrations page renders API-backed catalog and search.
- Connect and refresh actions show pending, connected, missing config, and error states.
- Thread tool picker grants and revokes connected toolkits.
- Composer chips reflect persisted grants.
- Timeline renders Composio metadata and remediation actions.

E2E tests:

- With mock runtime and mock Composio, connect GitHub, grant it to a thread, run a tool, reload, and confirm connection and grant persistence.
- Ask for Slack without connecting or granting Slack and confirm a remediation path appears.

Verification commands:

```bash
pnpm --filter @workspace/shared test
pnpm --filter api test
pnpm --filter web test
pnpm typecheck
pnpm build
pnpm lint
pnpm test:coverage
pnpm test:e2e
```

## Acceptance criteria
- User can connect at least one Composio integration from the Integrations screen.
- Integrations catalog lists Slack, Gmail, Google Drive, GitHub, and Airtable from the API.
- Connection state survives app restart.
- User can grant a connected integration to a thread.
- Composer shows visible chips for granted connected integrations.
- Runtime can call a granted Composio-backed tool from a thread run.
- Tool calls appear in the timeline with inputs, outputs, duration, and errors.
- Explicit disconnected or ungranted toolkit requests produce a visible remediation path.
- Server-only Composio secrets never reach frontend bundles, persisted run payloads, or logs.
