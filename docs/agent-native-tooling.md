# Agent Native Tooling PRD and Roadmap

## Purpose

Define the product direction, capability roadmap, and implementation references for Agentis-native agent tooling.

Agentis-native tooling covers capabilities that run inside the Agentis runtime, separate from Composio-backed external integrations. This includes workspace context, file inspection, file editing, command execution, sandboxing, approvals, documents, tables, browser/research tools, media tools, and tool observability.

## Product goal

Give every Agentis agent a durable workspace and a growing set of native tools so it can inspect, create, transform, and operate on its own working state. The first priority is a demoable workspace-backed read-only tooling slice. Later initiatives should move Agentis toward equivalent coverage for the Hyperagent native tool inventory.

## Roadmap

### ✅ V1: Workspace-backed read-only tools

Spec: `docs/specs/2026-05-29-agent-native-tooling-design.md`

Status: V1 vertical slice implemented for local demo and verification.

Goal: create the first demoable native tooling vertical slice by wiring selected-agent thread creation, agent-owned workspaces, a native tool registry, and read-only workspace file tools.

Scope:

- Built-in generic Agentis agent with a default workspace.
- One default workspace per custom agent.
- `/threads/new` creates threads under the selected agent and workspace.
- `thread.workspaceId` resolves workspace state at runtime.
- Native tool registry merges read-only native tools into `RunExecutor`.
- Local filesystem workspace backend under `AGENTIS_STORAGE_ROOT`.
- `listWorkspaceFiles`, `readWorkspaceFile`, and `searchWorkspaceFiles`.
- Generic native tool rendering in the run timeline.
- Promotion gating so only generic Agentis threads can become new agents.

Out of scope:

- File writes, patch application, command execution, package installation, VM/container runtime, production backends, and workspace copy during promotion.

Acceptance:

- A user can create a thread, ask the agent to inspect workspace files, and see native tool calls/results in persisted thread state and the run timeline.

### ✅ V2: Safe file edits

Spec: `[docs/specs/2026-05-30-agent-native-tooling-v2-safe-file-edits.md](specs/2026-05-30-agent-native-tooling-v2-safe-file-edits.md)`

Plan: `[.cursor/plans/V2 Safe File Edits-c58edf88.plan.md](../.cursor/plans/V2%20Safe%20File%20Edits-c58edf88.plan.md)`

Status: V2 vertical slice implemented for local demo and verification.

Goal: agents can create and edit workspace files under policy.

Scope:

- File create and replace tools.
- Patch application.
- Approval or policy gates.
- Changed-file summaries and timeline UI.
- Audit-friendly edit metadata.

### ✅ V3: Sandboxed execution

Plan: `[.cursor/plans/V3 Sandboxed Execution-eda6664c.plan.md](../.cursor/plans/V3%20Sandboxed%20Execution-eda6664c.plan.md)`

Decision record: `[docs/adr/0001-sandboxed-workspace-execution.md](adr/0001-sandboxed-workspace-execution.md)`

Status: V3 vertical slice implemented for local demo and verification.

Goal: agents can run bounded commands or scripts against a workspace.

Scope:

- Sandbox/runtime backend abstraction.
- Command or script execution tool.
- Abort, timeout, stdout/stderr limits, and exit-code capture.
- Changed-file detection after execution.
- Container or process backend for local development.
- `runWorkspaceCommand` accepts either `{ kind: "command"; command; cwd? }` or

  `{ kind: "script"; language: "python" | "node"; code; cwd? }`.
- `plan` mode records pending execution rows and waits for user approval; `agent`
  mode runs immediately, subject to policy.
- Execution provenance is stored in `workspace_executions` with sanitized input,
  bounded stdout/stderr, exit status, duration, timeout/abort flags, and changed
  files.
- Production defaults to `AGENTIS_SANDBOX_BACKEND=local-container` when unset;
  development/test defaults to `local-process` for local iteration.
- `AGENTIS_SANDBOX_BACKEND=local-container` runs through the standard `docker`
  CLI/socket against a Docker-compatible runtime. Docker Desktop and OrbStack are
  compatible local examples; ArcBox is future-watch/experimental only and is not
  currently supported.

### V4: Hyperagent capability parity expansion

Goal: adopt or provide equivalents for the remaining Hyperagent native tool inventory.

Scope candidates:

- Research tools: web search, browser, Exa, thread search.
- Data tools: tables and persistent documents.
- Interactive tools: webpages, slides, and HyperApp-style apps.
- Media tools: images, video, audio, transcription, avatars, maps.

(see `Hyperagent native tools inventory` section below)

Notes:

