import { createGateway, type LanguageModel } from "ai"
import type { AppConfig } from "../config.js"

const LEGACY_OPENAI_MODEL_IDS = new Set(["gpt-4o-mini", "gpt-4.1-mini"])

export function resolveGatewayModelId(modelId: string): string {
  const trimmed = modelId.trim()
  if (!trimmed) {
    throw new Error("Model id is required")
  }
  if (trimmed.includes("/")) {
    return trimmed
  }
  if (LEGACY_OPENAI_MODEL_IDS.has(trimmed)) {
    return `openai/${trimmed}`
  }
  return trimmed
}

export function createGatewayLanguageModel(
  config: AppConfig,
  modelId: string
): LanguageModel {
  if (!config.aiGatewayApiKey) {
    throw new Error("AI_GATEWAY_API_KEY is not configured")
  }

  const gateway = createGateway({ apiKey: config.aiGatewayApiKey })
  return gateway(resolveGatewayModelId(modelId))
}
