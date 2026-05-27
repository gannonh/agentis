import { describe, expect, it } from "vitest"
import {
  mapSourceWorkflowSnapshot,
  serializeSourceWorkflowJson,
  sourceWorkflowColumns,
  toSourceWorkflowSnapshot,
} from "./source-workflow-snapshot.js"

describe("source workflow snapshots", () => {
  it("serializes and maps source workflow snapshots through the canonical schema", () => {
    const columns = sourceWorkflowColumns({
      sourceThread: {
        id: "thread-1",
        title: "Investigate support backlog",
      },
      sourceWorkflow: {
        summary: "Investigate support backlog",
        firstUserPrompt: "Review support backlog patterns",
      },
    })

    expect(mapSourceWorkflowSnapshot(columns)).toEqual({
      sourceThread: {
        id: "thread-1",
        title: "Investigate support backlog",
      },
      sourceWorkflow: {
        summary: "Investigate support backlog",
        firstUserPrompt: "Review support backlog patterns",
      },
    })
  })

  it("rejects invalid persisted source workflow payloads", () => {
    expect(() =>
      mapSourceWorkflowSnapshot({
        sourceThreadId: "thread-1",
        sourceThreadTitle: "Investigate support backlog",
        sourceWorkflowJson: JSON.stringify({ summary: "" }),
      })
    ).toThrow()
  })

  it("requires source thread and workflow to travel as one snapshot", () => {
    expect(() =>
      toSourceWorkflowSnapshot({
        sourceWorkflow: { summary: "Investigate support backlog" },
      })
    ).toThrow("Incomplete source workflow snapshot")
    expect(() =>
      mapSourceWorkflowSnapshot({
        sourceThreadId: null,
        sourceThreadTitle: null,
        sourceWorkflowJson: JSON.stringify({
          summary: "Investigate support backlog",
        }),
      })
    ).toThrow("Invalid persisted source workflow snapshot")
  })

  it("omits empty source workflow snapshots from persistence columns", () => {
    expect(sourceWorkflowColumns({})).toEqual({
      sourceThreadId: null,
      sourceThreadTitle: null,
      sourceWorkflowJson: null,
    })
    expect(serializeSourceWorkflowJson(undefined)).toBeNull()
  })
})
