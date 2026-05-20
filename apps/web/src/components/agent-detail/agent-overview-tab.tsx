import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { formatRelativeTime } from "@/fixtures"
import type { Thread } from "@/fixtures/schema"

const SUGGESTED_INTEGRATIONS = ["Slack", "Email", "Webhook", "Telegram"] as const

type AgentOverviewTabProps = {
  recentThreads: Thread[]
}

function threadStatusBadge(status: Thread["status"]) {
  if (status === "finished") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      >
        Finished
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="capitalize">
      {status}
    </Badge>
  )
}

export function AgentOverviewTab({ recentThreads }: AgentOverviewTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-lg border border-border bg-card"
        aria-labelledby="access-heading"
      >
        <div className="border-b border-border px-4 py-3">
          <h2 id="access-heading" className="text-base font-medium">
            Access
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Only you can run this agent. It has full knowledge access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-4">
          <Badge variant="secondary">Personal</Badge>
          {SUGGESTED_INTEGRATIONS.map((name) => (
            <Button key={name} variant="outline" size="sm" disabled>
              Connect {name}
            </Button>
          ))}
        </div>
      </section>

      <section
        className="rounded-lg border border-border bg-card"
        aria-labelledby="recent-threads-heading"
      >
        <div className="border-b border-border px-4 py-3">
          <h2 id="recent-threads-heading" className="text-base font-medium">
            Recent threads
          </h2>
        </div>
        {recentThreads.length === 0 ? (
          <p className="text-muted-foreground px-4 py-4 text-sm">No threads yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentThreads.map((thread) => (
              <li key={thread.id}>
                <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="font-medium">{thread.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {threadStatusBadge(thread.status)}
                    <span className="text-muted-foreground text-xs">
                      {formatRelativeTime(thread.updatedAt)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Collapsible className="group/collapsible rounded-lg border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
          <h2 className="text-base font-medium">Observability</h2>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open/collapsible:rotate-180"
            strokeWidth={2}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-4 py-4">
          <p className="text-muted-foreground text-sm">
            Usage, evaluations, and version history will appear here once the agent runs.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
