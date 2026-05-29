# Agent Native Tooling v1
https://github.com/gannonh/agentis/issues/385

## Status

Implemented as the V1 local demo vertical slice.

## Goal

Add the first demoable Agentis-native tooling vertical slice:

1. Native tool registry.
2. Agent-owned workspace abstraction.
3. Read-only workspace file tools.

The vertical slice should let a user create a thread for the selected agent, have that thread resolve the agent workspace, and ask the agent to inspect workspace files through native tools with visible run timeline evidence.

## Source of truth

- Planning document: `docs/agent-native-tooling.md`
- Roadmap context: `docs/agentis-prd-roadmap.md`
- Existing runtime: `apps/api/src/runtime/run-executor.ts`
- Existing local generated artifact tool: `apps/api/src/artifacts/artifact-tool.ts`
- Existing Composio grant/runtime pattern: `apps/api/src/composio/tool-execution-service.ts`
- New thread selector UI: `apps/web/src/routes/new-thread.tsx`
- Current thread creation API: `apps/api/src/routes/threads.ts`
- Current promotion gate: `apps/api/src/agents/agent-promotion-service.ts`

## Verified current state

Agentis already has the runtime mechanics needed to execute native tools:

- AI SDK `streamText({ tools })` runs tools in `RunExecutor`.
- Assistant messages can persist `tool-call` and `tool-result` parts.
- Run steps can persist `tool-call`, `tool-result`, and `error` steps.
- The run status model includes `tool-calling`.
- `createArtifact` is a local native tool that writes generated content to artifact storage.
- Composio tools provide a working pattern for scoped tool availability, preflight remediation, and timeline payload normalization.

Pre-implementation gaps captured by this spec:

- No native tool registry.
- No workspace table or backend abstraction.
- No `workspaceId` on threads.
- `/threads/new` has a mocked agent selector, but the selected agent is not passed to the API.
- `POST /api/threads` creates plain threads without `agentId`.
- Promotion currently blocks any thread with `thread.agentId`; this needs to become a generic-Agentis-only rule.
- No read/list/search file tools.
- Run timeline has Composio-specific formatting but no structured native tool rendering.

## Approved approach

Build a foundation vertical slice.

Scope includes:

- Built-in generic Agentis agent.
- One default workspace per agent.
- Thread creation under the selected agent.
- `thread.workspaceId` resolution in runtime.
- Native tool registry.
- Local filesystem workspace backend.
- Read-only file tools: list, read, and search.
- Generic native tool timeline rendering.
- Promotion visibility/gating based on whether the thread belongs to the generic Agentis agent.

Scope excludes:

- File writes.
- Patch application.
- Command execution.
- Package installation.
- Network access from native tools.
- Containers, VMs, Cloudflare, object storage, or external sandbox backends.
- Workspace copy during thread-to-agent promotion, beyond documenting the intended behavior.
- Approval gates, except as documented future work for mutating tools.

## Product model

Agentis should model workspace ownership through agents.

```text
Agent
  has one default Workspace

Workspace
  belongs to one Agent
  stores durable working state

Thread
  belongs to one Agent
  belongs to that Agent's Workspace

Run
  resolves native tools through Thread -> Workspace
```

### Agent

- Owns one default workspace for this slice.
- Carries default capabilities.
- The generic Agentis assistant is a real built-in agent with its own workspace.
- Custom agents get a workspace at creation time.

### Workspace

- Durable working state for an agent.
- Mental model: an agent's home.
- Owns many threads or sessions.
- Has one backend type and backend reference.
- Initially backed by local filesystem storage.
- Persists with the agent lifecycle.

### Thread

- A chat session with an agent.
- Belongs to one agent.
- Belongs to that agent's workspace.
- Uses the capabilities of its agent, subject to thread-level scoping.

### Generic Agentis threads and promotion

Threads started from `/threads/new` should belong to the agent selected in the composer.

- Selecting Agentis creates a thread owned by the built-in generic Agentis agent and its default workspace.
- Selecting a custom agent creates a thread owned by that agent and its workspace.
- Only threads owned by the generic Agentis agent can be converted into a new agent.
- Threads started from a full agent stay with that agent and cannot be moved to another agent or used to create a different agent.

