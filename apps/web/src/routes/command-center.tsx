import { NavLink } from "react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import {
  formatRelativeTime,
  getAgentsForRoster,
  getWorkspace,
} from "@/fixtures"

function FleetStats({ metrics }: { metrics: ReturnType<typeof getWorkspace>["commandCenter"] }) {
  const items: { label: string; value: string | number }[] = [
    { label: "Agents", value: metrics.agents },
    { label: "Active", value: metrics.active },
    { label: "Total runs", value: metrics.totalRuns },
    { label: "Avg score", value: metrics.avgScore ?? "—" },
    { label: "Total cost", value: `$${metrics.totalCost.toFixed(2)}` },
    { label: "Pending", value: metrics.pending },
  ]

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2">
          <dt className="text-muted-foreground text-xs font-medium">{item.label}</dt>
          <dd className="text-sm font-medium tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Agent roster</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Last active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <NavLink
                          to={`/agents/${agent.id}`}
                          className="font-medium hover:underline"
                        >
                          {agent.name}
                        </NavLink>
                      </TableCell>
                      <TableCell>{agent.runCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.qualityScore ?? "—"}
                      </TableCell>
                      <TableCell>${agent.totalCost.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {agent.lastRunAt
                          ? formatRelativeTime(agent.lastRunAt)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Recent runs</h2>
            <Card>
              <CardContent className="flex flex-col gap-2 p-4">
                {workspace.runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span>{run.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      ${run.cost.toFixed(2)} · {formatRelativeTime(run.startedAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active operations</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="All quiet"
                description="No active operations right now."
                className="border-0 bg-transparent py-6"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">
                Not enough eval data for trends yet.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cost breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">No cost data yet.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Needs attention</CardTitle>
              <CardDescription>
                {metrics.pending} pending improvement
                {metrics.pending === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {workspace.needsAttention.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <p className="line-clamp-2">{item.title}</p>
                  <span className="text-muted-foreground mt-1 inline-block text-xs">
                    {item.tag}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}
