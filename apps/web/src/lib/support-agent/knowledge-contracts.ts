/**
 * Agentis-owned support knowledge contracts (KM-03).
 * Browser-safe shapes stay separate from server-only retrieval metadata.
 */

export type KnowledgeLifecycleState =
  | "candidate"
  | "selected"
  | "refresh_queued"
  | "refreshing"
  | "active"
  | "stale"
  | "refresh_failed"
  | "disabled"
  | "delete_requested"
  | "deleting"
  | "delete_failed"
  | "deleted"

export type KnowledgeIndexStatus =
  | "not_indexed"
  | "index_queued"
  | "indexing"
  | "indexed"
  | "index_stale"
  | "index_unavailable"
  | "delete_pending"
  | "deleting"
  | "deleted"
  | "index_failed"

export type KnowledgeParseStatus = "parsed" | "parse_failed" | "unsupported_format"

export type KnowledgeFreshnessStatus = "fresh" | "stale" | "unknown"

export type KnowledgeSourceType = "local-documentation" | "markdown" | "uploaded_file" | "url"

export type SupportKnowledgeRuntimeErrorCode =
  | "SUPPORT_KNOWLEDGE_MISSING_CONTENT"
  | "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE"
  | "SUPPORT_KNOWLEDGE_STALE_SOURCE"
  | "SUPPORT_KNOWLEDGE_DELETION_PENDING"
  | "SUPPORT_KNOWLEDGE_SOURCE_DELETED"
  | "SUPPORT_KNOWLEDGE_SCOPE_MISMATCH"
  | "SUPPORT_KNOWLEDGE_ADAPTER_ERROR"

export type SupportAgentDeploymentScope = {
  organizationId: string
  deploymentId: string
  agentId: string
}

/** Registry record: browser-safe display fields plus server-owned linkage. */
export type SupportKnowledgeSourceRegistryRecord = {
  organizationId: string
  deploymentId: string
  agentId: string
  knowledgeSourceId: string
  sourceType: KnowledgeSourceType
  displayTitle: string
  description: string
  lifecycleState: KnowledgeLifecycleState
  activeVersionId: string
  createdAt: string
  updatedAt: string
}

export type SupportKnowledgeSourceVersion = {
  sourceVersionId: string
  knowledgeSourceId: string
  versionLabel: string
  contentHash: string
  createdAt: string
  selectedAt: string
  freshnessStatus: KnowledgeFreshnessStatus
  parseStatus: KnowledgeParseStatus
  indexStatus: KnowledgeIndexStatus
}

export type SupportKnowledgeParsedDocument = {
  parsedDocumentId: string
  knowledgeSourceId: string
  sourceVersionId: string
  sourceType: KnowledgeSourceType
  title: string
  publicLocationLabel?: string
  canonicalUrl?: string
  contentText: string
  contentHash: string
  parserVersion: string
  parseStatus: KnowledgeParseStatus
  parseDiagnostics?: unknown
}

export type SupportKnowledgeChunkLocation = {
  locationLabel?: string
  publicUrl?: string
}

/** Full chunk: server-only content with browser-safe citation fields. */
export type SupportKnowledgeChunk = {
  chunkId: string
  parsedDocumentId: string
  knowledgeSourceId: string
  sourceVersionId: string
  chunkOrdinal: number
  headingPath?: string
  excerpt: string
  contentText: string
  tokenCount: number
  location?: SupportKnowledgeChunkLocation
  chunkHash: string
  embeddingMetadata?: SupportKnowledgeRetrievalServerMetadata
}

/** Normalized citation fields for API and UI (KM-03; KM-04 UX polish is out of scope). */
export type SupportKnowledgeCitation = {
  id: string
  knowledgeSourceId: string
  sourceVersionId: string
  chunkId: string
  title: string
  excerpt: string
  freshnessStatus: KnowledgeFreshnessStatus
  locationLabel?: string
  publicUrl?: string
  retrievedAt: string
}

export type SupportKnowledgeRetrievalBackend =
  | "local-demo"
  | "cloudflare-ai-search"
  | "cloudflare-vectorize"
  | "provider-native"

/** Server-only adapter metadata; must not appear in browser payloads. */
export type SupportKnowledgeRetrievalServerMetadata = {
  backend: SupportKnowledgeRetrievalBackend
  providerResourceId?: string
  providerFileId?: string
  providerVectorId?: string
  namespace?: string
  storageUri?: string
  score?: number
  queryTraceId?: string
  rawDiagnostics?: unknown
}

export type SupportKnowledgeRetrievedChunk = SupportKnowledgeChunk & {
  citationId: string
  retrievedAt: string
}

export type SupportKnowledgeRetrievalQuery = {
  scope: SupportAgentDeploymentScope
  knowledgeSourceIds: string[]
  question: string
}

export type SupportKnowledgeRetrievalResult = {
  chunks: SupportKnowledgeRetrievedChunk[]
  citations: SupportKnowledgeCitation[]
}

export const supportKnowledgeRuntimeErrorMessages: Record<
  SupportKnowledgeRuntimeErrorCode,
  string
> = {
  SUPPORT_KNOWLEDGE_MISSING_CONTENT:
    "The selected knowledge source is not ready yet.",
  SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE:
    "Knowledge search is unavailable right now.",
  SUPPORT_KNOWLEDGE_STALE_SOURCE:
    "The selected knowledge source needs a refresh before it can be used.",
  SUPPORT_KNOWLEDGE_DELETION_PENDING:
    "The selected knowledge source is being removed.",
  SUPPORT_KNOWLEDGE_SOURCE_DELETED:
    "The selected knowledge source is no longer available.",
  SUPPORT_KNOWLEDGE_SCOPE_MISMATCH:
    "The selected knowledge source is unavailable for this deployment.",
  SUPPORT_KNOWLEDGE_ADAPTER_ERROR:
    "Knowledge search failed before an answer could be grounded.",
}

export function toBrowserSafeCitation(
  chunk: SupportKnowledgeRetrievedChunk
): SupportKnowledgeCitation {
  return {
    id: chunk.citationId,
    knowledgeSourceId: chunk.knowledgeSourceId,
    sourceVersionId: chunk.sourceVersionId,
    chunkId: chunk.chunkId,
    title: chunk.headingPath ?? chunk.excerpt.split(".")[0] ?? "Support source",
    excerpt: chunk.excerpt,
    freshnessStatus: "fresh",
    locationLabel: chunk.location?.locationLabel ?? chunk.headingPath,
    publicUrl: chunk.location?.publicUrl,
    retrievedAt: chunk.retrievedAt,
  }
}
