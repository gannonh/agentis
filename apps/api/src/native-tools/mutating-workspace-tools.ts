import { tool, type ToolSet } from "ai"
import type { ThreadMode } from "@workspace/shared"
import type { WorkspaceEditService } from "../workspaces/workspace-edit-service.js"
import type { WorkspaceMutationInput } from "../workspaces/workspace-edit-service.js"
import type { WorkspaceHandle } from "../workspaces/workspace-service.js"
import {
  applyWorkspacePatchInputSchema,
  createWorkspaceFileInputSchema,
  replaceInWorkspaceFileInputSchema,
} from "./workspace-mutation-schemas.js"

export type MutatingWorkspaceToolContext = {
  handle: WorkspaceHandle
  editService: WorkspaceEditService
  threadId: string
  runId: string
  threadMode: ThreadMode
}

async function runMutation(
  context: MutatingWorkspaceToolContext,
  toolCallId: string,
  mutation: WorkspaceMutationInput
) {
  return context.editService.executeWorkspaceMutation(context.handle, {
    threadId: context.threadId,
    runId: context.runId,
    toolCallId,
    approvalMode: context.threadMode,
    mutation,
  })
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
        return runMutation(context, toolCallId, {
          toolName: "createWorkspaceFile",
          input,
        })
      },
    }),
    replaceInWorkspaceFile: tool({
      description:
        "Replace text in an existing workspace file using bounded search and replace.",
      inputSchema: replaceInWorkspaceFileInputSchema,
      execute: async (input, { toolCallId }) => {
        return runMutation(context, toolCallId, {
          toolName: "replaceInWorkspaceFile",
          input,
        })
      },
    }),
    applyWorkspacePatch: tool({
      description:
        "Apply a unified diff patch to a workspace file. The patch must target exactly one file.",
      inputSchema: applyWorkspacePatchInputSchema,
      execute: async (input, { toolCallId }) => {
        return runMutation(context, toolCallId, {
          toolName: "applyWorkspacePatch",
          input,
        })
      },
    }),
  }
}
