import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import {
  respondWithSupportAgentRuntime,
  type SupportAgentRuntime,
} from "./runtime-boundary"

describe("support-agent runtime boundary", () => {
  test("delegates Agentis chat requests through a configured runtime", async () => {
    const runtime: SupportAgentRuntime = {
      async respond(request) {
        return {
          agentId: request.agentId,
          conversationId: request.conversationId,
          messageId: "message_assistant_configured_runtime",
          inReplyToMessageId: request.messageId,
          answer: `Configured runtime handled ${request.messageId}.`,
          sources: [],
        }
      },
    }

    await expect(
      respondWithSupportAgentRuntime(runtime, supportAgentChatRequestFixture)
    ).resolves.toMatchObject({
      agentId: supportAgentChatRequestFixture.agentId,
      conversationId: supportAgentChatRequestFixture.conversationId,
      messageId: "message_assistant_configured_runtime",
      inReplyToMessageId: supportAgentChatRequestFixture.messageId,
    })
  })
})
