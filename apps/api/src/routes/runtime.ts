import { Hono } from "hono"
import { runtimeHealthSchema } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { isRuntimeAvailable } from "../config.js"

export function createRuntimeRoutes(config: AppConfig) {
  const app = new Hono()

  app.get("/health", (c) => {
    const available = isRuntimeAvailable(config)
    const health = runtimeHealthSchema.parse({
      available,
      reason:
        available || config.mockRuntime ? undefined : "missing_api_key",
      model: config.defaultModel,
    })
    return c.json(health)
  })

  return app
}
