import type { SupportKnowledgeChunk } from "./knowledge-contracts"

const productDocsVersionId = "ksrcv_product_docs_2026_05_19"
const releaseNotesVersionId = "ksrcv_release_notes_2026_05_19"

export const localSupportKnowledgeChunksByVersionId = new Map<
  string,
  SupportKnowledgeChunk[]
>([
  [
    productDocsVersionId,
    [
      {
        chunkId: "chunk_product_docs_setup",
        parsedDocumentId: "pdoc_product_docs_v1",
        knowledgeSourceId: "knowledge_product_docs",
        sourceVersionId: productDocsVersionId,
        chunkOrdinal: 0,
        headingPath: "Setup",
        excerpt: "Select Product documentation sample during setup.",
        contentText:
          "Setup: select Product documentation sample while configuring the support agent.",
        tokenCount: 18,
        location: { locationLabel: "Setup" },
        chunkHash: "hash_chunk_product_docs_setup",
      },
      {
        chunkId: "chunk_product_docs_billing",
        parsedDocumentId: "pdoc_product_docs_v1",
        knowledgeSourceId: "knowledge_product_docs",
        sourceVersionId: productDocsVersionId,
        chunkOrdinal: 1,
        headingPath: "Billing",
        excerpt: "Billing article covers invoices, plan changes, and payment failures.",
        contentText:
          "Billing: use the billing article when customers ask about invoices, plan changes, or payment failures.",
        tokenCount: 22,
        location: { locationLabel: "Billing" },
        chunkHash: "hash_chunk_product_docs_billing",
      },
      {
        chunkId: "chunk_product_docs_troubleshooting",
        parsedDocumentId: "pdoc_product_docs_v1",
        knowledgeSourceId: "knowledge_product_docs",
        sourceVersionId: productDocsVersionId,
        chunkOrdinal: 2,
        headingPath: "Troubleshooting",
        excerpt:
          "Troubleshooting asks for workspace URL, affected feature, and latest error before escalating.",
        contentText:
          "Troubleshooting: ask for the workspace URL, affected feature, and latest error before escalating.",
        tokenCount: 24,
        location: { locationLabel: "Troubleshooting" },
        chunkHash: "hash_chunk_product_docs_troubleshooting",
      },
    ],
  ],
  [
    releaseNotesVersionId,
    [
      {
        chunkId: "chunk_release_notes_may",
        parsedDocumentId: "pdoc_release_notes_v1",
        knowledgeSourceId: "knowledge_release_notes",
        sourceVersionId: releaseNotesVersionId,
        chunkOrdinal: 0,
        headingPath: "May update",
        excerpt: "May release notes summarize the newest support-agent changes.",
        contentText:
          "May update: support agents can receive selected documentation context from the Agentis GUI.",
        tokenCount: 20,
        location: { locationLabel: "May update" },
        chunkHash: "hash_chunk_release_notes_may",
      },
      {
        chunkId: "chunk_release_notes_runtime",
        parsedDocumentId: "pdoc_release_notes_v1",
        knowledgeSourceId: "knowledge_release_notes",
        sourceVersionId: releaseNotesVersionId,
        chunkOrdinal: 1,
        headingPath: "Runtime note",
        excerpt:
          "Agentis resolves local demo docs before handing a Flue-ready input to the runtime adapter.",
        contentText:
          "Runtime note: Agentis resolves local demo docs before handing a Flue-ready input to the runtime adapter.",
        tokenCount: 22,
        location: { locationLabel: "Runtime note" },
        chunkHash: "hash_chunk_release_notes_runtime",
      },
    ],
  ],
])
