import { describe, expect, it } from "vitest"
import {
  looksLikeRawToolProviderJson,
  shouldSuppressTextForToolResults,
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
})
