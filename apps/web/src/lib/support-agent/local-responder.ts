import { resolveSupportAgentGroundingContext } from "./knowledge-grounding"
import type { SupportAgentRuntime } from "./runtime-boundary"

export function createLocalSupportAgentResponder(): SupportAgentRuntime {
  return {
    async respond(request) {
      const { sources } = await resolveSupportAgentGroundingContext(request)
      const sourceTitles = sources.map((source) => source.title).join(", ")
      const answerPrefix = sourceTitles
        ? `Use ${sourceTitles} to answer:`
        : "Answer using available support context:"

      return {
        agentId: request.agentId,
        conversationId: request.conversationId,
        messageId: `message_assistant_${request.messageId}`,
        inReplyToMessageId: request.messageId,
        answer: `${answerPrefix} ${request.question}`,
        sources,
        runtime: { mode: "demo" },
      }
    },
  }
}
