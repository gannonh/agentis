import { NavLink } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { AgentRosterIcon } from "@/components/command-center/agent-roster-icons"
import {
  rosterStatusClass,
  rosterStatusLabel,
} from "@/components/command-center/roster-status"
import { QualityScoreCell } from "@/components/command-center/quality-score-cell"
import { QualityTrendCell } from "@/components/command-center/quality-trend-cell"
import { formatRelativeTime } from "@/fixtures"
import { cn } from "@workspace/ui/lib/utils"

type AgentRosterStatus = "active" | "idle" | "error"
type QualityTrend = "up" | "down" | "flat"

export type RosterAgent = {
  id: string
  name: string
  icon?: "search" | "command"
  rosterStatus?: AgentRosterStatus
  qualityTrend?: QualityTrend
  lastRunAt?: string
  runCount: number
  qualityScore?: number | null
  costPerRun?: number | null
  totalCost: number
}

type AgentRosterProps = {
  agents: RosterAgent[]
}

export function AgentRoster({ agents }: AgentRosterProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="agent-roster-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="agent-roster-heading" className="text-sm font-medium">
            Agent roster
          </h2>
          <Badge
            variant="secondary"
            className="border-status-success-border bg-status-success-muted text-status-success-foreground"
          >
            {agents.length} {agents.length === 1 ? "agent" : "agents"}
          </Badge>
        </div>
        <Input
          placeholder="Search agents…"
          className="h-8 max-w-xs"
          disabled
          aria-label="Search agents"
        />
      </div>

      <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <div className="min-w-[40rem] overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Runs</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Quality trend</TableHead>
              <TableHead className="text-right">Cost / run</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          rosterStatusClass(agent.rosterStatus ?? "idle")
                        )}
                        aria-hidden
                      />
                      <span className="sr-only">
                        {rosterStatusLabel(agent.rosterStatus ?? "idle")}
                      </span>
                    </span>
                    <AgentRosterIcon icon={agent.icon} />
                    <NavLink
                      to={`/agents/${agent.id}`}
                      className="font-medium hover:underline"
                    >
                      {agent.name}
                    </NavLink>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{agent.runCount}</TableCell>
                <TableCell>
                  <QualityScoreCell score={agent.qualityScore} />
                </TableCell>
                <TableCell>
                  <QualityTrendCell trend={agent.qualityTrend} />
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-sm tabular-nums">
                  {agent.costPerRun != null ? `$${agent.costPerRun.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  ${agent.totalCost.toFixed(2)}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-sm">
                  {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </section>
  )
}
