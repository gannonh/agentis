import { randomUUID, createHash } from "node:crypto";
import { openSync, closeSync, fstatSync, readSync, constants } from "node:fs";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { Schema } from "effect";
import { newActionIntentId, newRunId } from "./ids.js";
import {
  CommandReceipt,
  FrozenConfig,
  HandoffRow,
  type ProposeHandoff,
  type CommandId,
  type RunId,
} from "./schema.js";
import type { ApplyInput } from "./store.js";
import { row, rows, run, emit, message } from "./store-db.js";
import {
  CLAUDE_CLI_PIN,
  MAX_ACTIVE_RUNS,
  MAX_ACTIVE_RUNS_PER_BOT,
  MAX_ACTIONS_PER_TASK,
  RUN_DEADLINE_MS,
} from "./versions.js";

export const HANDOFF_DDL = `CREATE TABLE IF NOT EXISTS handoffs (
 id TEXT PRIMARY KEY, taskId TEXT NOT NULL UNIQUE, threadId TEXT NOT NULL,
 sourceRunId TEXT NOT NULL UNIQUE, recipientRunId TEXT NOT NULL UNIQUE,
 context TEXT NOT NULL, state TEXT NOT NULL, expiresAt INTEGER NOT NULL,
 grants TEXT NOT NULL DEFAULT 'draft_only', onwardDelegation INTEGER NOT NULL DEFAULT 0
);`;
const decodeHandoff = (value: Record<string, unknown>) =>
  Schema.decodeUnknownSync(HandoffRow)({
    ...value,
    onwardDelegation: value.onwardDelegation === 0 ? false : value.onwardDelegation,
  });
export const handoffs = (db: DatabaseSync): HandoffRow[] =>
  rows<Record<string, unknown>>(db, "SELECT * FROM handoffs").map(decodeHandoff);
export const handoffForRun = (db: DatabaseSync, runId: RunId) => {
  const value = row<Record<string, unknown>>(db, "SELECT * FROM handoffs WHERE recipientRunId=?", [
    runId,
  ]);
  return value ? decodeHandoff(value) : undefined;
};
const note = (
  db: DatabaseSync,
  handoff: HandoffRow,
  state: string,
  reason: string,
  nowMs: number,
) => {
  const author = state === "proposed" ? "mara" : "ivo";
  message(db, {
    threadId: handoff.threadId,
    taskId: handoff.taskId,
    runId: handoff.recipientRunId,
    authorKind: "bot",
    authorName: author,
    body: `Handoff ${state}: ${reason}`,
    nowMs,
  });
  emit(
    db,
    `handoff_${state}`,
    {
      handoffId: handoff.id,
      taskId: handoff.taskId,
      threadId: handoff.threadId,
      runId: handoff.recipientRunId,
      author,
      reason,
    },
    nowMs,
  );
};
export const rejectHandoff = (
  db: DatabaseSync,
  runId: RunId,
  state: "rejected" | "expired",
  reason: string,
  nowMs: number,
) => {
  const handoff = handoffForRun(db, runId);
  if (!handoff || handoff.state !== "proposed") return false;
  run(db, "UPDATE handoffs SET state=? WHERE id=? AND state='proposed'", [state, handoff.id]);
  run(db, "UPDATE runs SET status='failed',waiting_reason='none' WHERE id=?", [runId]);
  run(db, "UPDATE pending_actions SET state='canceled' WHERE run_id=? AND state='pending'", [
    runId,
  ]);
  note(db, handoff, state, reason, nowMs);
  return true;
};
const readVerifiedSource = (artifact: {
  path: string;
  byte_size: number;
  sha256: string;
}): string | null => {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      artifact.path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const info = fstatSync(descriptor);
    if (!info.isFile() || info.size > 65536 || info.size !== artifact.byte_size) return null;
    const buffer = Buffer.alloc(65537);
    let size = 0;
    while (size < buffer.length) {
      const count = readSync(descriptor, buffer, size, buffer.length - size, null);
      if (count === 0) break;
      size += count;
    }
    if (size > 65536 || size !== artifact.byte_size) return null;
    const bytes = buffer.subarray(0, size);
    if (createHash("sha256").update(bytes).digest("hex") !== artifact.sha256) return null;
    return bytes.toString("utf8");
  } catch {
    return null;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
};

