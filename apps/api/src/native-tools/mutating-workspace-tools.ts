import { tool, type ToolSet } from "ai"
import { z } from "zod"
import type { ThreadMode } from "@workspace/shared"
import type { WorkspaceEditService } from "../workspaces/workspace-edit-service.js"
import {
  summarizeChangedFiles,
  type WorkspaceMutationInput,
} from "../workspaces/workspace-edit-service.js"
import type { WorkspaceHandle } from "../workspaces/workspace-service.js"
import { requiresWorkspaceToolApproval } from "./workspace-tool-policy.js"

const createWorkspaceFileInputSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

const replaceInWorkspaceFileInputSchema = z.object({
  path: z.string().min(1),
  oldText: z.string(),
  newText: z.string(),
  replaceAll: z.boolean().optional(),
})

const applyWorkspacePatchInputSchema = z.object({
  path: z.string().min(1),
  patch: z.string().min(1),
})

export type MutatingWorkspaceToolContext = {
  handle: WorkspaceHandle
  editService: WorkspaceEditService
  threadId: string
  runId: string
  threadMode: ThreadMode
}

function operationForTool(toolName: WorkspaceMutationInput["toolName"]) {
  if (toolName === "createWorkspaceFile") return "create"
  if (toolName === "replaceInWorkspaceFile") return "replace"
  return "patch"
}

async function runMutation(
  context: MutatingWorkspaceToolContext,
  toolCallId: string,
  toolName: WorkspaceMutationInput["toolName"],
  toolInput: Record<string, unknown>,
  mutation: WorkspaceMutationInput
) {
  const path = String(toolInput.path ?? "")
  const operation = operationForTool(toolName)
  const needsApproval = requiresWorkspaceToolApproval(toolName, context.threadMode)

  if (needsApproval) {
    const edit = context.editService.createPending({
      workspaceId: context.handle.id,
      threadId: context.threadId,
      runId: context.runId,
      toolCallId,
      toolName,
      operation,
      path,
      approvalMode: context.threadMode,
      toolInput,
    })
    return {
      workspaceId: context.handle.id,
      path,
      operation,
      status: "pending_approval" as const,
      editId: edit.id,
      changedFiles: [{ path, operation }],
    }
  }

  const summary = await context.editService.applyMutation(context.handle, mutation)
  context.editService.recordApplied({
    workspaceId: context.handle.id,
    threadId: context.threadId,
    runId: context.runId,
    toolCallId,
    toolName,
    approvalMode: context.threadMode,
    toolInput,
    summary,
  })
  return {
    workspaceId: context.handle.id,
    ...summary,
    changedFiles: summarizeChangedFiles(summary),
  }
}

export function buildWorkspaceMutatingTools(
  context: MutatingWorkspaceToolContext
): ToolSet {
  return {
    createWorkspaceFile: tool({
      description:
        "Create a new text file in the current workspace. Fails if the file already exists.",
      inputSchema: createWorkspaceFileInputSchema,
      execute: async (input, { toolCallId }) => {
        return runMutation(
          context,
          toolCallId,
          "createWorkspaceFile",
          input,
          { toolName: "createWorkspaceFile", input }
        )
      },
    }),
    replaceInWorkspaceFile: tool({
      description:
        "Replace text in an existing workspace file using bounded search and replace.",
      inputSchema: replaceInWorkspaceFileInputSchema,
      execute: async (input, { toolCallId }) => {
        return runMutation(
          context,
          toolCallId,
          "replaceInWorkspaceFile",
          input,
          { toolName: "replaceInWorkspaceFile", input }
        )
      },
    }),
    applyWorkspacePatch: tool({
      description:
        "Apply a unified diff patch to a workspace file. The patch must target exactly one file.",
      inputSchema: applyWorkspacePatchInputSchema,
      execute: async (input, { toolCallId }) => {
        return runMutation(
          context,
          toolCallId,
          "applyWorkspacePatch",
          input,
          { toolName: "applyWorkspacePatch", input }
        )
      },
    }),
  }
}
