import { Hono } from "hono"
import { runtimeHealthSchema } from "@workspace/shared"
import type { AppConfig } from "../config.js"
import {
  getComposioUnavailableReason,
  isComposioAvailable,
  isRuntimeAvailable,
} from "../config.js"

export function createRuntimeRoutes(config: AppConfig) {
  const app = new Hono()

  app.get("/health", (c) => {
    const available = isRuntimeAvailable(config)
    const composioAvailable = isComposioAvailable(config)
    const health = runtimeHealthSchema.parse({
      available,
      reason:
        available || config.mockRuntime ? undefined : "missing_api_key",
      model: config.defaultModel,
      composio: {
        available: composioAvailable,
        reason: composioAvailable
          ? getComposioUnavailableReason(config)
          : getComposioUnavailableReason(config),
      },
    })
    return c.json(health)
  })

  return app
}
