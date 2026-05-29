# Agent Native Tooling

## Purpose

Track Agentis-native agent capabilities that run inside the Agentis runtime, separate from Composio-backed external integrations.

Native tooling covers local capabilities such as artifact creation, workspace context, file inspection, file editing, command execution, sandboxing, approvals, and tool observability.

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

Native tooling does not currently include:

- File reading.
- File listing.
- File search.
- File editing.
- Patch application.
- Workspace-aware path resolution.
- Shell or command execution.
- Sandboxed execution.
- Tool approval gates.
- Native tool grants or policy controls.
- A generic native tool catalog.
- Rich generic tool rendering in the web UI.

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
- Has special formatting for Composio payloads.
- Does not yet render native tool input/output previews in a structured way.

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

## Hyperagent native tools inventory

This inventory records the native tooling set previously created in Hyperagent. Use it as a reference surface when deciding Agentis-native tool categories and sequencing.

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

## Recommended next iteration

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

Before file tools, define what workspace means.

Questions to resolve:

- Is the workspace a project-attached directory, an uploaded artifact collection, a repository checkout, or a virtual filesystem?
- Where is workspace root stored?
- Can multiple projects have different workspace roots?
- Should local development use the repo filesystem, a storage directory, or an isolated sandbox?
- How do we prevent path traversal and accidental access outside the workspace?

Candidate interface:

```ts
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

Add command execution only after workspace and approval boundaries exist.

Candidate tool:

- `runWorkspaceCommand`

Acceptance criteria:

- Commands run in a sandbox or constrained execution environment.
- Long-running commands can be aborted.
- Output is bounded and persisted safely.
- Exit code, duration, stdout, and stderr appear in run steps.
- Destructive commands require approval or are blocked by policy.

### 6. UI rendering for native tools

Improve generic tool visibility.

Candidate updates:

- Render native tool payloads in `RunTimeline`.
- Render tool-call and tool-result parts in thread messages.
- Show changed files, outputs, and approval states clearly.
- Add copy/download actions for structured tool outputs when useful.

## Open product questions

- Should native file tooling operate on uploaded Library artifacts, project workspaces, Git repositories, or all three?
- Should file edits create new artifacts, modify a project workspace, or both depending on tool choice?
- What approval level should be required for writes and command execution?
- Should native tools be grantable per thread and agent like Composio tools?
- Should every native tool call be replayable or exportable for audit?
- Should agent-created files be versioned?

## Suggested milestone framing

### Native Tooling 1: Read-only workspace awareness

Goal: agents can inspect a bounded workspace.

Deliverables:

- Workspace root model.
- Native tool registry.
- List, read, and search tools.
- Generic native tool timeline rendering.

### Native Tooling 2: Safe file edits

Goal: agents can propose and apply file changes under policy.

Deliverables:

- File create and replace tools.
- Patch application tool.
- Approval or policy gate.
- Changed-file timeline UI.

### Native Tooling 3: Sandboxed execution

Goal: agents can run bounded commands against a workspace.

Deliverables:

- Sandbox abstraction.
- Command execution tool.
- Abort and timeout support.
- Output truncation and structured run logging.

## Reference files

- `apps/api/src/runtime/run-executor.ts`
- `apps/api/src/runtime/get-workspace-summary.ts`
- `apps/api/src/artifacts/artifact-tool.ts`
- `apps/api/src/artifacts/artifact-service.ts`
- `apps/api/src/artifacts/local-artifact-storage.ts`
- `apps/api/src/runtime/run-context.ts`
- `apps/api/src/composio/tool-execution-service.ts`
- `apps/api/src/routes/tool-grants.ts`
- `packages/shared/src/schemas.ts`
- `apps/web/src/components/thread/run-timeline.tsx`
- `apps/web/src/components/thread/tool-access-picker.tsx`
