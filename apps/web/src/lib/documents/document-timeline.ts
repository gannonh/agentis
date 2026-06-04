import type { RunStep } from "@workspace/shared"
import { documentWorkspacePath } from "@/lib/api/projects-client"

export type DocumentTimelineAction = {
  documentId: string
  title?: string
  workspacePath: string
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

export function projectDocumentTimelineAction(
  step: RunStep
): DocumentTimelineAction | null {
  const payload = getRecord(step.payload)
  if (!payload || typeof payload.documentId !== "string") return null

  return {
    documentId: payload.documentId,
    title: typeof payload.title === "string" ? payload.title : undefined,
    workspacePath: documentWorkspacePath(payload.documentId),
  }
}
