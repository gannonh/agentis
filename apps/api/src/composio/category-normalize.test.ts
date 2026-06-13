import { describe, expect, it } from "vitest"
import {
  normalizeToolkitCategoryList,
  normalizeToolkitCategoryValue,
  toComposioCategoryQuery,
} from "./category-normalize.js"

describe("category-normalize", () => {
  it("normalizes category slugs and names consistently", () => {
    expect(normalizeToolkitCategoryValue("developer-tools")).toBe("developer tools")
    expect(normalizeToolkitCategoryValue({ slug: "developer-tools", name: "Developer Tools" })).toBe(
      "developer tools"
    )
    expect(normalizeToolkitCategoryList([{ slug: "developer-tools", name: "Developer Tools" }])).toBe(
      "developer tools"
    )
  })

  it("maps UI category values to Composio query slugs", () => {
    expect(toComposioCategoryQuery("developer tools")).toBe("developer-tools")
  })
})
