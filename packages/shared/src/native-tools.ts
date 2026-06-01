import { z } from "zod"

export const NATIVE_TOOL_PERMISSION_IDS = ["webSearch"] as const

export type NativeToolPermissionId = (typeof NATIVE_TOOL_PERMISSION_IDS)[number]

export type NativeToolCapability = {
  id: NativeToolPermissionId
  runtimeToolName: "searchWeb"
  label: string
  description: string
  group: "Research"
  defaultSelected: boolean
}

export const WEB_SEARCH_NATIVE_TOOL_CAPABILITY: NativeToolCapability = {
  id: "webSearch",
  runtimeToolName: "searchWeb",
  label: "Search",
  description: "Find current web information with bounded source evidence.",
  group: "Research",
  defaultSelected: true,
}

export const NATIVE_TOOL_CAPABILITY_CATALOG: NativeToolCapability[] = [
  WEB_SEARCH_NATIVE_TOOL_CAPABILITY,
]

export const DEFAULT_CUSTOM_AGENT_NATIVE_TOOLS: NativeToolPermissionId[] =
  NATIVE_TOOL_CAPABILITY_CATALOG.filter((tool) => tool.defaultSelected).map(
    (tool) => tool.id
  )

export const nativeToolPermissionIdSchema = z.enum(NATIVE_TOOL_PERMISSION_IDS)

export const nativeToolsSchema = z.array(nativeToolPermissionIdSchema)
