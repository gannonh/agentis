import type { SupportAgentChatRequest, SupportAgentSource } from "./chat-contracts"
import type { SupportKnowledgeRetrievalResult } from "./knowledge-contracts"
import { createSupportKnowledgeRetrievalFacade } from "./knowledge-retrieval-facade"
import { SupportAgentRuntimeError } from "./runtime-boundary"

const registeredContextPathsByKnowledgeSourceId = new Map<string, string>([
  ["knowledge_product_docs", "docs/knowledge/product-documentation-sample.md"],
  ["knowledge_release_notes", "docs/knowledge/release-notes-sample.md"],
])

const defaultRetrievalFacade = createSupportKnowledgeRetrievalFacade()

export type SupportAgentGroundingContext = {
  retrieval: SupportKnowledgeRetrievalResult
  sources: SupportAgentSource[]
}

export async function resolveSupportAgentGroundingContext(
  request: SupportAgentChatRequest,
  facade = defaultRetrievalFacade
): Promise<SupportAgentGroundingContext> {
  assertRequestKnowledgeSourcePaths(request)
  const retrieval = await facade.retrieveForChatRequest(request)

  return {
    retrieval,
    sources: toSupportAgentSourcesFromRetrieval(retrieval),
  }
}

export function toSupportAgentSourcesFromRetrieval(
  retrieval: SupportKnowledgeRetrievalResult
): SupportAgentSource[] {
  const sourcesByKnowledgeId = new Map<string, SupportAgentSource>()

  for (const citation of retrieval.citations) {
    if (sourcesByKnowledgeId.has(citation.knowledgeSourceId)) {
      continue
    }

    sourcesByKnowledgeId.set(citation.knowledgeSourceId, {
      id: citation.id,
      knowledgeSourceId: citation.knowledgeSourceId,
      sourceVersionId: citation.sourceVersionId,
      chunkId: citation.chunkId,
      title: citation.title,
      excerpt: citation.excerpt,
      freshnessStatus: citation.freshnessStatus,
      locationLabel: citation.locationLabel,
    })
  }

  return [...sourcesByKnowledgeId.values()]
}

function assertRequestKnowledgeSourcePaths(
  request: SupportAgentChatRequest
): void {
  const sourcesById = new Map(
    request.knowledgeSources.map((source) => [source.id, source])
  )

  for (const knowledgeSourceId of new Set(request.knowledgeSourceIds)) {
    const source = sourcesById.get(knowledgeSourceId)
    const registeredPath = registeredContextPathsByKnowledgeSourceId.get(
      knowledgeSourceId
    )

    if (!source || !registeredPath) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message: `Unknown support-agent knowledge source: ${knowledgeSourceId}.`,
      })
    }

    if (source.contextReference.path !== registeredPath) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message: `Knowledge source path does not match registered context: ${knowledgeSourceId}.`,
      })
    }
  }
}

export function toGroundedPromptExcerpts(
  retrieval: SupportKnowledgeRetrievalResult
): string[] {
  return retrieval.chunks.map((chunk) =>
    [
      `Chunk: ${chunk.chunkId}`,
      `Source version: ${chunk.sourceVersionId}`,
      chunk.headingPath ? `Section: ${chunk.headingPath}` : undefined,
      `Excerpt: ${chunk.excerpt}`,
    ]
      .filter(Boolean)
      .join("\n")
  )
}
