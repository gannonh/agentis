import { describe, expect, test } from "vitest"

import {
  assertMalformedAdapterChunkRejected,
  createLocalKnowledgeRetrievalAdapter,
} from "./local-knowledge-retrieval-adapter"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"

describe("local knowledge retrieval adapter", () => {
  const adapter = createLocalKnowledgeRetrievalAdapter()

  test("retrieves contract-conformant chunks for an indexed source version", async () => {
    const chunks = await adapter.retrieve({
      record: {
        organizationId: "org_agentis_demo",
        deploymentId: "deployment_support_demo",
        agentId: "agent_support_template",
        knowledgeSourceId: "knowledge_product_docs",
        sourceType: "local-documentation",
        displayTitle: "Product documentation sample",
        description: "Demo",
        lifecycleState: "active",
        activeVersionId: "ksrcv_product_docs_2026_05_19",
        createdAt: "2026-05-19T00:00:00.000Z",
        updatedAt: "2026-05-19T00:00:00.000Z",
      },
      version: {
        sourceVersionId: "ksrcv_product_docs_2026_05_19",
        knowledgeSourceId: "knowledge_product_docs",
        versionLabel: "May 19 demo",
        contentHash: "hash_product_docs_v1",
        createdAt: "2026-05-19T00:00:00.000Z",
        selectedAt: "2026-05-19T00:00:00.000Z",
        freshnessStatus: "fresh",
        parseStatus: "parsed",
        indexStatus: "indexed",
      },
      question: "How do I connect billing?",
    })

    const billingChunk = chunks.find(
      (chunk) => chunk.chunkId === "chunk_product_docs_billing"
    )

    expect(billingChunk).toMatchObject({
      knowledgeSourceId: "knowledge_product_docs",
      excerpt: expect.any(String),
    })
    expect(billingChunk?.contentText).toContain("Billing")
  })

  test("rejects malformed adapter output before returning chunks", () => {
    expect(() =>
      assertMalformedAdapterChunkRejected({
        chunkId: "",
        citationId: "citation_bad",
        parsedDocumentId: "pdoc",
        knowledgeSourceId: "knowledge_product_docs",
        sourceVersionId: "ksrcv_product_docs_2026_05_19",
        chunkOrdinal: 0,
        excerpt: " ",
        contentText: "text",
        tokenCount: 1,
        chunkHash: "hash",
        retrievedAt: "2026-05-19T00:00:00.000Z",
      })
    ).toThrow(SupportKnowledgeRuntimeError)
  })
})
