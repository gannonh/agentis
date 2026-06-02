import { createGateway, type LanguageModel } from "ai"
import type { AppConfig } from "../config.js"

const LEGACY_OPENAI_MODEL_ID_PATTERN = /^(?:gpt-|chatgpt-|o\d(?:-|$))/

function isLegacyOpenAiModelId(modelId: string): boolean {
  return LEGACY_OPENAI_MODEL_ID_PATTERN.test(modelId)
}

export function resolveGatewayModelId(modelId: string): string {
  const trimmed = modelId.trim()
  if (!trimmed) {
    throw new Error("Model id is required")
  }
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/")
    if (parts.length === 2 && parts[0] && parts[1]) {
      return trimmed
    }
    throw new Error("Gateway model ids must use provider/model format")
  }
  if (isLegacyOpenAiModelId(trimmed)) {
    return `openai/${trimmed}`
  }
  throw new Error("Gateway model ids must include a provider prefix")
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
