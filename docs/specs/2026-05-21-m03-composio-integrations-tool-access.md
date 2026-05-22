# M03 Composio Integrations and Tool Access Spec
## Status
Implemented
## Goal
Let users connect external tools through Composio, grant connected tools to a thread, and run a prompt that executes an allowed Composio tool with visible timeline logging and recovery paths.
## Background
Agentis M01 shipped the shell and fixture-backed product surfaces. M02 added `apps/api`, SQLite persistence, thread sessions, AI SDK streaming, a local demo tool, abort handling, and runtime health. M03 should convert the fixture-backed Integrations surface into an API-backed connection workflow and extend the M02 runtime with Composio-backed tool execution.

The roadmap names Slack, Gmail, Google Drive, GitHub, and Airtable as the first supported apps. Current Composio TypeScript docs describe v3 concepts: toolkits, connected accounts, auth configs, `Composio` from `@composio/core`, `toolkits.authorize(...)` for a hosted OAuth-style connection request, `connectedAccounts.link(...)` when an auth config id is already known, and `tools.execute(...)` for direct execution with `userId`, `connectedAccountId`, arguments, and pinned toolkit versions.
## Requirements
- The Integrations screen lists Slack, Gmail, Google Drive, GitHub, and Airtable from the API with search, category, connection status, account count, and refresh.
  
- Users can start a Composio connection flow for a supported toolkit from the Integrations screen.
  
- The API stores connection metadata, auth status, Composio connected account id, toolkit slug, account label, scopes or permissions when available, and timestamps in SQLite.
  
- Connection state survives app restart.
  
- Thread composer shows a per-thread tool picker backed by connected toolkit availability.
  
- Users can grant and remove connected toolkit access for a thread before starting a run or follow-up.
  
- Composer shows connected-tool chips for the active thread.
  
- Runtime only exposes Composio tools for toolkits granted to the active thread.
  
- Runtime detects explicit requests for supported but disconnected or ungranted toolkits before execution and returns a visible remediation path.
  
- Composio tool calls appear in the run timeline with toolkit, tool slug, sanitized inputs, sanitized outputs, duration, status, and error details.
  
- Automated tests can run without live Composio credentials through an explicit mock Composio mode.
  
- Live Composio execution uses server-only credentials and never exposes `COMPOSIO_API_KEY` or connected account secrets to the web app.
  
## Non-goals
- Full Composio catalog coverage beyond the five M03 featured toolkits.
  
- Advanced per-action policy controls, approval gates, or human-in-the-loop tool confirmations.
  
- Full reusable agent creation or agent tool-management UI. M03 should create data/API support for agent-scoped grants, but M05 owns user-facing agent configuration.
  
- Slack invocation, webhook invocation, schedules, or external triggers.
  
- Project context, artifact storage, promotion to agent, evaluations, or Command Center replacement work.
  
- Production multi-workspace auth. M03 may use a deterministic local workspace/user id until auth lands.
  
## Proposed approach
Recommended: API-backed Composio adapter with mock mode and curated tool exposure.

- Why: This fits the current M02 architecture, keeps credentials on the API, provides a verifiable local path for CI, and ships one end-to-end tool grant and execution slice without waiting for M05 agent configuration.
  
- Trade-offs: The first tool surface is intentionally curated. Full dynamic toolkit coverage and fine-grained policy controls come later.
  

Alternative: Dynamic Composio session tools for every connected toolkit.

- Why it might fit: It reduces manual mapping work and can expose more Composio tools sooner.
  
- Trade-offs: It makes permission boundaries, timeline normalization, schema drift, and predictable tests harder in this milestone.
  

Alternative: UI-only connection catalog with no runtime bridge.

- Why it might fit: It would polish the Integrations screen quickly.
  
- Trade-offs: It misses the M03 acceptance path where a thread grants and executes a connected tool.
  
## User experience / workflow
1. User opens `/integrations`.
  
2. The page loads featured toolkits from `GET /api/integrations`.
  
3. The user searches or filters the catalog.
  
4. The user clicks Connect on Slack, Gmail, Google Drive, GitHub, or Airtable.
  
5. The web app calls `POST /api/integrations/:toolkitSlug/connect`.
  
