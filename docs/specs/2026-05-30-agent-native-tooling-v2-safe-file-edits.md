# Agent native tooling V2: safe file edits

## Scope

V2 adds text-only workspace mutation tools scoped to `AGENTIS_STORAGE_ROOT/workspaces/{id}/files/` through the existing workspace path jail. It keeps stored thread modes unchanged: `plan` requires approval before applying a mutation, and `agent` applies the mutation during execution.

Out of scope: shell execution, version-history UI, broad native tool grants UI, production storage backends, full file-body transcript rendering, and workspace copy on promotion.

## Tools

### `createWorkspaceFile`

Input: `{ path: string, content: string }`

Creates a new UTF-8 text file. The tool fails if the file exists.

Output summary: `{ path, operation, bytesWritten, created, changedFiles }`.

### `replaceInWorkspaceFile`

Input: `{ path: string, oldText: string, newText: string, replaceAll?: boolean }`

Reads an existing text file, replaces one unique match by default, or all matches when `replaceAll` is true. Replacement count is capped by `AGENTIS_WORKSPACE_REPLACE_MAX_COUNT`.

Output summary: `{ path, operation, replacements, bytesWritten, changedFiles }`.

### `applyWorkspacePatch`

Input: `{ path: string, patch: string }`

Applies one unified diff to one workspace-relative file. The parsed patch target must match `path`.

Output summary: `{ path, operation, linesAdded, linesRemoved, bytesWritten, changedFiles }`.

## Error codes

- `workspace_path_required`: missing path.
- `workspace_path_absolute`: absolute paths are rejected.
- `workspace_path_traversal`: path traversal is rejected.
- `workspace_symlink_escape`: symlink resolution escapes the files root.
- `workspace_write_denied`: deny prefix or root dotfile policy blocked the write.
- `workspace_write_too_large`: content exceeds `AGENTIS_WORKSPACE_WRITE_MAX_BYTES`.
- `workspace_file_exists`: create-only write target already exists.
- `workspace_path_is_directory`: target is a directory.
- `workspace_binary_file`: target cannot be treated as text.
- `workspace_replace_not_found`: search text was not found.
- `workspace_replace_ambiguous`: search text matched multiple times without `replaceAll`.
- `workspace_replace_limit`: replacement count exceeds the configured cap.
- `workspace_patch_invalid`: patch parsing or target count validation failed.
- `workspace_patch_path_mismatch`: patch target does not match the requested path.
- `workspace_patch_failed`: patch hunks could not be applied.

## Approval lifecycle

1. A mutating tool call is requested.
2. In `plan` mode, Agentis records a `workspace_edits` row with `status: "pending"`, persists a pending native run step, and does not write the file.
3. `POST /api/runs/:runId/tool-approvals/:toolCallId` receives `{ decision: "approve" | "deny" }`.
4. Approval applies the edit through `WorkspaceHandle`, updates the audit row to `applied`, stores before/after hashes, updates the run step with changed-file metadata, and completes the run.
5. Denial updates the audit row to `denied`, updates the run step, completes the run, and leaves the file untouched.
6. In `agent` mode, the edit is applied during tool execution and recorded as `applied` without a pending approval.

The installed AI SDK types in this branch do not expose `needsApproval`; the V2 implementation keeps the approval boundary in Agentis runtime code and persists the same approval states in run steps and audit metadata.

## Persisted shapes

Native run-step payloads include:

```ts
type NativeToolRunStepPayload = {
  provider: "native"
  toolCallId?: string
  toolName: string
  workspaceId: string
  input?: unknown
  output?: unknown
  changedFiles?: Array<{ path: string; operation: string; bytesWritten?: number }>
  approval?: { status: "pending" | "approved" | "denied"; editId: string }
  error?: string
  code?: string
}
```

Message parts continue to use existing `text`, `tool-call`, and `tool-result` variants. Tool-result outputs contain summaries only, not full file bodies.

## Audit table

`workspace_edits` stores `id`, `workspace_id`, `thread_id`, `run_id`, `tool_call_id`, `tool_name`, `operation`, `path`, `status`, `approval_mode`, `input_json`, `result_json`, `content_hash_before`, `content_hash_after`, `created_at`, and `applied_at`.

## Acceptance checks

Automated:

```bash
pnpm --filter @workspace/shared test
pnpm --filter api test
pnpm --filter web test
pnpm typecheck && pnpm build && pnpm lint
```

Manual/API evidence:

1. Plan mode create or patch request records a pending approval and leaves the target path absent or unchanged.
2. Approval applies the edit, updates the target file, records `workspace_edits.status = applied`, and stores content hash metadata.
3. Denial records `workspace_edits.status = denied` and leaves the target path absent or unchanged.
4. Execute mode applies the edit immediately, records `workspace_edits.status = applied`, and shows changed-file metadata without an approval action.
