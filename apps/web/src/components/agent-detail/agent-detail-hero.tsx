import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { MoreVerticalIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { AgentIcon } from "@/lib/agent-icons"
import { formatRelativeTime } from "@/fixtures"
import type { Agent } from "@/fixtures/schema"

type AgentDetailHeroProps = {
  agent: Agent
}

export function AgentDetailHero({ agent }: AgentDetailHeroProps) {
  return (
    <header className="flex flex-col gap-0">
      <nav aria-label="Breadcrumb" className="text-muted-foreground px-1 pb-5 text-sm">
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

      {/* TODO: wire this banner to per-agent theme data when themes are persisted. */}
      <div className="relative">
        <div className="h-28 w-full rounded-t-xl border border-border bg-[radial-gradient(circle_at_34%_38%,oklch(0.73_0.18_54),transparent_24%),linear-gradient(100deg,oklch(0.48_0.16_34),oklch(0.58_0.18_38),oklch(0.52_0.16_24))] sm:h-36" />
        <div className="absolute bottom-0 left-6 flex translate-y-1/2 items-end gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
            <AgentIcon icon={agent.icon} size="lg" className="text-foreground" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-x border-border px-6 pt-12 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-2xl font-medium tracking-tight">{agent.name}</h1>
          <p className="text-muted-foreground max-w-3xl text-base leading-relaxed sm:text-[0.95rem]">
            {agent.description}
          </p>
          <dl className="flex flex-wrap gap-8 text-xs">
            <div>
              <dt className="text-muted-foreground">Last run</dt>
              <dd className="mt-1 text-foreground">
                {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "No runs"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="mt-1 text-foreground">
                {agent.lastUpdatedAt ? formatRelativeTime(agent.lastUpdatedAt) : "Not saved"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <Button size="sm" className="gap-1.5" disabled>
            <HugeiconsIcon icon={PlusSignIcon} className="size-3" strokeWidth={2} />
            New thread
          </Button>
          <Button size="icon" variant="outline" disabled aria-label="Agent actions">
            <HugeiconsIcon icon={MoreVerticalIcon} className="size-4" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </header>
  )
}
