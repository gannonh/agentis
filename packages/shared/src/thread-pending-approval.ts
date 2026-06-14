import type { RunStep } from "./schemas.js"

function approvalPayload(step: RunStep): Record<string, unknown> | null {
  const payload = step.payload
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const approval =
    typeof record.approval === "object" && record.approval !== null
      ? (record.approval as Record<string, unknown>)
      : null
  if (approval?.status !== "pending") return null

  const toolCallId =
    typeof record.toolCallId === "string" ? record.toolCallId : null
  if (!toolCallId) return null

  return record
}

export function stepHasPendingApproval(step: RunStep): boolean {
  return approvalPayload(step) !== null
}

export function runStepsHavePendingApproval(steps: RunStep[]): boolean {
  return steps.some(stepHasPendingApproval)
}