- This is big scope. Each category could span multiple milestones. 
- scope 1 tool per epic/PR (e.g., web search)
- recommend sequencing: 1 tool per category to start

## Current state

### Runtime tool plumbing

Agentis already has the core runtime path needed to execute native tools.

Relevant files:

- `apps/api/src/runtime/run-executor.ts`
- `packages/shared/src/schemas.ts`
- `apps/api/src/repositories/run-step-repository.ts`
- `apps/web/src/components/thread/run-timeline.tsx`

Implemented behavior:

- Uses AI SDK `streamText({ tools })`.
- Persists assistant `tool-call` and `tool-result` message parts.
- Persists run steps for tool calls, tool results, errors, aborts, and completion.
- Supports `tool-calling` run status.
- Merges local native tools with granted Composio tools before model execution.

### Agent-owned workspaces and read-only tools

Implemented files:

- `apps/api/src/repositories/workspace-repository.ts`
- `apps/api/src/workspaces/workspace-service.ts`
- `apps/api/src/native-tools/read-only-workspace-tools.ts`
- `apps/api/src/routes/threads.ts`
- `apps/api/src/runtime/run-executor.ts`
- `apps/web/src/components/thread/run-timeline.tsx`

Implemented behavior:

- Provisions the built-in generic Agentis agent with `workspace_agentis`.
- Provisions one default local filesystem workspace for each created or promoted custom agent.
- Starts `/threads/new` conversations under the selected agent and that agent's workspace.
- Resolves `thread.workspaceId` before model execution and fails loudly when the workspace is missing.
- Exposes `listWorkspaceFiles`, `readWorkspaceFile`, and `searchWorkspaceFiles` to runs as native read-only tools.
- Normalizes paths, blocks traversal, blocks symlink escapes, bounds list/search/read output, rejects binary reads, and reports truncation metadata.
- Persists native tool calls and results as message parts and run steps.
- Renders native tool evidence in the run timeline without full file contents.
- Seeds deterministic demo workspace files through the local debug seed route.

### Safe workspace edits

Implemented files:

- `apps/api/src/native-tools/write-workspace-tools.ts`
- `apps/api/src/workspaces/workspace-edit-service.ts`
- `apps/api/src/repositories/workspace-edit-repository.ts`
- `apps/api/src/workspaces/workspace-tool-approval.ts`
- `apps/web/src/components/thread/run-timeline.tsx`
- `apps/web/src/routes/thread-detail.tsx`

Implemented behavior:

- Exposes `createWorkspaceFile`, `replaceInWorkspaceFile`, and

  `applyWorkspacePatch` as text-only native workspace tools.
- Reuses the workspace path jail and write deny prefixes to keep edits under

  `workspaces/{id}/files/`.
- Records edit audit rows with before/after hashes and changed-file metadata.
- Requires approval in `plan` mode and applies immediately in `agent` mode.
- Renders pending, approved, denied, failed, and completed edit states in the

  run timeline.

### Sandboxed workspace execution

Implemented files:

- `apps/api/src/native-tools/execution-workspace-tools.ts`
- `apps/api/src/native-tools/workspace-execution-schemas.ts`
- `apps/api/src/workspaces/workspace-execution-service.ts`
- `apps/api/src/repositories/workspace-execution-repository.ts`
- `apps/api/src/sandbox/`
- `apps/api/sandbox/Dockerfile`
- `apps/web/src/components/thread/run-timeline.tsx`
- `apps/web/src/routes/thread-detail.tsx`

Implemented behavior:

- Exposes `runWorkspaceCommand` for bounded shell commands and short Python or
  Node scripts in the current workspace.
- Resolves optional `cwd` through the workspace path jail before execution.
- Uses `local-process` by default for local development/test and defaults to
  `local-container` in production when unset. It also supports `local-container`
  through the standard `docker` CLI/socket when configured.
- Materializes script input under the workspace runtime tree and keeps changed

  file detection scoped to the workspace `files/` tree.
- Captures pre/post workspace snapshots and reports created, modified, and

  deleted files up to configured limits.
- Enforces timeout, abort propagation, stdout/stderr truncation, and optional

  command substring deny patterns.
- Persists execution audit rows with status, approval mode, sanitized input,

  result summaries, changed files, and timestamps.
- Requires approval in `plan` mode and executes immediately in `agent` mode.
- Renders exit code, duration, stdout/stderr previews, timeout/abort badges,

  changed files, and approval states in the run timeline.

### Existing native runtime tools

#### `getWorkspaceSummary`

File: `apps/api/src/runtime/get-workspace-summary.ts`