When a generic Agentis thread becomes a new agent, later work should create the new agent workspace from relevant source thread workspace state. This slice only needs the data model and gating needed to support the rule.

## Data model

### `workspaces`

Add a table for agent-owned workspaces.

Fields:

- `id` text primary key.
- `agent_id` text not null, references `agents.id`.
- `name` text not null.
- `backend_type` text not null, initially `local-fs`.
- `backend_ref` text not null, initially a relative storage key or directory reference.
- `status` text not null, initially `active`; future value `archived`.
- `created_at` text not null.
- `updated_at` text not null.

Indexes:

- Unique default workspace per agent for this slice. This can be modeled with a unique index on `agent_id` while the product has a one-to-one agent-workspace relationship.
- Index on status if archived filtering becomes necessary.

### Default workspace resolution

Use the unique `workspaces.agent_id` relationship as the default workspace source for this slice. Do not add `agents.default_workspace_id` yet. The one-to-one model keeps migration and repository logic simple while preserving a clear place to introduce explicit default workspace selection if Agentis later supports multiple workspaces per agent.

### `threads.workspace_id`

Add `workspace_id` to `threads`.

Rules:

- New threads always have `agent_id` and `workspace_id`.
- Existing plain threads are backfilled to the generic Agentis agent and workspace.
- Agent test threads use that agent's default workspace.
- Follow-up runs inherit the existing thread's workspace.

### Built-in generic Agentis agent

Seed a built-in generic Agentis agent idempotently.

Suggested stable id:

```text
agent_agentis
```

Suggested workspace id can be deterministic or generated and stored. If deterministic, use a clear prefix such as:

```text
workspace_agentis
```

Seed behavior:

- Ensure the generic agent exists.
- Ensure the generic workspace exists.
- Ensure the generic workspace belongs to the generic agent.
- Backfill existing threads without `agent_id` to the generic agent.
- Backfill existing threads without `workspace_id` to their agent's default workspace.

## Local workspace layout

Initial local backend layout:

```text
AGENTIS_STORAGE_ROOT/
  workspaces/
    {workspaceId}/
      files/
      artifacts/
      runtime/
      workspace.sqlite
```

For this slice, read-only tools operate under:

```text
AGENTIS_STORAGE_ROOT/workspaces/{workspaceId}/files/
```

The `artifacts/`, `runtime/`, and `workspace.sqlite` locations are reserved for later vertical slices. Do not couple read-only tools to those reserved paths.

## Backend architecture

### Workspace repository

Candidate path:

```text
apps/api/src/repositories/workspace-repository.ts
```

Responsibilities:

- Create a default workspace for an agent.
- Get workspace by id.
- Get default workspace by agent id.
- Update workspace status.
- Support idempotent seed/backfill workflows.

### Workspace service

Candidate path:

```text
apps/api/src/workspaces/workspace-service.ts
```

Responsibilities:

- Resolve a workspace for a thread.
- Ensure local workspace directories exist.
- Provide a `WorkspaceHandle` for tools.
- Normalize and validate paths under the workspace `files/` root.
- Enforce read bounds and binary detection.
- Provide list, read, and search operations.

Candidate interface:

```ts
type WorkspaceHandle = {
  id: string
  rootLabel: string
  list(path: string): Promise<WorkspaceEntry[]>
  readText(path: string): Promise<WorkspaceFileRead>
  search(input: WorkspaceSearchInput): Promise<WorkspaceSearchResult[]>
}
```

### Native tool registry

Candidate path:

```text
apps/api/src/native-tools/
```

Responsibilities:

- Register native tools by stable name.
- Store descriptions and input schemas near implementation.
- Build an AI SDK-compatible tool map for a run and workspace.
- Normalize native run step payloads.
- Keep native tools separate from Composio tools while allowing both to be merged in `RunExecutor`.

Suggested tool names:

- `listWorkspaceFiles`
- `readWorkspaceFile`
- `searchWorkspaceFiles`

Native run step payload shape:

```ts
type NativeToolRunStepPayload = {
  provider: "native"
  toolName: string
  workspaceId: string
  input?: unknown
  output?: unknown
  error?: string
  code?: string
}
```

## Read-only file tools

### `listWorkspaceFiles`

