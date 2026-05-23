import {
  AgentRoster,
  type RosterAgent,
} from "@/components/command-center/agent-roster"
import { FleetStats } from "@/components/command-center/fleet-stats"
import { NeedsAttentionPanel } from "@/components/command-center/needs-attention-panel"
import { RecentRunsPanel } from "@/components/command-center/recent-runs-panel"
import {
  ActiveOperationsPanel,
  CostBreakdownPanel,
  ScoreTrendsPanel,
} from "@/components/command-center/sidebar-panels"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { Button } from "@workspace/ui/components/button"
import { getWorkspace } from "@/fixtures"
import { useAgents } from "@/hooks/use-agents"
import type { Workspace } from "@/fixtures/schema"

function toRosterAgent(agent: ReturnType<typeof useAgents>["agents"][number]): RosterAgent {
  return {
    id: agent.id,
    name: agent.name,
    icon: "search",
    rosterStatus: "idle",
    qualityTrend: "flat",
    runCount: 0,
    qualityScore: null,
    costPerRun: null,
    totalCost: 0,
  }
}

function metricsFromRoster(
  baseMetrics: Workspace["commandCenter"],
  roster: RosterAgent[]
): Workspace["commandCenter"] {
  const scoredAgents = roster.filter((agent) => agent.qualityScore != null)
  const avgScore = scoredAgents.length
    ? Math.round(
        scoredAgents.reduce((total, agent) => total + (agent.qualityScore ?? 0), 0) /
          scoredAgents.length
      )
    : null

  return {
    ...baseMetrics,
    agents: roster.length,
    active: roster.filter((agent) => agent.rosterStatus === "active").length,
    totalRuns: roster.reduce((total, agent) => total + agent.runCount, 0),
    avgScore,
    totalCost: roster.reduce((total, agent) => total + agent.totalCost, 0),
  }
}

function AgentRosterStatus({
  error,
  loading,
  onRetry,
}: {
  error: string | null
  loading: boolean
  onRetry: () => void
}) {
  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading agents…</p>
  }

  if (error) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="agent-roster-error-heading"
      >
        <h2 id="agent-roster-error-heading" className="text-sm font-medium">
          Agent roster unavailable
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{error}</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          Retry loading agents
        </Button>
      </section>
    )
  }

  return null
}

export function CommandCenterPage() {
  const workspace = getWorkspace()
  const { agents, loading, error, refresh } = useAgents()
  const roster = agents.map(toRosterAgent)
  const metrics = metricsFromRoster(workspace.commandCenter, roster)

  return (
    <PageLayout>
      <PageHeader
        title="Command Center"
        description="Fleet overview, quality, cost, and items that need your attention."
      />

      <FleetStats metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="flex min-w-0 flex-col gap-8">
          {loading || error ? (
            <AgentRosterStatus error={error} loading={loading} onRetry={refresh} />
          ) : (
            <AgentRoster agents={roster} />
          )}
          <RecentRunsPanel runs={workspace.runs} />
        </div>

        <aside className="flex flex-col gap-4">
          <ActiveOperationsPanel />
          <ScoreTrendsPanel />
          <CostBreakdownPanel totalCost={metrics.totalCost} />
          <NeedsAttentionPanel
            items={workspace.needsAttention}
            pendingCount={metrics.pending}
          />
        </aside>
      </div>
    </PageLayout>
  )
}
