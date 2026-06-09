import { and, desc, eq, gte, inArray, sql } from "drizzle-orm"
import type {
  AgentUsageResponse,
  CommandCenterSummary,
  Run,
  RunCostBreakdown,
  RunStatus,
  RunUsage,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { runs } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapRun } from "../lib/mappers.js"
import { roundCostUsd } from "../cost/run-cost-attribution.js"

const ACTIVE_RUN_STATUSES: RunStatus[] = [
  "queued",
  "running",
  "tool-calling",
]

function serializeRunUsage(usage: RunUsage | null | undefined): string | null {
  return usage ? JSON.stringify(usage) : null
}

function serializeRunCostBreakdown(
  breakdown: RunCostBreakdown | null | undefined
): string | null {
  return breakdown ? JSON.stringify(breakdown) : null
}

function toUtcDateKey(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10)
}

function subtractDaysIso(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

export class RunRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    threadId: string
    model: string
    status?: RunStatus
    agentId?: string
    agentConfigurationVersionId?: string
  }): Run {
    const row = {
      id: createId("run"),
      threadId: input.threadId,
      status: input.status ?? "queued",
      model: input.model,
      agentId: input.agentId ?? null,
      agentConfigurationVersionId: input.agentConfigurationVersionId ?? null,
      startedAt: nowIso(),
      finishedAt: null,
      errorSummary: null,
      usageJson: null,
      cost: null,
      costBreakdownJson: null,
    }
    this.db.insert(runs).values(row).run()
    return mapRun(row)
  }

  getById(id: string): Run | null {
    const row = this.db.select().from(runs).where(eq(runs.id, id)).get()
    return row ? mapRun(row) : null
  }

  listByThreadId(threadId: string): Run[] {
    return this.db
      .select()
      .from(runs)
      .where(eq(runs.threadId, threadId))
      .orderBy(desc(runs.startedAt))
      .all()
      .map(mapRun)
  }

  getLatestByThreadId(threadId: string): Run | null {
    const row = this.db
      .select()
      .from(runs)
      .where(eq(runs.threadId, threadId))
      .orderBy(desc(runs.startedAt))
      .get()
    return row ? mapRun(row) : null
  }

  listLatestByThreadIds(threadIds: string[]): Map<string, Run> {
    if (threadIds.length === 0) return new Map()

    const rankedRuns = this.db
      .select({
        id: runs.id,
        threadId: runs.threadId,
        status: runs.status,
        model: runs.model,
        agentId: runs.agentId,
        agentConfigurationVersionId: runs.agentConfigurationVersionId,
        startedAt: runs.startedAt,
        finishedAt: runs.finishedAt,
        errorSummary: runs.errorSummary,
        usageJson: runs.usageJson,
        cost: runs.cost,
        costBreakdownJson: runs.costBreakdownJson,
        rank: sql<number>`row_number() over (partition by ${runs.threadId} order by ${runs.startedAt} desc, ${runs.id} desc)`.as(
          "rank"
        ),
      })
      .from(runs)
      .where(inArray(runs.threadId, threadIds))
      .as("ranked_runs")

    const rows = this.db
      .select({
        id: rankedRuns.id,
        threadId: rankedRuns.threadId,
        status: rankedRuns.status,
        model: rankedRuns.model,
        agentId: rankedRuns.agentId,
        agentConfigurationVersionId: rankedRuns.agentConfigurationVersionId,
        startedAt: rankedRuns.startedAt,
        finishedAt: rankedRuns.finishedAt,
        errorSummary: rankedRuns.errorSummary,
        usageJson: rankedRuns.usageJson,
        cost: rankedRuns.cost,
        costBreakdownJson: rankedRuns.costBreakdownJson,
      })
      .from(rankedRuns)
      .where(eq(rankedRuns.rank, 1))
      .all()

    return new Map(rows.map((row) => [row.threadId, mapRun(row)]))
  }

  updateStatus(
    id: string,
    status: RunStatus,
    patch?: {
      finishedAt?: string
      errorSummary?: string | null
      usage?: RunUsage | null
      cost?: number | null
      costBreakdown?: RunCostBreakdown | null
    }
  ): Run | null {
    const existing = this.getById(id)
    if (!existing) return null

    const nextUsage =
      patch?.usage !== undefined ? patch.usage : (existing.usage ?? null)

    this.db
      .update(runs)
      .set({
        status,
        finishedAt: patch?.finishedAt ?? existing.finishedAt ?? null,
        errorSummary:
          patch?.errorSummary !== undefined
            ? patch.errorSummary
            : (existing.errorSummary ?? null),
        usageJson: serializeRunUsage(nextUsage),
        cost: patch?.cost !== undefined ? patch.cost : (existing.cost ?? null),
        costBreakdownJson:
          patch?.costBreakdown !== undefined
            ? serializeRunCostBreakdown(patch.costBreakdown)
            : existing.costBreakdown
              ? serializeRunCostBreakdown(existing.costBreakdown)
              : null,
      })
      .where(eq(runs.id, id))
      .run()

    return this.getById(id)
  }

  getAgentUsage(agentId: string, periodDays = 14): AgentUsageResponse {
    const since = subtractDaysIso(periodDays)
    const rows = this.db
      .select({
        model: runs.model,
        startedAt: runs.startedAt,
        cost: runs.cost,
        usageJson: runs.usageJson,
      })
      .from(runs)
      .where(
        and(
          eq(runs.agentId, agentId),
          eq(runs.status, "completed"),
          gte(runs.startedAt, since)
        )
      )
      .all()

    const dailyMap = new Map<string, { costUsd: number; runCount: number }>()
    const modelMap = new Map<
      string,
      {
        costUsd: number
        runCount: number
        promptTokens: number
        completionTokens: number
      }
    >()

    let totalCostUsd = 0

    for (const row of rows) {
      const costUsd = row.cost ?? 0
      totalCostUsd += costUsd

      const date = toUtcDateKey(row.startedAt)
      const daily = dailyMap.get(date) ?? { costUsd: 0, runCount: 0 }
      daily.costUsd += costUsd
      daily.runCount += 1
      dailyMap.set(date, daily)

      const modelStats = modelMap.get(row.model) ?? {
        costUsd: 0,
        runCount: 0,
        promptTokens: 0,
        completionTokens: 0,
      }
      modelStats.costUsd += costUsd
      modelStats.runCount += 1
      if (row.usageJson) {
        const usage = JSON.parse(row.usageJson) as RunUsage
        modelStats.promptTokens += usage.promptTokens ?? 0
        modelStats.completionTokens += usage.completionTokens ?? 0
      }
      modelMap.set(row.model, modelStats)
    }

    return {
      agentId,
      periodDays,
      totalCostUsd: roundCostUsd(totalCostUsd),
      totalRuns: rows.length,
      daily: [...dailyMap.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, stats]) => ({
          date,
          costUsd: roundCostUsd(stats.costUsd),
          runCount: stats.runCount,
        })),
      byModel: [...modelMap.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([model, stats]) => ({
          model,
          costUsd: roundCostUsd(stats.costUsd),
          runCount: stats.runCount,
          promptTokens: stats.promptTokens,
          completionTokens: stats.completionTokens,
        })),
    }
  }

  getCommandCenterSummary(agentCount: number): CommandCenterSummary {
    const completedRows = this.db
      .select({
        cost: runs.cost,
      })
      .from(runs)
      .where(eq(runs.status, "completed"))
      .all()

    const activeRuns = this.db
      .select({ id: runs.id })
      .from(runs)
      .where(inArray(runs.status, ACTIVE_RUN_STATUSES))
      .all().length

    const totalCostUsd = roundCostUsd(
      completedRows.reduce((total, row) => total + (row.cost ?? 0), 0)
    )

    return {
      totalCostUsd,
      totalRuns: completedRows.length,
      activeRuns,
      agentCount,
    }
  }
}
