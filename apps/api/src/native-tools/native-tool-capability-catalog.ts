import {
  WEB_SEARCH_NATIVE_TOOL_CAPABILITY,
  type NativeToolPermissionId,
} from "@workspace/shared"
import type { ToolSet } from "ai"
import { WebSearchError } from "../research/web-search-provider.js"

export const WEB_SEARCH_SYSTEM_PROMPT =
  "When you use searchWeb, cite the sources you relied on inline using markdown links like [title](url) drawn from the returned results. Do not invent URLs."

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
  const webSearchEnabled = webSearchPermitted && webSearchAvailable
  const unavailableError =
    webSearchPermitted && !webSearchAvailable && webSearchRequested
      ? new WebSearchError(
          "web_search_unavailable",
          "Web search provider is not configured"
        )
      : undefined
  const runtimeTools =
    webSearchEnabled && input.buildTools?.webSearch
      ? input.buildTools.webSearch()
      : {}

  return {
    runtimeTools,
    systemPromptSections:
      webSearchEnabled ? [WEB_SEARCH_SYSTEM_PROMPT] : [],
    webSearch: {
      permitted: webSearchPermitted,
      requested: webSearchRequested,
      enabled: webSearchEnabled,
      unavailableError,
    },
  }
}
