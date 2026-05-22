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

function formatPayload(step: RunStep) {
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

export function RunTimeline({
  run,
  steps,
}: {
  run: Run | null
  steps: RunStep[]
}) {
  if (!run) {
    return null
  }

  const runSteps = steps.filter((step) => step.runId === run.id)

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 border-l border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Run timeline</h2>
        <Badge variant="outline">{statusLabel[run.status]}</Badge>
      </div>
      <ol className="flex flex-col gap-2">
        {runSteps.map((step) => {
          const composio = formatPayload(step)
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
              {composio?.toolkitSlug ? (
                <p className="text-muted-foreground mt-1">
                  {composio.toolkitSlug}
                  {composio.toolSlug ? ` · ${composio.toolSlug}` : ""}
                  {composio.durationMs != null ? ` · ${composio.durationMs}ms` : ""}
                </p>
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
      {run.errorSummary ? (
        <p className="text-destructive text-xs">{run.errorSummary}</p>
      ) : null}
    </aside>
  )
}
