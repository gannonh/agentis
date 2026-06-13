import { Hono } from "hono"
import {
  connectIntegrationResponseSchema,
  integrationsListQuerySchema,
  integrationsListResponseSchema,
  refreshIntegrationsResponseSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { getComposioUnavailableReason, isComposioAvailable } from "../config.js"
import type { ComposioServices } from "../composio/index.js"

export function createIntegrationRoutes(
  services: ComposioServices,
  config: AppConfig
) {
  const app = new Hono()

  app.get("/", async (c) => {
    const query = integrationsListQuerySchema.parse({
      q: c.req.query("q"),
      category: c.req.query("category"),
      featured: c.req.query("featured"),
    })

    try {
      const result = await services.integrations.listToolkits({
        q: query.q,
        category: query.category,
        featured: query.featured,
      })
      return c.json(
        integrationsListResponseSchema.parse({
          toolkits: result.toolkits,
          categories: result.categories,
          composioConfigured: isComposioAvailable(config),
          composioMockEnabled: config.mockComposio,
        })
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load integrations catalog"
      if (isComposioAvailable(config) || config.mockComposio) {
        return c.json({ error: message }, 502)
      }
      return c.json(
        integrationsListResponseSchema.parse({
          toolkits: [],
          categories: [],
          composioConfigured: false,
          composioMockEnabled: config.mockComposio,
        })
      )
    }
  })

  app.post("/:toolkitSlug/connect", async (c) => {
    try {
      const result = await services.integrations.startConnection(
        c.req.param("toolkitSlug")
      )
      return c.json(connectIntegrationResponseSchema.parse(result), 201)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start connection"
      if (message === "composio_not_configured") {
        return c.json(
          {
            error: message,
            remediation: "Set COMPOSIO_API_KEY and COMPOSIO_REDIRECT_BASE_URL or enable AGENTIS_MOCK_COMPOSIO=1.",
          },
          503
        )
      }
      if (message === "Unsupported toolkit") {
        return c.json({ error: message }, 404)
      }
      return c.json({ error: message }, 400)
    }
  })

  app.get("/callback", async (c) => {
    const connectionRequestId =
      c.req.query("connectionRequestId") ?? c.req.query("connection_request_id")
    const toolkitSlug = c.req.query("toolkitSlug") ?? c.req.query("toolkit_slug")
    const connectedAccountId =
      c.req.query("connected_account_id") ??
      c.req.query("connectedAccountId")
    const status = c.req.query("status")
    const mock = c.req.query("mock") === "1"

    try {
      const connection = await services.integrations.completeCallback({
        connectionRequestId: connectionRequestId ?? undefined,
        toolkitSlug: toolkitSlug ?? undefined,
        connectedAccountId: connectedAccountId ?? undefined,
        status: status ?? undefined,
        mock,
      })
      const slug = connection.toolkitSlug
      return c.redirect(
        `${config.webAppOrigin}/integrations?connected=${encodeURIComponent(slug)}`,
        302
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown_connection"
      return c.redirect(
        `${config.webAppOrigin}/integrations?error=${encodeURIComponent(message)}`,
        302
      )
    }
  })

  app.delete("/:toolkitSlug/connection", async (c) => {
    try {
      const reset = await services.integrations.resetConnection(
        c.req.param("toolkitSlug")
      )
      if (!reset) {
        return c.json({ error: "not_found" }, 404)
      }
      return c.json({ ok: true })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reset connection"
      if (message === "Unsupported toolkit") {
        return c.json({ error: message }, 404)
      }
      return c.json({ error: message }, 400)
    }
  })

  app.post("/refresh", async (c) => {
    if (!isComposioAvailable(config)) {
      return c.json(
        {
          error: "composio_not_configured",
          reason: getComposioUnavailableReason(config),
        },
        503
      )
    }
    const toolkits = await services.integrations.refreshAllConnections()
    return c.json(refreshIntegrationsResponseSchema.parse({ toolkits }))
  })

  return app
}
