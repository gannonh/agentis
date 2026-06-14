import { Hono } from "hono"
import {
  agentScheduleSchema,
  createAgentScheduleRequestSchema,
  updateAgentScheduleRequestSchema,
} from "@workspace/shared"
import {
  assertValidTimezone,
  ScheduleValidationError,
  validateCronExpression,
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

function validateScheduleTiming(input: {
  cadence: string
  cadenceConfig: { cadence: string }
  timezone: string
  cronExpression?: string | null
}): ScheduleValidationError | null {
  try {
    assertValidTimezone(input.timezone)
    if (input.cadence === "custom") {
      validateCronExpression(input.cronExpression ?? "", input.timezone)
    }
    return null
  } catch (error) {
    return error instanceof ScheduleValidationError ? error : null
  }
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

    const timingError = validateScheduleTiming(parsed.data)
    if (timingError) {
      return c.json(scheduleValidationErrorResponse(timingError), 400)
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

    const timingError = validateScheduleTiming({
      cadence: parsed.data.cadence ?? existing.cadence,
      cadenceConfig: parsed.data.cadenceConfig ?? existing.cadenceConfig,
      timezone: parsed.data.timezone ?? existing.timezone,
      cronExpression:
        parsed.data.cronExpression !== undefined
          ? parsed.data.cronExpression
          : existing.cronExpression,
    })
    if (timingError) {
      return c.json(scheduleValidationErrorResponse(timingError), 400)
    }

    try {
      const updated = repos.agentSchedules.update(scheduleId, parsed.data)
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
