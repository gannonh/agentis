import { desc, eq, inArray, sql } from "drizzle-orm"
import type { Run, RunStatus, RunUsage } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { runs } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapRun } from "../lib/mappers.js"

function serializeRunUsage(usage: RunUsage | null | undefined): string | null {
  return usage ? JSON.stringify(usage) : null
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
      })
      .where(eq(runs.id, id))
      .run()

    return this.getById(id)
  }
}