6. The API starts a Composio-hosted connection request and returns a redirect URL, connection request id, and pending local connection id.
  
7. The browser navigates to the redirect URL.
  
8. After Composio redirects to the API callback, the API refreshes connection status and sends the user back to `/integrations?connected=<toolkitSlug>`.
  
9. The Integrations page refreshes and shows connected status, account count, and any visible errors.
  
10. The user starts or opens a thread.
  
11. The composer includes a Tools control. It lists connected toolkits, grouped by connected and unavailable states.
  
12. The user grants a connected toolkit to the thread. The composer shows a chip such as `GitHub connected`.
  
13. The user prompts the agent to use the granted tool.
  
14. The runtime builds AI SDK tools only for granted connected toolkits and executes selected Composio tools through the API adapter.
  
15. The run timeline shows queued, running, tool-calling, tool-result, completed, failed, or aborted states with Composio call details.
  
16. If the user explicitly asks for a disconnected or ungranted supported toolkit, a preflight guard creates a visible remediation action: connect the toolkit or grant it to the thread.
  
## Technical design
### Shared schemas
Extend `packages/shared/src/schemas.ts` with API DTOs and enums for:

- `integrationToolkitSchema`: `slug`, `name`, `description`, `category`, `featured`, `status`, `connectedAccountCount`, `availableTools`.
  
- `connectionStatusSchema`: `not_connected`, `pending`, `connected`, `expired`, `error`.
  
- `integrationConnectionSchema`: local id, toolkit slug, Composio connected account id, status, label, scopes, created/updated timestamps.
  
- `toolAccessGrantSchema`: id, scope type `thread` or `agent`, scope id, toolkit slug, connected account id, created timestamp.
  
- Request/response DTOs for list, connect, callback refresh, grant, revoke, and thread grants.
  
### API persistence
Add Drizzle tables under `apps/api/src/db/schema.ts` and repository classes under `apps/api/src/repositories/`:

- `integration_toolkits`: seeded local metadata for Slack, Gmail, Google Drive, GitHub, and Airtable.
  
- `integration_connections`: workspace/user-scoped Composio connection metadata.
  
- `tool_access_grants`: thread or agent scoped grants to a connected toolkit/account.
  

The app can seed toolkit metadata at startup or in repository creation. Seed data must be deterministic and safe to rerun.
### Configuration
Add server-only env values to `.env.example` and API config parsing:

- `COMPOSIO_API_KEY`: required for live Composio connections and execution.
  
- `COMPOSIO_REDIRECT_BASE_URL`: public base URL for OAuth callbacks in live mode, such as an ngrok URL during local testing.
  
- `COMPOSIO_USER_ID`: optional local Composio user id, defaulting to `agentis-local-user`.
  
- `COMPOSIO_TOOLKIT_VERSIONS`: optional JSON object for pinned toolkit versions.
  
- `AGENTIS_MOCK_COMPOSIO`: enables deterministic connection and execution responses for tests and local demos without Composio credentials.
  

Runtime health should expose Composio readiness separately from model readiness:

- `runtime.model.available`
  
- `runtime.composio.available`
  
- `runtime.composio.reason`, such as `missing_api_key`, `missing_redirect_base_url`, or `mock_enabled`
  
### Composio adapter
Create `apps/api/src/composio/`:

- `types.ts`: internal Composio adapter contracts.
  
- `composio-client.ts`: live `@composio/core` wrapper.
  
- `mock-composio-client.ts`: deterministic test implementation.
  
- `integration-service.ts`: connection flow, status refresh, and toolkit metadata orchestration.
  
- `tool-execution-service.ts`: grant checks, curated tool mapping, execution, sanitization, duration tracking, and error mapping.
  

The live adapter should verify installed SDK APIs before implementation. Preferred flow:

- Use `Composio` from `@composio/core` with `COMPOSIO_API_KEY` and pinned toolkit versions when configured.
  
- Start hosted toolkit authorization with `toolkits.authorize(userId, toolkitSlug)` when available in the installed SDK.
  
- If the installed SDK requires auth config ids for a toolkit, support `connectedAccounts.link(userId, authConfigId, { callbackUrl })` and require toolkit auth config ids through env or stored metadata.
  
