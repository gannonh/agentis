import {
  resolveSupportAgentDocumentationContext,
  toSupportAgentSources,
} from "./documentation-context"
import type { SupportAgentRuntime } from "./runtime-boundary"

export function createLocalSupportAgentResponder(): SupportAgentRuntime {
  return {
    async respond(request) {
      const documentationContext = resolveSupportAgentDocumentationContext(request)
      const sourceTitles = documentationContext
        .map((context) => context.title)
        .join(", ")
      const answerPrefix = sourceTitles
        ? `Use ${sourceTitles} to answer:`
        : "Answer using available support context:"

      return {
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: `message_assistant_${request.messageId}`,
        inReplyToMessageId: request.messageId,
        answer: `${answerPrefix} ${request.question}`,
        sources: toSupportAgentSources(documentationContext),
      }
    },
  }
}
