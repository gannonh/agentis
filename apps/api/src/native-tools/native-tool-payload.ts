import { createHash } from "node:crypto"
import type { SearchWebInput, SearchWebOutput } from "@workspace/shared"
import type {
  WorkspaceEntry,
  WorkspaceFileRead,
  WorkspaceSearchResult,
} from "../workspaces/workspace-service.js"
import {
  MUTATING_NATIVE_WORKSPACE_TOOL_NAMES,
  NATIVE_WEB_SEARCH_TOOL_NAMES,
  NATIVE_WORKSPACE_READ_TOOL_NAMES,
  NATIVE_STATIC_ARTIFACT_TOOL_NAMES,
  EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES,
  type ExecutionNativeWorkspaceToolName,
  type MutatingNativeWorkspaceToolName,
  type NativeToolName,
  type NativeStaticArtifactToolName,
  type NativeWebSearchToolName,
} from "./tool-names.js"

export const NATIVE_WORKSPACE_TOOL_NAMES = [
  ...NATIVE_WORKSPACE_READ_TOOL_NAMES,
  ...MUTATING_NATIVE_WORKSPACE_TOOL_NAMES,
  ...EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES,
] as const

export type NativeWorkspaceToolName =
  (typeof NATIVE_WORKSPACE_TOOL_NAMES)[number]

const WEB_SEARCH_TITLE_MAX_CHARS = 200
const WEB_SEARCH_URL_MAX_CHARS = 500
const WEB_SEARCH_SNIPPET_MAX_CHARS = 500
const WEB_SEARCH_SOURCE_MAX_CHARS = 200
const WEB_SEARCH_METADATA_MAX_CHARS = 200
const WEB_SEARCH_DOMAIN_LIMIT = 10
const WEB_SEARCH_METADATA_KEYS = ["gatewayTool", "requestId"] as const
const STATIC_ARTIFACT_TEXT_MAX_CHARS = 200
const STATIC_ARTIFACT_CONTENT_MAX_CHARS = 2_000
const STATIC_ARTIFACT_ITEMS_LIMIT = 10

export type NativeToolRunStepPayload = {
  provider: "native"
  toolCallId?: string
  toolName: NativeToolName
  workspaceId?: string
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
    editId?: string
    executionId?: string
  }
}

export function isNativeWorkspaceToolName(
  toolName: string
): toolName is NativeWorkspaceToolName {
  return NATIVE_WORKSPACE_TOOL_NAMES.includes(
    toolName as NativeWorkspaceToolName
  )
}

export function isMutatingNativeWorkspaceToolName(
  toolName: string
): toolName is MutatingNativeWorkspaceToolName {
  return MUTATING_NATIVE_WORKSPACE_TOOL_NAMES.includes(
    toolName as MutatingNativeWorkspaceToolName
  )
}

export function isExecutionNativeWorkspaceToolName(
  toolName: string
): toolName is ExecutionNativeWorkspaceToolName {
  return EXECUTION_NATIVE_WORKSPACE_TOOL_NAMES.includes(
    toolName as ExecutionNativeWorkspaceToolName
  )
}

export function isNativeWebSearchToolName(
  toolName: string
): toolName is NativeWebSearchToolName {
  return NATIVE_WEB_SEARCH_TOOL_NAMES.includes(
    toolName as NativeWebSearchToolName
  )
}

export function isNativeStaticArtifactToolName(
  toolName: string
): toolName is NativeStaticArtifactToolName {
  return NATIVE_STATIC_ARTIFACT_TOOL_NAMES.includes(
    toolName as NativeStaticArtifactToolName
  )
}

export function isNativeToolName(toolName: string): toolName is NativeToolName {
  return (
    isNativeWorkspaceToolName(toolName) ||
    isNativeWebSearchToolName(toolName) ||
    isNativeStaticArtifactToolName(toolName)
  )
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  if (maxChars <= 0) return ""
  if (maxChars === 1) return "…"
  return `${value.slice(0, maxChars - 1)}…`
}

