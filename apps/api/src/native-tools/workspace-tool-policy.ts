import type { ThreadMode } from "@workspace/shared"
import { isMutatingNativeWorkspaceToolName } from "./native-tool-payload.js"
import { EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES } from "./tool-names.js"

export function requiresWorkspaceToolApproval(
  toolName: string,
  threadMode: ThreadMode
) {
  if (threadMode !== "plan") return false
  return (
    isMutatingNativeWorkspaceToolName(toolName) ||
    EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES.includes(
      toolName as (typeof EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES)[number]
    )
  )
}