Returns a static/demo summary of the Agentis workspace. It is useful as an M02-era runtime smoke test, but it does not inspect real workspace state or files.

#### `createArtifact`

File: `apps/api/src/artifacts/artifact-tool.ts`

Lets the model create a durable text artifact linked to the current run, thread, project, and Library.

Supporting files:

- `apps/api/src/artifacts/artifact-service.ts`
- `apps/api/src/artifacts/local-artifact-storage.ts`
- `apps/api/src/repositories/artifact-repository.ts`
- `apps/api/src/routes/artifacts.ts`

Implemented behavior:

- Accepts title, type, filename, content, description, and preview text.
- Writes generated content to local artifact storage under `AGENTIS_STORAGE_ROOT`.
- Persists artifact metadata in SQLite.
- Links generated artifacts to provenance where available.
- Logs artifact creation in the run timeline.

### Native context assembly

Relevant files:

- `apps/api/src/runtime/run-context.ts`
- `apps/api/src/projects/project-context-service.ts`

Implemented behavior:

- Injects source workflow context into run prompts.
- Injects project goals and enabled project memories into run prompts.
- Adds reasoning steps when context is loaded.

This is not exposed as a callable tool, but it is a native agent capability.

## Current boundaries

Native tooling currently includes agent-owned local workspaces, selected-agent thread creation, workspace-aware path resolution, read-only file listing, read-only file reading, read-only file search, safe text file creation/replacement/patching, bounded command and script execution, workspace action approvals, changed-file detection, native runtime tool wiring, persisted native tool evidence, and concise native timeline rendering.

Native tooling does not currently include:

- Native tool grants or policy controls.
- External or production workspace storage backends.
- Workspace copy during promotion.
- Thread transcript rendering for tool-call or tool-result message parts.

Local-process execution is a developer convenience, not a production isolation

boundary. Local-container execution improves local isolation with Docker runtime

controls, but production-grade sandboxing remains future work.

The artifact storage layer is a local file-backed storage implementation, but it is not a workspace filesystem interface for agents.

## Existing tool and persistence model

### Shared schemas

File: `packages/shared/src/schemas.ts`

Current tool-related primitives:

- Message part types:
  - `tool-call`
  - `tool-result`
- Run step types:
  - `tool-call`
  - `tool-result`
  - `error`
- Run status:
  - `tool-calling`

These schemas are generic enough to support native tools, but current UI formatting is mostly Composio-specific.

### Run timeline

File: `apps/web/src/components/thread/run-timeline.tsx`

Current behavior:

- Renders step title, type, and status for all run steps.
- Has special formatting for Composio and native workspace payloads.
- Renders native workspace evidence with path/query, workspace id, status,

  approval state, changed files, exit code, duration, timeout/abort flags, and

  bounded output summaries.
- Keeps full file contents out of timeline evidence.
- Provides a `Debug mode` toggle that shows persisted model input/output in development builds, including system prompt, messages, workspace binding, assistant parts, usage, errors, and tool metadata.
- Keeps debug `tools` as a compact tool-name list and stores full `toolDetails` with name, description, serializable input schema details, and execution availability in development builds; production builds do not persist or expose these debug payloads.

### Thread transcript

File: `apps/web/src/routes/thread-detail.tsx`

Current behavior:

- Renders text parts from assistant and user messages.
- Does not render tool-call or tool-result message parts directly.

## Composio relationship

Composio integration is implemented as external tool access, not native tooling.

Relevant files:

- `apps/api/src/composio/tool-execution-service.ts`
- `apps/api/src/composio/tool-catalog.ts`
- `apps/api/src/routes/tool-grants.ts`
- `apps/web/src/components/thread/tool-access-picker.tsx`

Useful patterns to reuse:

- Preflight remediation before model execution.
- Tool availability scoped to a thread or agent.
- Runtime tool construction from persisted grants.
- Run step payload normalization.
- Explicit connection or grant errors surfaced to the user.

## Workspace ownership model

Agentis should model workspace ownership through agents, not projects.

### Agent

- Owns workspaces.
- Every agent is provisioned with one default workspace for now.
- Capabilities are scoped first at the agent level, then narrowed or extended at the thread level.
- The generic Agentis assistant should be represented as a real built-in agent with its own default workspace.

### Workspace

- Durable working state for an agent.
- Mental model: an agent's home.
- Owns many threads or sessions.
- Has one storage/runtime backend.
- Initially backed by a filesystem directory with durable files, local SQLite data, artifacts, and a process runtime for code or commands.
- Later backed by pluggable production storage/runtime implementations such as containers, VMs, Cloudflare, Postgres, object storage, or external sandbox providers.
- Persists with the agent lifecycle. Archiving an agent archives its workspace.

