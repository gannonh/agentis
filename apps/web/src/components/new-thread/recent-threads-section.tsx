import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PickerAgentIconMark } from "@/lib/picker-agent-icon"
import { formatRelativeTime, getAgent } from "@/fixtures"
import type { AgentNavIcon, PickerAgentIcon, Thread } from "@/fixtures/schema"

const rosterIconToPickerIcon: Record<AgentNavIcon, PickerAgentIcon> = {
  search: "search",
  command: "briefing",
}

type RecentThreadsSectionProps = {
  threads: Thread[]
}

function agentIconForThread(thread: Thread): PickerAgentIcon {
  if (!thread.agentId) {
    return "agentis"
  }
  const agent = getAgent(thread.agentId)
  if (!agent?.icon) {
    return "search"
  }
  return rosterIconToPickerIcon[agent.icon]
}

export function RecentThreadsSection({ threads }: RecentThreadsSectionProps) {
  if (threads.length === 0) {
    return null
  }

  return (
    <section className="flex w-full flex-col gap-3" aria-labelledby="recent-threads-heading">
      <div className="flex items-center justify-between gap-2">
        <h2 id="recent-threads-heading" className="text-sm font-medium">
          Recent threads
        </h2>
        <Button variant="ghost" size="sm" className="h-8 text-xs" disabled>
          Show all
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <PickerAgentIconMark icon={agentIconForThread(thread)} size="sm" />
                <span className="text-muted-foreground text-xs font-medium">
                  {thread.agentName ?? "Agentis"}
                </span>
              </div>
              <p className="text-base font-medium">{thread.title}</p>
              <div className="mt-2 flex items-center gap-2">
                {thread.status === "finished" ? (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-transparent bg-transparent px-0 text-xs font-normal text-muted-foreground"
                  >
                    <span
                      className="size-1.5 rounded-full bg-muted-foreground"
                      aria-hidden
                    />
                    Finished
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="capitalize">
                    {thread.status}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  · {formatRelativeTime(thread.updatedAt)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
