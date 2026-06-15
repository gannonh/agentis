import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { agentSchedules } from "../db/schema.js"
import { createTestContext } from "../test/setup.js"
import { ScheduleValidationError } from "../invocations/schedule-calculator.js"

describe("AgentScheduleRepository", () => {
  it("creates schedules with computed next run times", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Scheduler Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })

    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Hourly check",
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 0 },
      timezone: "UTC",
      promptTemplate: "Summarize open work.",
    })

    expect(schedule.agentId).toBe(agent.id)
    expect(schedule.status).toBe("enabled")
    expect(schedule.nextRunAt).toBeTruthy()
    expect(ctx.repos.agentSchedules.listByAgentId(agent.id)).toHaveLength(1)
  })

  it("lists due enabled schedules", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Due Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Due now",
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 0 },
      timezone: "UTC",
      promptTemplate: "Ping.",
    })

    ctx.db
      .update(agentSchedules)
      .set({ nextRunAt: "2020-01-01T00:00:00.000Z" })
      .where(eq(agentSchedules.id, schedule.id))
      .run()

    const due = ctx.repos.agentSchedules.listDueEnabled("2026-06-14T12:00:00.000Z")
    expect(due.map((item) => item.id)).toContain(schedule.id)
  })

  it("disables schedules and clears next run", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Disable Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Disable me",
      cadence: "daily",
      cadenceConfig: { cadence: "daily", time: "09:00" },
      timezone: "UTC",
      promptTemplate: "Ping.",
    })

    const disabled = ctx.repos.agentSchedules.disable(
      schedule.id,
      "Agent was removed."
    )
    expect(disabled?.status).toBe("disabled")
    expect(disabled?.nextRunAt).toBeUndefined()
    expect(disabled?.lastFailureReason).toBe("Agent was removed.")
  })

  it("clears stored cron expressions when cadence is not custom", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Preset Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Custom first",
      cadence: "custom",
      cadenceConfig: { cadence: "custom" },
      cronExpression: "0 */6 * * *",
      timezone: "UTC",
      promptTemplate: "Ping.",
    })

    const updated = ctx.repos.agentSchedules.update(schedule.id, {
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 10 },
    })

    expect(updated?.cadence).toBe("hourly")
    expect(updated?.cronExpression).toBeUndefined()
  })

  it("rejects invalid custom cron on create", () => {
    const ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Cron Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })

    expect(() =>
      ctx.repos.agentSchedules.create({
        agentId: agent.id,
        name: "Broken cron",
        cadence: "custom",
        cadenceConfig: { cadence: "custom" },
        cronExpression: "not valid",
        timezone: "UTC",
        promptTemplate: "Ping.",
      })
    ).toThrow(ScheduleValidationError)
  })
})

describe("AgentInvocationRunRepository", () => {
  it("prevents duplicate claims for the same due slot", () => {
    const ctx = createTestContext()
    const first = ctx.repos.agentInvocationRuns.tryClaim({
      sourceType: "schedule",
      sourceId: "schedule_1",
      dueAt: "2026-06-14T10:00:00.000Z",
    })
    const second = ctx.repos.agentInvocationRuns.tryClaim({
      sourceType: "schedule",
      sourceId: "schedule_1",
      dueAt: "2026-06-14T10:00:00.000Z",
    })

    expect(first?.status).toBe("claimed")
    expect(second).toBeNull()
  })

  it("links thread and run ids after creation", () => {
    const ctx = createTestContext()
    const claim = ctx.repos.agentInvocationRuns.tryClaim({
      sourceType: "schedule",
      sourceId: "schedule_2",
      dueAt: "2026-06-14T11:00:00.000Z",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Scheduled thread",
      mode: "agent",
      model: "gpt-4o-mini",
      prompt: "Run now",
    })

    const linked = ctx.repos.agentInvocationRuns.linkThreadAndRun(claim!.id, {
      threadId: created.thread.id,
      runId: created.run.id,
    })

    expect(linked?.status).toBe("running")
    expect(linked?.threadId).toBe(created.thread.id)
    expect(linked?.runId).toBe(created.run.id)
  })
})
