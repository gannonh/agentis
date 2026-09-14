import { type DatabaseSync, type SQLInputValue } from "node:sqlite";
import { newEventId, newMessageId } from "./ids.js";
import type { MessageImportance, MessageKind } from "./schema.js";
export const row = <T>(db: DatabaseSync, sql: string, params: SQLInputValue[] = []) =>
  db.prepare(sql).get(...params) as T | undefined;

export const rows = <T>(db: DatabaseSync, sql: string, params: SQLInputValue[] = []) =>
  db.prepare(sql).all(...params) as T[];

export const run = (db: DatabaseSync, sql: string, params: SQLInputValue[] = []) => {
  db.prepare(sql).run(...params);
};

export const withTxn = <T>(db: DatabaseSync, fn: () => T): T => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

export const emit = (
  db: DatabaseSync,
  type: string,
  body: Record<string, unknown>,
  nowMs: number,
) => {
  run(db, "INSERT INTO events (id, type, body, created_at) VALUES (?, ?, ?, ?)", [
    newEventId(),
    type,
    JSON.stringify(body),
    nowMs,
  ]);
};

export const message = (
  db: DatabaseSync,
  input: {
    threadId: string;
    taskId: string;
    runId: string | null;
    authorKind: string;
    authorName: string;
    authorRole?: "operator" | "coordinator" | "specialist" | "system";
    kind?: typeof MessageKind.Type;
    importance?: typeof MessageImportance.Type;
    dedupeKey?: string;
    body: string;
    nowMs: number;
  },
) => {
  const id = newMessageId();
  const authorRole =
    input.authorRole ??
    (input.authorName === "mara"
      ? "coordinator"
      : input.authorName === "ivo"
        ? "specialist"
        : input.authorName === "owner"
          ? "operator"
          : "system");
  run(
    db,
    `INSERT OR IGNORE INTO messages
       (id, thread_id, task_id, run_id, author_kind, author_name, author_role, kind, importance, dedupe_key, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.threadId,
      input.taskId,
      input.runId,
      input.authorKind,
      input.authorName,
      authorRole,
      input.kind ?? "progress",
      input.importance ?? "routine",
      input.dedupeKey ?? id,
      input.body,
      input.nowMs,
    ],
  );
  return id;
};
