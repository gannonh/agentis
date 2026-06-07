import { tool } from "ai"
import { z } from "zod"
import { describe, expect, it } from "vitest"
import {
  APPS_SYSTEM_PROMPT,
  DOCUMENTS_SYSTEM_PROMPT,
  STATIC_ARTIFACTS_SYSTEM_PROMPT,
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

  it("exposes static artifact tools and prompt guidance when staticArtifacts is permitted", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["staticArtifacts"],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Create a static webpage for the launch plan.",
      buildTools: {
        staticArtifacts: () => ({
          createStaticArtifact: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.systemPromptSections).toEqual([
      STATIC_ARTIFACTS_SYSTEM_PROMPT,
    ])
    expect(capabilities.runtimeTools).toHaveProperty("createStaticArtifact")
    expect(capabilities.staticArtifacts).toMatchObject({
      permitted: true,
      enabled: true,
    })
  })

  it("reports visible denial when static artifact intent is not permitted", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: [],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Create a static webpage for the launch plan.",
      buildTools: {
        staticArtifacts: () => ({
          createStaticArtifact: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.staticArtifacts).toMatchObject({
      permitted: false,
      requested: true,
      enabled: false,
      permissionDeniedError: {
        code: "static_artifact_permission_denied",
        message: "This agent is not permitted to create static artifacts.",
      },
    })
  })

  it("does not deny ordinary read-only prompts about slide or webpage content", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: [],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Summarize these slides and explain the webpage references.",
      buildTools: {
        staticArtifacts: () => ({
          createStaticArtifact: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.staticArtifacts).toMatchObject({
      permitted: false,
      requested: false,
      enabled: false,
      permissionDeniedError: undefined,
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

  it("keeps permitted static artifact tools inactive without static artifact intent", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["staticArtifacts"],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Summarize this text",
      buildTools: {
        staticArtifacts: () => ({
          createStaticArtifact: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.staticArtifacts).toMatchObject({
      permitted: true,
      requested: false,
      enabled: false,
    })
    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.systemPromptSections).not.toContain(
      STATIC_ARTIFACTS_SYSTEM_PROMPT
    )
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

  it("exposes app tools and prompt guidance when apps is permitted", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["apps"],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Create an interactive calculator mini-app with saved state.",
      buildTools: {
        apps: () => ({
          createApp: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.systemPromptSections).toEqual([APPS_SYSTEM_PROMPT])
    expect(capabilities.runtimeTools).toHaveProperty("createApp")
    expect(capabilities.apps).toMatchObject({
      permitted: true,
      enabled: true,
    })
  })

  it.each([
    "Create a form for onboarding new users.",
    "Build a wizard for project setup.",
  ])("exposes app tools when apps is permitted for %s", (latestUserPrompt) => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: ["apps"],
      providerAvailability: { webSearch: true },
      latestUserPrompt,
      buildTools: {
        apps: () => ({
          createApp: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.systemPromptSections).toEqual([APPS_SYSTEM_PROMPT])
    expect(capabilities.runtimeTools).toHaveProperty("createApp")
    expect(capabilities.apps).toMatchObject({
      permitted: true,
      enabled: true,
    })
  })

  it.each([
    "Create a form for onboarding new users.",
    "Build a wizard for project setup.",
  ])("reports visible denial when app intent is not permitted for %s", (latestUserPrompt) => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: [],
      providerAvailability: { webSearch: true },
      latestUserPrompt,
      buildTools: {
        apps: () => ({
          createApp: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.apps).toMatchObject({
      permitted: false,
      requested: true,
      enabled: false,
      permissionDeniedError: {
        code: "app_permission_denied",
        message: "This agent is not permitted to create Apps.",
      },
    })
  })

  it("reports visible denial when app intent is not permitted", () => {
    const capabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds: [],
      providerAvailability: { webSearch: true },
      latestUserPrompt: "Build an interactive tracker mini-app.",
      buildTools: {
        apps: () => ({
          createApp: tool({
            inputSchema: z.object({}),
            execute: async () => ({}),
          }),
        }),
      },
    })

    expect(capabilities.runtimeTools).toEqual({})
    expect(capabilities.apps).toMatchObject({
      permitted: false,
      requested: true,
      enabled: false,
      permissionDeniedError: {
        code: "app_permission_denied",
        message: "This agent is not permitted to create Apps.",
      },
    })
  })
})
