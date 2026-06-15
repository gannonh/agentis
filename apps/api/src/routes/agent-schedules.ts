import { Hono } from "hono"
import {
  agentScheduleSchema,
  createAgentScheduleRequestSchema,
  updateAgentScheduleRequestSchema,
  type AgentSchedule,
  type AgentScheduleCadenceConfig,
} from "@workspace/shared"
import {
  resolveScheduleCronExpression,
  ScheduleValidationError,
  validateScheduleTiming,
} from "../invocations/schedule-calculator.js"
import type { Repositories } from "../repositories/index.js"

function scheduleValidationErrorResponse(error: ScheduleValidationError) {
  return {
    error: error.message,
    code: "invalid_agent_schedule",
    issues: [],
  }
}

function validateScheduleProject(
  repos: Repositories,
  projectId?: string | null
): Response | null {
  if (!projectId) return null
  const project = repos.projects.getById(projectId)
  if (!project || project.status === "archived") {
    return new Response(
      JSON.stringify({
        error: "Project is not available for scheduled runs.",
        code: "invalid_schedule_project",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
  return null
}

function resolveScheduleTiming(
  existing: AgentSchedule,
  patch: {
    cadence?: AgentSchedule["cadence"]
    cadenceConfig?: AgentScheduleCadenceConfig
    timezone?: string
    cronExpression?: string | null
  }
) {
  const cadence = patch.cadence ?? existing.cadence
  const cadenceConfig = patch.cadenceConfig ?? existing.cadenceConfig
  const timezone = patch.timezone ?? existing.timezone
  const cronExpression = resolveScheduleCronExpression({
    cadence,
    cronExpression: patch.cronExpression,
    existingCronExpression: existing.cronExpression,
  })

  return { cadence, cadenceConfig, timezone, cronExpression }
}

export function createAgentScheduleRoutes(repos: Repositories) {
  const app = new Hono()

  app.get("/", (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    return c.json(
      repos.agentSchedules
        .listByAgentId(agentId)
        .map((schedule) => agentScheduleSchema.parse(schedule))
    )
  })

  app.post("/", async (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(
        {
          error: "Invalid agent schedule payload",
          code: "invalid_agent_schedule",
          issues: [],
        },
        400
      )
    }

    const parsed = createAgentScheduleRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid agent schedule payload",
          code: "invalid_agent_schedule",
          issues: parsed.error.issues,
        },
        400
      )
    }

    const projectError = validateScheduleProject(repos, parsed.data.projectId)
    if (projectError) return projectError

    try {
      validateScheduleTiming({
        cadence: parsed.data.cadence,
        cadenceConfig: parsed.data.cadenceConfig,
        timezone: parsed.data.timezone,
        cronExpression: resolveScheduleCronExpression({
          cadence: parsed.data.cadence,
          cronExpression: parsed.data.cronExpression,
        }),
      })
    } catch (error) {
      if (error instanceof ScheduleValidationError) {
        return c.json(scheduleValidationErrorResponse(error), 400)
      }
      throw error
    }

    try {
      const created = repos.agentSchedules.create({
        ...parsed.data,
        agentId,
      })
      return c.json(agentScheduleSchema.parse(created), 201)
    } catch (error) {
      if (error instanceof ScheduleValidationError) {
        return c.json(scheduleValidationErrorResponse(error), 400)
      }
      throw error
    }
  })

  app.patch("/:scheduleId", async (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const scheduleId = c.req.param("scheduleId")
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    const existing = repos.agentSchedules.getById(scheduleId)
    if (!existing || existing.agentId !== agentId) {
      return c.json(
        { error: "Schedule not found", code: "agent_schedule_not_found" },
        404
      )
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(
        {
          error: "Invalid agent schedule payload",
          code: "invalid_agent_schedule",
          issues: [],
        },
        400
      )
    }

    const parsed = updateAgentScheduleRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid agent schedule payload",
          code: "invalid_agent_schedule",
          issues: parsed.error.issues,
        },
        400
      )
    }

    const projectId =
      parsed.data.projectId !== undefined
        ? parsed.data.projectId
        : existing.projectId
    const projectError = validateScheduleProject(repos, projectId)
    if (projectError) return projectError

    const timing = resolveScheduleTiming(existing, parsed.data)
    try {
      validateScheduleTiming(timing)
    } catch (error) {
      if (error instanceof ScheduleValidationError) {
        return c.json(scheduleValidationErrorResponse(error), 400)
      }
      throw error
    }

    const patch = { ...parsed.data }
    if (parsed.data.cadence !== undefined) {
      patch.cronExpression =
        timing.cadence === "custom" ? timing.cronExpression : null
    }

    try {
      const updated = repos.agentSchedules.update(scheduleId, patch)
      return c.json(agentScheduleSchema.parse(updated))
    } catch (error) {
      if (error instanceof ScheduleValidationError) {
        return c.json(scheduleValidationErrorResponse(error), 400)
      }
      throw error
    }
  })

  app.delete("/:scheduleId", (c) => {
    const agentId = c.req.param("agentId") ?? ""
    const scheduleId = c.req.param("scheduleId")
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    const existing = repos.agentSchedules.getById(scheduleId)
    if (!existing || existing.agentId !== agentId) {
      return c.json(
        { error: "Schedule not found", code: "agent_schedule_not_found" },
        404
      )
    }

    repos.agentSchedules.delete(scheduleId)
    return c.body(null, 204)
  })

  return app
}
