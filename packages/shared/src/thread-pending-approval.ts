import type { RunStep } from "./schemas.js"

function stepPayloadHasPendingApproval(step: RunStep): boolean {
  const payload = step.payload
  if (!payload || typeof payload !== "object") return false

  const record = payload as Record<string, unknown>
  const approval =
    typeof record.approval === "object" && record.approval !== null
      ? (record.approval as Record<string, unknown>)
      : null
  if (approval?.status !== "pending") return false

  return typeof record.toolCallId === "string"
}

export function stepHasPendingApproval(step: RunStep): boolean {
  return stepPayloadHasPendingApproval(step)
}

export function runStepsHavePendingApproval(steps: RunStep[]): boolean {
  return steps.some(stepHasPendingApproval)
}
