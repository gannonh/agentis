import { tool, type ToolSet } from "ai"
import type { ThreadMode } from "@workspace/shared"
import type { WorkspaceExecutionService } from "../workspaces/workspace-execution-service.js"
import type { WorkspaceHandle } from "../workspaces/workspace-service.js"
import { runWorkspaceCommandInputSchema } from "./workspace-execution-schemas.js"

export type ExecutionWorkspaceToolContext = {
  handle: WorkspaceHandle
  executionService: WorkspaceExecutionService
  threadId: string
  runId: string
  threadMode: ThreadMode
}

export function buildWorkspaceExecutionTools(
  context: ExecutionWorkspaceToolContext
): ToolSet {
  return {
    runWorkspaceCommand: tool({
      description:
        "Run a bounded shell command or short Python/Node script in the current workspace files directory. Use for local workspace inspection, tests, and file-generating scripts.",
      inputSchema: runWorkspaceCommandInputSchema,
      execute: async (input, { toolCallId }) => {
        return context.executionService.executeWorkspaceCommand(context.handle, {
          threadId: context.threadId,
          runId: context.runId,
          toolCallId,
          approvalMode: context.threadMode,
          input,
        })
      },
    }),
  }
}
