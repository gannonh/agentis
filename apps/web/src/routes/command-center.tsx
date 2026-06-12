import {
  AgentRoster,
  type RosterAgent,
} from "@/components/command-center/agent-roster"
import {
  FleetStats,
  type FleetMetrics,
} from "@/components/command-center/fleet-stats"
import { NeedsAttentionPanel } from "@/components/command-center/needs-attention-panel"
import { RecentRunsPanel } from "@/components/command-center/recent-runs-panel"
import {
  ActiveOperationsPanel,
  CostBreakdownPanel,
  ScoreTrendsPanel,
} from "@/components/command-center/sidebar-panels"
import { DemoDataNotice } from "@/components/shell/demo-data-notice"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { Button } from "@workspace/ui/components/button"
import { useAgents } from "@/hooks/use-agents"
import { useCommandCenter } from "@/hooks/use-command-center"
import { useCallback, useState } from "react"
import type {
  CommandCenterNeedsAttentionItem,
  CommandCenterRosterAgent,
  CommandCenterSummary,
} from "@workspace/shared"
import type { AgentListItem } from "@workspace/shared"
import { dismissLearningSuggestion } from "@/lib/api/learning-client"

function rosterMetricsByAgentId(
  roster: CommandCenterRosterAgent[]
): Map<string, CommandCenterRosterAgent> {
  return new Map(roster.map((entry) => [entry.agentId, entry]))
}

function toRosterAgent(
  agent: AgentListItem,
  metrics?: CommandCenterRosterAgent
): RosterAgent {
  const runCount = metrics?.runCount ?? 0
  const totalCost = metrics?.totalCostUsd ?? 0
  const costPerRun = runCount > 0 ? totalCost / runCount : null

  return {
    id: agent.id,
    name: agent.name,
    icon: "search",
    rosterStatus: (metrics?.activeRunCount ?? 0) > 0 ? "active" : "idle",
    qualityTrend: "flat",
    lastRunAt: metrics?.lastRunAt ?? undefined,
    runCount,
    qualityScore: metrics?.avgScore ?? null,
    costPerRun,
    totalCost,
  }
}

function metricsFromSummary(
  summary: CommandCenterSummary,
  pending: number
): FleetMetrics {
  return {
    agents: summary.agentCount,
    active: summary.activeRuns,
    totalRuns: summary.totalRuns,
    avgScore: summary.avgScore,
    totalCost: summary.totalCostUsd,
    pending,
  }
}

function CommandCenterStatus({
  error,
  loading,
  onRetry,
}: {
  error: string | null
  loading: boolean
  onRetry: () => void
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading metrics…</p>
  }

  if (error) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-labelledby="command-center-error-heading"
      >
        <h2 id="command-center-error-heading" className="text-sm font-medium">
          Command Center metrics unavailable
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          Retry loading metrics
        </Button>
      </section>
    )
  }

  return null
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
    return <p className="text-sm text-muted-foreground">Loading agents…</p>
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
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          Retry loading agents
        </Button>
      </section>
    )
  }

  return null
}

export function CommandCenterPage() {
  const {
    agents,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
  } = useAgents()
  const {
    data: commandCenterData,
    loading: metricsLoading,
    error: metricsError,
    sectionErrors,
    refresh: refreshMetrics,
  } = useCommandCenter()

  const rosterMetrics = rosterMetricsByAgentId(commandCenterData?.roster ?? [])
  const roster = agents.map((agent) =>
    toRosterAgent(agent, rosterMetrics.get(agent.id))
  )
  const summary = commandCenterData?.summary
  const needsAttentionItems = commandCenterData?.needsAttention?.items ?? []
  const needsAttentionTotalCount =
    commandCenterData?.needsAttention?.totalCount ?? 0
  const metrics = summary
    ? metricsFromSummary(summary, needsAttentionTotalCount)
    : null
  const [dismissError, setDismissError] = useState<string | null>(null)

  const refreshCommandCenter = useCallback(async () => {
    setDismissError(null)
    await refreshMetrics()
  }, [refreshMetrics])

  const handleDismissAttention = async (
    item: CommandCenterNeedsAttentionItem
  ) => {
    if (!item.suggestionId) return
    setDismissError(null)
    try {
      await dismissLearningSuggestion(item.suggestionId)
      await refreshCommandCenter()
    } catch (error) {
      setDismissError(
        error instanceof Error ? error.message : "Failed to dismiss suggestion"
      )
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Command Center"
        description="Fleet overview, quality, cost, and items that need your attention."
      />

      <DemoDataNotice>
        Score trends and cost breakdown by model use seeded workspace data until
        their live chart APIs ship.
      </DemoDataNotice>

      {metricsLoading && !summary ? (
        <CommandCenterStatus error={null} loading onRetry={refreshCommandCenter} />
      ) : metricsError || sectionErrors.summary ? (
        <CommandCenterStatus
          error={sectionErrors.summary ?? metricsError}
          loading={false}
          onRetry={refreshCommandCenter}
        />
      ) : summary ? (
        <FleetStats metrics={metrics!} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="flex min-w-0 flex-col gap-8">
          {agentsLoading || agentsError ? (
            <AgentRosterStatus
              error={agentsError}
              loading={agentsLoading}
              onRetry={refreshAgents}
            />
          ) : (
            <AgentRoster agents={roster} />
          )}
          <RecentRunsPanel
            runs={commandCenterData?.recentRuns ?? []}
            loading={metricsLoading && commandCenterData === null}
            error={sectionErrors.recentRuns ?? null}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <ActiveOperationsPanel />
          <ScoreTrendsPanel />
          <CostBreakdownPanel totalCost={summary?.totalCostUsd ?? 0} />
          <NeedsAttentionPanel
            items={needsAttentionItems}
            pendingCount={needsAttentionTotalCount}
            error={sectionErrors.needsAttention ?? null}
            actionError={dismissError}
            onDismiss={handleDismissAttention}
          />
        </aside>
      </div>
    </PageLayout>
  )
}
