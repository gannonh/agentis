import type { RunStep } from "./schemas.js"

export type PendingApprovalFromStep = {
  toolCallId: string
  toolName: string
  path?: string
  actionType: "execution" | "edit"
}

function parsePendingApprovalRecord(
  record: Record<string, unknown>
): { toolCallId: string } | null {
  const approval =
    typeof record.approval === "object" && record.approval !== null
      ? (record.approval as Record<string, unknown>)
      : null
  if (approval?.status !== "pending") return null

  const toolCallId =
    typeof record.toolCallId === "string" ? record.toolCallId : null
  if (!toolCallId) return null

  return { toolCallId }
}

function pendingApprovalRecordFromStep(
  step: RunStep
): Record<string, unknown> | null {
  const payload = step.payload
  if (!payload || typeof payload !== "object") return null
  return payload as Record<string, unknown>
}

export function stepHasPendingApproval(step: RunStep): boolean {
  const record = pendingApprovalRecordFromStep(step)
  return record ? parsePendingApprovalRecord(record) !== null : false
}

export function getPendingApprovalFromStep(
  step: RunStep
): PendingApprovalFromStep | null {
  const record = pendingApprovalRecordFromStep(step)
  if (!record) return null

  const pending = parsePendingApprovalRecord(record)
  if (!pending) return null

  const output =
    typeof record.output === "object" && record.output !== null
      ? (record.output as Record<string, unknown>)
      : null

  return {
    toolCallId: pending.toolCallId,
    toolName:
      typeof record.toolName === "string" ? record.toolName : "workspace edit",
    path: typeof output?.path === "string" ? output.path : undefined,
    actionType:
      typeof record.toolName === "string" &&
      record.toolName === "runWorkspaceCommand"
        ? "execution"
        : "edit",
  }
}

export function runStepsHavePendingApproval(steps: RunStep[]): boolean {
  return steps.some(stepHasPendingApproval)
}
