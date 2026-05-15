import type { SupportAgentChatRequest } from "./chat-contracts"
import {
  resolveSupportAgentDocumentationContext,
  toSupportAgentSources,
} from "./documentation-context"
import type { SupportAgentProviderConfig } from "./provider-config"
import {
  SupportAgentRuntimeError,
  type SupportAgentRuntime,
} from "./runtime-boundary"

const supportAgentSystemPrompt =
  "Answer as an Agentis support agent. Use only the selected knowledge sources when they are available."

export type SupportAgentTextGenerationRequest = {
  config: SupportAgentProviderConfig
  system: string
  prompt: string
}

export type SupportAgentTextGenerationResponse = {
  text: string
}

export type SupportAgentTextGenerator = (
  request: SupportAgentTextGenerationRequest
) => Promise<SupportAgentTextGenerationResponse>

export type SupportAgentModelRuntimeOptions = {
  config: SupportAgentProviderConfig
  generateText: SupportAgentTextGenerator
}

export function createSupportAgentModelRuntime({
  config,
  generateText,
}: SupportAgentModelRuntimeOptions): SupportAgentRuntime {
  return {
    async respond(request) {
      const result = await generateSupportAgentText({
        config,
        generateText,
        request,
      })

      const documentationContext = resolveSupportAgentDocumentationContext(request)

      return {
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: `message_assistant_${request.messageId}`,
        inReplyToMessageId: request.messageId,
        answer: result.text,
        sources: toSupportAgentSources(documentationContext),
        runtime: {
          mode: "model",
          provider: config.provider,
          model: config.model,
        },
      }
    },
  }
}

async function generateSupportAgentText({
  config,
  generateText,
  request,
}: SupportAgentModelRuntimeOptions & {
  request: SupportAgentChatRequest
}): Promise<SupportAgentTextGenerationResponse> {
  try {
    const result = await generateText({
      config,
      system: supportAgentSystemPrompt,
      prompt: toSupportAgentPrompt(request),
    })

    if (typeof result.text !== "string" || !result.text.trim()) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_OUTPUT_MALFORMED",
        message: "Support agent provider returned an empty answer.",
      })
    }

    return result
  } catch (error) {
    if (error instanceof SupportAgentRuntimeError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_ABORTED",
        message: "Support agent provider call was aborted.",
      })
    }

    throw new SupportAgentRuntimeError({
      code: "SUPPORT_AGENT_PROVIDER_CALL_FAILED",
      message: "Support agent provider call failed.",
    })
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  )
}

function toSupportAgentPrompt(request: SupportAgentChatRequest): string {
  const parts = [
    `Agent: ${request.agentId}`,
    `Conversation: ${request.conversationId}`,
    `Message: ${request.messageId}`,
  ]

  const documentationContext = resolveSupportAgentDocumentationContext(request)

  if (request.knowledgeSourceIds.length > 0) {
    parts.push(`Knowledge sources: ${request.knowledgeSourceIds.join(", ")}`)
  }

  if (documentationContext.length > 0) {
    parts.push(
      "Documentation context:",
      ...documentationContext.map((context) =>
        [
          `Source: ${context.title}`,
          `Path: ${context.path}`,
          context.content,
        ].join("\n")
      )
    )
  }

  parts.push(`Question: ${request.question}`)

  return parts.join("\n")
}
