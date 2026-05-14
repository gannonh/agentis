import type {
  SupportAgentChatRequest,
  SupportAgentSource,
} from "./chat-contracts"
import { SupportAgentRuntimeError } from "./runtime-boundary"

type LocalDocumentationSource = {
  sourceId: string
  excerpt: string
  content: string
}

export type SupportAgentDocumentationContext = {
  knowledgeSourceId: string
  title: string
  description: string
  path: string
  excerpt: string
  content: string
  sourceId: string
}

const localDocumentationSources = new Map<string, LocalDocumentationSource>([
  [
    "docs/knowledge/product-documentation-sample.md",
    {
      sourceId: "source_product_docs_setup",
      excerpt: "Select Product documentation sample during setup.",
      content: [
        "# Product documentation sample",
        "Setup: select Product documentation sample while configuring the support agent.",
        "Billing: use the billing article when customers ask about invoices, plan changes, or payment failures.",
        "Troubleshooting: ask for the workspace URL, affected feature, and latest error before escalating.",
      ].join("\n"),
    },
  ],
  [
    "docs/knowledge/release-notes-sample.md",
    {
      sourceId: "source_release_notes_may",
      excerpt: "May release notes summarize the newest support-agent changes.",
      content: [
        "# Release notes sample",
        "May update: support agents can receive selected documentation context from the Agentis GUI.",
        "Runtime note: Agentis resolves local demo docs before handing a Flue-ready input to the runtime adapter.",
      ].join("\n"),
    },
  ],
])

export function resolveSupportAgentDocumentationContext(
  request: SupportAgentChatRequest
): SupportAgentDocumentationContext[] {
  const sourcesById = new Map(
    request.knowledgeSources.map((source) => [source.id, source])
  )
  const selectedSourceIds = [...new Set(request.knowledgeSourceIds)]

  return selectedSourceIds.map((knowledgeSourceId) => {
    const source = sourcesById.get(knowledgeSourceId)

    if (!source) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message: `Unknown support-agent knowledge source: ${knowledgeSourceId}.`,
      })
    }

    const localSource = localDocumentationSources.get(source.contextReference.path)

    if (!localSource) {
      throw new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message: `No local documentation context is registered for knowledge source: ${knowledgeSourceId}.`,
      })
    }

    return {
      knowledgeSourceId,
      title: source.title,
      description: source.description,
      path: source.contextReference.path,
      excerpt: localSource.excerpt,
      content: localSource.content,
      sourceId: localSource.sourceId,
    }
  })
}

export function toSupportAgentSources(
  context: SupportAgentDocumentationContext[]
): SupportAgentSource[] {
  return context.map((source) => ({
    id: source.sourceId,
    knowledgeSourceId: source.knowledgeSourceId,
    title: source.title,
    excerpt: source.excerpt,
  }))
}