### Thread

- A chat session with an agent.
- Belongs to one agent.
- Belongs to that agent's workspace.
- Uses the capabilities of its agent, subject to thread-level scoping.

### Generic Agentis threads and agent creation

Threads started from `/threads/new` belong to the agent selected in the composer. Selecting Agentis creates a thread owned by the built-in generic Agentis agent and its default workspace. Selecting a custom agent creates a thread owned by that agent and its workspace.

Only threads owned by the generic Agentis agent can be converted into a new agent. When this happens, the new agent receives its own default workspace. Workspace state copy from the source thread remains future work.

Threads started from a full agent stay with that agent. They cannot be moved to another agent or used to create a different agent.

## Hyperagent native tools inventory

This inventory records the native tooling in Hyperagent, the platform Agentis is using as a product reference. Treat it as a target capability map: Agentis should adopt each tool directly, provide an equivalent native capability, or explicitly defer it.

### Execution

- **Script:** Run Python or JavaScript code in an isolated container. Fast startup, with no state persisted between runs.
- **Full VM:** Persistent virtual machine. Install packages, save files, and maintain state across conversations.

### Research

- **Exa:** Enable Exa.ai semantic search and related tools.
- **Search:** Search the web for information using SDK web search. Supports native and Exa-backed modes.
- **Browser:** Control a real browser with AI-powered automation. Click, type, scroll, and take screenshots. Persistent sessions are still an explicit capability question.
- **Find Similar:** Find pages semantically similar to a given URL. Useful for competitive analysis and content curation.
- **Exa Answer:** Get direct answers to questions with source citations.
- **Exa Research:** Deep multi-source research with structured output. Takes 1-3 minutes and returns comprehensive results.
- **Exa Websets:** Build structured datasets with entity verification and custom field extraction. Useful for lead generation and research.
- **Thread Search:** Search past conversations for context and decisions.

### Data

- **Tables:** Create, update, and query structured data tables. Useful for research, comparisons, and tracking. Global tables across threads are still an explicit capability question.
- **Documents:** Create and update persistent documents that can be shared across threads and evolve over time.

### Interactive

- **Webpages and Slides:** Generate styled webpages and slide presentations.
- **Slides:** Create slide presentations. Polished mode uses AI to render each slide as a visual.
- **HyperApps:** Create interactive HyperApps with custom UI, persistent state, and direct tool access. Supports forms, wizards, and visual tools.

### Media

- **Images:** Generate and edit images using Google's Gemini models. Supports image editing and style transfer.
- **Video:** Generate short video clips with native audio. Supports image-to-video, style guidance, and video extension.
- **Audio:** Generate speech or multi-speaker dialogue using Google's Gemini TTS.
- **Transcribe:** Transcribe audio files with speaker diarization, timestamps, and emotion detection. Uses fast cloud-based processing.
- **Avatar:** Create videos of AI avatars speaking a script. Useful for presentations.
- **Maps:** Geocoding, places search, directions, distance calculations, and interactive map visualization.

Source note: inventory copied from the Hyperagent agent tools section screenshot provided during planning.

## V1 and follow-on implementation notes

Authoritative V1 design: `docs/specs/2026-05-29-agent-native-tooling-design.md`.

The notes below summarize the V1 architecture and adjacent follow-on capabilities.

### 1. Native tool registry

Create a small server-side registry for Agentis-native tools.

Candidate responsibilities:

- Register native tools by stable name.
- Store descriptions and input schemas near implementation.
- Build the runtime tool map for a run.
- Normalize run step payloads for native tools.
- Separate native tools from Composio tools while allowing both in `RunExecutor`.

Candidate path:

- `apps/api/src/native-tools/`

### 2. Workspace abstraction

Define workspace as an agent-owned durable home that threads run inside.

Initial local layout:

```text
AGENTIS_STORAGE_ROOT/
  workspaces/
    {workspaceId}/
      files/
      artifacts/
      runtime/
      workspace.sqlite
```

Candidate model:

```ts
type Workspace = {
  id: string
  agentId: string
  backendType: "local-fs" | "container" | "vm" | "cloudflare" | "postgres" | "object-store"
  backendRef: string
  status: "active" | "archived"
}

type WorkspaceHandle = {
  id: string
  rootLabel: string
  readText(path: string): Promise<string>
  list(path: string): Promise<WorkspaceEntry[]>
  search(query: string): Promise<WorkspaceSearchResult[]>
  writeText(path: string, content: string): Promise<void>
  applyPatch(patch: string): Promise<ApplyPatchResult>
}
```

