import { describe, expect, it } from "vitest"
import { loadConfig } from "../config.js"
import { boundSearchInput, normalizeSearchResults } from "./web-search-normalize.js"

describe("web search normalization", () => {
  const config = loadConfig({})

  it("bounds requested max results to configured caps", () => {
    expect(
      boundSearchInput(
        { query: "latest ai news", maxResults: 99 },
        config
      ).maxResults
    ).toBe(5)
  })

  it("normalizes provider results into the Agentis contract", () => {
    const output = normalizeSearchResults({
      query: "latest ai news",
      provider: "mock",
      rawResults: [
        {
          title: "Example headline",
          url: "https://example.com/story",
          snippet: "x".repeat(2000),
        },
      ],
      maxResults: 5,
      maxSnippetChars: 100,
    })

    expect(output.resultCount).toBe(1)
    expect(output.results[0]?.snippet).toHaveLength(101)
    expect(output.results[0]?.source).toBe("example.com")
  })

  it("fails normalization when no trustworthy results remain", () => {
    expect(() =>
      normalizeSearchResults({
        query: "latest ai news",
        provider: "mock",
        rawResults: [{ title: "Missing url" }],
        maxResults: 5,
        maxSnippetChars: 100,
      })
    ).toThrow(/trustworthy/)
  })
})
