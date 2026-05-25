import { describe, expect, it } from "vitest"
import { summarizeTitle } from "./title-summary.js"

describe("summarizeTitle", () => {
  it("uses a fallback title for whitespace-only prompts", () => {
    expect(summarizeTitle("   \n\t  ")).toBe("New thread")
  })
})
