import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import {
  resolveSupportAgentGroundingContext,
  toGroundedPromptExcerpts,
} from "./knowledge-grounding"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("support agent knowledge grounding", () => {
  test("rejects unknown knowledge source ids before retrieval", async () => {
    await expect(
      resolveSupportAgentGroundingContext({
        ...supportAgentChatRequestFixture,
        knowledgeSourceIds: ["knowledge_unknown"],
        knowledgeSources: [
          {
            id: "knowledge_unknown",
            title: "Unknown",
            description: "Unknown source",
            contextReference: {
              type: "local-documentation",
              path: "docs/knowledge/product-documentation-sample.md",
            },
          },
        ],
      })
    ).rejects.toMatchObject({
      code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
    })
  })

  test("rejects knowledge sources whose path does not match the registry", async () => {
    await expect(
      resolveSupportAgentGroundingContext({
        ...supportAgentChatRequestFixture,
        knowledgeSources: [
          {
            ...supportAgentChatRequestFixture.knowledgeSources[0],
            contextReference: {
              type: "local-documentation",
              path: "docs/knowledge/wrong-path.md",
            },
          },
        ],
      })
    ).rejects.toBeInstanceOf(SupportAgentRuntimeError)
  })

  test("formats grounded prompt excerpts from retrieved chunks", async () => {
    const { retrieval } = await resolveSupportAgentGroundingContext(
      supportAgentChatRequestFixture
    )

    const excerpts = toGroundedPromptExcerpts(retrieval)

    expect(excerpts[0]).toContain("chunk_product_docs")
    expect(excerpts.some((excerpt) => excerpt.includes("Section:"))).toBe(true)

    const withoutHeading = toGroundedPromptExcerpts({
      chunks: [
        {
          ...retrieval.chunks[0],
          headingPath: undefined,
        },
      ],
      citations: retrieval.citations,
    })

    expect(withoutHeading[0]).not.toContain("Section:")
    expect(withoutHeading[0]).toContain("Excerpt:")
  })
})
