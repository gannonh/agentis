import { describe, expect, test } from "vitest"

import {
  toBrowserSafeCitation,
  type SupportKnowledgeRetrievedChunk,
} from "./knowledge-contracts"

describe("support knowledge contracts", () => {
  test("browser-safe citation omits server-only retrieval metadata", () => {
    const chunk: SupportKnowledgeRetrievedChunk = {
      chunkId: "chunk_product_docs_setup",
      citationId: "citation_product_docs_setup",
      parsedDocumentId: "pdoc_product_docs_v1",
      knowledgeSourceId: "knowledge_product_docs",
      sourceVersionId: "ksrcv_product_docs_2026_05_19",
      chunkOrdinal: 0,
      headingPath: "Setup",
      excerpt: "Select Product documentation sample during setup.",
      contentText: "Setup: select Product documentation sample.",
      tokenCount: 12,
      chunkHash: "hash_setup",
      retrievedAt: "2026-05-19T00:00:00.000Z",
      embeddingMetadata: {
        backend: "local-demo",
        providerVectorId: "vec_secret_123",
        storageUri: "s3://private-bucket/object",
      },
    }

    const citation = toBrowserSafeCitation(chunk)
    const serialized = JSON.stringify(citation)

    expect(citation).toMatchObject({
      knowledgeSourceId: "knowledge_product_docs",
      sourceVersionId: "ksrcv_product_docs_2026_05_19",
      chunkId: "chunk_product_docs_setup",
    })
    expect(serialized).not.toContain("vec_secret")
    expect(serialized).not.toContain("s3://")
    expect(serialized).not.toContain("contentText")
  })

  test("uses display title and default heading fallbacks for citations", () => {
    const chunk: SupportKnowledgeRetrievedChunk = {
      chunkId: "chunk_plain",
      citationId: "citation_plain",
      parsedDocumentId: "pdoc_plain",
      knowledgeSourceId: "knowledge_product_docs",
      sourceVersionId: "ksrcv_product_docs_2026_05_19",
      chunkOrdinal: 0,
      excerpt: "Excerpt only.",
      contentText: "Server-only body.",
      tokenCount: 4,
      chunkHash: "hash_plain",
      retrievedAt: "2026-05-19T00:00:00.000Z",
    }

    expect(toBrowserSafeCitation(chunk, "Registry title").title).toBe(
      "Registry title"
    )
    expect(toBrowserSafeCitation({ ...chunk, headingPath: "Setup" }).title).toBe(
      "Setup"
    )
    expect(toBrowserSafeCitation(chunk).title).toBe("Support source")
  })
})