- Refresh connection status through connected account APIs after callback and on Integrations refresh.
  
- Execute curated tool slugs through `tools.execute(toolSlug, { userId, connectedAccountId, arguments, version })`.
  

Curated M03 tool mapping should include at least one safe read-style tool per connected toolkit where Composio supports it. GitHub should be the primary end-to-end acceptance tool because it gives a simple, low-risk read operation. If a toolkit lacks a stable read tool in the installed SDK, keep the toolkit connectable and mark runtime tools unavailable with a specific reason.
### Permission boundary
Runtime tool construction and preflight checks must follow this order:

1. Load the thread and current grants.
  
2. Load connected accounts for each granted toolkit.
  
3. Run a small supported-toolkit intent guard against the latest user prompt. If the prompt explicitly names a supported toolkit that is disconnected or ungranted, stop before model execution and persist a remediation step.
  
4. Build AI SDK tools only for granted and connected toolkits.
  
5. When a tool runs, re-check the grant and connection immediately before calling Composio.
  
6. If the grant or connection is missing, throw a typed remediation error.
  
7. Persist a failed run step with remediation details.
  

Agent-scoped grants should share the same repository and service shape with `scopeType = "agent"`, but M03 only needs thread-scoped UI.
### Runtime integration
Update `apps/api/src/runtime/run-executor.ts`:

- Replace the M02 local-only tool list with a merged tool registry: local demo tools plus Composio tools available to the thread.
  
- Add a thread-aware `buildRuntimeTools(threadId)` method or service dependency.
  
- Add a preflight guard that detects explicit mentions of supported toolkit names when the toolkit is disconnected or ungranted.
  
- Persist Composio tool call and result parts on assistant messages using existing `tool-call` and `tool-result` message parts.
  
- Extend run steps with normalized Composio payload fields: `provider`, `toolkitSlug`, `toolSlug`, `connectedAccountId`, `input`, `output`, `durationMs`, `error`, `remediation`.
  
- Keep abort behavior unchanged and ensure in-flight Composio errors mark the run failed loudly.
  
### API routes
Add routes:

- `GET /api/integrations`: list featured toolkits with status and account counts.
  
- `POST /api/integrations/:toolkitSlug/connect`: start Composio connection request.
  
- `GET /api/integrations/callback`: handle Composio redirect, refresh status, and redirect to the web app.
  
- `POST /api/integrations/refresh`: refresh connection statuses from Composio.
  
- `GET /api/threads/:id/tool-grants`: list thread grants and available connected toolkits.
  
- `POST /api/threads/:id/tool-grants`: grant a connected toolkit/account to a thread.
  
- `DELETE /api/threads/:id/tool-grants/:grantId`: remove a thread grant.
  

Route handlers should return typed errors with remediation codes:

- `composio_not_configured`
  
- `toolkit_not_connected`
  
- `toolkit_not_granted`
  
- `connection_pending`
  
- `connection_expired`
  
- `tool_execution_failed`
  
### Frontend
Update `apps/web`:

- Replace fixture reads in `routes/integrations.tsx` with API hooks.
  
- Enable Connect and Refresh actions in integration cards.
  
- Add pending, connected, expired, error, and not-connected states.
  
- Preserve the existing visual structure and search behavior.
  
- Add `ToolAccessPicker` for the thread composer.
  
- Add connected-tool chips beside the mode/model controls.
  
- Add thread grant hooks and API client methods under `apps/web/src/lib/api/client.ts` or split `integrations-client.ts` if the file grows.
  
- Update `run-timeline.tsx` to render Composio tool metadata and remediation actions.
  
## Data and API changes
### Tables
```text
integration_toolkits
- slug text primary key
- name text not null
- description text not null
- category text not null
- featured integer not null
- auth_config_id text nullable
- created_at text not null
- updated_at text not null

integration_connections
- id text primary key
- user_id text not null
- toolkit_slug text not null references integration_toolkits(slug)
- composio_connected_account_id text nullable
- composio_connection_request_id text nullable
- status text not null
- account_label text nullable
- scopes_json text nullable
- error_code text nullable
- error_message text nullable
- created_at text not null
- updated_at text not null

tool_access_grants
- id text primary key
- scope_type text not null -- thread | agent
- scope_id text not null
- toolkit_slug text not null references integration_toolkits(slug)
- connection_id text not null references integration_connections(id)
- created_at text not null
```

