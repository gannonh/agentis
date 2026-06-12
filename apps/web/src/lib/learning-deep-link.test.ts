import { describe, expect, it } from "vitest"
import {
  learningSuggestionDomId,
  parseLearningDeepLink,
} from "./learning-deep-link"

describe("learning deep link helpers", () => {
  it("builds stable suggestion element ids", () => {
    expect(learningSuggestionDomId("learning_suggestion_abc")).toBe(
      "learning-suggestion-learning_suggestion_abc"
    )
  })

  it("parses suggestionId and status from search params", () => {
    const params = new URLSearchParams(
      "status=pending&suggestionId=learning_suggestion_abc"
    )
    expect(parseLearningDeepLink(params)).toEqual({
      suggestionId: "learning_suggestion_abc",
      status: "pending",
    })
  })

  it("returns nulls for missing params", () => {
    expect(parseLearningDeepLink(new URLSearchParams())).toEqual({
      suggestionId: null,
      status: null,
    })
  })
})