export const proposeHandoff = (
  db: DatabaseSync,
  commandId: CommandId,
  input: ApplyInput,
  command: typeof ProposeHandoff.Type,
): CommandReceipt => {
  const denied = (error: string): CommandReceipt => ({
    commandId,
    replayed: false,
    accepted: false,
    error,
    effects: [],
  });
  const source = row<{
    task_id: string;
    thread_id: string;
    frozen_json: string;
    brief: string;
    action_count: number;
    owner_session: string;
  }>(
    db,
    `SELECT r.task_id,r.thread_id,r.frozen_json,t.brief,t.action_count,t.owner_session FROM runs r JOIN tasks t ON t.id=r.task_id WHERE r.id=? AND r.status='succeeded' AND t.bot_name='mara' AND json_extract(r.frozen_json,'$.bot')='mara'`,
    [command.sourceRunId],
  );
  if (!source || source.owner_session !== input.principal.sessionId)
    return denied("handoff requires the owner's completed Mara source run");
  if (row(db, "SELECT id FROM handoffs WHERE taskId=?", [source.task_id]))
    return denied("task already has a bounded handoff");
  if (row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id=1")?.latched === 1)
    return denied("stop-all is latched");
  const counts = row<{ total: number; bot: number }>(
    db,
    `SELECT COUNT(*) AS total,COALESCE(SUM(json_extract(frozen_json,'$.bot')='ivo'),0) AS bot FROM runs WHERE status IN ('queued','running','waiting_approval','waiting_input','reconciling') OR json_extract(provider_state,'$.loadStatus')='loading'`,
  );
  if ((counts?.total ?? 0) >= MAX_ACTIVE_RUNS || (counts?.bot ?? 0) >= MAX_ACTIVE_RUNS_PER_BOT)
    return denied("handoff concurrency exceeded");
  if (source.action_count + 2 > MAX_ACTIONS_PER_TASK) return denied("task action budget exhausted");
  const original = Schema.decodeUnknownSync(FrozenConfig)(JSON.parse(source.frozen_json));
  if (original.provider !== "codex")
    return denied("handoff requires Codex coordinator and Claude specialist");
  const artifact = row<{ path: string; byte_size: number; sha256: string }>(
    db,
    "SELECT path,byte_size,sha256 FROM artifacts WHERE run_id=? ORDER BY created_at DESC LIMIT 1",
    [command.sourceRunId],
  );
  if (!artifact || artifact.byte_size > 65536)
    return denied("handoff requires a source draft of at most 65536 bytes");
  const sourceDraft = readVerifiedSource(artifact);
  if (sourceDraft === null)
    return denied("source draft is missing, changed, oversized, or not a regular file");
  const context = JSON.stringify({
    sender: "mara",
    sourceRunId: command.sourceRunId,
    brief: source.brief,
    sourceDraft,
    request: command.context,
  });
  const recipientRunId = newRunId();
  const frozen: FrozenConfig = {
    executionBoundary: original.executionBoundary,
    deadlineMs: original.deadlineMs,
    actionBudget: original.actionBudget,
    bot: "ivo",
    provider: "claude",
    transport: "claude-sdk-jsonl-stdio",
    executableVersion: CLAUDE_CLI_PIN,
    model: "claude-sonnet-5",
    effort: "medium",
    authMode: "api-key",
    workspaceId: join(input.workspaceId, "runs", recipientRunId),
    mode: "agent",
  };
  const handoff = Schema.decodeUnknownSync(HandoffRow)({
    id: `handoff_${randomUUID()}`,
    taskId: source.task_id,
    threadId: source.thread_id,
    sourceRunId: command.sourceRunId,
    recipientRunId,
    context,
    state: "proposed",
    expiresAt: input.nowMs + 60000,
    grants: "draft_only",
    onwardDelegation: false,
  });
  run(
    db,
    "INSERT INTO handoffs (id,taskId,threadId,sourceRunId,recipientRunId,context,state,expiresAt) VALUES (?,?,?,?,?,?,?,?)",
    [
      handoff.id,
      handoff.taskId,
      handoff.threadId,
      handoff.sourceRunId,
      recipientRunId,
      context,
      handoff.state,
      handoff.expiresAt,
    ],
  );
  run(
    db,
    `INSERT INTO runs (id,task_id,thread_id,status,waiting_reason,frozen_json,fixture,action_count,deadline_at,created_at) VALUES (?,?,?,'queued','none',?,NULL,0,?,?)`,
    [
      recipientRunId,
      handoff.taskId,
      handoff.threadId,
      JSON.stringify(frozen),
      input.nowMs + RUN_DEADLINE_MS,
      input.nowMs,
    ],
  );
  run(
    db,
    "INSERT INTO pending_actions (id,run_id,kind,state,payload,created_at) VALUES (?,?,'launch','pending',?,?)",
    [newActionIntentId(), recipientRunId, JSON.stringify({ handoffId: handoff.id }), input.nowMs],
  );
  note(
    db,
    handoff,
    "proposed",
    "Mara requests Ivo's explicit acceptance; draft only, no onward delegation",
    input.nowMs,
  );
  return {
    commandId,
    replayed: false,
    accepted: true,
    handoffId: handoff.id,
    taskId: handoff.taskId,
    threadId: handoff.threadId,
    runId: recipientRunId,
    effects: ["launch"],
  };
};
const Decision = Schema.Struct({
  handoffId: Schema.String,
  decision: Schema.Literal("accept", "reject"),
});
export const decideHandoff = (
  db: DatabaseSync,
  runId: RunId,
  sessionId: string,
  text: string,
  nowMs: number,
) => {
  const h = handoffForRun(db, runId);
  if (!h || h.state !== "proposed") return false;
  if (h.expiresAt <= nowMs) {
    rejectHandoff(db, runId, "expired", "acceptance timed out", nowMs);
    return false;
  }
  const current = row<{
    status: string;
    provider_session_id: string;
    bot_name: string;
    action_count: number;
  }>(
    db,
    "SELECT r.status,r.provider_session_id,t.bot_name,t.action_count FROM runs r JOIN tasks t ON t.id=r.task_id WHERE r.id=?",
    [runId],
  );
  if (
    !current ||
    current.status !== "running" ||
    current.provider_session_id !== sessionId ||
    current.bot_name !== "mara" ||
    row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id=1")?.latched !== 0
  )
    return false;
  let decision: typeof Decision.Type;
  try {
    decision = Schema.decodeUnknownSync(Decision, { onExcessProperty: "error" })(JSON.parse(text));
  } catch {
    rejectHandoff(db, runId, "rejected", "invalid acceptance response", nowMs);
    return false;
  }
  if (
    decision.handoffId !== h.id ||
    decision.decision === "reject" ||
    current.action_count >= MAX_ACTIONS_PER_TASK
  ) {
    rejectHandoff(
      db,
      runId,
      "rejected",
      decision.handoffId !== h.id
        ? "wrong handoff identity"
        : decision.decision === "reject"
          ? "recipient declined"
          : "task action budget exhausted",
      nowMs,
    );
    return false;
  }
  run(db, "UPDATE handoffs SET state='accepted' WHERE id=? AND state='proposed'", [h.id]);
  run(
    db,
    "UPDATE tasks SET bot_name='ivo',bot_role='specialist',status='running' WHERE id=? AND bot_name='mara'",
    [h.taskId],
  );
  run(
    db,
    "INSERT INTO pending_actions (id,run_id,kind,state,payload,created_at) VALUES (?,?,'handoff_draft','pending',?,?)",
    [newActionIntentId(), runId, JSON.stringify({ handoffId: h.id }), nowMs],
  );
  note(db, h, "accepted", "ownership transferred from Mara to Ivo", nowMs);
  return true;
};
export const claimDraft = (db: DatabaseSync, runId: RunId) => {
  const result = db
    .prepare(
      "UPDATE pending_actions SET state='claimed' WHERE run_id=? AND kind='handoff_draft' AND state='pending'",
    )
    .run(runId);
  return result.changes === 1;
};
