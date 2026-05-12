import { describe, expect, test } from "vitest"

import {
  supportAgentChatRequestFixture,
  toFlueSupportAgentRuntimeInput,
} from "."

describe("support-agent public module surface", () => {
  test("re-exports fixtures and adapter helpers through one module", () => {
    expect(
      toFlueSupportAgentRuntimeInput(supportAgentChatRequestFixture)
    ).toMatchObject({
      agentId: supportAgentChatRequestFixture.agentId,
      conversationId: supportAgentChatRequestFixture.conversationId,
    })
  })
})
