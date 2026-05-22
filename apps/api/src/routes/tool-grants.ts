import { Hono } from "hono"
import {
  createToolGrantRequestSchema,
  threadToolGrantsResponseSchema,
  toolAccessGrantSchema,
} from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import type { Repositories } from "../repositories/index.js"
import { IntegrationService } from "../composio/integration-service.js"
import type { AppConfig } from "../config.js"

export function createToolGrantRoutes(
  repos: Repositories,
  services: ComposioServices,
  config: AppConfig
) {
  const app = new Hono()
  const integrationService = new IntegrationService(
    repos,
    config,
    services.composio
  )

  app.get("/:id/tool-grants", (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const grants = repos.toolAccessGrants.listByScope("thread", thread.id)
    const connected = repos.integrationConnections.listConnectedByUserId()
    const availableToolkits = integrationService
      .listFeaturedToolkits()
      .filter(
        (toolkit) =>
          toolkit.status === "connected" ||
          connected.some((c) => c.toolkitSlug === toolkit.slug)
      )

    return c.json(
      threadToolGrantsResponseSchema.parse({
        grants,
        availableToolkits,
      })
    )
  })

  app.post("/:id/tool-grants", async (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const body = createToolGrantRequestSchema.parse(await c.req.json())
    const connection =
      body.connectionId
        ? repos.integrationConnections.getById(body.connectionId)
        : repos.integrationConnections.getByToolkitSlug(body.toolkitSlug)

    if (
      connection &&
      body.connectionId &&
      body.toolkitSlug &&
      connection.toolkitSlug !== body.toolkitSlug
    ) {
      return c.json({ error: "toolkit_connection_mismatch" }, 400)
    }

    if (!connection || connection.status !== "connected") {
      return c.json(
        {
          error: "toolkit_not_connected",
          remediation: "Connect the toolkit from Integrations before granting it to a thread.",
        },
        400
      )
    }

    const existing = repos.toolAccessGrants.getByScopeAndToolkit(
      "thread",
      thread.id,
      body.toolkitSlug
    )
    if (existing) {
      return c.json(toolAccessGrantSchema.parse(existing))
    }

    const grant = repos.toolAccessGrants.create({
      scopeType: "thread",
      scopeId: thread.id,
      toolkitSlug: body.toolkitSlug,
      connectionId: connection.id,
    })

    return c.json(toolAccessGrantSchema.parse(grant), 201)
  })

  app.delete("/:id/tool-grants/:grantId", (c) => {
    const thread = repos.threads.getById(c.req.param("id"))
    if (!thread) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const grant = repos.toolAccessGrants.getById(c.req.param("grantId"))
    if (!grant || grant.scopeId !== thread.id) {
      return c.json({ error: "Grant not found" }, 404)
    }

    repos.toolAccessGrants.delete(grant.id)
    return c.json({ ok: true })
  })

  return app
}
