import {
  DOCUMENTS_NATIVE_TOOL_CAPABILITY,
  WEB_SEARCH_NATIVE_TOOL_CAPABILITY,
  type NativeToolPermissionId,
} from "@workspace/shared"
import type { ToolSet } from "ai"
import { WebSearchError } from "../research/web-search-provider.js"

export const WEB_SEARCH_SYSTEM_PROMPT =
  "When you use searchWeb, cite the sources you relied on inline using markdown links like [title](url) drawn from the returned results. Do not invent URLs."

export const DOCUMENTS_SYSTEM_PROMPT =
  "Use createDocument when the user asks for a durable document, brief, report, notes, playbook, or library item. If the request has enough context to create useful content, choose a concise title and content instead of asking for schema fields. Search and read relevant documents before updating durable knowledge. For document links, use only the exact relative viewPath or downloadPath returned by document tools. Use downloadPath for markdown downloads. Never invent hostnames or placeholder URLs such as yourworkspaceurl. For durable markdown Documents scoped to Thread, Project or Global, use createDocument — not createWorkspaceFile. To change scope on an existing document, use updateDocumentVisibility with the same documentId; do not create a duplicate document for scope-only requests."

export function looksLikeWebSearchIntent(prompt: string): boolean {
  return (
    /\b(search|look up|latest|current|web)\b/i.test(prompt) &&
    !/\bfiles?\b|workspace file|read .*file|search .*file/i.test(prompt)
  )
}

type ProviderAvailability = {
  webSearch: boolean
}

type ToolBuilders = {
  webSearch?: () => ToolSet
  documents?: () => ToolSet
}

export function resolveNativeRuntimeCapabilities(input: {
  permittedNativeToolIds: NativeToolPermissionId[]
  providerAvailability: ProviderAvailability
  latestUserPrompt: string
  buildTools?: ToolBuilders
}) {
  const webSearchPermitted = input.permittedNativeToolIds.includes(
    WEB_SEARCH_NATIVE_TOOL_CAPABILITY.id
  )
  const webSearchRequested = looksLikeWebSearchIntent(input.latestUserPrompt)
  const webSearchAvailable = input.providerAvailability.webSearch
  const webSearchEnabled =
    webSearchPermitted && webSearchRequested && webSearchAvailable
  const unavailableError =
    webSearchPermitted && !webSearchAvailable && webSearchRequested
      ? new WebSearchError(
          "web_search_unavailable",
          "Web search provider is not configured"
        )
      : undefined

  const documentsPermitted = input.permittedNativeToolIds.includes(
    DOCUMENTS_NATIVE_TOOL_CAPABILITY.id
  )
  const documentsEnabled = documentsPermitted

  const runtimeTools: ToolSet = {
    ...(webSearchEnabled && input.buildTools?.webSearch
      ? input.buildTools.webSearch()
      : {}),
    ...(documentsEnabled && input.buildTools?.documents
      ? input.buildTools.documents()
      : {}),
  }

  const systemPromptSections = [
    webSearchEnabled ? WEB_SEARCH_SYSTEM_PROMPT : null,
    documentsEnabled ? DOCUMENTS_SYSTEM_PROMPT : null,
  ].filter((section): section is string => Boolean(section))

  return {
    runtimeTools,
    systemPromptSections,
    webSearch: {
      permitted: webSearchPermitted,
      requested: webSearchRequested,
      enabled: webSearchEnabled,
      unavailableError,
    },
    documents: {
      permitted: documentsPermitted,
      enabled: documentsEnabled,
    },
  }
}
