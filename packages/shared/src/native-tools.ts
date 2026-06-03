import { z } from "zod"

export const NATIVE_TOOL_PERMISSION_IDS = ["documents", "webSearch"] as const

export type NativeToolPermissionId = (typeof NATIVE_TOOL_PERMISSION_IDS)[number]

export type NativeToolCapabilityGroup = "Research" | "Data"

export type NativeToolCapability = {
  id: NativeToolPermissionId
  runtimeToolName: "searchWeb" | "documents"
  label: string
  description: string
  group: NativeToolCapabilityGroup
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

export const DOCUMENTS_NATIVE_TOOL_CAPABILITY: NativeToolCapability = {
  id: "documents",
  runtimeToolName: "documents",
  label: "Documents",
  description: "Create and update persistent documents.",
  group: "Data",
  defaultSelected: true,
}

export const NATIVE_TOOL_CAPABILITY_CATALOG: NativeToolCapability[] = [
  WEB_SEARCH_NATIVE_TOOL_CAPABILITY,
  DOCUMENTS_NATIVE_TOOL_CAPABILITY,
]

export const DEFAULT_CUSTOM_AGENT_NATIVE_TOOLS: NativeToolPermissionId[] =
  NATIVE_TOOL_CAPABILITY_CATALOG.filter((tool) => tool.defaultSelected).map(
    (tool) => tool.id
  )

export const nativeToolPermissionIdSchema = z.enum(NATIVE_TOOL_PERMISSION_IDS)

export const nativeToolsSchema = z.array(nativeToolPermissionIdSchema)