Purpose: list files and directories under a workspace path.

Input:

- `path` optional string, defaults to workspace root.
- `recursive` optional boolean, defaults to false for this slice.
- `limit` optional number, bounded by server config.

Output:

- Entries with name, path, type, size when known, and modified time when available.
- `truncated` boolean when limits are hit.

### `readWorkspaceFile`

Purpose: read a text file from the workspace.

Input:

- `path` required string.
- Optional `maxBytes` or `maxChars`, bounded by server config.

Output:

- `path`.
- `content`.
- `bytesReturned`.
- `totalBytes`.
- `truncated` boolean.

Failures:

- Directory path.
- Missing file.
- Binary file.
- File too large when safe truncation is not possible.
- Path outside workspace root.

### `searchWorkspaceFiles`

Purpose: search text files in the workspace.

Input:

- `query` required string.
- `path` optional string, defaults to workspace root.
- `limit` optional number, bounded by server config.

Output:

- Matching paths with snippets and line numbers when available.
- `truncated` boolean when result limits are hit.

Implementation note: a simple local search is sufficient for the first slice. Do not add a search index unless needed after the vertical slice is working.

## Runtime integration

Update `RunExecutor` flow:

1. Load run.
2. Load thread.
3. Resolve workspace from `thread.workspaceId`.
4. Build native tools through `NativeToolRegistry` and `WorkspaceService`.
5. Build Composio tools through existing grant service.
6. Merge native and Composio tools.
7. Stream model output with the merged tool map.
8. Persist native tool calls and results as message parts and run steps.

Tool step finalization should recognize native payloads by `provider: "native"` and preserve clear titles such as:

- `Native: listWorkspaceFiles`
- `Native: readWorkspaceFile`
- `Native: searchWorkspaceFiles`

If workspace resolution fails before model execution, fail the run loudly with a run step and assistant-visible error.

## Frontend integration

### `/threads/new`

Current state:

- `AgentPicker` stores `selectedAgentId`.
- `ThreadComposer` does not receive or submit `selectedAgentId`.

Required changes:

- Pass selected agent id into `ThreadComposer`.
- Extend create-thread API request schema and client payload with `agentId`.
- Treat the default picker value as the built-in generic Agentis agent.
- For selected custom agents, create the thread with the selected agent's id.

### Thread detail promotion action

Current state:

- UI shows “Create agent from thread” when `thread.agentId` is falsy.
- Backend promotion service blocks when `thread.agentId` is truthy.

Required changes:

- UI shows promotion only when `thread.agentId` is the generic Agentis agent id.
- Backend allows promotion only when `thread.agentId` is the generic Agentis agent id.
- Backend rejects promotion for full-agent threads.

### Run timeline

Add generic native tool rendering to `RunTimeline`:

- Provider: Native.
- Tool name.
- Workspace id or label when useful.
- Path/query from sanitized input.
- Error code/message when failed.
- Bounded output summary.

Do not render full large file contents in the timeline.

## Data flows

### Thread creation from `/threads/new`

```text
User selects agent
User submits prompt
Web sends { prompt, mode, model, projectId?, agentId }
API resolves selected agent
API resolves selected agent default workspace
API creates thread with agentId + workspaceId
API creates initial user message, queued run, queued step
```

### Run execution

```text
RunExecutor loads run
RunExecutor loads thread
RunExecutor loads thread.workspaceId
WorkspaceService opens workspace handle
NativeToolRegistry builds read-only tools for workspace
Composio service builds granted external tools
RunExecutor streams with merged tool map
Tool calls/results persist as message parts and run steps
```

### Read-only tool call

```text
Model calls readWorkspaceFile({ path })
Tool validates path inside workspace root
Tool checks file type and size limits
Tool returns bounded content/metadata
Run timeline stores normalized payload
Assistant summarizes result
```

## Error handling and constraints

### Workspace resolution

- Missing thread: preserve existing run-not-found/thread-not-found behavior.
- Thread without workspace after migration: fail loudly with `workspace_not_found` unless the backfill path can repair it safely before the run starts.
- Agent without default workspace: create one idempotently when possible, otherwise fail with `workspace_not_configured`.
- Archived workspace: block new runs with a clear error.

### Path safety

