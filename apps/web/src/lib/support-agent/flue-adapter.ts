import type {
  SupportAgentChatRequest,
  SupportAgentChatResponse,
} from "./chat-contracts"
import { resolveSupportAgentGroundingContext } from "./knowledge-grounding"
import { SupportAgentRuntimeError } from "./runtime-boundary"

export type FlueSupportAgentRuntimeInput = {
  agentId: string
  conversationId: string
  userMessage: {
    id: string
    content: string
  }
  knowledgeSourceIds: string[]
  knowledgeSources: Array<{
    id: string
    title: string
    description: string
    contextReference: {
      type: "local-documentation"
      path: string
    }
  }>
  groundingContext: Array<{
    knowledgeSourceId: string
    sourceVersionId: string
    chunkId: string
    title: string
    excerpt: string
    locationLabel?: string
  }>
}

export type FlueSupportAgentRuntimeResponse = {
  assistantMessage: {
    id: string
    inReplyToMessageId?: string
    content: string
  }
  provenance?: Array<{
    sourceId: string
    knowledgeSourceId: string
    sourceVersionId?: string
    chunkId?: string
    title: string
    excerpt: string
    freshnessStatus?: "fresh" | "stale" | "unknown"
    locationLabel?: string
    [runtimeField: string]: unknown
  }>
  [runtimeField: string]: unknown
}

export async function toFlueSupportAgentRuntimeInput(
  request: SupportAgentChatRequest
): Promise<FlueSupportAgentRuntimeInput> {
  const { retrieval } = await resolveSupportAgentGroundingContext(request)
  const knowledgeSourceIds = [...new Set(request.knowledgeSourceIds)]
  const knowledgeSourcesById = new Map(
    request.knowledgeSources.map((source) => [source.id, source])
  )

  return {
    agentId: request.agentId,
    conversationId: request.conversationId,
    userMessage: {
      id: request.messageId,
      content: request.question,
    },
    knowledgeSourceIds,
    knowledgeSources: knowledgeSourceIds.map((knowledgeSourceId) => {
      const source = knowledgeSourcesById.get(knowledgeSourceId)!

      return {
        id: source.id,
        title: source.title,
        description: source.description,
        contextReference: { ...source.contextReference },
      }
    }),
    groundingContext: retrieval.citations.map((citation) => ({
      knowledgeSourceId: citation.knowledgeSourceId,
      sourceVersionId: citation.sourceVersionId,
      chunkId: citation.chunkId,
      title: citation.title,
      excerpt: citation.excerpt,
      locationLabel: citation.locationLabel,
    })),
  }
}

export function toSupportAgentChatResponse(
  request: SupportAgentChatRequest,
  response: FlueSupportAgentRuntimeResponse
): SupportAgentChatResponse {
  const provenance = response.provenance ?? []

  if (request.knowledgeSourceIds.length > 0) {
    if (provenance.length === 0) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE",
        message: "Support agent response did not include citation data.",
      })
    }

    const coveredKnowledgeSourceIds = new Set(
      provenance.map((source) => source.knowledgeSourceId)
    )
    const hasCoverageForEverySelectedSource = request.knowledgeSourceIds.every(
      (knowledgeSourceId) => coveredKnowledgeSourceIds.has(knowledgeSourceId)
    )

    if (!hasCoverageForEverySelectedSource) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE",
        message:
          "Support agent response did not include citation data for every selected source.",
      })
    }
  }

  return {
    agentId: request.agentId,
    conversationId: request.conversationId,
    messageId: response.assistantMessage.id,
    inReplyToMessageId:
      response.assistantMessage.inReplyToMessageId ?? request.messageId,
    answer: response.assistantMessage.content,
    sources: provenance.map((source) => ({
      id: source.sourceId,
      knowledgeSourceId: source.knowledgeSourceId,
      sourceVersionId: source.sourceVersionId,
      chunkId: source.chunkId,
      title: source.title,
      excerpt: source.excerpt,
      freshnessStatus: source.freshnessStatus,
      locationLabel: source.locationLabel,
    })),
  }
}
