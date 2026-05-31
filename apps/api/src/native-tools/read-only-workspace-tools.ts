import { tool, type ToolSet } from "ai"
import { z } from "zod"
import type { WorkspaceHandle } from "../workspaces/workspace-service.js"
import { NATIVE_WORKSPACE_READ_TOOL_NAMES } from "./tool-names.js"

export {
  formatNativeToolRunStepPayload,
  isNativeWorkspaceToolName,
  isMutatingNativeWorkspaceToolName,
  NATIVE_WORKSPACE_TOOL_NAMES,
  type NativeToolRunStepPayload,
  type NativeWorkspaceToolName,
} from "./native-tool-payload.js"

export { NATIVE_WORKSPACE_READ_TOOL_NAMES, type NativeWorkspaceReadToolName } from "./tool-names.js"

const listWorkspaceFilesInputSchema = z.object({
  path: z.string().optional(),
  recursive: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
})

const readWorkspaceFileInputSchema = z.object({
  path: z.string().min(1),
  maxBytes: z.number().int().positive().optional(),
})

const searchWorkspaceFilesInputSchema = z.object({
  query: z.string().min(1),
  path: z.string().optional(),
  limit: z.number().int().positive().optional(),
})

export function buildWorkspaceReadOnlyTools(handle: WorkspaceHandle): ToolSet {
  return {
    listWorkspaceFiles: tool({
      description:
        "List files and directories under the current workspace.",
      inputSchema: listWorkspaceFilesInputSchema,
      execute: async (input) => {
        const result = await handle.list(input)
        return { workspaceId: handle.id, ...result }
      },
    }),
    readWorkspaceFile: tool({
      description:
        "Read a text file from the current workspace. Use this only for workspace-relative paths.",
      inputSchema: readWorkspaceFileInputSchema,
      execute: async (input) => {
        const result = await handle.readText(input)
        return { workspaceId: handle.id, ...result }
      },
    }),
    searchWorkspaceFiles: tool({
      description:
        "Search text files in the current workspace and return matching snippets.",
      inputSchema: searchWorkspaceFilesInputSchema,
      execute: async (input) => {
        const result = await handle.search(input)
        return { workspaceId: handle.id, ...result }
      },
    }),
  }
}

export function isNativeWorkspaceReadToolName(
  toolName: string
): toolName is (typeof NATIVE_WORKSPACE_READ_TOOL_NAMES)[number] {
  return NATIVE_WORKSPACE_READ_TOOL_NAMES.includes(
    toolName as (typeof NATIVE_WORKSPACE_READ_TOOL_NAMES)[number]
  )
}
