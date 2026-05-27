import { describe, expect, it } from "vitest"
import { demoWorkspace } from "./demo-workspace"
import { workspaceSchema } from "./schema"

describe("fixture schemas", () => {
  it("parses demo workspace seed data", () => {
    expect(() => workspaceSchema.parse(demoWorkspace)).not.toThrow()
  })

  it("includes a visibly mocked learning candidate seed", () => {
    const [candidate] = demoWorkspace.learningCandidates

    expect(candidate.source.threadId).toBe("thread-creating-agent")
    expect(candidate.source.threadTitle).toBe("Creating Agent")
    expect(candidate.suggestionType).toBe("memory")
    expect(candidate.confidence).toBeGreaterThan(0)
    expect(candidate.status).toBe("suggested")
    expect(candidate.actions.map((action: { label: string }) => action.label)).toEqual([
      "Save memory",
      "Dismiss",
    ])
    expect(candidate.provenance.kind).toBe("mocked-llm-derived")
    expect(candidate.provenance.label).toContain("Mocked")
    expect(candidate.createdBy).toBe("seed")
  })
})
