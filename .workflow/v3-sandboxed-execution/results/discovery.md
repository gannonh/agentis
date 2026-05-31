# Discovery Packet

Status: completed

## Scope

Map existing V2 native tool, workspace edit approval, database, runtime, and UI patterns before editing implementation files.

## Findings

- V2 approval state is split between `WorkspaceEditService`, `WorkspaceEditRepository`, `workspace-tool-approval.ts`, and run-step payload formatting.
- Native tools are merged through `buildWorkspaceNativeTools` and finalized in `RunExecutor` by `formatNativeToolRunStepPayload`.
- Mock runtime has explicit prompt-triggered branches in `run-executor.ts` and direct service calls in `run-executor-mocks.ts`.
- Workspace path jail logic lives on `WorkspaceHandle`; V3 needed narrow public methods for files-root realpath, execution cwd resolution, and runtime script materialization.
- Timeline and approval UI already consume generic native payloads, so V3 could extend those formatters without new component primitives.
