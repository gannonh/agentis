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
    expect(output.results[0]?.snippet).toHaveLength(100)
    expect(output.results[0]?.source).toBe("example.com")
  })

  it("marks output truncated only when results exceed the requested cap", () => {
    const output = normalizeSearchResults({
      query: "latest ai news",
      provider: "mock",
      rawResults: [
        { title: "Missing url" },
        {
          title: "Example headline",
          url: "https://example.com/story",
        },
      ],
      maxResults: 5,
      maxSnippetChars: 100,
    })

    expect(output.resultCount).toBe(1)
    expect(output.truncated).toBe(false)

    const capped = normalizeSearchResults({
      query: "latest ai news",
      provider: "mock",
      rawResults: [
        { title: "One", url: "https://example.com/one" },
        { title: "Two", url: "https://example.com/two" },
      ],
      maxResults: 1,
      maxSnippetChars: 100,
    })

    expect(capped.resultCount).toBe(1)
    expect(capped.truncated).toBe(true)
  })

  it("rejects unsafe urls and invalid normalized fields", () => {
    expect(() =>
      normalizeSearchResults({
        query: "latest ai news",
        provider: "mock",
        rawResults: [
          { title: "Unsafe link", url: "javascript:alert(1)" },
        ],
        maxResults: 5,
        maxSnippetChars: 100,
      })
    ).toThrow(/trustworthy/)

    expect(() =>
      normalizeSearchResults({
        query: "latest ai news",
        provider: "mock",
        rawResults: [
          {
            title: "   ",
            url: "https://example.com/story",
            source: "x".repeat(300),
          },
        ],
        maxResults: 5,
        maxSnippetChars: 100,
      })
    ).toThrow(/trustworthy/)
  })

  it("fails when provider output is missing a results array", () => {
    expect(() =>
      normalizeSearchResults({
        query: "latest ai news",
        provider: "mock",
        rawResults: undefined as never,
        maxResults: 5,
        maxSnippetChars: 100,
      })
    ).toThrow(/results array/)
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
