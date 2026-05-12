import type { SupportAgentRuntime } from "./flue-adapter"
import { supportAgentChatResponseFixture } from "./chat-fixtures"

export function createLocalSupportAgentResponder(): SupportAgentRuntime {
  return {
    async respond(request) {
      return {
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: `message_assistant_${request.messageId}`,
        inReplyToMessageId: request.messageId,
        answer: `Use Product documentation sample to answer: ${request.question}`,
        sources: supportAgentChatResponseFixture.sources.filter((source) =>
          request.knowledgeSourceIds.includes(source.knowledgeSourceId)
        ),
      }
    },
  }
}
