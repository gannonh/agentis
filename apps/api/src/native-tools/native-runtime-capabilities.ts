import type { NativeToolPermissionId } from "@workspace/shared"
import { WebSearchError } from "../research/web-search-provider.js"
import { isWebSearchPermitted } from "./native-tool-permissions.js"

export const WEB_SEARCH_SYSTEM_PROMPT =
  "When you use searchWeb, cite the sources you relied on inline using markdown links like [title](url) drawn from the returned results. Do not invent URLs."

export function looksLikeWebSearchIntent(prompt: string): boolean {
  return (
    /\b(search|look up|latest|current|web)\b/i.test(prompt) &&
    !/\bfiles?\b|workspace file|read .*file|search .*file/i.test(prompt)
  )
}

export function resolveNativeRuntimeCapabilities(input: {
  permittedNativeToolIds: NativeToolPermissionId[]
  webSearchAvailable: boolean
  latestUserPrompt: string
}) {
  const webSearchPermitted = isWebSearchPermitted(input.permittedNativeToolIds)
  const webSearchRequested = looksLikeWebSearchIntent(input.latestUserPrompt)
  const webSearchEnabled = webSearchPermitted && input.webSearchAvailable
  const unavailableError =
    webSearchPermitted && !input.webSearchAvailable && webSearchRequested
      ? new WebSearchError(
          "web_search_unavailable",
          "Web search provider is not configured"
        )
      : undefined

  return {
    systemPromptSections: webSearchEnabled ? [WEB_SEARCH_SYSTEM_PROMPT] : [],
    webSearch: {
      permitted: webSearchPermitted,
      requested: webSearchRequested,
      enabled: webSearchEnabled,
      unavailableError,
    },
  }
}
