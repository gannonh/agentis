import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import {
  resolveSupportAgentDocumentationContext,
  toSupportAgentSources,
} from "./documentation-context"
import { SupportAgentRuntimeError } from "./runtime-boundary"

const releaseNotesSource = {
  id: "knowledge_release_notes",
  title: "Release notes sample",
  description: "Recent product updates and support-agent changes.",
  contextReference: {
    type: "local-documentation" as const,
    path: "docs/knowledge/release-notes-sample.md",
  },
}

describe("support-agent documentation context", () => {
  test("resolves selected documentation into typed context", () => {
    expect(
      resolveSupportAgentDocumentationContext(supportAgentChatRequestFixture)
    ).toEqual([
      {
        knowledgeSourceId: "knowledge_product_docs",
        title: "Product documentation sample",
        description: "Product setup, billing, and troubleshooting articles.",
        path: "docs/knowledge/product-documentation-sample.md",
        excerpt: "Select Product documentation sample during setup.",
        content: [
          "# Product documentation sample",
          "Setup: select Product documentation sample while configuring the support agent.",
          "Billing: use the billing article when customers ask about invoices, plan changes, or payment failures.",
          "Troubleshooting: ask for the workspace URL, affected feature, and latest error before escalating.",
        ].join("\n"),
        sourceId: "source_product_docs_setup",
      },
    ])
  })

  test("excludes unselected documentation sources", () => {
    const context = resolveSupportAgentDocumentationContext({
      ...supportAgentChatRequestFixture,
      knowledgeSourceIds: ["knowledge_release_notes"],
      knowledgeSources: [
        ...supportAgentChatRequestFixture.knowledgeSources,
        releaseNotesSource,
      ],
    })

    expect(context.map((source) => source.knowledgeSourceId)).toEqual([
      "knowledge_release_notes",
    ])
    expect(context[0]?.content).toContain("# Release notes sample")
    expect(context[0]?.content).not.toContain("# Product documentation sample")
  })

  test("keeps duplicate selections stable", () => {
    expect(
      resolveSupportAgentDocumentationContext({
        ...supportAgentChatRequestFixture,
        knowledgeSourceIds: [
          "knowledge_product_docs",
          "knowledge_product_docs",
          "knowledge_release_notes",
          "knowledge_release_notes",
        ],
        knowledgeSources: [
          ...supportAgentChatRequestFixture.knowledgeSources,
          releaseNotesSource,
        ],
      }).map((source) => source.knowledgeSourceId)
    ).toEqual(["knowledge_product_docs", "knowledge_release_notes"])
  })

  test("throws a support-agent runtime error for unknown selected source IDs", () => {
    expect(() =>
      resolveSupportAgentDocumentationContext({
        ...supportAgentChatRequestFixture,
        knowledgeSourceIds: ["knowledge_unknown"],
      })
    ).toThrow(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message: "Unknown support-agent knowledge source: knowledge_unknown.",
      })
    )
  })

  test("throws a support-agent runtime error for path mismatches against registered context", () => {
    expect(() =>
      resolveSupportAgentDocumentationContext({
        ...supportAgentChatRequestFixture,
        knowledgeSources: [
          {
            ...supportAgentChatRequestFixture.knowledgeSources[0]!,
            contextReference: {
              type: "local-documentation",
              path: "docs/knowledge/unregistered.md",
            },
          },
        ],
      })
    ).toThrow(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message:
          "Knowledge source path does not match registered context: knowledge_product_docs.",
      })
    )
  })

  test("maps resolved context into response sources", () => {
    expect(
      toSupportAgentSources(
        resolveSupportAgentDocumentationContext(supportAgentChatRequestFixture)
      )
    ).toEqual([
      {
        id: "source_product_docs_setup",
        knowledgeSourceId: "knowledge_product_docs",
        title: "Product documentation sample",
        excerpt: "Select Product documentation sample during setup.",
      },
    ])
  })
})
