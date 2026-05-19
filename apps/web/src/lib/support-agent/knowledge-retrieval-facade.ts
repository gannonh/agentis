import type { SupportAgentChatRequest } from "./chat-contracts"
import {
  toBrowserSafeCitation,
  type SupportAgentDeploymentScope,
  type SupportKnowledgeRetrievalQuery,
  type SupportKnowledgeRetrievalResult,
} from "./knowledge-contracts"
import { resolveSupportAgentDeploymentScope } from "./knowledge-deployment-scope"
import type { LocalKnowledgeRetrievalAdapter } from "./local-knowledge-retrieval-adapter"
import { createLocalKnowledgeRetrievalAdapter } from "./local-knowledge-retrieval-adapter"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"
import {
  getSupportKnowledgeSourceVersion,
  requireSupportKnowledgeRegistryRecord,
} from "./knowledge-source-registry"

const blockedLifecycleStates = new Set([
  "disabled",
  "delete_requested",
  "deleting",
  "delete_failed",
  "deleted",
])

const blockedIndexStatuses = new Set([
  "not_indexed",
  "index_queued",
  "indexing",
  "index_unavailable",
  "delete_pending",
  "deleting",
  "deleted",
  "index_failed",
])

export type SupportKnowledgeRetrievalFacadeOptions = {
  adapter?: LocalKnowledgeRetrievalAdapter
  resolveScope?: (
    request: SupportAgentChatRequest
  ) => SupportAgentDeploymentScope
}

export function createSupportKnowledgeRetrievalFacade({
  adapter = createLocalKnowledgeRetrievalAdapter(),
  resolveScope = resolveSupportAgentDeploymentScope,
}: SupportKnowledgeRetrievalFacadeOptions = {}) {
  return {
    async retrieveForChatRequest(
      request: SupportAgentChatRequest
    ): Promise<SupportKnowledgeRetrievalResult> {
      const scope = resolveScope(request)
      const knowledgeSourceIds = [...new Set(request.knowledgeSourceIds)]

      if (knowledgeSourceIds.length === 0) {
        return { chunks: [], citations: [] }
      }

      return retrieveSupportKnowledge({
        scope,
        knowledgeSourceIds,
        question: request.question,
        adapter,
      })
    },
  }
}

export async function retrieveSupportKnowledge({
  scope,
  knowledgeSourceIds,
  question,
  adapter,
}: SupportKnowledgeRetrievalQuery & {
  adapter: LocalKnowledgeRetrievalAdapter
}): Promise<SupportKnowledgeRetrievalResult> {
  const chunks = []

  for (const knowledgeSourceId of knowledgeSourceIds) {
    const record = requireSupportKnowledgeRegistryRecord(scope, knowledgeSourceId)
    const version = getSupportKnowledgeSourceVersion(record.activeVersionId)

    if (!version || version.knowledgeSourceId !== knowledgeSourceId) {
      throw new SupportKnowledgeRuntimeError({
        code: "SUPPORT_KNOWLEDGE_MISSING_CONTENT",
      })
    }

    assertIndexEligible(version.indexStatus, record.lifecycleState)
    assertLifecycleEligible(record.lifecycleState)
    const retrieved = await adapter.retrieve({ record, version, question })
    chunks.push(...retrieved)
  }

  return {
    chunks,
    citations: chunks.map((chunk) => {
      const record = requireSupportKnowledgeRegistryRecord(
        scope,
        chunk.knowledgeSourceId
      )
      return toBrowserSafeCitation(chunk, record.displayTitle)
    }),
  }
}

function assertLifecycleEligible(lifecycleState: string): void {
  if (blockedLifecycleStates.has(lifecycleState)) {
    if (
      lifecycleState === "delete_requested" ||
      lifecycleState === "deleting"
    ) {
      throw new SupportKnowledgeRuntimeError({
        code: "SUPPORT_KNOWLEDGE_DELETION_PENDING",
      })
    }

    if (lifecycleState === "deleted") {
      throw new SupportKnowledgeRuntimeError({
        code: "SUPPORT_KNOWLEDGE_SOURCE_DELETED",
      })
    }

    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_SCOPE_MISMATCH",
    })
  }

  if (lifecycleState === "stale") {
    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_STALE_SOURCE",
    })
  }
}

function assertIndexEligible(
  indexStatus: string,
  lifecycleState: string
): void {
  if (indexStatus === "index_stale" && lifecycleState === "stale") {
    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_STALE_SOURCE",
    })
  }

  if (indexStatus === "index_unavailable") {
    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE",
    })
  }

  if (blockedIndexStatuses.has(indexStatus)) {
    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_MISSING_CONTENT",
    })
  }
}
