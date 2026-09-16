import type { DatabaseSync } from "node:sqlite";
import {
  MessageImportance,
  MessageKind,
  type ArtifactId,
  type RunId,
  type RunStatus,
  type TaskId,
  type TransitionReason,
} from "./schema.js";
import { emit, message, row, run } from "./store-db.js";

export const ACTIVE_RUN_STATUSES = [
  "queued",
  "running",
  "waiting_approval",
  "waiting_input",
] as const satisfies readonly RunStatus[];

const quoted = ACTIVE_RUN_STATUSES.map((status) => `'${status}'`).join(",");

export const ACTIVE_RUN_SQL = `status IN (${quoted})`;

export const ACTIVE_RUN_OR_LOADING_SQL = `(${ACTIVE_RUN_SQL} OR json_extract(provider_state,'$.loadStatus')='loading')`;

export type ActiveRunStatus = (typeof ACTIVE_RUN_STATUSES)[number];
export type FinishedRunStatus = "succeeded" | "failed" | "canceled";
export type FinishedTaskStatus = "completed" | "failed" | "canceled";

export const isActiveRunStatus = (status: string): boolean =>
  (ACTIVE_RUN_STATUSES as readonly string[]).includes(status);

export const isTerminalStatus = (status: string): boolean => !isActiveRunStatus(status);

export type FinishRunMessage = {
  readonly authorKind: "human" | "bot" | "system";
  readonly authorName: "owner" | "mara" | "ivo" | "agentis";
  readonly kind: typeof MessageKind.Type;
  readonly importance: typeof MessageImportance.Type;
  readonly dedupeKey: string;
  readonly body: string;
};

export type FinishRunInput = {
  readonly runId: RunId;
  readonly taskId: TaskId;
  readonly status: FinishedRunStatus;
  readonly taskStatus: FinishedTaskStatus;
  readonly nowMs: number;
  readonly latestArtifactId?: ArtifactId;
  readonly message: FinishRunMessage;
  readonly transition: {
    readonly reason: typeof TransitionReason.Type;
    readonly body: Record<string, unknown>;
  };
};

export const finishRun = (db: DatabaseSync, input: FinishRunInput): void => {
  run(db, "UPDATE runs SET status=?,waiting_reason='none',completed_at=? WHERE id=?", [
    input.status,
    input.nowMs,
    input.runId,
  ]);
  run(
    db,
    "UPDATE tasks SET status=?,updated_at=?,latest_artifact_id=COALESCE(?,latest_artifact_id) WHERE id=? AND current_run_id=?",
    [input.taskStatus, input.nowMs, input.latestArtifactId ?? null, input.taskId, input.runId],
  );
  const thread = row<{ thread_id: string }>(db, "SELECT thread_id FROM runs WHERE id=?", [
    input.runId,
  ]);
  message(db, {
    threadId: thread?.thread_id ?? "",
    taskId: input.taskId,
    runId: input.runId,
    ...input.message,
    nowMs: input.nowMs,
  });
  emit(db, input.transition.reason, input.transition.body, input.nowMs);
};
