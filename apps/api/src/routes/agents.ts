import { Hono } from "hono"
import {
  agentDetailResponseSchema,
  agentListItemSchema,
  createAgentRequestSchema,
  createAgentTestThreadRequestSchema,
  updateAgentRequestSchema,
  type AgentToolGrantInput,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { summarizeTitle } from "../lib/title-summary.js"
import type { Repositories } from "../repositories/index.js"

export function createAgentRoutes(repos: Repositories, config: AppConfig) {
  const app = new Hono()

  function resolveRequestedGrants(requestedGrants: AgentToolGrantInput[]) {
    const resolvedGrants: { toolkitSlug: string; connectionId: string }[] = []
    const requestedToolkitSlugs = new Set<string>()

    for (const requested of requestedGrants) {
      if (requestedToolkitSlugs.has(requested.toolkitSlug)) {
        return { error: "duplicate_toolkit_grant" as const }
      }
      requestedToolkitSlugs.add(requested.toolkitSlug)

      const connection = requested.connectionId
        ? repos.integrationConnections.getById(requested.connectionId)
        : repos.integrationConnections.getByToolkitSlug(requested.toolkitSlug)

      if (
        connection &&
        requested.connectionId &&
        connection.toolkitSlug !== requested.toolkitSlug
      ) {
        return { error: "toolkit_connection_mismatch" as const }
      }

      if (!connection || connection.status !== "connected") {
        return { error: "toolkit_not_connected" as const }
      }

      resolvedGrants.push({
        toolkitSlug: requested.toolkitSlug,
        connectionId: connection.id,
      })
    }

    return { grants: resolvedGrants }
  }

  function toolkitGrantRemediation(
    error: string | undefined
  ): string | undefined {
    if (error !== "toolkit_not_connected") return undefined
    return "Connect the toolkit from Integrations before granting it to an agent."
  }

  function agentDetail(agentId: string) {
    const agent = repos.agents.getById(agentId)
    if (!agent) return null

    const toolGrants = repos.toolAccessGrants.listByScope("agent", agentId)

    return agentDetailResponseSchema.parse({
      agent,
      configurationVersions: repos.agents.listConfigurationVersions(agentId),
      toolGrants,
      information: {
        configuredTools: toolGrants.map((grant) => ({
          id: grant.id,
          toolkitSlug: grant.toolkitSlug,
          connectionId: grant.connectionId,
          createdAt: grant.createdAt,
        })),
        recentThreads: [],
        library: { items: [], totalCount: 0 },
      },
    })
  }

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
    const resolvedGrants = resolveRequestedGrants(requestedGrants)
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

    return c.json(agentDetail(created.id), 201)
  })

  app.post("/:agentId/test-thread", async (c) => {
    const agentId = c.req.param("agentId")
    const detail = agentDetail(agentId)
    if (!detail) {
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
      const version = repos.agents.getCurrentConfigurationSnapshot(
        detail.agent.id
      )
      const resolvedGrants = resolveRequestedGrants(version.toolGrants)
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
        agentId: detail.agent.id,
        agentNameSnapshot: detail.agent.name,
        agentConfigurationVersionId: version.id,
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
    const detail = agentDetail(agentId)
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
      ? resolveRequestedGrants(body.toolGrants)
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

    const detail = agentDetail(agentId)
    if (!detail) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    return c.json(detail)
  })

  return app
}
