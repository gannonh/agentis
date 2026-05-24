import { Hono } from "hono"
import { cors } from "hono/cors"
import type { ComposioServices } from "./composio/index.js"
import { createComposioServices } from "./composio/index.js"
import type { AppConfig } from "./config.js"
import type { Repositories } from "./repositories/index.js"
import { createAgentRoutes } from "./routes/agents.js"
import { createArtifactRoutes } from "./routes/artifacts.js"
import { createIntegrationRoutes } from "./routes/integrations.js"
import { createProjectRoutes } from "./routes/projects.js"
import { createRuntimeRoutes } from "./routes/runtime.js"
import { createRunRoutes, createThreadRoutes } from "./routes/threads.js"
import { createToolGrantRoutes } from "./routes/tool-grants.js"

function getAllowedWebOrigins(webAppOrigin: string) {
  const normalizedOrigin = webAppOrigin.trim().replace(/\/$/, "")
  const origins = new Set([normalizedOrigin])
  try {
    const url = new URL(normalizedOrigin)
    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost"
      origins.add(url.toString().replace(/\/$/, ""))
    } else if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1"
      origins.add(url.toString().replace(/\/$/, ""))
    }
  } catch {
    // Let CORS ignore malformed custom origins by keeping the configured value.
  }
  return [...origins]
}

export function createApp(
  repos: Repositories,
  config: AppConfig,
  services: ComposioServices = createComposioServices(repos, config)
) {
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: getAllowedWebOrigins(config.webAppOrigin),
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  )

  app.route("/api/runtime", createRuntimeRoutes(config))
  app.route("/api/agents", createAgentRoutes(repos, config))
  app.route("/api/projects", createProjectRoutes(repos, config))
  app.route("/api/artifacts", createArtifactRoutes(repos, config))
  app.route("/api/integrations", createIntegrationRoutes(services, config))
  app.route("/api/threads", createThreadRoutes(repos, config))
  app.route("/api/threads", createToolGrantRoutes(repos, services, config))
  app.route("/api/runs", createRunRoutes(repos, config, services))

  app.get("/api/health", (c) => c.json({ ok: true }))

  return app
}
