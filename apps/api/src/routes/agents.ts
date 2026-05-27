import { Hono } from "hono"
import {
  agentListItemSchema,
  createAgentRequestSchema,
  createAgentTestThreadRequestSchema,
  updateAgentRequestSchema,
} from "@workspace/shared"
import { buildAgentDetail } from "../agents/agent-detail-service.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantRemediation,
} from "../agents/tool-grant-resolution.js"
import type { AppConfig } from "../config.js"
import { summarizeTitle } from "../lib/title-summary.js"
import { toSourceWorkflowSnapshot } from "../lib/source-workflow-snapshot.js"
import type { Repositories } from "../repositories/index.js"

export function createAgentRoutes(repos: Repositories, config: AppConfig) {
  const app = new Hono()

  app.get("/", (c) => {
    return c.json(
      repos.agents.list().map((agent) => agentListItemSchema.parse(agent))
    )
  })

  app.post("/", async (c) => {
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(
        {
          error: "Invalid agent payload",
          code: "invalid_agent",
          issues: [],
        },
        400
      )
    }

    const parsed = createAgentRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid agent payload",
          code: "invalid_agent",
          issues: parsed.error.issues,
        },
        400
      )
    }

    const body = parsed.data
    const requestedGrants = body.toolGrants ?? []
    const resolvedGrants = resolveRequestedAgentGrants(repos, requestedGrants)
    if ("error" in resolvedGrants) {
      return c.json(
        {
          error: resolvedGrants.error,
          remediation: toolkitGrantRemediation(resolvedGrants.error),
        },
        400
      )
    }

    const created = repos.agents.createWithGrants(
      {
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        model: body.model ?? config.defaultModel,
      },
      resolvedGrants.grants
    )

    return c.json(buildAgentDetail(repos, created.id), 201)
  })

  app.post("/:agentId/test-thread", async (c) => {
    const agentId = c.req.param("agentId")
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
          error: "Invalid agent test thread payload",
          code: "invalid_agent_test_thread",
          issues: [],
        },
        400
      )
    }

    const parsed = createAgentTestThreadRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid agent test thread payload",
          code: "invalid_agent_test_thread",
          issues: parsed.error.issues,
        },
        400
      )
    }

    try {
      const version = repos.agents.getCurrentConfigurationSnapshot(agent.id)
      const resolvedGrants = resolveRequestedAgentGrants(
        repos,
        version.toolGrants
      )
      if ("error" in resolvedGrants) {
        return c.json(
          {
            error: resolvedGrants.error,
            remediation: toolkitGrantRemediation(resolvedGrants.error),
          },
          400
        )
      }

      const created = repos.threads.createWithInitialRun({
        title: summarizeTitle(parsed.data.prompt),
        prompt: parsed.data.prompt,
        model: version.model,
        mode: "agent",
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        agentConfigurationVersionId: version.id,
        ...toSourceWorkflowSnapshot({
          sourceThread: agent.sourceThread,
          sourceWorkflow: agent.sourceWorkflow,
        }),
        toolGrants: resolvedGrants.grants,
      })

      return c.json(created, 201)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create agent test thread"
      return c.json(
        { error: message, code: "agent_test_thread_creation_failed" },
        500
      )
    }
  })

  app.get("/:agentId", (c) => {
    const agentId = c.req.param("agentId")
    const detail = buildAgentDetail(repos, agentId)
    if (!detail) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    return c.json(detail)
  })

  app.patch("/:agentId", async (c) => {
    const agentId = c.req.param("agentId")
    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json(
        {
          error: "Invalid agent update payload",
          code: "invalid_agent_update",
          issues: [],
        },
        400
      )
    }

    const parsed = updateAgentRequestSchema.safeParse(payload)
    if (!parsed.success) {
      return c.json(
        {
          error: "Invalid agent update payload",
          code: "invalid_agent_update",
          issues: parsed.error.issues,
        },
        400
      )
    }

    const body = parsed.data
    const resolvedGrants = body.toolGrants
      ? resolveRequestedAgentGrants(repos, body.toolGrants)
      : undefined
    if (resolvedGrants && "error" in resolvedGrants) {
      return c.json(
        {
          error: resolvedGrants.error,
          remediation: toolkitGrantRemediation(resolvedGrants.error),
        },
        400
      )
    }

    const updated = repos.agents.update(agentId, {
      ...body,
      toolGrants: resolvedGrants?.grants,
    })
    if (!updated) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    const detail = buildAgentDetail(repos, agentId)
    if (!detail) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    return c.json(detail)
  })

  return app
}
