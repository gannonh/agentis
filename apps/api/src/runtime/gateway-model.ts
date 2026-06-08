import { createGateway, type LanguageModel } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { formatMissingEnvVarsMessage, type AppConfig } from "../config.js"

const LEGACY_OPENAI_MODEL_ID_PATTERN = /^(?:gpt-|chatgpt-|o\d(?:-|$))/

function isLegacyOpenAiModelId(modelId: string): boolean {
  return LEGACY_OPENAI_MODEL_ID_PATTERN.test(modelId)
}

export function resolveGatewayModelId(modelId: string): string {
  const trimmed = modelId.trim()
  if (!trimmed) {
    throw new Error("Model id is required")
  }
  if (trimmed.startsWith("@cf/")) {
    const parts = trimmed.split("/")
    if (parts.length >= 3 && parts[0] === "@cf" && parts[1] && parts[2]) {
      return trimmed
    }
    throw new Error("Workers AI model ids must use @cf/author/model format")
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

function cloudflareBaseUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`
}

function cloudflareHeaders(
  gatewayId: string | undefined
): Record<string, string> | undefined {
  return gatewayId ? { "cf-aig-gateway-id": gatewayId } : undefined
}

export function createGatewayLanguageModel(
  config: AppConfig,
  modelId: string
): LanguageModel {
  const resolvedModelId = resolveGatewayModelId(modelId)

  if (config.aiGatewayProvider === "cloudflare") {
    const missing = [
      ...(config.cloudflareApiKey ? [] : ["CLOUDFLARE_API_KEY"]),
      ...(config.cloudflareAccountId ? [] : ["CLOUDFLARE_ACCOUNT_ID"]),
    ]
    if (missing.length > 0) {
      throw new Error(formatMissingEnvVarsMessage(missing))
    }

    const cloudflareApiKey = config.cloudflareApiKey!
    const cloudflareAccountId = config.cloudflareAccountId!

    const gateway = createOpenAICompatible({
      name: "cloudflare-ai-gateway",
      apiKey: cloudflareApiKey,
      baseURL: cloudflareBaseUrl(cloudflareAccountId),
      headers: cloudflareHeaders(config.cloudflareAiGatewayId),
    })
    return gateway(resolvedModelId)
  }

  if (!config.vercelAiGatewayApiKey) {
    throw new Error("VERCEL_AI_GATEWAY_API_KEY is not configured")
  }

  const gateway = createGateway({ apiKey: config.vercelAiGatewayApiKey })
  return gateway(resolvedModelId)
}
