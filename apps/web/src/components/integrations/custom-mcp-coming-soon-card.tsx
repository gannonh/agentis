import { HugeiconsIcon } from "@hugeicons/react"
import { Plug01Icon } from "@hugeicons/core-free-icons"
import { Badge } from "@workspace/ui/components/badge"

export function CustomMcpComingSoonCard() {
  return (
    <article className="relative flex flex-col gap-3 rounded-lg border border-dashed border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
          <HugeiconsIcon icon={Plug01Icon} className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">Custom MCP</h3>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Coming soon
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Register your own MCP servers and grant their tools to agents. Full
            connection management is planned in HA-GAP-16.
          </p>
        </div>
      </div>
    </article>
  )
}
