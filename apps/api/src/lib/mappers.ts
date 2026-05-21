import type {
  Message,
  MessagePart,
  Run,
  RunStep,
  RunUsage,
  Thread,
} from "@workspace/shared"
import type { messages, runSteps, runs, threads } from "../db/schema.js"

type ThreadRow = typeof threads.$inferSelect
type MessageRow = typeof messages.$inferSelect
type RunRow = typeof runs.$inferSelect
type RunStepRow = typeof runSteps.$inferSelect

export function mapThread(row: ThreadRow): Thread {
  return {
    id: row.id,
    title: row.title,
    status: row.status as Thread["status"],
    model: row.model,
    mode: row.mode as Thread["mode"],
    projectId: row.projectId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role as Message["role"],
    parts: JSON.parse(row.partsJson) as MessagePart[],
    status: row.status as Message["status"],
    createdAt: row.createdAt,
  }
}

export function mapRun(row: RunRow): Run {
  return {
    id: row.id,
    threadId: row.threadId,
    status: row.status as Run["status"],
    model: row.model,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt ?? undefined,
    errorSummary: row.errorSummary ?? undefined,
    usage: row.usageJson
      ? (JSON.parse(row.usageJson) as RunUsage)
      : undefined,
    cost: row.cost ?? undefined,
  }
}

export function mapRunStep(row: RunStepRow): RunStep {
  return {
    id: row.id,
    runId: row.runId,
    type: row.type as RunStep["type"],
    status: row.status as RunStep["status"],
    title: row.title,
    payload: row.payloadJson
      ? (JSON.parse(row.payloadJson) as Record<string, unknown>)
      : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
