import { and, eq } from "drizzle-orm"
import type { ThreadMode } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { workspaceExecutions } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

export type WorkspaceExecutionStatus =
  | "pending"
  | "denied"
  | "applied"
  | "failed"
  | "aborted"

export type WorkspaceExecutionRecord = {
  id: string
  workspaceId: string
  threadId: string
  runId: string
  toolCallId: string
  toolName: string
  kind: "command" | "script"
  status: WorkspaceExecutionStatus
  approvalMode: ThreadMode
  input: Record<string, unknown>
  result?: Record<string, unknown>
  changedFiles: Array<{ path: string; operation: string }>
  createdAt: string
  finishedAt?: string
}

type ChangedFileRecord = WorkspaceExecutionRecord["changedFiles"][number]

function parseJsonObject(
  value: string | null
): Record<string, unknown> | undefined {
  if (!value) return undefined
  const parsed = JSON.parse(value) as unknown
  return typeof parsed === "object" && parsed !== null
    ? (parsed as Record<string, unknown>)
    : undefined
}

function parseChangedFiles(value: string | null): ChangedFileRecord[] {
  return value ? (JSON.parse(value) as ChangedFileRecord[]) : []
}

function stringifyJsonObject(
  value: Record<string, unknown> | undefined
): string | null {
  return value === undefined ? null : JSON.stringify(value)
}

function stringifyChangedFiles(
  files: ChangedFileRecord[] | undefined
): string | null {
  return files && files.length > 0 ? JSON.stringify(files) : null
}

function finishedAtForStatus(
  status: WorkspaceExecutionStatus | undefined,
  existingFinishedAt?: string
): string | null {
  if (status && status !== "pending") return nowIso()
  return existingFinishedAt ?? null
}

function mapRow(
  row: typeof workspaceExecutions.$inferSelect
): WorkspaceExecutionRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    threadId: row.threadId,
    runId: row.runId,
    toolCallId: row.toolCallId,
    toolName: row.toolName,
    kind: row.kind as "command" | "script",
    status: row.status as WorkspaceExecutionStatus,
    approvalMode: row.approvalMode as ThreadMode,
    input: JSON.parse(row.inputJson) as Record<string, unknown>,
    result: parseJsonObject(row.resultJson),
    changedFiles: parseChangedFiles(row.changedFilesJson),
    createdAt: row.createdAt,
    finishedAt: row.finishedAt ?? undefined,
  }
}

export class WorkspaceExecutionRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    workspaceId: string
    threadId: string
    runId: string
    toolCallId: string
    toolName: string
    kind: "command" | "script"
    status: WorkspaceExecutionStatus
    approvalMode: ThreadMode
    input: Record<string, unknown>
    result?: Record<string, unknown>
    changedFiles?: ChangedFileRecord[]
  }): WorkspaceExecutionRecord {
    const now = nowIso()
    const row = {
      id: createId("wexec"),
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      kind: input.kind,
      status: input.status,
      approvalMode: input.approvalMode,
      inputJson: JSON.stringify(input.input),
      resultJson: stringifyJsonObject(input.result),
      changedFilesJson: stringifyChangedFiles(input.changedFiles),
      createdAt: now,
      finishedAt: input.status === "pending" ? null : now,
    }
    this.db.insert(workspaceExecutions).values(row).run()
    return mapRow(row)
  }

  getById(id: string): WorkspaceExecutionRecord | null {
    const row = this.db
      .select()
      .from(workspaceExecutions)
      .where(eq(workspaceExecutions.id, id))
      .get()
    return row ? mapRow(row) : null
  }

  getByRunAndToolCall(
    runId: string,
    toolCallId: string
  ): WorkspaceExecutionRecord | null {
    const row = this.db
      .select()
      .from(workspaceExecutions)
      .where(
        and(
          eq(workspaceExecutions.runId, runId),
          eq(workspaceExecutions.toolCallId, toolCallId)
        )
      )
      .get()
    return row ? mapRow(row) : null
  }

  getPendingByRunId(runId: string): WorkspaceExecutionRecord | null {
    const row = this.db
      .select()
      .from(workspaceExecutions)
      .where(
        and(
          eq(workspaceExecutions.runId, runId),
          eq(workspaceExecutions.status, "pending")
        )
      )
      .get()
    return row ? mapRow(row) : null
  }

  update(
    id: string,
    patch: {
      status?: WorkspaceExecutionStatus
      result?: Record<string, unknown>
      changedFiles?: ChangedFileRecord[]
      finishedAt?: string
    }
  ): WorkspaceExecutionRecord | null {
    const existing = this.getById(id)
    if (!existing) return null
    const finishedAt =
      patch.finishedAt ?? finishedAtForStatus(patch.status, existing.finishedAt)
    const result = patch.result ?? existing.result
    const changedFiles = patch.changedFiles ?? existing.changedFiles

    this.db
      .update(workspaceExecutions)
      .set({
        status: patch.status ?? existing.status,
        resultJson: stringifyJsonObject(result),
        changedFilesJson: stringifyChangedFiles(changedFiles),
        finishedAt,
      })
      .where(eq(workspaceExecutions.id, id))
      .run()
    return this.getById(id)
  }

  claimPending(
    id: string,
    status: Extract<WorkspaceExecutionStatus, "applied" | "denied">
  ): WorkspaceExecutionRecord | null {
    const row = this.db
      .update(workspaceExecutions)
      .set({ status, finishedAt: nowIso() })
      .where(
        and(
          eq(workspaceExecutions.id, id),
          eq(workspaceExecutions.status, "pending")
        )
      )
      .returning()
      .get()
    return row ? mapRow(row) : null
  }
}