Add indexes on `integration_connections.user_id`, `integration_connections.toolkit_slug`, `tool_access_grants(scope_type, scope_id)`, and `tool_access_grants.connection_id`.
### Dependencies
- Add `@composio/core` to `apps/api` dependencies after verifying the current package name and version.
  
- No web dependency is required for Composio.
  
### API DTOs
API responses must use `@workspace/shared` schemas to keep web and API aligned.
## Error handling and edge cases
- Missing `COMPOSIO_API_KEY`: Integrations page shows connect actions disabled with setup guidance unless `AGENTIS_MOCK_COMPOSIO=1` is enabled.
  
- Missing public redirect base URL in live mode: Connect action explains that local OAuth needs `COMPOSIO_REDIRECT_BASE_URL`.
  
- User cancels OAuth: connection remains `pending` or becomes `error`; Integrations page offers Retry.
  
- Callback arrives for an unknown connection request: API returns a safe error page or redirects to `/integrations?error=unknown_connection`.
  
- Composio SDK/API failure: connection or run step stores the exact safe error message; no silent fallback to mock mode.
  
- Connected account expires: status becomes `expired`; composer chips show re-connect action and runtime blocks execution.
  
- User revokes a grant during a run: tool execution re-checks permission and fails the tool call with `toolkit_not_granted`.
  
- Tool output contains large payloads: timeline stores summarized output and truncates display while preserving enough payload for debugging.
  
- Tool output contains likely secrets: sanitizer redacts token-like keys before persistence or display.
  
- Active run is aborted during tool execution: run is marked aborted as soon as the SDK returns or throws; no completed status overwrites abort.
  
## Test strategy
### API unit and integration tests
- Integration toolkit repository seeds five featured toolkits idempotently.
  
- Connection repository creates, updates, and lists connection status across app restart using SQLite.
  
- Mock Composio client returns deterministic redirect URLs, connected accounts, and tool execution results.
  
- Live Composio adapter has contract tests mocked at the SDK boundary.
  
- Route tests cover list integrations, start connection, callback refresh, refresh statuses, grant, revoke, and grant listing.
  
- Permission tests prove unconnected and ungranted tools fail before Composio execution.
  
- Runtime tests prove granted tools execute, log run steps, persist assistant tool parts, and surface errors.
  
- Sanitizer tests redact token-like fields and truncate large outputs.
  
### Web tests
- Integrations page renders API-backed catalog and preserves search.
  
- Connect action handles missing Composio config, pending redirect, success notice, and error notice.
  
- Refresh action reloads statuses.
  
- Thread composer lists connected toolkits and disables unconnected toolkits with remediation copy.
  
- Granting a toolkit adds a chip; revoking removes it.
  
- Run timeline renders Composio tool calls, outputs, duration, errors, and remediation.
  
### E2E tests
- With `AGENTIS_MOCK_RUNTIME=1` and `AGENTIS_MOCK_COMPOSIO=1`, user connects GitHub from `/integrations`, opens a thread, grants GitHub, runs a prompt that triggers the mock GitHub tool, sees a completed tool step, reloads, and sees connection/grant state persist.
  
- User asks for Slack without connecting or granting Slack and sees a preflight remediation path.
  
### Verification commands
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
## Implementation plan
### Phase 1: Shared contracts and persistence
- [ ] 
  
  Extend `packages/shared/src/schemas.ts` with integration, connection, grant, and runtime health DTOs.
  
- [ ] 
  
  Add API Drizzle tables for integration toolkits, connections, and tool access grants.
  
- [ ] 
  
  Add repository classes and tests for toolkit seeding, connection status persistence, and grants.
  
- [ ] 
  
  Add config parsing for Composio env values and mock mode.
  
- [ ] 
  
  Verification: `pnpm --filter @workspace/shared test && pnpm --filter api test`.
  