function summarizeWebSearchResult(
  result: unknown
): SearchWebOutput["results"][number] | null {
  if (!isObject(result)) return null
  if (typeof result.title !== "string" || typeof result.url !== "string") {
    return null
  }

  return {
    title: truncateText(result.title, WEB_SEARCH_TITLE_MAX_CHARS),
    url: truncateText(result.url, WEB_SEARCH_URL_MAX_CHARS),
    snippet:
      typeof result.snippet === "string"
        ? truncateText(result.snippet, WEB_SEARCH_SNIPPET_MAX_CHARS)
        : undefined,
    source:
      typeof result.source === "string"
        ? truncateText(result.source, WEB_SEARCH_SOURCE_MAX_CHARS)
        : undefined,
    publishedAt:
      typeof result.publishedAt === "string"
        ? truncateText(result.publishedAt, WEB_SEARCH_METADATA_MAX_CHARS)
        : undefined,
  }
}

function summarizeWebSearchMetadata(
  metadata: unknown
): Record<string, string> | undefined {
  if (!isObject(metadata)) return undefined
  const entries = WEB_SEARCH_METADATA_KEYS.flatMap((key) => {
    const value = metadata[key]
    return typeof value === "string"
      ? [[key, truncateText(value, WEB_SEARCH_METADATA_MAX_CHARS)] as const]
      : []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

function summarizeWebSearchOutput(output: unknown): unknown {
  if (!isObject(output)) return output
  const results = Array.isArray(output.results)
    ? output.results
        .slice(0, 10)
        .map(summarizeWebSearchResult)
        .filter((result): result is SearchWebOutput["results"][number] =>
          Boolean(result)
        )
    : []

  return {
    query: typeof output.query === "string" ? output.query : undefined,
    provider: typeof output.provider === "string" ? output.provider : undefined,
    resultCount:
      typeof output.resultCount === "number"
        ? output.resultCount
        : results.length,
    truncated: output.truncated === true,
    results,
    metadata: summarizeWebSearchMetadata(output.metadata),
  } satisfies Partial<SearchWebOutput>
}

function isSearchWebRecency(
  value: unknown
): value is NonNullable<SearchWebInput["recency"]> {
  return (
    value === "day" || value === "week" || value === "month" || value === "year"
  )
}

function summarizeWebSearchInput(input: unknown): unknown {
  if (!isObject(input)) return input
  return {
    query: typeof input.query === "string" ? input.query : undefined,
    maxResults:
      typeof input.maxResults === "number" ? input.maxResults : undefined,
    domains: Array.isArray(input.domains)
      ? input.domains
          .filter((domain): domain is string => typeof domain === "string")
          .slice(0, WEB_SEARCH_DOMAIN_LIMIT)
          .map((domain) => truncateText(domain, WEB_SEARCH_SOURCE_MAX_CHARS))
      : undefined,
    recency: isSearchWebRecency(input.recency) ? input.recency : undefined,
  } satisfies Partial<SearchWebInput>
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

function summarizeExecutionInput(input: unknown) {
  if (!isObject(input)) return input
  if (input.kind === "command") {
    const command = typeof input.command === "string" ? input.command : ""
    return {
      kind: input.kind,
      command: "[REDACTED]",
      commandLength: command.length,
      commandSha256: createHash("sha256").update(command).digest("hex"),
      cwd: input.cwd,
    }
  }
  if (input.kind === "script") {
    const code = typeof input.code === "string" ? input.code : ""
    return {
      kind: input.kind,
      language: input.language,
      code: "[REDACTED]",
      codeLength: code.length,
      codeSha256: createHash("sha256").update(code).digest("hex"),
      cwd: input.cwd,
    }
  }
  return input
}

function summarizeExecutionOutput(output: unknown) {
  if (!isObject(output)) return output
  return {
    workspaceId: output.workspaceId,
    executionId: output.executionId,
    kind: output.kind,
    exitCode: output.exitCode,
    durationMs: output.durationMs,
    stdout: output.stdout,
    stderr: output.stderr,
    stdoutTruncated: output.stdoutTruncated,
    stderrTruncated: output.stderrTruncated,
    timedOut: output.timedOut,
    aborted: output.aborted,
    status: output.status,
    changedFiles: output.changedFiles,
  }
}

function inferApproval(
  output: unknown
): NativeToolRunStepPayload["approval"] | undefined {
  if (!isObject(output)) return undefined
  const editId = typeof output.editId === "string" ? output.editId : undefined
  const executionId =
    typeof output.executionId === "string" ? output.executionId : undefined

  const approvalId = executionId
    ? { executionId }
    : editId
      ? { editId }
      : undefined
  if (!approvalId) return undefined

  if (output.status === "pending_approval") {
    return { status: "pending", ...approvalId }
  }
  if (output.status === "denied") {
    return { status: "denied", ...approvalId }
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
      operation:
        typeof output.operation === "string" ? output.operation : "edit",
      bytesWritten:
        typeof output.bytesWritten === "number"
          ? output.bytesWritten
          : undefined,
    },
  ]
}

function summarizeNativeOutput(
  toolName: NativeWorkspaceToolName,
  output: unknown
) {
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

  if (isExecutionNativeWorkspaceToolName(toolName)) {
    return summarizeExecutionOutput(output)
  }

  return output
}

function summarizeStaticArtifactInput(input: unknown): unknown {
  if (!isObject(input)) return input
  return {
    title:
      typeof input.title === "string"
        ? truncateText(input.title, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    artifactId:
      typeof input.artifactId === "string"
        ? truncateText(input.artifactId, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    artifactType:
      typeof input.artifactType === "string" ? input.artifactType : undefined,
    renderMode:
      typeof input.renderMode === "string" ? input.renderMode : undefined,
    theme:
      typeof input.theme === "string"
        ? truncateText(input.theme, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    visibilityScope:
      typeof input.visibilityScope === "string"
        ? input.visibilityScope
        : undefined,
    query:
      typeof input.query === "string"
        ? truncateText(input.query, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    limit: typeof input.limit === "number" ? input.limit : undefined,
    changeSummary:
      typeof input.changeSummary === "string"
        ? truncateText(input.changeSummary, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
  }
}

function summarizeStaticArtifactItem(item: unknown): unknown {
  if (!isObject(item)) return null
  return {
    artifactId:
      typeof item.artifactId === "string"
        ? truncateText(item.artifactId, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    title:
      typeof item.title === "string"
        ? truncateText(item.title, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    artifactType:
      typeof item.artifactType === "string" ? item.artifactType : undefined,
    renderMode:
      typeof item.renderMode === "string" ? item.renderMode : undefined,
    version: typeof item.version === "number" ? item.version : undefined,
    theme:
      typeof item.theme === "string"
        ? truncateText(item.theme, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    slideCount:
      typeof item.slideCount === "number" ? item.slideCount : undefined,
    viewPath:
      typeof item.viewPath === "string"
        ? truncateText(item.viewPath, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    updatedAt:
      typeof item.updatedAt === "string"
        ? truncateText(item.updatedAt, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
  }
}

function summarizeStaticArtifactOutput(output: unknown): unknown {
  if (!isObject(output)) return output
  const contentText =
    typeof output.contentText === "string" ? output.contentText : undefined
  const previewText =
    typeof output.previewText === "string" ? output.previewText : undefined
  const contentTextTruncatedByPayload =
    contentText != null && contentText.length > STATIC_ARTIFACT_CONTENT_MAX_CHARS
  const items = Array.isArray(output.items)
    ? output.items
        .slice(0, STATIC_ARTIFACT_ITEMS_LIMIT)
        .map(summarizeStaticArtifactItem)
        .filter(Boolean)
    : undefined

  return {
    action:
      typeof output.action === "string"
        ? truncateText(output.action, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    artifactId:
      typeof output.artifactId === "string"
        ? truncateText(output.artifactId, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    title:
      typeof output.title === "string"
        ? truncateText(output.title, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    artifactType:
      typeof output.artifactType === "string" ? output.artifactType : undefined,
    renderMode:
      typeof output.renderMode === "string" ? output.renderMode : undefined,
    version: typeof output.version === "number" ? output.version : undefined,
    previousVersion:
      typeof output.previousVersion === "number"
        ? output.previousVersion
        : undefined,
    theme:
      typeof output.theme === "string"
        ? truncateText(output.theme, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    designBriefSummary:
      typeof output.designBriefSummary === "string"
        ? truncateText(output.designBriefSummary, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    slideCount:
      typeof output.slideCount === "number" ? output.slideCount : undefined,
    provider:
      typeof output.provider === "string"
        ? truncateText(output.provider, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    viewPath:
      typeof output.viewPath === "string"
        ? truncateText(output.viewPath, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    contentText:
      contentText != null
        ? truncateText(contentText, STATIC_ARTIFACT_CONTENT_MAX_CHARS)
        : undefined,
    contentTextTruncated:
      output.contentTextTruncated === true || contentTextTruncatedByPayload,
    previewText:
      previewText != null
        ? truncateText(previewText, STATIC_ARTIFACT_CONTENT_MAX_CHARS)
        : undefined,
    errorCode:
      typeof output.errorCode === "string"
        ? truncateText(output.errorCode, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : typeof output.code === "string"
          ? truncateText(output.code, STATIC_ARTIFACT_TEXT_MAX_CHARS)
          : undefined,
    error:
      typeof output.error === "string"
        ? truncateText(output.error, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    remediation:
      typeof output.remediation === "string"
        ? truncateText(output.remediation, STATIC_ARTIFACT_TEXT_MAX_CHARS)
        : undefined,
    resultCount:
      typeof output.resultCount === "number" ? output.resultCount : undefined,
    truncated: output.truncated === true,
    items,
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function formatNativeToolRunStepPayload(input: {
  toolCallId?: string
  toolName: string
  workspaceId?: string
  input?: unknown
  output?: unknown
  error?: string
  code?: string
  approval?: NativeToolRunStepPayload["approval"]
  changedFiles?: NativeToolRunStepPayload["changedFiles"]
}): NativeToolRunStepPayload | null {
  if (isNativeWebSearchToolName(input.toolName)) {
    return {
      provider: "native",
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      input: summarizeWebSearchInput(input.input),
      output:
        input.output === undefined
          ? undefined
          : summarizeWebSearchOutput(input.output),
      error: input.error,
      code: input.code,
    }
  }

  if (isNativeStaticArtifactToolName(input.toolName)) {
    return {
      provider: "native",
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      input: summarizeStaticArtifactInput(input.input),
      output:
        input.output === undefined
          ? undefined
          : summarizeStaticArtifactOutput(input.output),
      error: input.error,
      code: input.code,
    }
  }

  if (!isNativeWorkspaceToolName(input.toolName) || !input.workspaceId) {
    return null
  }

  const output =
    input.output === undefined
      ? undefined
      : summarizeNativeOutput(input.toolName, input.output)
  const toolInput = isExecutionNativeWorkspaceToolName(input.toolName)
    ? summarizeExecutionInput(input.input)
    : input.input
  const changedFiles =
    input.changedFiles ??
    (isMutatingNativeWorkspaceToolName(input.toolName) ||
    isExecutionNativeWorkspaceToolName(input.toolName)
      ? changedFilesFromOutput(output)
      : undefined)

  return {
    provider: "native",
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    workspaceId: input.workspaceId,
    input: toolInput,
    output,
    error: input.error,
    code: input.code,
    approval: input.approval ?? inferApproval(output),
    changedFiles,
  }
}
