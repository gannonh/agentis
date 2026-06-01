import { z } from "zod"

export const NATIVE_TOOL_PERMISSION_IDS = ["webSearch"] as const

export type NativeToolPermissionId = (typeof NATIVE_TOOL_PERMISSION_IDS)[number]

export const nativeToolPermissionIdSchema = z.enum(NATIVE_TOOL_PERMISSION_IDS)

export const nativeToolsSchema = z.array(nativeToolPermissionIdSchema)

export const DEFAULT_CUSTOM_AGENT_NATIVE_TOOLS: NativeToolPermissionId[] = [
  "webSearch",
]
