import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { AgentIcon } from "@/lib/agent-icons"
import { formatRelativeTime } from "@/fixtures"
import type { Agent } from "@/fixtures/schema"

type AgentDetailHeroProps = {
  agent: Agent
}

export function AgentDetailHero({ agent }: AgentDetailHeroProps) {
  return (
    <header className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              to="/command-center"
              className="hover:text-foreground transition-colors"
            >
              Agents
            </Link>
          </li>
          <li aria-hidden className="select-none">
            /
          </li>
          <li className="text-foreground font-medium" aria-current="page">
            {agent.name}
          </li>
        </ol>
      </nav>

      <div className="relative">
        <div
          className="bg-muted h-24 w-full rounded-lg border border-border"
          aria-hidden
        />
        <div className="absolute bottom-0 left-4 flex translate-y-1/2 items-end gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-background bg-card shadow-sm">
            <AgentIcon icon={agent.icon} size="lg" className="text-foreground" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            {agent.description}
          </p>
          <p className="text-muted-foreground text-xs">
            Last run {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "—"} · Last
            updated{" "}
            {agent.lastUpdatedAt ? formatRelativeTime(agent.lastUpdatedAt) : "—"}
          </p>
        </div>
        <Button size="sm" className="shrink-0 self-start" disabled>
          + New thread
        </Button>
      </div>
    </header>
  )
}
