import {
  agentScheduleCadenceConfigSchema,
  type AgentSchedule,
  type AgentScheduleLastRunStatus,
  type AgentScheduleStatus,
  type CreateAgentScheduleRequest,
  type UpdateAgentScheduleRequest,
} from "@workspace/shared"
import { and, asc, desc, eq, lte } from "drizzle-orm"
import type { AppDatabase } from "../db/client.js"
import { agentSchedules } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapAgentSchedule } from "../lib/schedule-mappers.js"
import {
  computeNextRunAt,
  resolveScheduleCronExpression,
} from "../invocations/schedule-calculator.js"

type ScheduleCreateInput = CreateAgentScheduleRequest & {
  agentId: string
}

type ScheduleUpdateInput = UpdateAgentScheduleRequest

export class AgentScheduleRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: ScheduleCreateInput): AgentSchedule {
    const now = nowIso()
    const status = input.status ?? "enabled"
    const cadenceConfig = agentScheduleCadenceConfigSchema.parse(
      input.cadenceConfig
    )
    const cronExpression = resolveScheduleCronExpression({
      cadence: input.cadence,
      cronExpression: input.cronExpression,
    })
    const nextRunAt =
      status === "enabled"
        ? computeNextRunAt({
            cadence: input.cadence,
            cadenceConfig,
            timezone: input.timezone,
            cronExpression,
          })
        : null

    const row = {
      id: createId("schedule"),
      agentId: input.agentId,
      name: input.name,
      status,
      cadence: input.cadence,
      cronExpression,
      timezone: input.timezone,
      promptTemplate: input.promptTemplate,
      projectId: input.projectId ?? null,
      cadenceConfigJson: JSON.stringify(cadenceConfig),
      nextRunAt,
      lastRunAt: null,
      lastRunStatus: null,
      lastFailureReason: null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(agentSchedules).values(row).run()
    return mapAgentSchedule(row)
  }

  getById(id: string): AgentSchedule | null {
    const row = this.db
      .select()
      .from(agentSchedules)
      .where(eq(agentSchedules.id, id))
      .get()
    return row ? mapAgentSchedule(row) : null
  }

  listByAgentId(agentId: string): AgentSchedule[] {
    return this.db
      .select()
      .from(agentSchedules)
      .where(eq(agentSchedules.agentId, agentId))
      .orderBy(desc(agentSchedules.updatedAt))
      .all()
      .map(mapAgentSchedule)
  }

  listDueEnabled(now: string): AgentSchedule[] {
    return this.db
      .select()
      .from(agentSchedules)
      .where(
        and(
          eq(agentSchedules.status, "enabled"),
          lte(agentSchedules.nextRunAt, now)
        )
      )
      .orderBy(asc(agentSchedules.nextRunAt))
      .all()
      .map(mapAgentSchedule)
  }

  hasEnabledSchedules(agentId: string): boolean {
    const row = this.db
      .select({ id: agentSchedules.id })
      .from(agentSchedules)
      .where(
        and(
          eq(agentSchedules.agentId, agentId),
          eq(agentSchedules.status, "enabled")
        )
      )
      .get()
    return Boolean(row)
  }

  update(id: string, patch: ScheduleUpdateInput): AgentSchedule | null {
    const existing = this.getById(id)
    if (!existing) return null

    const cadence = patch.cadence ?? existing.cadence
    const cadenceConfig = patch.cadenceConfig
      ? agentScheduleCadenceConfigSchema.parse(patch.cadenceConfig)
      : existing.cadenceConfig
    const timezone = patch.timezone ?? existing.timezone
    const cronExpression = resolveScheduleCronExpression({
      cadence,
      cronExpression: patch.cronExpression,
      existingCronExpression: existing.cronExpression,
    })
    const status = patch.status ?? existing.status
    const updatedAt = nowIso()
    const nextRunAt =
      status === "enabled"
        ? computeNextRunAt({
            cadence,
            cadenceConfig,
            timezone,
            cronExpression,
          })
        : null

    this.db
      .update(agentSchedules)
      .set({
        name: patch.name ?? existing.name,
        status,
        cadence,
        cronExpression,
        timezone,
        promptTemplate: patch.promptTemplate ?? existing.promptTemplate,
        projectId:
          patch.projectId !== undefined
            ? patch.projectId
            : (existing.projectId ?? null),
        cadenceConfigJson: JSON.stringify(cadenceConfig),
        nextRunAt,
        updatedAt,
      })
      .where(eq(agentSchedules.id, id))
      .run()

    return this.getById(id)
  }

  recordRunResult(input: {
    id: string
    lastRunStatus: AgentScheduleLastRunStatus
    lastFailureReason?: string | null
    ranAt: string
    recomputeNextRun?: boolean
  }): AgentSchedule | null {
    const existing = this.getById(input.id)
    if (!existing) return null

    const updatedAt = nowIso()
    const nextRunAt =
      existing.status === "enabled" && input.recomputeNextRun !== false
        ? computeNextRunAt({
            cadence: existing.cadence,
            cadenceConfig: existing.cadenceConfig,
            timezone: existing.timezone,
            cronExpression: resolveScheduleCronExpression({
              cadence: existing.cadence,
              existingCronExpression: existing.cronExpression,
            }),
            from: new Date(input.ranAt),
          })
        : existing.nextRunAt ?? null

    this.db
      .update(agentSchedules)
      .set({
        lastRunAt: input.ranAt,
        lastRunStatus: input.lastRunStatus,
        lastFailureReason: input.lastFailureReason ?? null,
        nextRunAt,
        updatedAt,
      })
      .where(eq(agentSchedules.id, input.id))
      .run()

    return this.getById(input.id)
  }

  disable(id: string, failureReason?: string | null): AgentSchedule | null {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(agentSchedules)
      .set({
        status: "disabled" as AgentScheduleStatus,
        lastFailureReason: failureReason ?? existing.lastFailureReason ?? null,
        nextRunAt: null,
        updatedAt,
      })
      .where(eq(agentSchedules.id, id))
      .run()
    return this.getById(id)
  }

  delete(id: string): boolean {
    const result = this.db
      .delete(agentSchedules)
      .where(eq(agentSchedules.id, id))
      .run()
    return result.changes > 0
  }
}
