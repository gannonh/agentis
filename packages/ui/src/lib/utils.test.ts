import { describe, expect, test } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  test("merges conditional classes and resolves Tailwind conflicts", () => {
    expect(cn("px-2", null, undefined, ["text-sm", "px-4"])).toBe(
      "text-sm px-4"
    )
  })
})
