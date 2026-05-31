import type { ThreadMode } from "@workspace/shared"
import {
  operationForMutationTool,
  parseWorkspaceMutationInput,
} from "../native-tools/workspace-mutation-schemas.js"
import { requiresWorkspaceToolApproval } from "../native-tools/workspace-tool-policy.js"
import type { WorkspaceEditRepository } from "../repositories/workspace-edit-repository.js"
import {
  buildAppliedMutationOutput,
  buildPendingMutationOutput,
  type WorkspaceMutationToolOutput,
} from "./workspace-mutation-output.js"
import {
  WorkspaceError,
  type WorkspaceHandle,
  type WorkspacePatchInput,
  type WorkspaceReplaceInput,
  type WorkspaceWriteInput,
} from "./workspace-service.js"

export type WorkspaceMutationInput =
  | { toolName: "createWorkspaceFile"; input: WorkspaceWriteInput }
  | { toolName: "replaceInWorkspaceFile"; input: WorkspaceReplaceInput }
  | { toolName: "applyWorkspacePatch"; input: WorkspacePatchInput }

export type WorkspaceMutationSummary = {
  path: string
  operation: string
  bytesWritten?: number
  replacements?: number
  linesAdded?: number
  linesRemoved?: number
  created?: boolean
  contentHashBefore?: string
  contentHashAfter?: string
}

export function summarizeChangedFiles(
  summary: WorkspaceMutationSummary
): Array<{ path: string; operation: string; bytesWritten?: number }> {
  return [
    {
      path: summary.path,
      operation: summary.operation,
      bytesWritten: summary.bytesWritten,
    },
  ]
}

export class WorkspaceEditService {
  constructor(private readonly edits: WorkspaceEditRepository) {}

  createPending(input: {
    workspaceId: string
    threadId: string
    runId: string
    toolCallId: string
    toolName: string
    operation: string
    path: string
    approvalMode: ThreadMode
    toolInput: Record<string, unknown>
  }) {
    return this.edits.create({
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      operation: input.operation,
      path: input.path,
      status: "pending",
      approvalMode: input.approvalMode,
      input: input.toolInput,
      result: { status: "pending_approval" },
    })
  }

  recordApplied(input: {
    workspaceId: string
    threadId: string
    runId: string
    toolCallId: string
    toolName: string
    approvalMode: ThreadMode
    toolInput: Record<string, unknown>
    summary: WorkspaceMutationSummary
  }) {
    return this.edits.create({
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      operation: input.summary.operation,
      path: input.summary.path,
      status: "applied",
      approvalMode: input.approvalMode,
      input: input.toolInput,
      result: input.summary,
      contentHashBefore: input.summary.contentHashBefore,
      contentHashAfter: input.summary.contentHashAfter,
    })
  }

  async applyMutation(
    handle: WorkspaceHandle,
    mutation: WorkspaceMutationInput
  ): Promise<WorkspaceMutationSummary> {
    if (mutation.toolName === "createWorkspaceFile") {
      const result = await handle.writeText({
        ...mutation.input,
        createOnly: true,
      })
      return {
        path: result.path,
        operation: result.operation,
        bytesWritten: result.bytesWritten,
        created: result.created,
        contentHashBefore: result.contentHashBefore,
        contentHashAfter: result.contentHashAfter,
      }
    }
    if (mutation.toolName === "replaceInWorkspaceFile") {
      const result = await handle.replaceInText(mutation.input)
      return {
        path: result.path,
        operation: result.operation,
        bytesWritten: result.bytesWritten,
        replacements: result.replacements,
        contentHashBefore: result.contentHashBefore,
        contentHashAfter: result.contentHashAfter,
      }
    }
    const result = await handle.applyUnifiedPatch(mutation.input)
    return {
      path: result.path,
      operation: result.operation,
      bytesWritten: result.bytesWritten,
      linesAdded: result.linesAdded,
      linesRemoved: result.linesRemoved,
      contentHashBefore: result.contentHashBefore,
      contentHashAfter: result.contentHashAfter,
    }
  }

  async executeWorkspaceMutation(
    handle: WorkspaceHandle,
    input: {
      threadId: string
      runId: string
      toolCallId: string
      approvalMode: ThreadMode
      mutation: WorkspaceMutationInput
    }
  ): Promise<WorkspaceMutationToolOutput> {
    const { mutation } = input
    const path = mutation.input.path
    const operation = operationForMutationTool(mutation.toolName)
    const toolInput = mutation.input as Record<string, unknown>
    const needsApproval = requiresWorkspaceToolApproval(
      mutation.toolName,
      input.approvalMode
    )

    if (needsApproval) {
      const edit = this.createPending({
        workspaceId: handle.id,
        threadId: input.threadId,
        runId: input.runId,
        toolCallId: input.toolCallId,
        toolName: mutation.toolName,
        operation,
        path,
        approvalMode: input.approvalMode,
        toolInput,
      })
      return buildPendingMutationOutput({
        workspaceId: handle.id,
        editId: edit.id,
        path,
        operation,
      })
    }

    const summary = await this.applyMutation(handle, mutation)
    const edit = this.recordApplied({
      workspaceId: handle.id,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      toolName: mutation.toolName,
      approvalMode: input.approvalMode,
      toolInput,
      summary,
    })
    return buildAppliedMutationOutput({
      workspaceId: handle.id,
      editId: edit.id,
      summary,
    })
  }

  async approveByRunToolCall(
    handle: WorkspaceHandle,
    runId: string,
    toolCallId: string
  ): Promise<{ editId: string; summary: WorkspaceMutationSummary }> {
    const edit = this.edits.getByRunAndToolCall(runId, toolCallId)
    if (!edit) {
      throw new WorkspaceError("workspace_edit_not_found", "Workspace edit not found.")
    }
    if (edit.status !== "pending") {
      throw new WorkspaceError(
        "workspace_edit_not_pending",
        "Workspace edit is not pending approval."
      )
    }

    const summary = await this.applyMutation(
      handle,
      parseWorkspaceMutationInput(edit.toolName, edit.input)
    )
    this.edits.update(edit.id, {
      status: "applied",
      result: summary,
      contentHashBefore: summary.contentHashBefore,
      contentHashAfter: summary.contentHashAfter,
    })
    return { editId: edit.id, summary }
  }

  denyByRunToolCall(runId: string, toolCallId: string) {
    const edit = this.edits.getByRunAndToolCall(runId, toolCallId)
    if (!edit) {
      throw new WorkspaceError("workspace_edit_not_found", "Workspace edit not found.")
    }
    if (edit.status !== "pending") {
      throw new WorkspaceError(
        "workspace_edit_not_pending",
        "Workspace edit is not pending approval."
      )
    }
    const updated = this.edits.update(edit.id, {
      status: "denied",
      result: { status: "denied" },
    })
    if (!updated) {
      throw new WorkspaceError("workspace_edit_not_found", "Workspace edit not found.")
    }
    return updated
  }
}
