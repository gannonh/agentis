import { useState } from "react"
import type { Run, RunStep } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const statusLabel: Record<Run["status"], string> = {
  queued: "Queued",
  running: "Running",
  "tool-calling": "Tool calling",
  completed: "Completed",
  failed: "Failed",
  aborted: "Aborted",
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function formatComposioPayload(step: RunStep) {
  const payload = step.payload
  if (!payload || typeof payload !== "object" || payload.provider !== "composio") {
    return null
  }
  const record = payload as Record<string, unknown>
  return {
    toolkitSlug:
      typeof record.toolkitSlug === "string" ? record.toolkitSlug : undefined,
    toolSlug: typeof record.toolSlug === "string" ? record.toolSlug : undefined,
    durationMs:
      typeof record.durationMs === "number" ? record.durationMs : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
    remediation:
      typeof record.remediation === "string" ? record.remediation : undefined,
    input: record.input,
    output: record.output,
  }
}

function formatDebugTools(value: unknown) {
  if (!Array.isArray(value)) return value
  return value.map((tool) => {
    if (typeof tool === "string") return tool
    const record = getRecord(tool)
    return typeof record?.name === "string" ? record.name : tool
  })
}

function inferDebugToolDetails(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const details = value.filter((tool) => getRecord(tool))
  return details.length > 0 ? details : undefined
}

function formatDebugPayload(step: RunStep) {
  const payload = step.payload
  if (!payload || typeof payload !== "object" || payload.provider !== "debug") {
    return null
  }
  const record = payload as Record<string, unknown>
  return {
    kind: typeof record.kind === "string" ? record.kind : undefined,
    systemPrompt:
      typeof record.systemPrompt === "string" ? record.systemPrompt : undefined,
    messages: record.messages,
    memoryPrompt: record.memoryPrompt,
    memories: record.memories,
    tools: formatDebugTools(record.tools),
    toolDetails: record.toolDetails ?? inferDebugToolDetails(record.tools),
    workspace: record.workspace,
    assistantParts: record.assistantParts,
    usage: record.usage,
    error: typeof record.error === "string" ? record.error : undefined,
  }
}

function formatDebugValue(value: unknown) {
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function DebugBlock({ title, value }: { title: string; value: unknown }) {
  if (value === undefined || value === null) return null

  return (
    <details className="mt-2 rounded-md border border-border/70 bg-background/60 px-2 py-1">
      <summary className="cursor-pointer text-muted-foreground">
        {title}
      </summary>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-mono text-[0.68rem] text-foreground">
        {formatDebugValue(value)}
      </pre>
    </details>
  )
}

function getNativePath(
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null
): string | undefined {
  if (typeof input?.path === "string") return input.path
  if (typeof output?.path === "string") return output.path
  return undefined
}

function formatNativeOutputSummary(
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

function formatExecutionSummary(output: Record<string, unknown> | null) {
  if (!output || output.kind !== "command" && output.kind !== "script") {
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

function formatPreview(value: unknown, truncated: unknown) {
  if (typeof value !== "string" || !value) return undefined
  return {
    text: value,
    truncated: truncated === true,
  }
}

function formatNativePayload(step: RunStep) {
  const payload = step.payload
  if (!payload || typeof payload !== "object" || payload.provider !== "native") {
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
  const path = getNativePath(input, output)
  const query = typeof input?.query === "string" ? input.query : undefined
  const truncated = output?.truncated === true
  const outputSummary = formatNativeOutputSummary(output, truncated)
  const executionSummary = formatExecutionSummary(output)
  const stdout = formatPreview(output?.stdout, output?.stdoutTruncated)
  const stderr = formatPreview(output?.stderr, output?.stderrTruncated)
  const timedOut = output?.timedOut === true
  const aborted = output?.aborted === true

  return {
    toolName: typeof record.toolName === "string" ? record.toolName : undefined,
    workspaceId:
      typeof record.workspaceId === "string" ? record.workspaceId : undefined,
    path,
    query,
    outputSummary,
    executionSummary,
    stdout,
    stderr,
    timedOut,
    aborted,
    changedFiles: changedFiles.map((file) => ({
      path: typeof file.path === "string" ? file.path : "unknown",
      operation: typeof file.operation === "string" ? file.operation : "edit",
      bytesWritten:
        typeof file.bytesWritten === "number" ? file.bytesWritten : undefined,
    })),
    approvalStatus:
      typeof approval?.status === "string" ? approval.status : undefined,
    error: typeof record.error === "string" ? record.error : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  }
}

export function RunTimeline({
  run,
  steps,
}: {
  run: Run | null
  steps: RunStep[]
}) {
  const [debugMode, setDebugMode] = useState(false)
  if (!run) {
    return null
  }

  const runSteps = steps.filter((step) => step.runId === run.id)
  const debugSteps = runSteps.filter((step) => Boolean(formatDebugPayload(step)))
  const visibleSteps = debugMode
    ? runSteps
    : runSteps.filter((step) => !formatDebugPayload(step))

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 border-l border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Run timeline</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={debugMode}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[0.625rem] font-medium",
              debugMode
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-input/20 text-muted-foreground"
            )}
            onClick={() => setDebugMode((value) => !value)}
          >
            Debug mode
          </button>
          <Badge variant="outline">{statusLabel[run.status]}</Badge>
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {visibleSteps.map((step) => {
          const composio = formatComposioPayload(step)
          const native = formatNativePayload(step)
          const debug = formatDebugPayload(step)
          return (
            <li
              key={step.id}
              className={cn(
                "rounded-lg border border-border px-3 py-2 text-xs",
                step.status === "failed" && "border-destructive/40",
                step.type === "aborted" && "border-amber-500/30"
              )}
            >
              <p className="font-medium">{step.title}</p>
              <p className="text-muted-foreground mt-0.5 capitalize">
                {step.type.replace("-", " ")} · {step.status}
              </p>
              {debug?.kind ? (
                <p className="text-muted-foreground mt-1">{debug.kind}</p>
              ) : null}
              {debug?.error ? (
                <p className="text-destructive mt-1">{debug.error}</p>
              ) : null}
              {debug ? (
                <div>
                  <DebugBlock title="System prompt" value={debug.systemPrompt} />
                  <DebugBlock title="Messages" value={debug.messages} />
                  <DebugBlock title="Memories" value={debug.memories} />
                  <DebugBlock title="Memory prompt" value={debug.memoryPrompt} />
                  <DebugBlock title="Tools" value={debug.tools} />
                  <DebugBlock title="Tool details" value={debug.toolDetails} />
                  <DebugBlock title="Workspace" value={debug.workspace} />
                  <DebugBlock title="Assistant parts" value={debug.assistantParts} />
                  <DebugBlock title="Usage" value={debug.usage} />
                </div>
              ) : null}
              {composio?.toolkitSlug ? (
                <p className="text-muted-foreground mt-1">
                  {composio.toolkitSlug}
                  {composio.toolSlug ? ` · ${composio.toolSlug}` : ""}
                  {composio.durationMs != null ? ` · ${composio.durationMs}ms` : ""}
                </p>
              ) : null}
              {native ? (
                <p className="text-muted-foreground mt-1">
                  <span>Native</span>
                  {native.toolName ? ` · ${native.toolName}` : ""}
                  {native.workspaceId ? ` · ${native.workspaceId}` : ""}
                </p>
              ) : null}
              {native?.path ? (
                <p className="text-muted-foreground mt-1">Path: {native.path}</p>
              ) : null}
              {native?.query ? (
                <p className="text-muted-foreground mt-1">Query: {native.query}</p>
              ) : null}
              {native?.outputSummary ? (
                <p className="text-muted-foreground mt-1">{native.outputSummary}</p>
              ) : null}
              {native?.executionSummary ? (
                <p className="text-muted-foreground mt-1">
                  {native.executionSummary}
                </p>
              ) : null}
              {native?.timedOut || native?.aborted ? (
                <div className="mt-2 flex gap-1">
                  {native.timedOut ? <Badge variant="outline">Timed out</Badge> : null}
                  {native.aborted ? <Badge variant="outline">Aborted</Badge> : null}
                </div>
              ) : null}
              {native?.stdout ? (
                <div className="mt-2">
                  <p className="text-muted-foreground font-medium">stdout</p>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-mono text-[0.68rem] text-foreground">
                    {native.stdout.text}
                    {native.stdout.truncated ? "\n[truncated]" : ""}
                  </pre>
                </div>
              ) : null}
              {native?.stderr ? (
                <div className="mt-2">
                  <p className="text-muted-foreground font-medium">stderr</p>
                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-mono text-[0.68rem] text-foreground">
                    {native.stderr.text}
                    {native.stderr.truncated ? "\n[truncated]" : ""}
                  </pre>
                </div>
              ) : null}
              {native?.approvalStatus ? (
                <Badge variant="outline" className="mt-2 capitalize">
                  {native.approvalStatus === "pending"
                    ? "Pending approval"
                    : native.approvalStatus}
                </Badge>
              ) : null}
              {native?.changedFiles.length ? (
                <ul className="text-muted-foreground mt-2 space-y-1">
                  {native.changedFiles.map((file, index) => (
                    <li key={`${file.operation}:${file.path}:${index}`}>
                      Changed {file.path} · {file.operation}
                      {file.bytesWritten != null
                        ? ` · ${file.bytesWritten} bytes`
                        : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {native?.code ? (
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  {native.code}
                </p>
              ) : null}
              {native?.error ? (
                <p className="text-destructive mt-1">{native.error}</p>
              ) : null}
              {composio?.remediation ? (
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  {composio.remediation}
                </p>
              ) : null}
              {composio?.error ? (
                <p className="text-destructive mt-1">{composio.error}</p>
              ) : null}
            </li>
          )
        })}
      </ol>
      {debugMode && debugSteps.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No debug events for this run.
        </p>
      ) : null}
      {run.errorSummary ? (
        <p className="text-destructive text-xs">{run.errorSummary}</p>
      ) : null}
    </aside>
  )
}
