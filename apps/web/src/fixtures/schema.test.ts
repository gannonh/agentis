import { describe, expect, it } from "vitest"
import { demoWorkspace } from "./demo-workspace"
import { workspaceSchema } from "./schema"

describe("fixture schemas", () => {
  it("parses demo workspace seed data", () => {
    expect(() => workspaceSchema.parse(demoWorkspace)).not.toThrow()
  })

  it("includes a visibly mocked learning candidate seed", () => {
    const [candidate] = demoWorkspace.learningCandidates

    expect(candidate).toMatchObject({
      source: {
        threadId: "thread-creating-agent",
        threadTitle: "Creating Agent",
      },
      suggestionType: "memory",
      status: "suggested",
      actions: [
        { id: "save-memory", label: "Save memory", tone: "primary", icon: "sparkles" },
        { id: "dismiss", label: "Dismiss", tone: "secondary" },
      ],
      provenance: {
        kind: "mocked-llm-derived",
        label: expect.stringContaining("Mocked"),
      },
      createdBy: "seed",
    })
    expect(candidate.confidence).toBeGreaterThan(0)
  })
})
