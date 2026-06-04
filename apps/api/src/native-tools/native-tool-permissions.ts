import {
  GENERIC_AGENTIS_AGENT_ID,
  type NativeToolPermissionId,
} from "@workspace/shared"
export const PLATFORM_BASIC_NATIVE_TOOL_PERMISSIONS: NativeToolPermissionId[] =
  ["documents", "webSearch"]

export function resolveNativeToolsForRun(input: {
  agentId?: string | null
  agentConfiguration: { nativeTools: NativeToolPermissionId[] } | null
}): NativeToolPermissionId[] {
  if (input.agentId === GENERIC_AGENTIS_AGENT_ID || !input.agentId) {
    return [...PLATFORM_BASIC_NATIVE_TOOL_PERMISSIONS]
  }
  if (!input.agentConfiguration) return []

  return input.agentConfiguration.nativeTools
}

export function isWebSearchPermitted(
  nativeTools: NativeToolPermissionId[]
): boolean {
  return nativeTools.includes("webSearch")
}
