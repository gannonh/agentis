import { Hono } from "hono"
import {
  getGatewayModelsForProvider,
  runtimeHealthSchema,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import {
  getComposioUnavailableReason,
  getRuntimeMissingEnvVars,
  isComposioAvailable,
  isRuntimeAvailable,
} from "../config.js"

export function createRuntimeRoutes(config: AppConfig) {
  const app = new Hono()

  app.get("/health", (c) => {
    const available = isRuntimeAvailable(config)
    const missingEnvVars = getRuntimeMissingEnvVars(config)
    const composioAvailable = isComposioAvailable(config)
    const models = getGatewayModelsForProvider(config.aiGatewayProvider)
    const health = runtimeHealthSchema.parse({
      available,
      reason:
        available || config.mockRuntime ? undefined : "missing_api_key",
      model: config.defaultModel,
      defaultModel: config.defaultModel,
      models,
      aiGatewayProvider: config.aiGatewayProvider,
      missingEnvVars: missingEnvVars.length > 0 ? missingEnvVars : undefined,
      composio: {
        available: composioAvailable,
        reason: composioAvailable
          ? undefined
          : getComposioUnavailableReason(config),
      },
    })
    return c.json(health)
  })

  return app
}
