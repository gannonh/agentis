import type {
  WorkspaceEntry,
  WorkspaceFileRead,
  WorkspaceSearchResult,
} from "../workspaces/workspace-service.js"
import {
  MUTATING_NATIVE_WORKSPACE_TOOL_NAMES,
  NATIVE_WORKSPACE_READ_TOOL_NAMES,
  type MutatingNativeWorkspaceToolName,
} from "./tool-names.js"

export const NATIVE_WORKSPACE_TOOL_NAMES = [
  ...NATIVE_WORKSPACE_READ_TOOL_NAMES,
  ...MUTATING_NATIVE_WORKSPACE_TOOL_NAMES,
] as const

export type NativeWorkspaceToolName = (typeof NATIVE_WORKSPACE_TOOL_NAMES)[number]

export type NativeToolRunStepPayload = {
  provider: "native"
  toolCallId?: string
  toolName: NativeWorkspaceToolName
  workspaceId: string
  input?: unknown
  output?: unknown
  error?: string
  code?: string
  changedFiles?: Array<{
    path: string
    operation: string
    bytesWritten?: number
  }>
  approval?: {
    status: "pending" | "approved" | "denied"
    editId: string
  }
}

export function isNativeWorkspaceToolName(
  toolName: string
): toolName is NativeWorkspaceToolName {
  return NATIVE_WORKSPACE_TOOL_NAMES.includes(toolName as NativeWorkspaceToolName)
}

export function isMutatingNativeWorkspaceToolName(
  toolName: string
): toolName is MutatingNativeWorkspaceToolName {
  return MUTATING_NATIVE_WORKSPACE_TOOL_NAMES.includes(
    toolName as MutatingNativeWorkspaceToolName
  )
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

function summarizeMutatingOutput(output: unknown) {
  if (typeof output !== "object" || output === null) return output
  const record = output as Record<string, unknown>
  return {
    workspaceId: record.workspaceId,
    path: record.path,
    operation: record.operation,
    bytesWritten: record.bytesWritten,
    replacements: record.replacements,
    linesAdded: record.linesAdded,
    linesRemoved: record.linesRemoved,
    created: record.created,
    status: record.status,
    editId: record.editId,
    changedFiles: record.changedFiles,
  }
}

function inferApproval(
  output: unknown
): NativeToolRunStepPayload["approval"] | undefined {
  if (!isObject(output) || typeof output.editId !== "string") return undefined
  if (output.status === "pending_approval") {
    return { status: "pending", editId: output.editId }
  }
  if (output.status === "denied") {
    return { status: "denied", editId: output.editId }
  }
  return undefined
}

function changedFilesFromOutput(
  output: unknown
): NativeToolRunStepPayload["changedFiles"] | undefined {
  if (!isObject(output)) return undefined
  if (Array.isArray(output.changedFiles)) {
    return output.changedFiles as NativeToolRunStepPayload["changedFiles"]
  }
  if (typeof output.path !== "string") return undefined

  return [
    {
      path: output.path,
      operation: typeof output.operation === "string" ? output.operation : "edit",
      bytesWritten:
        typeof output.bytesWritten === "number" ? output.bytesWritten : undefined,
    },
  ]
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

  if (isMutatingNativeWorkspaceToolName(toolName)) {
    return summarizeMutatingOutput(output)
  }

  return output
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function formatNativeToolRunStepPayload(input: {
  toolCallId?: string
  toolName: string
  workspaceId: string
  input?: unknown
  output?: unknown
  error?: string
  code?: string
  approval?: NativeToolRunStepPayload["approval"]
  changedFiles?: NativeToolRunStepPayload["changedFiles"]
}): NativeToolRunStepPayload | null {
  if (!isNativeWorkspaceToolName(input.toolName)) return null
  const output =
    input.output === undefined
      ? undefined
      : summarizeNativeOutput(input.toolName, input.output)
  const changedFiles = input.changedFiles ?? changedFilesFromOutput(output)

  return {
    provider: "native",
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    workspaceId: input.workspaceId,
    input: input.input,
    output,
    error: input.error,
    code: input.code,
    approval: input.approval ?? inferApproval(output),
    changedFiles,
  }
}
