import {
  agentScheduleCadenceConfigSchema,
  type AgentInvocationRun,
  type AgentSchedule,
} from "@workspace/shared"
import type {
  agentInvocationRuns,
  agentSchedules,
} from "../db/schema.js"

type AgentScheduleRow = typeof agentSchedules.$inferSelect
type AgentInvocationRunRow = typeof agentInvocationRuns.$inferSelect

export function mapAgentSchedule(row: AgentScheduleRow): AgentSchedule {
  return {
    id: row.id,
    agentId: row.agentId,
    name: row.name,
    status: row.status as AgentSchedule["status"],
    cadence: row.cadence as AgentSchedule["cadence"],
    cronExpression: row.cronExpression ?? undefined,
    timezone: row.timezone,
    promptTemplate: row.promptTemplate,
    projectId: row.projectId ?? undefined,
    cadenceConfig: agentScheduleCadenceConfigSchema.parse(
      JSON.parse(row.cadenceConfigJson)
    ),
    nextRunAt: row.nextRunAt ?? undefined,
    lastRunAt: row.lastRunAt ?? undefined,
    lastRunStatus: row.lastRunStatus
      ? (row.lastRunStatus as AgentSchedule["lastRunStatus"])
      : undefined,
    lastFailureReason: row.lastFailureReason ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapAgentInvocationRun(
  row: AgentInvocationRunRow
): AgentInvocationRun {
  return {
    id: row.id,
    sourceType: row.sourceType as AgentInvocationRun["sourceType"],
    sourceId: row.sourceId,
    dueAt: row.dueAt,
    status: row.status as AgentInvocationRun["status"],
    threadId: row.threadId ?? undefined,
    runId: row.runId ?? undefined,
    failureReason: row.failureReason ?? undefined,
    claimedAt: row.claimedAt ?? undefined,
    startedAt: row.startedAt ?? undefined,
    finishedAt: row.finishedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
