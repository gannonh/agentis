import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

type ConnectionStatusPanelProps = {
  connectedCount: number
  connectedNames: string[]
}

export function ConnectionStatusPanel({
  connectedCount,
  connectedNames,
}: ConnectionStatusPanelProps) {
  const countLabel =
    connectedCount === 1 ? "1 connected" : `${connectedCount} connected`

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      aria-labelledby="connection-status-heading"
    >
      <div className="flex min-w-0 items-center gap-2">
        <HugeiconsIcon
          icon={Tick01Icon}
          className="size-4 shrink-0 text-emerald-600 dark:text-emerald-500"
          strokeWidth={2}
          aria-hidden
        />
        <h2 id="connection-status-heading" className="text-sm font-medium">
          Connection Status
        </h2>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            connectedCount > 0 && "text-emerald-600 dark:text-emerald-500"
          )}
        >
          {countLabel}
        </span>
      </div>
      {connectedNames.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {connectedNames.map((name) => (
            <Badge
              key={name}
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            >
              {name}
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  )
}
