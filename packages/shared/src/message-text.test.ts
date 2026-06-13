import { describe, expect, it } from "vitest"
import {
  looksLikeRawToolProviderJson,
  isRedundantArtifactLinkLine,
  shouldSuppressTextForToolResults,
  stripRedundantArtifactLinkLines,
} from "./message-text.js"

describe("message-text", () => {
  it("detects raw searchWeb provider JSON", () => {
    expect(
      looksLikeRawToolProviderJson(
        '{"query":"ai agents","provider":"tavily:keyless","results":[]}'
      )
    ).toBe(true)
  })

  it("keeps user-requested structured JSON visible", () => {
    expect(
      looksLikeRawToolProviderJson(
        '{"summary":"Adoption is rising","sources":["https://example.com"]}'
      )
    ).toBe(false)
  })

  it("suppresses only known raw tool shapes when tool results exist", () => {
    const parts = [
      {
        type: "tool-result" as const,
        toolCallId: "call_1",
        toolName: "searchWeb",
        output: { query: "ai agents", provider: "mock", results: [] },
      },
    ]

    expect(
      shouldSuppressTextForToolResults(
        '{"summary":"Adoption is rising","sources":["https://example.com"]}',
        parts
      )
    ).toBe(false)
    expect(
      shouldSuppressTextForToolResults(
        '{"query":"ai agents","provider":"mock","results":[]}',
        parts
      )
    ).toBe(true)
  })

  it("strips redundant artifact view and download path lines", () => {
    const text = [
      "Done — I created the slide deck.",
      "",
      "View it here: /artifacts/artifact_50228a8a-6d2c-4b59-8c5f-7c17efebc1fb",
      "",
      "Download markdown/HTML source: /api/artifacts/artifact_50228a8a-6d2c-4b59-8c5f-7c17efebc1fb/download",
    ].join("\n")

    expect(stripRedundantArtifactLinkLines(text)).toBe(
      "Done — I created the slide deck."
    )
    expect(
      isRedundantArtifactLinkLine(
        "View it here: /documents/document_cab5727a-1950-4554-bea7-6dd46a933b01"
      )
    ).toBe(true)
    expect(
      isRedundantArtifactLinkLine(
        "Download markdown: /api/documents/document_cab5727a-1950-4554-bea7-6dd46a933b01/download"
      )
    ).toBe(true)
  })
})
