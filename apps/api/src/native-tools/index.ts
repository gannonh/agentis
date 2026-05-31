import type { ThreadMode } from "@workspace/shared"
import type { ToolSet } from "ai"
import type { WorkspaceEditService } from "../workspaces/workspace-edit-service.js"
import type { WorkspaceHandle } from "../workspaces/workspace-service.js"
import { buildWorkspaceMutatingTools } from "./mutating-workspace-tools.js"
import { buildWorkspaceReadOnlyTools } from "./read-only-workspace-tools.js"

export function buildWorkspaceNativeTools(input: {
  handle: WorkspaceHandle
  editService: WorkspaceEditService
  threadId: string
  runId: string
  threadMode: ThreadMode
}): ToolSet {
  return {
    ...buildWorkspaceReadOnlyTools(input.handle),
    ...buildWorkspaceMutatingTools({
      handle: input.handle,
      editService: input.editService,
      threadId: input.threadId,
      runId: input.runId,
      threadMode: input.threadMode,
    }),
  }
}
