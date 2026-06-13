import { describe, expect, it } from "vitest"
import { escapeLikePattern, likeContainsPattern } from "./like-pattern.js"

describe("like-pattern", () => {
  it("escapes SQL LIKE wildcards", () => {
    expect(escapeLikePattern("100%")).toBe("100\\%")
    expect(escapeLikePattern("a_b")).toBe("a\\_b")
    expect(escapeLikePattern("path\\to")).toBe("path\\\\to")
  })

  it("wraps escaped values for contains matching", () => {
    expect(likeContainsPattern("100%")).toBe("%100\\%%")
    expect(likeContainsPattern("  prospect  ")).toBe("%prospect%")
  })
})
