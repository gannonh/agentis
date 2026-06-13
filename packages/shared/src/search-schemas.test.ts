import { describe, expect, it } from "vitest"
import {
  MAX_SEARCH_QUERY_LENGTH,
  normalizeSearchQuery,
} from "./search-schemas.js"

describe("normalizeSearchQuery", () => {
  it("returns empty for blank input", () => {
    expect(normalizeSearchQuery("")).toEqual({ status: "empty" })
    expect(normalizeSearchQuery("   ")).toEqual({ status: "empty" })
  })

  it("returns ready for trimmed input within the max length", () => {
    expect(normalizeSearchQuery("  prospect  ")).toEqual({
      status: "ready",
      query: "prospect",
    })
  })

  it("returns too_long when input exceeds the max length", () => {
    const longQuery = "a".repeat(MAX_SEARCH_QUERY_LENGTH + 1)
    expect(normalizeSearchQuery(longQuery)).toEqual({ status: "too_long" })
  })
})
