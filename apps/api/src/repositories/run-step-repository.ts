import { asc, eq, inArray } from "drizzle-orm"
import type { RunStep, RunStepStatus, RunStepType } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { runSteps } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapRunStep } from "../lib/mappers.js"

export class RunStepRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    runId: string
    type: RunStepType
    status: RunStepStatus
    title: string
    payload?: Record<string, unknown>
  }): RunStep {
    const now = nowIso()
    const row = {
      id: createId("step"),
      runId: input.runId,
      type: input.type,
      status: input.status,
      title: input.title,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(runSteps).values(row).run()
    return mapRunStep(row)
  }

  listByRunId(runId: string): RunStep[] {
    return this.db
      .select()
      .from(runSteps)
      .where(eq(runSteps.runId, runId))
      .orderBy(asc(runSteps.createdAt))
      .all()
      .map(mapRunStep)
  }

  listByRunIds(runIds: string[]): RunStep[] {
    if (runIds.length === 0) return []
    return this.db
      .select()
      .from(runSteps)
      .where(inArray(runSteps.runId, runIds))
      .orderBy(asc(runSteps.createdAt))
      .all()
      .map(mapRunStep)
  }

  update(
    id: string,
    patch: {
      status?: RunStepStatus
      title?: string
      payload?: Record<string, unknown>
    }
  ): RunStep | null {
    const existing = this.db
      .select()
      .from(runSteps)
      .where(eq(runSteps.id, id))
      .get()
    if (!existing) return null

    const updatedAt = nowIso()
    this.db
      .update(runSteps)
      .set({
        status: patch.status ?? existing.status,
        title: patch.title ?? existing.title,
        payloadJson:
          patch.payload !== undefined
            ? JSON.stringify(patch.payload)
            : existing.payloadJson,
        updatedAt,
      })
      .where(eq(runSteps.id, id))
      .run()

    const row = this.db
      .select()
      .from(runSteps)
      .where(eq(runSteps.id, id))
      .get()
    return row ? mapRunStep(row) : null
  }
}
