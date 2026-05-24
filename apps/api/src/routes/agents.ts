import { Hono } from "hono"
import {
  agentDetailResponseSchema,
  agentListItemSchema,
  createAgentRequestSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import type { Repositories } from "../repositories/index.js"

export function createAgentRoutes(repos: Repositories, config: AppConfig) {
  const app = new Hono()

  app.get("/", (c) => {
    return c.json(
      repos.agents.list().map((agent) => agentListItemSchema.parse(agent))
    )
  })

  app.post("/", async (c) => {
    const parsed = createAgentRequestSchema.safeParse(await c.req.json())
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
    const resolvedGrants = []
    const requestedToolkitSlugs = new Set<string>()

    for (const requested of requestedGrants) {
      if (requestedToolkitSlugs.has(requested.toolkitSlug)) {
        return c.json({ error: "duplicate_toolkit_grant" }, 400)
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
        return c.json({ error: "toolkit_connection_mismatch" }, 400)
      }

      if (!connection || connection.status !== "connected") {
        return c.json(
          {
            error: "toolkit_not_connected",
            remediation:
              "Connect the toolkit from Integrations before granting it to an agent.",
          },
          400
        )
      }

      resolvedGrants.push({
        toolkitSlug: requested.toolkitSlug,
        connectionId: connection.id,
      })
    }

    const created = repos.agents.createWithGrants(
      {
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        model: body.model ?? config.defaultModel,
      },
      resolvedGrants
    )

    const agent = repos.agents.getById(created.id) ?? created
    return c.json(
      agentDetailResponseSchema.parse({
        agent,
        configurationVersions: repos.agents.listConfigurationVersions(
          created.id
        ),
        toolGrants: repos.toolAccessGrants.listByScope("agent", created.id),
      }),
      201
    )
  })

  app.get("/:agentId", (c) => {
    const agentId = c.req.param("agentId")
    const agent = repos.agents.getById(agentId)
    if (!agent) {
      return c.json({ error: "Agent not found", code: "agent_not_found" }, 404)
    }

    return c.json(
      agentDetailResponseSchema.parse({
        agent,
        configurationVersions: repos.agents.listConfigurationVersions(agentId),
        toolGrants: repos.toolAccessGrants.listByScope("agent", agentId),
      })
    )
  })

  return app
}
