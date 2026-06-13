import { createAnthropic } from "@ai-sdk/anthropic"
import type { LanguageModel } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { AppConfig } from "../config.js"
import { formatMissingEnvVarsMessage } from "../config.js"
import { resolveGatewayModelId } from "./gateway-model.js"

/**
 * Cloudflare REST API transports for LLM chat runs.
 *
 * @see https://developers.cloudflare.com/ai-gateway/usage/rest-api/
 * - anthropic/* → POST /ai/v1/messages (Anthropic SDK)
 * - openai/*, google/*, xai/*, … → POST /ai/v1/chat/completions (OpenAI schema)
 * - @cf/* → POST /ai/v1/chat/completions with required cf-aig-gateway-id
 */
export type CloudflareLlmTransport =
  | "anthropic-messages"
  | "openai-chat-completions"
  | "workers-ai-chat-completions"

export function resolveCloudflareLlmTransport(
  resolvedModelId: string
): CloudflareLlmTransport {
  if (resolvedModelId.startsWith("anthropic/")) {
    return "anthropic-messages"
  }
  if (resolvedModelId.startsWith("@cf/")) {
    return "workers-ai-chat-completions"
  }
  return "openai-chat-completions"
}

export function isWorkersAiGatewayModel(resolvedModelId: string): boolean {
  return resolvedModelId.startsWith("@cf/")
}

export function cloudflareRestBaseUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`
}

export function gatewayModelProvider(resolvedModelId: string): string {
  if (resolvedModelId.startsWith("@cf/")) return "workers-ai"
  const slash = resolvedModelId.indexOf("/")
  return slash === -1 ? "" : resolvedModelId.slice(0, slash)
}

export function gatewayModelName(resolvedModelId: string): string {
  const slash = resolvedModelId.indexOf("/")
  return slash === -1 ? resolvedModelId : resolvedModelId.slice(slash + 1)
}

/** Workers AI requests always require cf-aig-gateway-id; third-party models may use the account default. */
export function resolveCloudflareGatewayId(
  config: AppConfig,
  resolvedModelId: string
): string | undefined {
  if (config.cloudflareAiGatewayId) return config.cloudflareAiGatewayId
  if (isWorkersAiGatewayModel(resolvedModelId)) return "default"
  return undefined
}

export function buildCloudflareRestHeaders(
  config: AppConfig,
  resolvedModelId: string
): Record<string, string> | undefined {
  const gatewayId = resolveCloudflareGatewayId(config, resolvedModelId)
  return gatewayId ? { "cf-aig-gateway-id": gatewayId } : undefined
}

/**
 * OpenAI reasoning-era models reject max_tokens on chat/completions.
 * Logic mirrors @ai-sdk/openai capability detection on the bare model name.
 */
export function isOpenAiReasoningEraModel(modelName: string): boolean {
  return !(
    modelName.startsWith("gpt-3") ||
    modelName.startsWith("gpt-4") ||
    modelName.startsWith("chatgpt-4o") ||
    modelName.startsWith("gpt-5-chat")
  )
}

/**
 * Normalize OpenAI-schema requests before they reach Cloudflare chat/completions.
 * Provider-specific quirks are handled here instead of per-model catalog flags.
 */
export function transformCloudflareOpenAiChatRequestBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const model = typeof args.model === "string" ? args.model : ""
  let result: Record<string, unknown> = { ...args }

  if (gatewayModelProvider(model) === "openai") {
    const name = gatewayModelName(model)
    if (
      isOpenAiReasoningEraModel(name) &&
      result.max_tokens != null &&
      result.max_completion_tokens == null
    ) {
      const { max_tokens: maxTokens, ...rest } = result
      result = { ...rest, max_completion_tokens: maxTokens }
    }
  }

  return result
}

export function usesCloudflareAnthropicMessagesTransport(
  config: AppConfig,
  modelId: string
): boolean {
  if (config.aiGatewayProvider !== "cloudflare") return false
  return (
    resolveCloudflareLlmTransport(resolveGatewayModelId(modelId)) ===
    "anthropic-messages"
  )
}

export function createCloudflareLanguageModel(
  config: AppConfig,
  resolvedModelId: string
): LanguageModel {
  const missing = [
    ...(config.cloudflareApiKey ? [] : ["CLOUDFLARE_API_KEY"]),
    ...(config.cloudflareAccountId ? [] : ["CLOUDFLARE_ACCOUNT_ID"]),
  ]
  if (missing.length > 0) {
    throw new Error(formatMissingEnvVarsMessage(missing))
  }

  const cloudflareApiKey = config.cloudflareApiKey!
  const cloudflareAccountId = config.cloudflareAccountId!
  const baseURL = cloudflareRestBaseUrl(cloudflareAccountId)
  const gatewayHeaders = buildCloudflareRestHeaders(config, resolvedModelId)
  const transport = resolveCloudflareLlmTransport(resolvedModelId)

  if (transport === "anthropic-messages") {
    const anthropic = createAnthropic({
      apiKey: cloudflareApiKey,
      baseURL,
      headers: {
        Authorization: `Bearer ${cloudflareApiKey}`,
        ...gatewayHeaders,
      },
    })
    return anthropic(resolvedModelId)
  }

  const gateway = createOpenAICompatible({
    name: "cloudflare-ai-gateway",
    apiKey: cloudflareApiKey,
    baseURL,
    headers: gatewayHeaders,
    transformRequestBody: transformCloudflareOpenAiChatRequestBody,
  })
  return gateway(resolvedModelId)
}
