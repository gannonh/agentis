import type { ComposioServices } from "../composio/index.js"
import type { AppConfig } from "../config.js"
import { nowIso } from "../lib/ids.js"
import type { Repositories } from "../repositories/index.js"
import {
  createRunExecutor,
  startAgentScheduledRun,
  validateRuntimeForExecution,
} from "./agent-run-starter.js"

export type ScheduleProducerResult = {
  processed: number
  completed: number
  failed: number
  skipped: number
}

export class ScheduleProducer {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly services: ComposioServices
  ) {}

  async processDueSchedules(now = nowIso()): Promise<ScheduleProducerResult> {
    const result: ScheduleProducerResult = {
      processed: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
    }

    const dueSchedules = this.repos.agentSchedules.listDueEnabled(now)
    for (const schedule of dueSchedules) {
      result.processed += 1
      const dueAt = schedule.nextRunAt
      if (!dueAt) {
        result.skipped += 1
        continue
      }

      const claim = this.repos.agentInvocationRuns.tryClaim({
        sourceType: "schedule",
        sourceId: schedule.id,
        dueAt,
      })
      if (!claim) {
        result.skipped += 1
        continue
      }

      const currentSchedule = this.repos.agentSchedules.getById(schedule.id)
      if (!currentSchedule || currentSchedule.status !== "enabled") {
        this.repos.agentInvocationRuns.markStatus(claim.id, {
          status: "skipped",
          failureReason: "Schedule is disabled.",
        })
        result.skipped += 1
        continue
      }

      const runtimeError = validateRuntimeForExecution(this.config)
      if (runtimeError) {
        await this.failInvocation({
          claimId: claim.id,
          scheduleId: schedule.id,
          ranAt: now,
          failureReason: runtimeError,
        })
        result.failed += 1
        continue
      }

      const started = startAgentScheduledRun(this.repos, {
        agentId: schedule.agentId,
        prompt: schedule.promptTemplate,
        projectId: schedule.projectId,
      })

      if (!started.ok) {
        if (started.code === "agent_not_found") {
          this.repos.agentSchedules.disable(
            schedule.id,
            started.message
          )
        }
        await this.failInvocation({
          claimId: claim.id,
          scheduleId: schedule.id,
          ranAt: now,
          failureReason: started.message,
        })
        result.failed += 1
        continue
      }

      this.repos.agentInvocationRuns.linkThreadAndRun(claim.id, {
        threadId: started.threadId,
        runId: started.runId,
      })

      this.repos.steps.create({
        runId: started.runId,
        type: "reasoning",
        status: "completed",
        title: "Scheduled invocation",
        payload: {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          dueAt,
        },
      })

      try {
        const executor = createRunExecutor(
          this.repos,
          this.config,
          this.services
        )
        const completedRun = await executor.executeToCompletion(started.runId)
        const finishedAt = nowIso()
        if (completedRun.status === "completed") {
          this.repos.agentInvocationRuns.markStatus(claim.id, {
            status: "completed",
            finishedAt,
          })
          this.repos.agentSchedules.recordRunResult({
            id: schedule.id,
            lastRunStatus: "completed",
            ranAt: finishedAt,
            lastFailureReason: null,
          })
          result.completed += 1
        } else {
          const failureReason =
            completedRun.errorSummary ??
            `Scheduled run finished with status ${completedRun.status}.`
          await this.failInvocation({
            claimId: claim.id,
            scheduleId: schedule.id,
            ranAt: finishedAt,
            failureReason,
          })
          result.failed += 1
        }
      } catch (error) {
        const failureReason =
          error instanceof Error ? error.message : "Scheduled run failed."
        await this.failInvocation({
          claimId: claim.id,
          scheduleId: schedule.id,
          ranAt: nowIso(),
          failureReason,
        })
        result.failed += 1
      }
    }

    return result
  }

  private async failInvocation(input: {
    claimId: string
    scheduleId: string
    ranAt: string
    failureReason: string
  }) {
    this.repos.agentInvocationRuns.markStatus(input.claimId, {
      status: "failed",
      failureReason: input.failureReason,
      finishedAt: input.ranAt,
    })
    this.repos.agentSchedules.recordRunResult({
      id: input.scheduleId,
      lastRunStatus: "failed",
      lastFailureReason: input.failureReason,
      ranAt: input.ranAt,
    })
  }
}
