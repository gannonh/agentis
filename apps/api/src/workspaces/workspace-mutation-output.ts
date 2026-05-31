import type { WorkspaceMutationSummary } from "./workspace-edit-service.js"
import { summarizeChangedFiles } from "./workspace-edit-service.js"

export type WorkspaceChangedFile = {
  path: string
  operation: string
  bytesWritten?: number
}

export type WorkspaceMutationToolOutput = {
  workspaceId: string
  path: string
  operation: string
  status?: "pending_approval" | "denied"
  editId?: string
  changedFiles: WorkspaceChangedFile[]
  bytesWritten?: number
  replacements?: number
  linesAdded?: number
  linesRemoved?: number
  created?: boolean
  contentHashBefore?: string
  contentHashAfter?: string
}

export function buildPendingMutationOutput(input: {
  workspaceId: string
  editId: string
  path: string
  operation: string
}): WorkspaceMutationToolOutput {
  return {
    workspaceId: input.workspaceId,
    path: input.path,
    operation: input.operation,
    status: "pending_approval",
    editId: input.editId,
    changedFiles: [{ path: input.path, operation: input.operation }],
  }
}

export function buildAppliedMutationOutput(input: {
  workspaceId: string
  editId?: string
  summary: WorkspaceMutationSummary
}): WorkspaceMutationToolOutput {
  return {
    workspaceId: input.workspaceId,
    editId: input.editId,
    ...input.summary,
    changedFiles: summarizeChangedFiles(input.summary),
  }
}

export function buildDeniedMutationOutput(input: {
  workspaceId: string
  editId: string
  path: string
  operation: string
}): WorkspaceMutationToolOutput {
  return {
    workspaceId: input.workspaceId,
    editId: input.editId,
    path: input.path,
    operation: input.operation,
    status: "denied",
    changedFiles: [{ path: input.path, operation: input.operation }],
  }
}

export function isPendingApprovalOutput(
  output: unknown
): output is WorkspaceMutationToolOutput & { status: "pending_approval" } {
  return (
    typeof output === "object" &&
    output !== null &&
    (output as WorkspaceMutationToolOutput).status === "pending_approval"
  )
}
