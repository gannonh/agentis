import type { MessagePart } from "@workspace/shared"
import type { RunStep } from "@workspace/shared"

export type WebSearchSource = {
  title: string
  url: string
  source?: string
}

export function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

export function stableRelativePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  if (!value.startsWith("/") || value.startsWith("//")) return undefined
  return value
}

export function getNativePath(
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null
): string | undefined {
  if (typeof input?.path === "string") return input.path
  if (typeof output?.path === "string") return output.path
  return undefined
}

export function formatNativeOutputSummary(
  output: Record<string, unknown> | null,
  truncated: boolean
): string | undefined {
  const truncationLabel = truncated ? " · truncated" : ""
  if (Array.isArray(output?.entries)) {
    return `${output.entries.length} entries${truncationLabel}`
  }
  if (Array.isArray(output?.results)) {
    return `${output.results.length} matches${truncationLabel}`
  }
  if (
    typeof output?.bytesReturned === "number" &&
    typeof output.totalBytes === "number"
  ) {
    return `${output.bytesReturned}/${output.totalBytes} bytes${truncationLabel}`
  }
  return truncated ? "truncated" : undefined
}

export function formatWebSearchSource(result: unknown): WebSearchSource | null {
  const record = getRecord(result)
  if (!record || typeof record.url !== "string") return null

  try {
    const url = new URL(record.url)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
  } catch {
    return null
  }

  return {
    title: typeof record.title === "string" ? record.title : "Untitled source",
    url: record.url,
    source: typeof record.source === "string" ? record.source : undefined,
  }
}

export function formatWebSearchSources(
  output: Record<string, unknown> | null
): WebSearchSource[] {
  if (!Array.isArray(output?.results)) return []
  return output.results
    .map(formatWebSearchSource)
    .filter((result): result is WebSearchSource => Boolean(result))
}

