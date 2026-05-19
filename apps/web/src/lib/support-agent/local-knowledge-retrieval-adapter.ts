import type {
  SupportKnowledgeChunk,
  SupportKnowledgeRetrievedChunk,
} from "./knowledge-contracts"
import type {
  SupportKnowledgeSourceRegistryRecord,
  SupportKnowledgeSourceVersion,
} from "./knowledge-contracts"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"
import { localSupportKnowledgeChunksByVersionId } from "./local-knowledge-index"

export type LocalKnowledgeRetrievalAdapterInput = {
  record: SupportKnowledgeSourceRegistryRecord
  version: SupportKnowledgeSourceVersion
  question: string
}

export type LocalKnowledgeRetrievalAdapter = {
  retrieve(
    input: LocalKnowledgeRetrievalAdapterInput
  ): Promise<SupportKnowledgeRetrievedChunk[]>
}

export function createLocalKnowledgeRetrievalAdapter(): LocalKnowledgeRetrievalAdapter {
  return {
    async retrieve({ record, version, question }) {
      const chunks =
        localSupportKnowledgeChunksByVersionId.get(version.sourceVersionId) ?? []

      if (chunks.length === 0) {
        throw new SupportKnowledgeRuntimeError({
          code: "SUPPORT_KNOWLEDGE_MISSING_CONTENT",
        })
      }

      const retrievedAt = new Date().toISOString()
      const normalized = chunks.map((chunk) =>
        toRetrievedChunk(chunk, record, retrievedAt)
      )

      validateAdapterChunks(normalized)

      const questionTokens = question.toLowerCase().split(/\s+/).filter(Boolean)
      if (questionTokens.length === 0) {
        return normalized
      }

      const ranked = normalized
        .map((chunk) => ({
          chunk,
          score: scoreChunk(chunk, questionTokens),
        }))
        .sort((left, right) => right.score - left.score)

      return ranked.map((entry) => entry.chunk)
    },
  }
}

function scoreChunk(
  chunk: SupportKnowledgeRetrievedChunk,
  questionTokens: string[]
): number {
  const haystack = `${chunk.excerpt} ${chunk.contentText}`.toLowerCase()
  return questionTokens.reduce(
    (score, token) => score + (haystack.includes(token) ? 1 : 0),
    0
  )
}

function toRetrievedChunk(
  chunk: SupportKnowledgeChunk,
  record: SupportKnowledgeSourceRegistryRecord,
  retrievedAt: string
): SupportKnowledgeRetrievedChunk {
  return {
    ...chunk,
    citationId: `citation_${chunk.chunkId}`,
    retrievedAt,
    knowledgeSourceId: record.knowledgeSourceId,
    sourceVersionId: chunk.sourceVersionId,
    embeddingMetadata: {
      backend: "local-demo",
    },
  }
}

export function validateAdapterChunks(
  chunks: SupportKnowledgeRetrievedChunk[]
): void {
  for (const chunk of chunks) {
    if (
      !chunk.knowledgeSourceId ||
      !chunk.sourceVersionId ||
      !chunk.chunkId ||
      !chunk.excerpt?.trim()
    ) {
      throw new SupportKnowledgeRuntimeError({
        code: "SUPPORT_KNOWLEDGE_ADAPTER_ERROR",
      })
    }
  }
}

export function assertMalformedAdapterChunkRejected(
  chunk: SupportKnowledgeRetrievedChunk
): void {
  validateAdapterChunks([chunk])
}
