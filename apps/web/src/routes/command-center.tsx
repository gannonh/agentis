import { AgentRoster } from "@/components/command-center/agent-roster"
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
import { getAgentsForRoster, getWorkspace } from "@/fixtures"

export function CommandCenterPage() {
  const workspace = getWorkspace()
  const metrics = workspace.commandCenter
  const roster = getAgentsForRoster()

  return (
    <PageLayout>
      <PageHeader
        title="Command Center"
        description="Fleet overview, quality, cost, and items that need your attention."
      />

      <FleetStats metrics={metrics} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="flex min-w-0 flex-col gap-8">
          <AgentRoster agents={roster} />
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