### Phase 2: Composio adapter and integration routes
- [ ] 
  
  Install and verify `@composio/core` APIs against local package typings before coding adapter methods.
  
- [ ] 
  
  Add live and mock Composio client adapters.
  
- [ ] 
  
  Add integration service for list, connect, callback refresh, and status refresh.
  
- [ ] 
  
  Add `GET /api/integrations`, `POST /api/integrations/:toolkitSlug/connect`, `GET /api/integrations/callback`, and `POST /api/integrations/refresh`.
  
- [ ] 
  
  Add route tests using the mock Composio client.
  
- [ ] 
  
  Verification: `pnpm --filter api test && pnpm --filter api typecheck`.
  
### Phase 3: Integrations UI
- [ ] 
  
  Replace fixture data in `apps/web/src/routes/integrations.tsx` with API-backed hooks.
  
- [ ] 
  
  Enable Connect and Refresh actions in integration cards.
  
- [ ] 
  
  Render pending, connected, expired, error, missing-config, and no-results states.
  
- [ ] 
  
  Update MSW handlers for non-thread API mocks in dev/test where needed.
  
- [ ] 
  
  Update route tests for API-backed behavior.
  
- [ ] 
  
  Verification: `pnpm --filter web test -- integrations && pnpm --filter web typecheck`.
  
### Phase 4: Thread grant UI and APIs
- [ ] 
  
  Add thread grant API routes and client methods.
  
- [ ] 
  
  Add grant repository/service checks for connected account availability.
  
- [ ] 
  
  Add `ToolAccessPicker` and connected-tool chips to `ThreadPromptComposer`.
  
- [ ] 
  
  Persist and fetch thread grants on `/threads/:id` sessions.
  
- [ ] 
  
  Add web tests for grant, revoke, disabled, and reload states.
  
- [ ] 
  
  Verification: `pnpm --filter api test && pnpm --filter web test -- thread`.
  
### Phase 5: Runtime tool execution bridge
- [ ] 
  
  Add curated Composio tool mapping and execution service.
  
- [ ] 
  
  Add supported-toolkit intent preflight before model execution.
  
- [ ] 
  
  Build AI SDK tools from granted connected toolkits for each run.
  
- [ ] 
  
  Re-check permissions at execution time.
  
- [ ] 
  
  Persist Composio tool calls/results to assistant message parts and run steps.
  
- [ ] 
  
  Add sanitizer and duration/error metadata.
  
- [ ] 
  
  Update run timeline rendering for Composio tool metadata and remediation.
  
- [ ] 
  
  Verification: API runtime tests plus web timeline tests.
  
### Phase 6: Acceptance and hardening
- [ ] 
  
  Add Playwright E2E for mock GitHub connect, grant, execute, reload persistence.
  
- [ ] 
  
  Add Playwright E2E for disconnected or ungranted remediation.
  
- [ ] 
  
  Update README or `.env.example` with Composio local setup notes.
  
- [ ] 
  
  Run full verification commands.
  
- [ ] 
  
  Commit coherent changes with Conventional Commits.
  
## Acceptance criteria
- [ ] 
  
  User can connect at least one Composio integration from the Integrations screen in mock mode and, when configured, live Composio mode.
  
- [ ] 
  
  Integrations screen lists Slack, Gmail, Google Drive, GitHub, and Airtable with API-backed status and search.
  
- [ ] 
  
  Connection state survives app restart.
  
- [ ] 
  
  User can enable a connected integration for a thread.
  
- [ ] 
  
  Composer shows visible chips for granted connected tools.
  
- [ ] 
  
  A prompt can call a granted Composio-backed tool and complete the run.
  
- [ ] 
  
  Tool calls appear in the run timeline with inputs, outputs, duration, status, and errors.
  
- [ ] 
  
  Explicit requests for disconnected or ungranted supported toolkits produce a visible remediation path.
  
- [ ] 
  
  `COMPOSIO_API_KEY` and connected account secrets never appear in frontend code, persisted run payloads, or logs.
  
- [ ] 
  
  `pnpm typecheck && pnpm build && pnpm lint` pass.
  
- [ ] 
  
  `pnpm test:coverage` and `pnpm test:e2e` pass.
  
