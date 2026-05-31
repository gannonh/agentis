import type { ThreadMode } from "@workspace/shared"
import { isMutatingNativeWorkspaceToolName } from "./native-tool-payload.js"

export function requiresWorkspaceToolApproval(
  toolName: string,
  threadMode: ThreadMode
) {
  return threadMode === "plan" && isMutatingNativeWorkspaceToolName(toolName)
}