export function formatWebSearchSummary(
  output: Record<string, unknown> | null
): string | undefined {
  if (!output || !Array.isArray(output.results)) return undefined
  const provider =
    typeof output.provider === "string" ? output.provider : "search"
  const resultCount =
    typeof output.resultCount === "number"
      ? output.resultCount
      : output.results.length
  return [
    provider,
    `${resultCount} ${resultCount === 1 ? "result" : "results"}`,
    output.truncated === true ? "truncated" : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function formatExecutionSummary(output: Record<string, unknown> | null) {
  if (!output || (output.kind !== "command" && output.kind !== "script")) {
    return undefined
  }
  const exitCode =
    typeof output.exitCode === "number" || output.exitCode === null
      ? output.exitCode
      : undefined
  const durationMs =
    typeof output.durationMs === "number" ? output.durationMs : undefined
  if (exitCode === undefined && durationMs === undefined) return undefined
  return [
    exitCode === null ? "Exit -" : `Exit ${exitCode}`,
    durationMs !== undefined ? `${durationMs}ms` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function formatPreview(value: unknown, truncated: unknown) {
  if (typeof value !== "string" || !value) return undefined
  return {
    text: value,
    truncated: truncated === true,
  }
}

function staticArtifactActionLabel(action: string | undefined) {
  if (action === "created") return "Static artifact created"
  if (action === "edited") return "Static artifact edited"
  if (action === "found") return "Static artifacts found"
  if (action === "read") return "Static artifact read"
  if (action === "failed") return "Static artifact failed"
  return "Static artifact"
}

function appActionLabel(action: string | undefined) {
  if (action === "created") return "App created"
  if (action === "edited") return "App edited"
  if (action === "found") return "Apps found"
  if (action === "failed") return "App failed"
  return "App"
}

export function formatDocumentPayload(output: Record<string, unknown> | null) {
  const documentId = stringValue(output?.documentId)
  if (!documentId) return null

  const title = stringValue(output?.title) ?? documentId
  const viewPath =
    stableRelativePath(output?.viewPath) ?? `/documents/${documentId}`
  const version = numberValue(output?.currentVersion)

  return {
    documentId,
    title,
    viewPath,
    version,
    visibilityScope: stringValue(output?.visibilityScope),
    previewText: stringValue(output?.previewText),
    error: stringValue(output?.error),
    code: stringValue(output?.code),
  }
}

export function formatAppPayload(input: {
  toolName?: string
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error?: string
  code?: string
}) {
  const isAppTool =
    input.toolName === "createApp" ||
    input.toolName === "editApp" ||
    input.toolName === "findApps"
  if (!isAppTool) return null

  const outputFailed =
    stringValue(input.output?.errorCode) != null ||
    stringValue(input.output?.error) != null
  const action =
    stringValue(input.output?.action) ??
    (input.error || input.code || outputFailed
      ? "failed"
      : input.toolName === "createApp"
        ? "created"
        : input.toolName === "editApp"
          ? "edited"
          : "found")
  const artifactId =
    stringValue(input.output?.artifactId) ??
    stringValue(input.input?.artifactId)
  const title =
    stringValue(input.output?.title) ??
    stringValue(input.input?.title) ??
    artifactId
  const version = numberValue(input.output?.version)
  const viewPath =
    stableRelativePath(input.output?.viewPath) ??
    (artifactId ? `/artifacts/${encodeURIComponent(artifactId)}` : undefined)
  const errorCode =
    stringValue(input.output?.errorCode) ??
    stringValue(input.output?.code) ??
    input.code
  const items = Array.isArray(input.output?.items)
    ? input.output.items
        .map((item) => getRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
    : []

  return {
    action,
    actionLabel: appActionLabel(action),
    artifactId,
    title,
    version,
    previousVersion: numberValue(input.output?.previousVersion),
    visibilityScope: stringValue(input.output?.visibilityScope),
    changeSummary: stringValue(input.input?.changeSummary),
    viewPath,
    errorCode,
    error: stringValue(input.output?.error) ?? input.error,
    remediation: stringValue(input.output?.remediation),
    resultCount: numberValue(input.output?.resultCount),
    truncated: input.output?.truncated === true,
    items,
  }
}

export function formatStaticArtifactPayload(input: {
  toolName?: string
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  error?: string
  code?: string
}) {
  const isStaticTool =
    input.toolName === "createStaticArtifact" ||
    input.toolName === "editStaticArtifact" ||
    input.toolName === "findStaticArtifacts" ||
    input.toolName === "readStaticArtifact"
  if (!isStaticTool) return null

  const outputFailed =
    stringValue(input.output?.errorCode) != null ||
    stringValue(input.output?.error) != null
  const action =
    stringValue(input.output?.action) ??
    (input.error || input.code || outputFailed
      ? "failed"
      : input.toolName === "createStaticArtifact"
        ? "created"
        : input.toolName === "editStaticArtifact"
          ? "edited"
          : input.toolName === "readStaticArtifact"
            ? "read"
            : "found")
  const artifactId =
    stringValue(input.output?.artifactId) ??
    stringValue(input.input?.artifactId)
  const title =
    stringValue(input.output?.title) ??
    stringValue(input.input?.title) ??
    artifactId
  const artifactType =
    stringValue(input.output?.artifactType) ??
    stringValue(input.input?.artifactType)
  const renderMode =
    stringValue(input.output?.renderMode) ??
    stringValue(input.input?.renderMode)
  const version = numberValue(input.output?.version)
  const viewPath =
    stableRelativePath(input.output?.viewPath) ??
    (artifactId ? `/artifacts/${encodeURIComponent(artifactId)}` : undefined)
  const errorCode =
    stringValue(input.output?.errorCode) ??
    stringValue(input.output?.code) ??
    input.code
  const items = Array.isArray(input.output?.items)
    ? input.output.items
        .map((item) => getRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
    : []

  return {
    action,
    actionLabel: staticArtifactActionLabel(action),
    artifactId,
    title,
    artifactType,
    renderMode,
    version,
    previousVersion: numberValue(input.output?.previousVersion),
    theme: stringValue(input.output?.theme),
    designBriefSummary: stringValue(input.output?.designBriefSummary),
    slideCount: numberValue(input.output?.slideCount),
    provider: stringValue(input.output?.provider),
    contentText: stringValue(input.output?.contentText),
    contentTextTruncated: input.output?.contentTextTruncated === true,
    previewText: stringValue(input.output?.previewText),
    viewPath,
    errorCode,
    error: stringValue(input.output?.error) ?? input.error,
    remediation: stringValue(input.output?.remediation),
    resultCount: numberValue(input.output?.resultCount),
    truncated: input.output?.truncated === true,
    items,
  }
}

export type NativeToolDisplay = {
  toolName?: string
  workspaceId?: string
  path?: string
  query?: string
  outputSummary?: string
  sources: WebSearchSource[]
  document?: NonNullable<ReturnType<typeof formatDocumentPayload>>
  staticArtifact?: NonNullable<ReturnType<typeof formatStaticArtifactPayload>>
  app?: NonNullable<ReturnType<typeof formatAppPayload>>
  executionSummary?: string
  stdout?: { text: string; truncated: boolean }
  stderr?: { text: string; truncated: boolean }
  timedOut: boolean
  aborted: boolean
  changedFiles: Array<{
    path: string
    operation: string
    bytesWritten?: number
  }>
  approvalStatus?: string
  error?: string
  code?: string
}

export function formatNativeFromRecords(input: {
  toolName?: string
  workspaceId?: string
  input?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
  approval?: Record<string, unknown> | null
  changedFiles?: Array<Record<string, unknown>>
  error?: string
  code?: string
}): NativeToolDisplay | null {
  const toolInput = input.input ?? null
  const output = input.output ?? null
  const path = getNativePath(toolInput, output)
  const query =
    typeof toolInput?.query === "string"
      ? toolInput.query
      : typeof output?.query === "string"
        ? output.query
        : undefined
  const truncated = output?.truncated === true
  const toolName = input.toolName
  const webSearchSummary =
    toolName === "searchWeb" ? formatWebSearchSummary(output) : undefined
  const outputSummary =
    webSearchSummary ?? formatNativeOutputSummary(output, truncated)
  const executionSummary = formatExecutionSummary(output)
  const stdout = formatPreview(output?.stdout, output?.stdoutTruncated)
  const stderr = formatPreview(output?.stderr, output?.stderrTruncated)
  const document =
    toolName === "createDocument" || toolName === "updateDocument"
      ? formatDocumentPayload(output)
      : null

  const display: NativeToolDisplay = {
    toolName,
    workspaceId: input.workspaceId,
    path,
    query,
    outputSummary,
    sources: toolName === "searchWeb" ? formatWebSearchSources(output) : [],
    document: document ?? undefined,
    staticArtifact:
      formatStaticArtifactPayload({
        toolName,
        input: toolInput,
        output,
        error: input.error,
        code: input.code,
      }) ?? undefined,
    app:
      formatAppPayload({
        toolName,
        input: toolInput,
        output,
        error: input.error,
        code: input.code,
      }) ?? undefined,
    executionSummary,
    stdout,
    stderr,
    timedOut: output?.timedOut === true,
    aborted: output?.aborted === true,
    changedFiles: (input.changedFiles ?? []).map((file) => ({
      path: typeof file.path === "string" ? file.path : "unknown",
      operation: typeof file.operation === "string" ? file.operation : "edit",
      bytesWritten:
        typeof file.bytesWritten === "number" ? file.bytesWritten : undefined,
    })),
    approvalStatus:
      typeof input.approval?.status === "string"
        ? input.approval.status
        : undefined,
    error: input.error,
    code: input.code,
  }

  const hasContent =
    display.toolName ||
    display.path ||
    display.query ||
    display.outputSummary ||
    display.sources.length > 0 ||
    display.document ||
    display.staticArtifact ||
    display.app ||
    display.executionSummary ||
    display.stdout ||
    display.stderr ||
    display.changedFiles.length > 0 ||
    display.error

  return hasContent ? display : null
}

export function formatNativePayload(step: RunStep): NativeToolDisplay | null {
  const payload = step.payload
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.provider !== "native"
  ) {
    return null
  }
  const record = payload as Record<string, unknown>
  const input = getRecord(record.input)
  const output = getRecord(record.output)
  const approval = getRecord(record.approval)
  const changedFiles = Array.isArray(record.changedFiles)
    ? record.changedFiles
        .map((file) => getRecord(file))
        .filter((file): file is Record<string, unknown> => Boolean(file))
    : []

  return formatNativeFromRecords({
    toolName:
      typeof record.toolName === "string" ? record.toolName : undefined,
    workspaceId:
      typeof record.workspaceId === "string" ? record.workspaceId : undefined,
    input,
    output,
    approval,
    changedFiles,
    error: typeof record.error === "string" ? record.error : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  })
}

export type MessageToolDisplay =
  | { kind: "result"; toolCallId: string; native: NativeToolDisplay }
  | {
      kind: "error"
      toolCallId: string
      toolName: string
      error: string
      code?: string
    }

export function formatMessageToolResult(part: MessagePart): MessageToolDisplay | null {
  if (part.type === "tool-error") {
    return {
      kind: "error",
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      error: part.error,
      code: part.code,
    }
  }
  if (part.type !== "tool-result") return null

  const output = getRecord(part.output)
  const native = formatNativeFromRecords({
    toolName: part.toolName,
    output,
    error: stringValue(output?.error),
    code: stringValue(output?.code),
  })

  if (!native) return null

  return {
    kind: "result",
    toolCallId: part.toolCallId,
    native,
  }
}
