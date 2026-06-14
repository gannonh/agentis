import { describe, expect, it } from "vitest"
import type { RunStep } from "./schemas.js"
import {
  getPendingApprovalFromStep,
  runStepsHavePendingApproval,
  stepHasPendingApproval,
} from "./thread-pending-approval.js"

describe("thread pending approval helpers", () => {
  const pendingStep = {
    id: "step_1",
    runId: "run_1",
    type: "tool-result",
    status: "pending",
    title: "Workspace edit",
    payload: {
      toolCallId: "tool-call-1",
      approval: { status: "pending" },
    },
    createdAt: "2026-06-14T00:00:00.000Z",
    updatedAt: "2026-06-14T00:00:00.000Z",
  } satisfies RunStep

  it("detects pending approval on a step", () => {
    expect(stepHasPendingApproval(pendingStep)).toBe(true)
  })

  it("returns false when approval is not pending", () => {
    expect(
      stepHasPendingApproval({
        ...pendingStep,
        payload: {
          toolCallId: "tool-call-1",
          approval: { status: "approved" },
        },
      })
    ).toBe(false)
  })

  it("returns false when toolCallId is missing", () => {
    expect(
      stepHasPendingApproval({
        ...pendingStep,
        payload: {
          approval: { status: "pending" },
        },
      })
    ).toBe(false)
  })

  it("detects pending approval across run steps", () => {
    expect(runStepsHavePendingApproval([pendingStep])).toBe(true)
    expect(runStepsHavePendingApproval([])).toBe(false)
  })

  it("parses pending approval details for thread detail", () => {
    expect(getPendingApprovalFromStep(pendingStep)).toEqual({
      toolCallId: "tool-call-1",
      toolName: "workspace edit",
      path: undefined,
      actionType: "edit",
    })
  })
})