## Build handoff
- Spec path: `docs/specs/2026-05-21-m03-composio-integrations-tool-access.md`
  
- Approved scope: API-backed integrations catalog, Composio connection flow, SQLite connection metadata, thread-scoped tool grants, curated Composio tool execution bridge, run timeline logging, tests, and local setup docs.
  
- Non-goals: Full catalog coverage, external invocations, reusable agent creation UI, project/artifact work, promotion, evaluations, Docker Compose, and production auth.
  
- Ordered task list: Phase 1 through Phase 6 in this spec.
  
- Verification commands: `pnpm --filter @workspace/shared test`, `pnpm --filter api test`, `pnpm --filter web test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test:coverage`, `pnpm test:e2e`.
  
- Required fixtures or test data: SQLite test databases, mock Composio client, `AGENTIS_MOCK_RUNTIME=1`, `AGENTIS_MOCK_COMPOSIO=1`, seeded toolkit metadata for Slack, Gmail, Google Drive, GitHub, and Airtable. Live Composio manual verification requires `COMPOSIO_API_KEY` and `COMPOSIO_REDIRECT_BASE_URL`.
  
- Known risks: Composio SDK API drift, OAuth callback requirements during local development, toolkit version pinning, large or sensitive tool payloads, prompt-based toolkit intent false positives, and permission re-check gaps.
  
- Blocking open questions: None. Build should verify the installed Composio SDK typings before implementing live adapter calls.
  
## Open questions
- None.

## Build completion report

- **Spec path:** `docs/specs/2026-05-21-m03-composio-integrations-tool-access.md`
- **Base SHA:** `aa63db88b5a8ddeb29ea66245dc8342e19a189f4`
- **Final head SHA:** `aa63db88b5a8ddeb29ea66245dc8342e19a189f4` (implementation uncommitted on branch `gannonhall/m03-compsio`)
- **Execution mode:** Single-agent path; independent subagent spec/code review was not performed.

### Tasks completed

| Phase | Summary |
| ----- | ------- |
| 1 | Shared Zod DTOs, Drizzle tables/migration, repositories, seeds, config |
| 2 | Composio adapter (mock + live), integration and tool-grant API routes, runtime health |
| 3 | API-backed Integrations page and hooks |
| 4 | Thread tool-access picker, grants API client, composer chips |
| 5 | Run executor Composio bridge, preflight remediation, timeline metadata |
| 6 | Playwright E2E (mock GitHub connect/grant/execute + Slack remediation), `.env.example` |

### Verification results

| Command | Result |
| ------- | ------ |
| `pnpm --filter @workspace/shared test` | Pass |
| `pnpm --filter api test` (15) | Pass |
| `pnpm --filter web test` (22) | Pass |
| `pnpm typecheck` | Pass |
| `pnpm build` | Pass (after removing unused `DropdownMenuSeparator` import) |
| `pnpm lint` | Pass (1 pre-existing warning in `mockServiceWorker.js`) |
| `pnpm test:coverage` | Pass |
| `pnpm test:e2e` (12 tests) | Pass |

### Approved deviations

- **E2E web port:** Playwright and `dev:e2e` / `preview:e2e` use port **5175** (not 5173) to avoid conflicts with other local Vite apps; `strictPort: true` in Playwright config.
- **Migration 0001:** Removed duplicate index DDL from drizzle-kit output; ordered `integration_toolkits` before `integration_connections`.
- **Pending reconnect:** `startConnection` allows retry when status is `pending` (errors only on `connected`).

### Known follow-up

- Live Composio OAuth/callback not exercised in CI; manual check needs `COMPOSIO_API_KEY` + `COMPOSIO_REDIRECT_BASE_URL`.
- MSW still serves fixture data for some non-thread routes; integrations/thread paths hit the API.
- No git commits were made in this Build session unless the user requests them.

### Spec compliance (self-review)

Implemented scope matches the approved spec: five featured toolkits, connect flow, SQLite metadata, thread grants, curated runtime execution, timeline logging, remediation, mock modes, and server-only secrets. Non-goals (full catalog, agent UI, invocations, production auth) were not expanded.
