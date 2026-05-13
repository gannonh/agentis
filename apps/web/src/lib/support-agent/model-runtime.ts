import type { SupportAgentChatRequest } from "./chat-contracts"
import type { SupportAgentProviderConfig } from "./provider-config"
import type { SupportAgentRuntime } from "./runtime-boundary"

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
      const result = await generateText({
        config,
        system: supportAgentSystemPrompt,
        prompt: toSupportAgentPrompt(request),
      })

      return {
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: `message_assistant_${request.messageId}`,
        inReplyToMessageId: request.messageId,
        answer: result.text,
        sources: [],
      }
    },
  }
}

function toSupportAgentPrompt(request: SupportAgentChatRequest): string {
  return [
    `Agent: ${request.agentId}`,
    `Conversation: ${request.conversationId}`,
    `Message: ${request.messageId}`,
    `Knowledge sources: ${request.knowledgeSourceIds.join(", ")}`,
    `Question: ${request.question}`,
  ].join("\n")
}
