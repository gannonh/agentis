import {
  agentSourceWorkflowSchema,
  type AgentSourceThread,
  type AgentSourceWorkflow,
} from "@workspace/shared"

export type SourceWorkflowSnapshot =
  | {
      sourceThread: AgentSourceThread
      sourceWorkflow: AgentSourceWorkflow
    }
  | {
      sourceThread?: undefined
      sourceWorkflow?: undefined
    }

type SourceWorkflowColumns = {
  sourceThreadId: string | null
  sourceThreadTitle: string | null
  sourceWorkflowJson: string | null
}

type OptionalSourceWorkflowSnapshot = {
  sourceThread?: AgentSourceThread
  sourceWorkflow?: AgentSourceWorkflow
}

export function toSourceWorkflowSnapshot(
  input: OptionalSourceWorkflowSnapshot
): SourceWorkflowSnapshot {
  if (!input.sourceThread && !input.sourceWorkflow) return {}
  if (!input.sourceThread || !input.sourceWorkflow) {
    throw new Error("Incomplete source workflow snapshot")
  }
  return {
    sourceThread: input.sourceThread,
    sourceWorkflow: input.sourceWorkflow,
  }
}

export function parseSourceWorkflowJson(
  raw: string | null
): AgentSourceWorkflow | undefined {
  if (!raw) return undefined
  return agentSourceWorkflowSchema.parse(JSON.parse(raw))
}

export function serializeSourceWorkflowJson(
  sourceWorkflow?: AgentSourceWorkflow
): string | null {
  return sourceWorkflow
    ? JSON.stringify(agentSourceWorkflowSchema.parse(sourceWorkflow))
    : null
}

export function mapSourceWorkflowSnapshot(
  row: SourceWorkflowColumns
): SourceWorkflowSnapshot {
  const sourceWorkflow = parseSourceWorkflowJson(row.sourceWorkflowJson)
  const sourceThread = row.sourceThreadId
    ? {
        id: row.sourceThreadId,
        title: row.sourceThreadTitle ?? row.sourceThreadId,
      }
    : undefined

  if (!sourceThread && !sourceWorkflow) return {}
  if (!sourceThread || !sourceWorkflow) {
    throw new Error("Invalid persisted source workflow snapshot")
  }

  return { sourceThread, sourceWorkflow }
}

export function sourceWorkflowColumns(
  snapshot: SourceWorkflowSnapshot
): SourceWorkflowColumns {
  return {
    sourceThreadId: snapshot.sourceThread?.id ?? null,
    sourceThreadTitle: snapshot.sourceThread?.title ?? null,
    sourceWorkflowJson: serializeSourceWorkflowJson(snapshot.sourceWorkflow),
  }
}
