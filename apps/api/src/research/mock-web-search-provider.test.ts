import { describe, expect, it } from "vitest"
import { loadConfig } from "../config.js"
import { createMockWebSearchProvider } from "./mock-web-search-provider.js"

describe("mock web search provider", () => {
  it("returns bounded cited results for a query", async () => {
    const provider = createMockWebSearchProvider(
      loadConfig({ AGENTIS_WEB_SEARCH_MAX_RESULTS: "2" })
    )

    const output = await provider.search({ query: "Agentis launch" })

    expect(output.provider).toBe("mock")
    expect(output.resultCount).toBe(2)
    expect(output.results[0]?.url).toMatch(/^https:\/\//)
    expect(output.results[0]?.title).toContain("Agentis launch")
  })
})
