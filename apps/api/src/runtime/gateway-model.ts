import { createGateway, type LanguageModel } from "ai"
import type { ModelMessage } from "ai"
import type { AppConfig } from "../config.js"
import {
  createCloudflareLanguageModel,
  usesCloudflareAnthropicMessagesTransport,
} from "./cloudflare-ai-gateway.js"

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
    if (parts.length === 3 && parts[0] === "@cf" && parts[1] && parts[2]) {
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

export function createGatewayLanguageModel(
  config: AppConfig,
  modelId: string
): LanguageModel {
  const resolvedModelId = resolveGatewayModelId(modelId)

  if (config.aiGatewayProvider === "cloudflare") {
    return createCloudflareLanguageModel(config, resolvedModelId)
  }

  if (!config.vercelAiGatewayApiKey) {
    throw new Error("VERCEL_AI_GATEWAY_API_KEY is not configured")
  }

  const gateway = createGateway({ apiKey: config.vercelAiGatewayApiKey })
  return gateway(resolvedModelId)
}

function prependSystemToFirstUserMessage(
  system: string,
  messages: ModelMessage[]
): { messages: ModelMessage[]; applied: boolean } {
  const trimmedSystem = system.trim()
  if (!trimmedSystem) return { messages, applied: false }

  let applied = false
  const next = messages.map((message) => {
    if (applied || message.role !== "user") return message
    applied = true
    if (typeof message.content === "string") {
      return {
        ...message,
        content: `${trimmedSystem}\n\n${message.content}`,
      }
    }
    if (Array.isArray(message.content)) {
      return {
        ...message,
        content: [{ type: "text", text: trimmedSystem }, ...message.content],
      }
    }
    return message
  })
  return { messages: next, applied }
}

export function prepareGatewayStreamPrompt(input: {
  config: AppConfig
  modelId: string
  system: string
  messages: ModelMessage[]
}): { system?: string; messages: ModelMessage[] } {
  if (!usesCloudflareAnthropicMessagesTransport(input.config, input.modelId)) {
    return { system: input.system, messages: input.messages }
  }
  const merged = prependSystemToFirstUserMessage(input.system, input.messages)
  if (!merged.applied && input.system.trim()) {
    return {
      messages: [{ role: "user", content: input.system.trim() }, ...input.messages],
    }
  }
  return { messages: merged.messages }
}
