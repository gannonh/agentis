import {
  GENERIC_AGENTIS_AGENT_ID,
  type NativeToolPermissionId,
} from "@workspace/shared"
export const PLATFORM_BASIC_NATIVE_TOOL_PERMISSIONS: NativeToolPermissionId[] =
  ["webSearch"]

export function resolveNativeToolsForRun(input: {
  agentId?: string | null
  agentConfiguration: { nativeTools: NativeToolPermissionId[] } | null
}): NativeToolPermissionId[] {
  if (
    input.agentId === GENERIC_AGENTIS_AGENT_ID ||
    !input.agentConfiguration
  ) {
    return [...PLATFORM_BASIC_NATIVE_TOOL_PERMISSIONS]
  }

  return input.agentConfiguration.nativeTools
}

export function isWebSearchPermitted(
  nativeTools: NativeToolPermissionId[]
): boolean {
  return nativeTools.includes("webSearch")
}
