import { useState } from "react"
import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Link } from "react-router"
import type { Run, RunStep } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { projectDocumentTimelineAction } from "@/lib/documents/document-timeline"
import {
  formatNativePayload,
  getRecord,
  numberValue,
  stableRelativePath,
  stringValue,
} from "@/lib/thread/native-tool-display"

const statusLabel: Record<Run["status"], string> = {
  queued: "Queued",
  running: "Running",
  "tool-calling": "Tool calling",
  completed: "Completed",
  failed: "Failed",
  aborted: "Aborted",
}

function formatComposioPayload(step: RunStep) {
  const payload = step.payload
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.provider !== "composio"
  ) {
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
      <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted/50 p-2 font-mono text-[0.68rem] break-words whitespace-pre-wrap text-foreground">
        {formatDebugValue(value)}
      </pre>
    </details>
  )
}

export function RunTimeline({
  run,
  steps,
  defaultExpanded = false,
}: {
  run: Run | null
  steps: RunStep[]
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [debugMode, setDebugMode] = useState(false)
  if (!run) {
    return null
  }

  const runSteps = steps.filter((step) => step.runId === run.id)
  const debugSteps = runSteps.filter((step) =>
    Boolean(formatDebugPayload(step))
  )
  const visibleSteps = debugMode
    ? runSteps
    : runSteps.filter((step) => !formatDebugPayload(step))
  const contentId = `run-timeline-content-${run.id}`

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 bg-card/40 p-4">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex items-center gap-2 text-left"
        onClick={() => setExpanded((value) => !value)}
      >
        <HugeiconsIcon
          icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
          className="size-3.5 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <h2 className="text-sm font-medium">Run timeline</h2>
      </button>
      {expanded ? (
        <div id={contentId} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Latest run</span>
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
          const documentAction = projectDocumentTimelineAction(step)
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
              <p className="mt-0.5 text-muted-foreground capitalize">
                {step.type.replace("-", " ")} · {step.status}
              </p>
              {debug?.kind ? (
                <p className="mt-1 text-muted-foreground">{debug.kind}</p>
              ) : null}
              {debug?.error ? (
                <p className="mt-1 text-destructive">{debug.error}</p>
              ) : null}
              {debug ? (
                <div>
                  <DebugBlock
                    title="System prompt"
                    value={debug.systemPrompt}
                  />
                  <DebugBlock title="Messages" value={debug.messages} />
                  <DebugBlock title="Memories" value={debug.memories} />
                  <DebugBlock
                    title="Memory prompt"
                    value={debug.memoryPrompt}
                  />
                  <DebugBlock title="Tools" value={debug.tools} />
                  <DebugBlock title="Tool details" value={debug.toolDetails} />
                  <DebugBlock title="Workspace" value={debug.workspace} />
                  <DebugBlock
                    title="Assistant parts"
                    value={debug.assistantParts}
                  />
                  <DebugBlock title="Usage" value={debug.usage} />
                </div>
              ) : null}
              {composio?.toolkitSlug ? (
                <p className="mt-1 text-muted-foreground">
                  {composio.toolkitSlug}
                  {composio.toolSlug ? ` · ${composio.toolSlug}` : ""}
                  {composio.durationMs != null
                    ? ` · ${composio.durationMs}ms`
                    : ""}
                </p>
              ) : null}
              {native ? (
                <p className="mt-1 text-muted-foreground">
                  Native
                  {native.toolName ? ` · ${native.toolName}` : ""}
                  {native.workspaceId ? ` · ${native.workspaceId}` : ""}
                </p>
              ) : null}
              {native?.staticArtifact ? (
                <div className="mt-2 rounded-md border border-border/70 bg-background/60 p-2">
                  <p className="font-medium">
                    {native.staticArtifact.actionLabel}
                  </p>
                  {native.staticArtifact.title ? (
                    <p className="mt-1 text-muted-foreground">
                      {native.staticArtifact.title}
                    </p>
                  ) : null}
                  {native.staticArtifact.artifactType || native.staticArtifact.renderMode ? (
                    <p className="mt-1 text-muted-foreground">
                      {[
                        native.staticArtifact.artifactType,
                        native.staticArtifact.renderMode,
                        native.staticArtifact.version
                          ? `v${native.staticArtifact.version}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {native.staticArtifact.previousVersion ? (
                    <p className="mt-1 text-muted-foreground">
                      Previous version: v{native.staticArtifact.previousVersion}
                    </p>
                  ) : null}
                  {native.staticArtifact.theme ? (
                    <p className="mt-1 text-muted-foreground">
                      Theme: {native.staticArtifact.theme}
                    </p>
                  ) : null}
                  {native.staticArtifact.designBriefSummary ? (
                    <p className="mt-1 text-muted-foreground">
                      Design brief: {native.staticArtifact.designBriefSummary}
                    </p>
                  ) : null}
                  {native.staticArtifact.slideCount ? (
                    <p className="mt-1 text-muted-foreground">
                      Slides: {native.staticArtifact.slideCount}
                    </p>
                  ) : null}
                  {native.staticArtifact.provider ? (
                    <p className="mt-1 text-muted-foreground">
                      Provider: {native.staticArtifact.provider}
                    </p>
                  ) : null}
                  {native.staticArtifact.resultCount != null ? (
                    <p className="mt-1 text-muted-foreground">
                      Results: {native.staticArtifact.resultCount}
                      {native.staticArtifact.truncated ? " · truncated" : ""}
                    </p>
                  ) : null}
                  {native.staticArtifact.items.length ? (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {native.staticArtifact.items.map((item, index) => {
                        const itemPath = stableRelativePath(item.viewPath)
                        const itemTitle = stringValue(item.title) ?? stringValue(item.artifactId) ?? "Static artifact"
                        return (
                          <li key={`${itemTitle}:${index}`} className="space-y-0.5">
                            {itemPath ? (
                              <Link
                                to={itemPath}
                                className="text-foreground underline-offset-4 hover:underline"
                              >
                                {itemTitle}
                              </Link>
                            ) : (
                              itemTitle
                            )}
                            <p>
                              {[
                                stringValue(item.artifactType),
                                stringValue(item.renderMode),
                                numberValue(item.version) ? `v${numberValue(item.version)}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {stringValue(item.theme) ? <p>Theme: {stringValue(item.theme)}</p> : null}
                            {numberValue(item.slideCount) ? (
                              <p>Slides: {numberValue(item.slideCount)}</p>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                  {native.staticArtifact.errorCode ? (
                    <p className="mt-1 text-amber-700 dark:text-amber-400">
                      {native.staticArtifact.errorCode}
                    </p>
                  ) : null}
                  {native.staticArtifact.error ? (
                    <p className="mt-1 text-destructive">
                      {native.staticArtifact.error}
                    </p>
                  ) : null}
                  {native.staticArtifact.remediation ? (
                    <p className="mt-1 text-amber-700 dark:text-amber-400">
                      {native.staticArtifact.remediation}
                    </p>
                  ) : null}
                  {native.staticArtifact.viewPath ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      nativeButton={false}
                      render={<Link to={native.staticArtifact.viewPath} />}
                    >
                      Open artifact
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {native?.app ? (
                <div className="mt-2 rounded-md border border-border/70 bg-background/60 p-2">
                  <p className="font-medium">{native.app.actionLabel}</p>
                  {native.app.title ? (
                    <p className="mt-1 text-muted-foreground">{native.app.title}</p>
                  ) : null}
                  {native.app.version ? (
                    <p className="mt-1 text-muted-foreground">
                      {[
                        "app",
                        `v${native.app.version}`,
                        native.app.visibilityScope,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {native.app.previousVersion ? (
                    <p className="mt-1 text-muted-foreground">
                      Previous version: v{native.app.previousVersion}
                    </p>
                  ) : null}
                  {native.app.changeSummary ? (
                    <p className="mt-1 text-muted-foreground">
                      {native.app.changeSummary}
                    </p>
                  ) : null}
                  {native.app.resultCount != null ? (
                    <p className="mt-1 text-muted-foreground">
                      Results: {native.app.resultCount}
                      {native.app.truncated ? " · truncated" : ""}
                    </p>
                  ) : null}
                  {native.app.items.length ? (
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      {native.app.items.map((item, index) => {
                        const itemPath = stableRelativePath(item.viewPath)
                        const itemTitle =
                          stringValue(item.title) ??
                          stringValue(item.artifactId) ??
                          "App"
                        return (
                          <li key={`${itemTitle}:${index}`} className="space-y-0.5">
                            {itemPath ? (
                              <Link
                                to={itemPath}
                                className="text-foreground underline-offset-4 hover:underline"
                              >
                                {itemTitle}
                              </Link>
                            ) : (
                              itemTitle
                            )}
                            <p>
                              {[
                                numberValue(item.version)
                                  ? `v${numberValue(item.version)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                  {native.app.errorCode ? (
                    <p className="mt-1 text-amber-700 dark:text-amber-400">
                      {native.app.errorCode}
                    </p>
                  ) : null}
                  {native.app.error ? (
                    <p className="mt-1 text-destructive">{native.app.error}</p>
                  ) : null}
                  {native.app.remediation ? (
                    <p className="mt-1 text-amber-700 dark:text-amber-400">
                      {native.app.remediation}
                    </p>
                  ) : null}
                  {native.app.viewPath ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      nativeButton={false}
                      render={<Link to={native.app.viewPath} />}
                    >
                      Open artifact
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {native?.path ? (
                <p className="mt-1 text-muted-foreground">
                  Path: {native.path}
                </p>
              ) : null}
              {native?.query ? (
                <p className="mt-1 text-muted-foreground">
                  Query: {native.query}
                </p>
              ) : null}
              {native?.outputSummary ? (
                <p className="mt-1 text-muted-foreground">
                  {native.outputSummary}
                </p>
              ) : null}
              {native?.executionSummary ? (
                <p className="mt-1 text-muted-foreground">
                  {native.executionSummary}
                </p>
              ) : null}
              {native?.sources.length ? (
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {native.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {source.title}
                      </a>
                      {source.source ? ` · ${source.source}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {native?.timedOut || native?.aborted ? (
                <div className="mt-2 flex gap-1">
                  {native.timedOut ? (
                    <Badge variant="outline">Timed out</Badge>
                  ) : null}
                  {native.aborted ? (
                    <Badge variant="outline">Aborted</Badge>
                  ) : null}
                </div>
              ) : null}
              {native?.stdout ? (
                <div className="mt-2">
                  <p className="font-medium text-muted-foreground">stdout</p>
                  <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted/50 p-2 font-mono text-[0.68rem] break-words whitespace-pre-wrap text-foreground">
                    {native.stdout.text}
                    {native.stdout.truncated ? "\n[truncated]" : ""}
                  </pre>
                </div>
              ) : null}
              {native?.stderr ? (
                <div className="mt-2">
                  <p className="font-medium text-muted-foreground">stderr</p>
                  <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted/50 p-2 font-mono text-[0.68rem] break-words whitespace-pre-wrap text-foreground">
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
                <ul className="mt-2 space-y-1 text-muted-foreground">
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
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  {native.code}
                </p>
              ) : null}
              {native?.error ? (
                <p className="mt-1 text-destructive">{native.error}</p>
              ) : null}
              {composio?.error ? (
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  {composio.error}
                </p>
              ) : composio?.remediation ? (
                <p className="mt-1 text-amber-700 dark:text-amber-400">
                  {composio.remediation}
                </p>
              ) : null}
              {documentAction ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  nativeButton={false}
                  render={<Link to={documentAction.workspacePath} />}
                >
                  Open document
                </Button>
              ) : null}
            </li>
          )
        })}
      </ol>
          {debugMode && debugSteps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No debug events for this run.
            </p>
          ) : null}
          {run.errorSummary ? (
            <p className="text-xs text-destructive">{run.errorSummary}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
