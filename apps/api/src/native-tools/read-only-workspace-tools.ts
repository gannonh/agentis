import { tool, type ToolSet } from "ai"
import { z } from "zod"
import type {
  WorkspaceEntry,
  WorkspaceFileRead,
  WorkspaceHandle,
  WorkspaceSearchResult,
} from "../workspaces/workspace-service.js"

export const NATIVE_WORKSPACE_TOOL_NAMES = [
  "listWorkspaceFiles",
  "readWorkspaceFile",
  "searchWorkspaceFiles",
] as const

export type NativeWorkspaceToolName = (typeof NATIVE_WORKSPACE_TOOL_NAMES)[number]

export type NativeToolRunStepPayload = {
  provider: "native"
  toolName: NativeWorkspaceToolName
  workspaceId: string
  input?: unknown
  output?: unknown
  error?: string
  code?: string
}

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

export function isNativeWorkspaceToolName(
  toolName: string
): toolName is NativeWorkspaceToolName {
  return NATIVE_WORKSPACE_TOOL_NAMES.includes(toolName as NativeWorkspaceToolName)
}

function summarizeEntries(entries: WorkspaceEntry[]) {
  return entries.slice(0, 25).map((entry) => ({
    name: entry.name,
    path: entry.path,
    type: entry.type,
    size: entry.size,
    modifiedAt: entry.modifiedAt,
  }))
}

function summarizeRead(output: WorkspaceFileRead) {
  return {
    path: output.path,
    bytesReturned: output.bytesReturned,
    totalBytes: output.totalBytes,
    truncated: output.truncated,
  }
}

function summarizeSearch(results: WorkspaceSearchResult[]) {
  return results.slice(0, 25).map((result) => ({
    path: result.path,
    lineNumber: result.lineNumber,
    snippet: result.snippet,
  }))
}

function summarizeNativeOutput(toolName: NativeWorkspaceToolName, output: unknown) {
  if (toolName === "listWorkspaceFiles" && isObject(output)) {
    const entries = Array.isArray(output.entries)
      ? (output.entries as WorkspaceEntry[])
      : []
    return {
      workspaceId: output.workspaceId,
      entries: summarizeEntries(entries),
      truncated: output.truncated,
    }
  }

  if (toolName === "readWorkspaceFile" && isObject(output)) {
    return {
      workspaceId: output.workspaceId,
      ...summarizeRead(output as WorkspaceFileRead),
    }
  }

  if (toolName === "searchWorkspaceFiles" && isObject(output)) {
    const results = Array.isArray(output.results)
      ? (output.results as WorkspaceSearchResult[])
      : []
    return {
      workspaceId: output.workspaceId,
      results: summarizeSearch(results),
      truncated: output.truncated,
    }
  }

  return output
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function formatNativeToolRunStepPayload(input: {
  toolName: string
  workspaceId: string
  input?: unknown
  output?: unknown
  error?: string
  code?: string
}): NativeToolRunStepPayload | null {
  if (!isNativeWorkspaceToolName(input.toolName)) return null
  return {
    provider: "native",
    toolName: input.toolName,
    workspaceId: input.workspaceId,
    input: input.input,
    output:
      input.output === undefined
        ? undefined
        : summarizeNativeOutput(input.toolName, input.output),
    error: input.error,
    code: input.code,
  }
}

export function buildWorkspaceNativeTools(handle: WorkspaceHandle): ToolSet {
  return {
    listWorkspaceFiles: tool({
      description:
        "List files and directories under the current Agentis workspace.",
      inputSchema: listWorkspaceFilesInputSchema,
      execute: async (input) => {
        const result = await handle.list(input)
        return { workspaceId: handle.id, ...result }
      },
    }),
    readWorkspaceFile: tool({
      description:
        "Read a text file from the current Agentis workspace. Use this only for workspace-relative paths.",
      inputSchema: readWorkspaceFileInputSchema,
      execute: async (input) => {
        const result = await handle.readText(input)
        return { workspaceId: handle.id, ...result }
      },
    }),
    searchWorkspaceFiles: tool({
      description:
        "Search text files in the current Agentis workspace and return matching snippets.",
      inputSchema: searchWorkspaceFilesInputSchema,
      execute: async (input) => {
        const result = await handle.search(input)
        return { workspaceId: handle.id, ...result }
      },
    }),
  }
}
