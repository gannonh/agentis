import { Hono } from "hono"
import { cors } from "hono/cors"
import type { AppConfig } from "./config.js"
import type { Repositories } from "./repositories/index.js"
import { createRuntimeRoutes } from "./routes/runtime.js"
import { createRunRoutes, createThreadRoutes } from "./routes/threads.js"

export function createApp(repos: Repositories, config: AppConfig) {
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  )

  app.route("/api/runtime", createRuntimeRoutes(config))
  app.route("/api/threads", createThreadRoutes(repos, config))
  app.route("/api/runs", createRunRoutes(repos, config))

  app.get("/api/health", (c) => c.json({ ok: true }))

  return app
}