- Normalize all paths relative to workspace `files/`.
- Reject absolute paths.
- Reject `..` traversal.
- Reject symlink escape.
- Reject directories for `readWorkspaceFile`.

### Read limits

- Text files only for the first slice.
- Reject or summarize binary files.
- Truncate large files with returned bytes, total bytes, and `truncated` metadata.
- Bound search result count and snippet length.

### Tool failures

Tool errors should create failed run steps with:

- `provider: "native"`
- `toolName`
- path or query
- code
- message

Tool errors should not silently fall back. The assistant should receive enough error detail to explain the issue.

### Security constraints

- No writes.
- No shell commands.
- No package installs.
- No network access from native tools.
- No access outside the workspace root.

## Implementation phases

### Phase 1: Workspace data model and generic Agentis seed

Likely files:

- `packages/shared/src/schemas.ts`
- `packages/shared/src/schemas.test.ts`
- `apps/api/src/db/schema.ts`
- `apps/api/drizzle/`
- `apps/api/src/repositories/workspace-repository.ts`
- `apps/api/src/repositories/index.ts`
- `apps/api/src/repositories/agent-repository.ts`
- `apps/api/src/repositories/thread-repository.ts`

Tasks:

- Add workspace schemas and types.
- Add `workspaces` table.
- Add `threads.workspace_id`.
- Seed generic Agentis agent and workspace idempotently.
- Backfill existing threads.
- Ensure agent creation provisions a workspace.

Acceptance:

- Every new thread has `agentId` and `workspaceId`.
- Every agent has one default workspace.
- Existing tests are updated for the new invariants.

### Phase 2: New thread agent selection and promotion gate

Likely files:

- `packages/shared/src/schemas.ts`
- `apps/api/src/routes/threads.ts`
- `apps/api/src/routes/agents.ts`
- `apps/api/src/agents/agent-promotion-service.ts`
- `apps/web/src/routes/new-thread.tsx`
- `apps/web/src/components/new-thread/thread-composer.tsx`
- `apps/web/src/lib/api/client.ts`
- `apps/web/src/routes/thread-detail.tsx`

Tasks:

- Add `agentId` to create-thread request.
- Pass selected agent id from `/threads/new` to thread creation.
- Resolve Agentis selector to the built-in generic agent.
- Create custom-agent threads under the selected agent and workspace.
- Show promotion action only for generic Agentis threads.
- Backend blocks promotion for full-agent threads.

Acceptance:

- Creating a generic thread links it to the generic Agentis agent/workspace.
- Creating a selected-agent thread links it to that agent/workspace.
- Promotion appears only for generic Agentis threads.

### Phase 3: Workspace service and local filesystem backend

Likely files:

- `apps/api/src/workspaces/workspace-service.ts`
- `apps/api/src/workspaces/local-workspace-backend.ts`
- `apps/api/src/config.ts`
- `apps/api/src/config.test.ts`

Tasks:

- Add workspace directory resolution under `AGENTIS_STORAGE_ROOT`.
- Add path jail helpers.
- Add list/read/search operations.
- Add binary detection and truncation bounds.
- Add tests for traversal, symlink escape, binary rejection, and truncation.

Acceptance:

- Workspace service can list, read, and search seeded files.
- Unsafe paths fail loudly.
- Large results are bounded.

### Phase 4: Native tool registry and read-only tools

Likely files:

- `apps/api/src/native-tools/index.ts`
- `apps/api/src/native-tools/read-only-workspace-tools.ts`
- `apps/api/src/runtime/run-executor.ts`
- `apps/api/src/runtime/run-executor.test.ts`

Tasks:

- Add native tool registry.
- Register `listWorkspaceFiles`, `readWorkspaceFile`, and `searchWorkspaceFiles`.
- Wire registry into `RunExecutor`.
- Normalize native tool payloads.
- Add runtime tests for native tool inclusion and persisted tool output.

Acceptance:

- Runtime exposes read-only tools for workspace-backed threads.
- Tool calls persist message parts and run steps.
- Missing workspace fails loudly.

### Phase 5: Web timeline rendering and demo fixture

Likely files:

