import { describe, expect, it } from "vitest"
import type { RunStep } from "@workspace/shared"
import { projectDocumentTimelineAction } from "./document-timeline"

function step(payload: Record<string, unknown>): RunStep {
  return {
    id: "step_1",
    runId: "run_1",
    type: "tool-result",
    status: "completed",
    title: "Document created: Brief",
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe("projectDocumentTimelineAction", () => {
  it("projects document timeline actions when documentId is present", () => {
    expect(
      projectDocumentTimelineAction(
        step({ documentId: "document_123", title: "Brief" })
      )
    ).toEqual({
      documentId: "document_123",
      title: "Brief",
      workspacePath: "/documents/document_123",
    })
  })

  it("returns null for non-document timeline steps", () => {
    expect(
      projectDocumentTimelineAction(
        step({ provider: "native", toolName: "readWorkspaceFile" })
      )
    ).toBeNull()
  })
})
