import { describe, expect, test } from "vitest"

import {
  createAiSdkOpenAiTextGenerator,
  supportAgentChatRequestFixture,
  toFlueSupportAgentRuntimeInput,
  type SupportAgentRuntime,
} from "."

describe("support-agent public module surface", () => {
  test("re-exports fixtures and adapter helpers through one module", () => {
    const runtime: SupportAgentRuntime = {
      async respond(request) {
        return {
          agentId: request.agentId,
          conversationId: request.conversationId,
          messageId: `message_assistant_${request.messageId}`,
          inReplyToMessageId: request.messageId,
          answer: request.question,
          sources: [],
        }
      },
    }

    expect(runtime).toHaveProperty("respond")
    expect(
      toFlueSupportAgentRuntimeInput(supportAgentChatRequestFixture)
    ).toMatchObject({
      agentId: supportAgentChatRequestFixture.agentId,
      conversationId: supportAgentChatRequestFixture.conversationId,
    })
    expect(createAiSdkOpenAiTextGenerator).toEqual(expect.any(Function))
  })
})
