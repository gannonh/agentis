import { eq } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { agentInvocationRuns, agentSchedules } from "../db/schema.js"
import { createComposioServices } from "../composio/index.js"
import { createTestContext } from "../test/setup.js"
import { InvocationWorker } from "./invocation-worker.js"
import { ScheduleProducer } from "./schedule-producer.js"

describe("ScheduleProducer", () => {
  it("claims due schedules, creates runs, and completes them in the background", async () => {
    const ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Worker Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Hourly ping",
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 0 },
      timezone: "UTC",
      promptTemplate: "Say hello in one short sentence.",
    })
    ctx.db
      .update(agentSchedules)
      .set({ nextRunAt: "2020-01-01T00:00:00.000Z" })
      .where(eq(agentSchedules.id, schedule.id))
      .run()

    const producer = new ScheduleProducer(ctx.repos, config, services)
    const result = await producer.processDueSchedules("2026-06-14T12:00:00.000Z")

    expect(result.processed).toBe(1)
    expect(result.completed).toBe(1)
    const invocations = ctx.repos.agentInvocationRuns.listBySource(
      "schedule",
      schedule.id
    )
    expect(invocations).toHaveLength(1)
    expect(invocations[0]?.status).toBe("completed")
    expect(invocations[0]?.runId).toBeTruthy()
    expect(ctx.repos.runs.getById(invocations[0]!.runId!)?.status).toBe(
      "completed"
    )
    const updatedSchedule = ctx.repos.agentSchedules.getById(schedule.id)
    expect(updatedSchedule?.lastRunStatus).toBe("completed")
    expect(updatedSchedule?.nextRunAt).toBeTruthy()
  }, 20_000)

  it("skips duplicate claims for the same due slot", async () => {
    const ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Duplicate Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const dueAt = "2020-01-01T00:00:00.000Z"
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Hourly duplicate",
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 0 },
      timezone: "UTC",
      promptTemplate: "Say hello in one short sentence.",
    })
    ctx.db
      .update(agentSchedules)
      .set({ nextRunAt: dueAt })
      .where(eq(agentSchedules.id, schedule.id))
      .run()

    const producer = new ScheduleProducer(ctx.repos, config, services)
    const first = await producer.processDueSchedules("2026-06-14T12:00:00.000Z")
    ctx.db
      .update(agentSchedules)
      .set({ nextRunAt: dueAt })
      .where(eq(agentSchedules.id, schedule.id))
      .run()
    const second = await producer.processDueSchedules("2026-06-14T12:00:00.000Z")

    expect(first.completed).toBe(1)
    expect(second.skipped).toBe(1)
    expect(
      ctx.repos.agentInvocationRuns.listBySource("schedule", schedule.id)
    ).toHaveLength(1)
  }, 25_000)

  it("records project validation failures without disabling the schedule", async () => {
    const ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Project Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const project = ctx.repos.projects.create({ name: "Archived project" })
    ctx.repos.projects.archive(project.id)
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Archived project schedule",
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 0 },
      timezone: "UTC",
      promptTemplate: "Ping.",
      projectId: project.id,
    })
    ctx.db
      .update(agentSchedules)
      .set({ nextRunAt: "2020-01-01T00:00:00.000Z" })
      .where(eq(agentSchedules.id, schedule.id))
      .run()

    const producer = new ScheduleProducer(ctx.repos, config, services)
    const result = await producer.processDueSchedules("2026-06-14T12:00:00.000Z")

    expect(result.failed).toBe(1)
    const updatedSchedule = ctx.repos.agentSchedules.getById(schedule.id)
    expect(updatedSchedule?.status).toBe("enabled")
    expect(updatedSchedule?.lastFailureReason).toContain("Project")
  })
})

describe("InvocationWorker", () => {
  it("marks stale claims failed and advances the schedule", async () => {
    const ctx = createTestContext()
    const config = { ...ctx.config, mockRuntime: true }
    const services = createComposioServices(ctx.repos, config)
    const agent = ctx.repos.agents.create({
      name: "Stale Agent",
      systemPrompt: "Run on schedule.",
      model: "gpt-4o-mini",
    })
    const schedule = ctx.repos.agentSchedules.create({
      agentId: agent.id,
      name: "Stale claim",
      cadence: "hourly",
      cadenceConfig: { cadence: "hourly", minute: 0 },
      timezone: "UTC",
      promptTemplate: "Ping.",
    })
    const claim = ctx.repos.agentInvocationRuns.tryClaim({
      sourceType: "schedule",
      sourceId: schedule.id,
      dueAt: "2020-01-01T00:00:00.000Z",
    })
    ctx.db
      .update(agentInvocationRuns)
      .set({ claimedAt: "2020-01-01T00:00:00.000Z" })
      .where(eq(agentInvocationRuns.id, claim!.id))
      .run()
    ctx.db
      .update(agentSchedules)
      .set({ nextRunAt: "2020-01-01T00:00:00.000Z" })
      .where(eq(agentSchedules.id, schedule.id))
      .run()

    const worker = new InvocationWorker(ctx.repos, config, services, {
      staleClaimMs: 1,
    })
    await worker.tick("2026-06-14T12:00:00.000Z")

    const updatedClaim = ctx.repos.agentInvocationRuns.getById(claim!.id)
    expect(updatedClaim?.status).toBe("failed")
    const updatedSchedule = ctx.repos.agentSchedules.getById(schedule.id)
    expect(updatedSchedule?.lastRunStatus).toBe("failed")
    expect(updatedSchedule?.lastFailureReason).toContain("Stale invocation")
  })
})
