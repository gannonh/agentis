import { tool } from "ai"
import { z } from "zod"
import { describe, expect, it } from "vitest"
import {
  DOCUMENTS_SYSTEM_PROMPT,
  WEB_SEARCH_SYSTEM_PROMPT,
  resolveNativeRuntimeCapabilities,
} from "./native-tool-capability-catalog.js"

describe("native tool capability catalog", () => {
  it("uses the catalog to expose permitted available web search", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["webSearch"],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Search the web for Agentis news.",
      buildTools: {
        webSearch: () => ({
          searchWeb: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.systemPromptSections).toEqual([
      WEB_SEARCH_SYSTEM_PROMPT,
    ])
    expect(capabilities.runtimeTools).toHaveProperty("searchWeb")
    expect(capabilities.webSearch).toMatchObject({
      permitted: true,
      requested: true,
      enabled: true,
    })
  })

  it("blocks explicit permitted web search when the provider is unavailable", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["webSearch"],
      providerAvailability: { webSearch: false },
      latestUserPrompt: "Search the web for current AI news.",
      buildTools: { webSearch: () => ({}) },
    })

    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.webSearch.unavailableError).toMatchObject({
      code: "web_search_unavailable",
      message: "Web search provider is not configured",
    })
  })

  it("exposes document tools and prompt guidance when documents are permitted", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["documents"],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Draft a product brief.",
      buildTools: {
        documents: () => ({
          createDocument: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.systemPromptSections).toEqual([
      DOCUMENTS_SYSTEM_PROMPT,
    ])
    expect(capabilities.runtimeTools).toHaveProperty("createDocument")
    expect(capabilities.documents).toMatchObject({
      permitted: true,
      enabled: true,
    })
  })

  it("omits document tools when documents are not permitted", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: [],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Draft a product brief.",
      buildTools: {
        documents: () => ({
          createDocument: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.documents).toMatchObject({
      permitted: false,
      enabled: false,
    })
  })

  it("keeps permitted available web search inactive without search intent", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["webSearch"],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Summarize this text",
      buildTools: {
        webSearch: () => ({
          searchWeb: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.webSearch).toMatchObject({
      permitted: true,
      requested: false,
      enabled: false,
    })
    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.systemPromptSections).not.toContain(
      WEB_SEARCH_SYSTEM_PROMPT
    )
  })
})
