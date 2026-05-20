import { describe, expect, it } from "vitest"
import { demoWorkspace } from "./demo-workspace"
import { workspaceSchema } from "./schema"

describe("fixture schemas", () => {
  it("parses demo workspace seed data", () => {
    expect(() => workspaceSchema.parse(demoWorkspace)).not.toThrow()
  })
})