- `apps/web/src/components/thread/run-timeline.tsx`
- `apps/web/src/routes/thread-detail.test.tsx`
- `apps/web/src/routes/new-thread.test.tsx`
- API test setup or debug seed files if needed.

Tasks:

- Render native tool metadata in the timeline.
- Add tests for native payload display.
- Add a deterministic way to seed demo workspace files for local/manual testing.

Acceptance:

- User can see native read/list/search tool calls in the run timeline.
- Manual demo can inspect seeded workspace files.

## Testing and verification

Commands:

```bash
pnpm --filter @workspace/shared test
pnpm --filter api test
pnpm --filter web test
pnpm typecheck
pnpm build
pnpm lint
```

Targeted tests:

- Shared schemas parse workspace DTOs and thread `workspaceId`.
- Agent creation creates a workspace.
- Generic Agentis seed is idempotent.
- Thread creation links selected agent and workspace.
- Workspace path jail blocks traversal and absolute paths.
- Workspace read rejects binary files.
- Workspace read truncates large text files with metadata.
- Workspace search respects result limits.
- Runtime includes native tools for workspace-backed threads.
- Runtime persists native tool results.
- `/threads/new` sends selected agent.
- Promotion action is visible only for generic Agentis threads.
- Run timeline renders native tool payloads.

Manual UAT:

1. Seed or create a workspace file for the generic Agentis workspace.
2. Start a new Agentis thread from `/threads/new`.
3. Ask: “What files are in your workspace?”
4. Confirm the assistant calls `listWorkspaceFiles` or `readWorkspaceFile`.
5. Confirm the timeline shows the native tool call.
6. Reload the thread and confirm message parts and run steps persist.
7. Create a thread from a full agent and confirm the promotion action is hidden.

## Risks and mitigations

### Workspace data migration touches core tables

Risk: threads, agents, and runs are foundational. Migration mistakes can break existing flows.

Mitigation: backfill to the generic Agentis agent/workspace and add repository tests around old plain-thread assumptions.

### Selector UI currently uses fixture agents

Risk: selected agent ids may not correspond to API agents.

Mitigation: for this slice, support the built-in Agentis id and API-backed agent ids. If fixture-only agents remain visible, disable or clearly mark them until API-backed selection is available.

### Tool output can bloat messages and run steps

Risk: reading files can persist too much content.

Mitigation: enforce strict byte/char limits and store bounded summaries in run steps.

### Local filesystem behavior varies

Risk: symlinks, permissions, and binary detection can be inconsistent.

Mitigation: implement conservative validation, fail loudly on uncertain cases, and test path traversal and symlink escape.

### Model may not call read tools reliably in mock runtime

Risk: deterministic CI may not exercise real tool calling.

Mitigation: unit-test tool construction and execution directly. Add targeted runtime tests with AI SDK mock behavior where practical. Manual UAT can use a real model key.

## Explicitly deferred work

- File creation, edits, and patch application.
- Approval gates for mutating operations.
- Shell or command execution.
- Script containers.
- Persistent VM backend.
- Cloudflare, Postgres, object storage, or external sandbox backends.
- Workspace copy/fork behavior during promotion.
- Multi-workspace-per-agent UX.
- Native tool grants UI beyond existing agent/thread capability assumptions.
- Rich transcript rendering for full tool result bodies.

## Build handoff

Approved scope:

- Implement the foundation vertical slice for native tooling: registry, agent-owned workspace abstraction, selected-agent thread creation, and read-only file tools.

Non-goals:

- No writes, command execution, VM/container runtime, or production backend integration.

Ordered phases:

1. Workspace data model and generic Agentis seed.
2. New thread agent selection and promotion gate.
3. Workspace service and local filesystem backend.
4. Native tool registry and read-only tools.
5. Web timeline rendering and demo fixture.

Required verification:

- Shared, API, and web tests for the new model and tool behavior.
- Full `pnpm typecheck`, `pnpm build`, and `pnpm lint` before completion.
- Manual UAT demonstrating a thread inspecting workspace files.

Blocking decisions:

- If fixture picker agents cannot map to API agents cleanly, disable non-API picker options for this slice or replace them with API-backed options.
- If the existing promotion flow requires workspace copy to preserve current behavior, keep promotion gating in this slice and defer workspace copy behind an explicit follow-up task.