Implementation constraints:

- Native tools resolve workspace through `thread.workspaceId`.
- Projects can organize threads and contribute context, but do not own workspaces.
- The built-in generic Agentis agent owns the default workspace for general threads.
- Full agents own their default workspace and all threads created from them.
- Only generic Agentis threads can be converted into new agents.
- Path resolution must prevent access outside the workspace root.

### 3. Read-only file tools

Ship read-only tools before mutating tools.

Candidate tools:

- `listWorkspaceFiles`
- `readWorkspaceFile`
- `searchWorkspaceFiles`

Acceptance criteria:

- Tools only access files under an allowed workspace root.
- Large files are bounded and return clear truncation metadata.
- Binary files are detected and rejected or summarized safely.
- Run timeline shows file path, action, status, and bounded output metadata.
- Tool results are persisted as message parts and run steps.

### 4. Mutating file tools

Add file mutation after read-only flows are stable.

Candidate tools:

- `createWorkspaceFile`
- `replaceInWorkspaceFile`
- `applyWorkspacePatch`

Acceptance criteria:

- Mutations require explicit policy or approval.
- Tools validate paths and avoid writes outside the workspace root.
- Patch failures fail loudly with actionable errors.
- Successful edits log changed paths and summary metadata.
- The UI makes pending, approved, failed, and completed edits visible.

### 5. Command execution

Command execution exists as the V3 local vertical slice. Treat the implementation

as a bounded local developer runtime, not as the final production sandbox.

Implemented tool:

- `runWorkspaceCommand`

Acceptance criteria:

- Commands run in a sandbox or constrained execution environment.
- Long-running commands can be aborted.
- Output is bounded and persisted safely.
- Exit code, duration, stdout, and stderr appear in run steps.
- Destructive commands require approval or are blocked by policy.
- The local container backend builds from `apps/api/sandbox/Dockerfile`, mounts

  workspace `files/` at `/workspace`, mounts generated runtime scripts read-only

  at `/runtime-scripts`, disables networking, drops Linux capabilities, prevents

  privilege escalation, uses a read-only root filesystem, and applies CPU,

  memory, PID, and `/tmp` tmpfs limits.
- Run `pnpm smoke:sandbox-container` to build the local sandbox image and verify

  command execution, Python and Node scripts, persisted `/workspace` writes,

  timeout handling, and the active Docker context.

### 6. UI rendering for native tools

Improve generic tool visibility.

Candidate updates:

- Render native tool payloads in `RunTimeline`.
- Render tool-call and tool-result parts in thread messages.
- Show changed files, outputs, and approval states clearly.
- Add copy/download actions for structured tool outputs when useful.

## Open product questions

- Should native file tooling operate on workspace files, uploaded Library artifacts, Git repositories, or all three?
- Should file edits create new artifacts, modify workspace files, or both depending on tool choice?
- Should native tools be grantable per thread and agent like Composio tools?
- Should every native tool call be replayable or exportable for audit?
- Should agent-created files be versioned?
- What production sandbox backend should replace or harden the local developer

  backends?
- When converting a generic Agentis thread into a new agent, which workspace state should be copied into the new agent workspace?

## Build sequencing summary

1. **V1: Workspace-backed read-only tools**: selected-agent workspace flow and read-only file tools are implemented.
2. **V2: Safe file edits**: mutating workspace tools with approval and audit metadata are implemented.
3. **V3: Sandboxed execution**: bounded command/script execution with local-process and optional local-container backends is implemented.
4. **V4: Capability parity expansion**: adopt or provide equivalents for the remaining Hyperagent tools by category.

## Reference files

- `apps/api/src/runtime/run-executor.ts`
- `apps/api/src/runtime/get-workspace-summary.ts`
- `apps/api/src/artifacts/artifact-tool.ts`
- `apps/api/src/artifacts/artifact-service.ts`
- `apps/api/src/artifacts/local-artifact-storage.ts`
- `apps/api/src/runtime/run-context.ts`
- `apps/api/src/native-tools/execution-workspace-tools.ts`
- `apps/api/src/workspaces/workspace-execution-service.ts`
- `apps/api/src/repositories/workspace-execution-repository.ts`
- `apps/api/src/sandbox/`
- `apps/api/src/composio/tool-execution-service.ts`
- `apps/api/src/routes/tool-grants.ts`
- `packages/shared/src/schemas.ts`
- `apps/web/src/components/thread/run-timeline.tsx`
- `apps/web/src/components/thread/tool-access-picker.tsx`
