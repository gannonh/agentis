import { describe, expect, it } from "vitest"
import { resolveNativeRuntimeCapabilities } from "./native-runtime-capabilities.js"

describe("native runtime capabilities", () => {
  it("omits unavailable permitted web search from ordinary non-search runs", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["webSearch"],
      webSearchAvailable: false,
      latestUserPrompt: "Draft a concise project update.",
    })

    expect(capabilities.webSearch.enabled).toBe(false)
    expect(capabilities.webSearch.unavailableError).toBeUndefined()
    expect(capabilities.systemPromptSections).toEqual([])
  })

  it("blocks explicit web search intent when the provider is unavailable", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["webSearch"],
      webSearchAvailable: false,
      latestUserPrompt: "Search the web for current AI news.",
    })

    expect(capabilities.webSearch.enabled).toBe(false)
    expect(capabilities.webSearch.unavailableError).toMatchObject({
      code: "web_search_unavailable",
      message: "Web search provider is not configured",
    })
  })

  it("enables web search prompt guidance only when permitted and available", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["webSearch"],
      webSearchAvailable: true,
      latestUserPrompt: "Search the web for Agentis news.",
    })

    expect(capabilities.webSearch.enabled).toBe(true)
    expect(capabilities.webSearch.unavailableError).toBeUndefined()
    expect(capabilities.systemPromptSections.join("\n")).toContain(
      "cite the sources"
    )
  })
})
