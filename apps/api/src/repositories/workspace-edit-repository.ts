import { and, eq } from "drizzle-orm"
import type { ThreadMode } from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import { workspaceEdits } from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"

export type WorkspaceEditStatus =
  | "pending"
  | "denied"
  | "applied"
  | "failed"

export type WorkspaceEditRecord = {
  id: string
  workspaceId: string
  threadId: string
  runId: string
  toolCallId: string
  toolName: string
  operation: string
  path: string
  status: WorkspaceEditStatus
  approvalMode: ThreadMode
  input: Record<string, unknown>
  result?: Record<string, unknown>
  contentHashBefore?: string
  contentHashAfter?: string
  createdAt: string
  appliedAt?: string
}

function mapRow(row: typeof workspaceEdits.$inferSelect): WorkspaceEditRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    threadId: row.threadId,
    runId: row.runId,
    toolCallId: row.toolCallId,
    toolName: row.toolName,
    operation: row.operation,
    path: row.path,
    status: row.status as WorkspaceEditStatus,
    approvalMode: row.approvalMode as ThreadMode,
    input: JSON.parse(row.inputJson) as Record<string, unknown>,
    result: row.resultJson
      ? (JSON.parse(row.resultJson) as Record<string, unknown>)
      : undefined,
    contentHashBefore: row.contentHashBefore ?? undefined,
    contentHashAfter: row.contentHashAfter ?? undefined,
    createdAt: row.createdAt,
    appliedAt: row.appliedAt ?? undefined,
  }
}

export class WorkspaceEditRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: {
    workspaceId: string
    threadId: string
    runId: string
    toolCallId: string
    toolName: string
    operation: string
    path: string
    status: WorkspaceEditStatus
    approvalMode: ThreadMode
    input: Record<string, unknown>
    result?: Record<string, unknown>
    contentHashBefore?: string
    contentHashAfter?: string
  }): WorkspaceEditRecord {
    const now = nowIso()
    const row = {
      id: createId("wedit"),
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      runId: input.runId,
      toolCallId: input.toolCallId,
      toolName: input.toolName,
      operation: input.operation,
      path: input.path,
      status: input.status,
      approvalMode: input.approvalMode,
      inputJson: JSON.stringify(input.input),
      resultJson: input.result ? JSON.stringify(input.result) : null,
      contentHashBefore: input.contentHashBefore ?? null,
      contentHashAfter: input.contentHashAfter ?? null,
      createdAt: now,
      appliedAt: input.status === "applied" ? now : null,
    }
    this.db.insert(workspaceEdits).values(row).run()
    return mapRow(row)
  }

  getById(id: string): WorkspaceEditRecord | null {
    const row = this.db
      .select()
      .from(workspaceEdits)
      .where(eq(workspaceEdits.id, id))
      .get()
    return row ? mapRow(row) : null
  }

  getByRunAndToolCall(
    runId: string,
    toolCallId: string
  ): WorkspaceEditRecord | null {
    const row = this.db
      .select()
      .from(workspaceEdits)
      .where(
        and(
          eq(workspaceEdits.runId, runId),
          eq(workspaceEdits.toolCallId, toolCallId)
        )
      )
      .get()
    return row ? mapRow(row) : null
  }

  getPendingByRunId(runId: string): WorkspaceEditRecord | null {
    const row = this.db
      .select()
      .from(workspaceEdits)
      .where(
        and(eq(workspaceEdits.runId, runId), eq(workspaceEdits.status, "pending"))
      )
      .get()
    return row ? mapRow(row) : null
  }

  update(
    id: string,
    patch: {
      status?: WorkspaceEditStatus
      result?: Record<string, unknown>
      contentHashBefore?: string
      contentHashAfter?: string
      appliedAt?: string
    }
  ): WorkspaceEditRecord | null {
    const existing = this.db
      .select()
      .from(workspaceEdits)
      .where(eq(workspaceEdits.id, id))
      .get()
    if (!existing) return null

    const appliedAt =
      patch.appliedAt ??
      (patch.status === "applied" || patch.status === "denied"
        ? nowIso()
        : existing.appliedAt)

    this.db
      .update(workspaceEdits)
      .set({
        status: patch.status ?? existing.status,
        resultJson:
          patch.result !== undefined
            ? JSON.stringify(patch.result)
            : existing.resultJson,
        contentHashBefore: patch.contentHashBefore ?? existing.contentHashBefore,
        contentHashAfter: patch.contentHashAfter ?? existing.contentHashAfter,
        appliedAt,
      })
      .where(eq(workspaceEdits.id, id))
      .run()

    const row = this.db
      .select()
      .from(workspaceEdits)
      .where(eq(workspaceEdits.id, id))
      .get()
    return row ? mapRow(row) : null
  }
}
