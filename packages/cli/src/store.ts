import {
  HANDOFF_DDL,
  handoffs,
  handoffForRun,
  proposeHandoff,
  rejectHandoff,
  decideHandoff,
  claimDraft,
} from "./handoff-store.js";
import { row, rows, run, withTxn, emit, message } from "./store-db.js";
import { ProviderState } from "./provider-contract.js";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Effect, Schema } from "effect";
import {
  newActionIntentId,
  newApprovalId,
  newArtifactId,
  newCommandId,
  newRunId,
  newTaskId,
  newThreadId,
} from "./ids.js";
import {
  ActionState,
  AnswerInput,
  CancelRun,
  Command,
  CommandReceipt,
  ExecutionBoundary,
  FixtureKind,
  FrozenConfig,
  ProviderKind,
  ResolveApproval,
  RunStatus,
  SubmitTask,
  type ActionIntentId,
  type ApprovalId,
  type CommandId,
  type HandoffRow,
  type IdempotencyKey,
  type PrincipalKind,
  type RunId,
  TaskId,
} from "./schema.js";
import {
  APPROVAL_TTL_MS,
  CURSOR_CLI_PIN,
  CODEX_AUTH_MODE,
  CODEX_CLI_PIN,
  CODEX_TRANSPORT,
  MAX_ACTIONS_PER_RUN,
  MAX_ACTIONS_PER_TASK,
  MAX_ACTIVE_RUNS,
  MAX_ACTIVE_RUNS_PER_BOT,
  RUN_DEADLINE_MS,
  SCHEMA_ID,
} from "./versions.js";

export class UnsupportedSchemaError extends Error {
  readonly _tag = "UnsupportedSchemaError";
  constructor(readonly found: string) {
    super(`unsupported schema ${found}; refusing to open or migrate`);
  }
}

export class StoreError extends Error {
  readonly _tag = "StoreError";
}

export type Principal = {
  readonly kind: PrincipalKind;
  readonly sessionId: string;
};

export type ApplyInput = {
  readonly principal: Principal;
  readonly idempotencyKey: IdempotencyKey;
  readonly command: Command;
  readonly nowMs: number;
  readonly provider: typeof ProviderKind.Type;
  readonly executionBoundary: typeof ExecutionBoundary.Type;
  readonly workspaceId: string;
};

export type TaskRow = {
  readonly id: TaskId;
  readonly brief: string;
  readonly ownerSession: string;
  readonly botName: string;
  readonly botRole: string;
  readonly status: string;
  readonly actionCount: number;
};

export type RunRow = {
  readonly id: RunId;
  readonly taskId: TaskId;
  readonly status: typeof RunStatus.Type;
  readonly waitingReason: string;
  readonly frozen: FrozenConfig;
  readonly providerState: ProviderState;
  readonly providerSessionId: string | null;
  readonly fixture: typeof FixtureKind.Type | null;
  readonly actionCount: number;
  readonly deadlineAt: number;
};

export type PendingActionRow = {
  readonly id: typeof ActionIntentId.Type;
  readonly runId: RunId;
  readonly kind: string;
  readonly state: typeof ActionState.Type;
  readonly payload: string;
  readonly approvalId: ApprovalId | null;
};

export type ArtifactRow = {
  readonly id: string;
  readonly taskId: TaskId;
  readonly runId: RunId;
  readonly author: string;
  readonly source: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly path: string;
};

export type MessageRow = {
  readonly id: string;
  readonly threadId: string;
  readonly taskId: TaskId;
  readonly runId: string | null;
  readonly authorKind: string;
  readonly authorName: string;
  readonly body: string;
};

export type Snapshot = {
  readonly schemaId: string;
  readonly stopAll: boolean;
  readonly tasks: readonly TaskRow[];
  readonly handoffs: readonly HandoffRow[];
  readonly runs: readonly RunRow[];
  readonly pending: readonly PendingActionRow[];
  readonly artifacts: readonly ArtifactRow[];
  readonly messages: readonly MessageRow[];
  readonly events: readonly EventRow[];
};

export type EventRow = {
  readonly seq: number;
  readonly id: string;
  readonly type: string;
  readonly body: string;
};

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const DDL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS commands (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  principal_kind TEXT NOT NULL,
  payload_digest TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  brief TEXT NOT NULL,
  owner_session TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  bot_role TEXT NOT NULL,
  status TEXT NOT NULL,
  action_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  status TEXT NOT NULL,
  waiting_reason TEXT NOT NULL,
  frozen_json TEXT NOT NULL,
  provider_state TEXT NOT NULL DEFAULT '{"loadStatus":"idle","capabilities":[],"history":[],"pendingPrompt":null,"failure":null}',
  provider_session_id TEXT,
  fixture TEXT,
  action_count INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  run_id TEXT,
  author_kind TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  author TEXT NOT NULL,
  source TEXT NOT NULL,
  media_type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  state TEXT NOT NULL,
  tool TEXT NOT NULL,
  argument_digest TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  resolver TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pending_actions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  state TEXT NOT NULL,
  payload TEXT NOT NULL,
  approval_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stop_all (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  latched INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

export type Store = {
  readonly path: string;
  readonly applyCommand: (input: ApplyInput) => Effect.Effect<CommandReceipt, StoreError>;
  readonly snapshot: () => Effect.Effect<Snapshot, StoreError>;
  readonly interruptActiveRuns: (nowMs: number) => Effect.Effect<readonly RunId[], StoreError>;
  readonly close: () => Effect.Effect<void>;
};

const assertSchemaBeforeOpen = (db: DatabaseSync, path: string) => {
  if (!existsSync(path) || statSync(path).size === 0) {
    return;
  }
  const meta = row<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'schema_id'", []);
  if (meta && meta.value !== SCHEMA_ID) {
    throw new UnsupportedSchemaError(meta.value);
  }
  const foreign = row<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1",
    [],
  );
  if (foreign && !meta) {
    throw new UnsupportedSchemaError("unknown");
  }
};

const ownerOnly = (principal: Principal, commandKind: string) => {
  if (principal.kind !== "owner") {
    throw new StoreError(`bot cannot ${commandKind}`);
  }
};

const receiptOf = (value: CommandReceipt) => Schema.decodeSync(CommandReceipt)(value);

export const openStore = (
  dataRoot: string,
): Effect.Effect<Store, UnsupportedSchemaError | StoreError> =>
  Effect.try({
    try: () => {
      mkdirSync(dataRoot, { recursive: true, mode: 0o700 });
      const path = join(dataRoot, "state.sqlite");
      mkdirSync(dirname(path), { recursive: true });
      const db = new DatabaseSync(path);
      assertSchemaBeforeOpen(db, path);
      db.exec("PRAGMA journal_mode = WAL;");
      db.exec("PRAGMA foreign_keys = ON;");
      db.exec(DDL + HANDOFF_DDL);
      const existing = row<{ value: string }>(
        db,
        "SELECT value FROM meta WHERE key = 'schema_id'",
        [],
      );
      if (existing && existing.value !== SCHEMA_ID) {
        db.close();
        throw new UnsupportedSchemaError(existing.value);
      }
      if (!existing) {
        run(db, "INSERT INTO meta (key, value) VALUES ('schema_id', ?)", [SCHEMA_ID]);
        run(db, "INSERT INTO stop_all (id, latched, updated_at) VALUES (1, 0, 0)", []);
      }
      const applyCommand = (input: ApplyInput): CommandReceipt => {
        ownerOnly(input.principal, input.command.kind);
        const payloadDigest = digest(input.command);
        const prior = row<{ id: string; payload_digest: string; result_json: string }>(
          db,
          "SELECT id, payload_digest, result_json FROM commands WHERE idempotency_key = ?",
          [input.idempotencyKey],
        );
        if (prior) {
          if (prior.payload_digest !== payloadDigest) {
            throw new StoreError("idempotency key reused with a different payload");
          }
          return receiptOf({
            ...(JSON.parse(prior.result_json) as CommandReceipt),
            replayed: true,
          });
        }
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = dispatch(db, input);
          const commandId = result.commandId;
          run(
            db,
            `INSERT INTO commands (id, idempotency_key, principal_kind, payload_digest, result_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              commandId,
              input.idempotencyKey,
              input.principal.kind,
              payloadDigest,
              JSON.stringify(result),
              input.nowMs,
            ],
          );
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      };
      return {
        path,
        applyCommand: (input) =>
          Effect.try({
            try: () => applyCommand(input),
            catch: (error) => (error instanceof StoreError ? error : new StoreError(String(error))),
          }),
        snapshot: () =>
          Effect.try({
            try: () => readSnapshot(db),
            catch: (error) => new StoreError(String(error)),
          }),
        interruptActiveRuns: (nowMs) =>
          Effect.try({
            try: () => interruptActive(db, nowMs),
            catch: (error) => new StoreError(String(error)),
          }),
        close: () =>
          Effect.sync(() => {
            db.close();
          }),
      };
    },
    catch: (error) =>
      error instanceof UnsupportedSchemaError ? error : new StoreError(String(error)),
  });

const expireApprovalAndRun = (
  db: DatabaseSync,
  approval: { id: string; run_id: string; task_id: string },
  nowMs: number,
  commandId?: CommandId,
) => {
  run(db, "UPDATE approvals SET state = 'expired' WHERE id = ?", [approval.id]);
  run(
    db,
    "UPDATE pending_actions SET state = 'expired' WHERE approval_id = ? AND state = 'pending'",
    [approval.id],
  );
  run(db, "UPDATE runs SET status = 'failed', waiting_reason = 'none' WHERE id = ?", [
    approval.run_id,
  ]);
  run(db, "UPDATE tasks SET status = 'failed' WHERE id = ?", [approval.task_id]);
  emit(db, "run_failed", { runId: approval.run_id, error: "approval expired", commandId }, nowMs);
};

const dispatch = (db: DatabaseSync, input: ApplyInput): CommandReceipt => {
  const commandId = newCommandId();
  const command = input.command;
  switch (command.kind) {
    case "propose_handoff":
      ownerOnly(input.principal, "propose_handoff");
      return proposeHandoff(db, commandId, input, command);
    case "submit_task":
      return submitTask(db, commandId, input, command);
    case "resolve_approval":
      return resolveApproval(db, commandId, input, command);
    case "answer_input":
      return answerInput(db, commandId, input, command);
    case "cancel_run":
      return cancelRun(db, commandId, input, command);
    case "load_session": {
      ownerOnly(input.principal, "load_session");
      const target = row<{
        task_id: string;
        status: string;
        provider_session_id: string | null;
        frozen_json: string;
        provider_state: string;
      }>(
        db,
        "SELECT task_id,status,provider_session_id,frozen_json,provider_state FROM runs WHERE id = ?",
        [command.runId],
      );
      if (
        !target ||
        !target.provider_session_id ||
        (!isTerminal(target.status) && target.status !== "interrupted")
      )
        return receiptOf({
          commandId,
          replayed: false,
          accepted: false,
          error: "session loading requires an inactive run with a provider session",
          effects: [],
        });
      const frozen = Schema.decodeUnknownSync(FrozenConfig)(JSON.parse(target.frozen_json));
      if (frozen.provider === "fake")
        return receiptOf({
          commandId,
          replayed: false,
          accepted: false,
          error: "unsupported-provider: fake has no sessions",
          errorCode: "unsupported-provider",
          effects: [],
        });
      const stopped = row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id=1", []);
      const loading =
        Schema.decodeUnknownSync(ProviderState)(JSON.parse(target.provider_state)).loadStatus ===
        "loading";
      const counts = row<{ total: number; bot: number }>(
        db,
        `SELECT COUNT(*) AS total, COALESCE(SUM(json_extract(frozen_json,'$.bot') = ?),0) AS bot FROM runs WHERE status IN ('queued','running','waiting_approval','waiting_input','reconciling') OR json_extract(provider_state,'$.loadStatus')='loading'`,
        [frozen.bot],
      );
      if (
        stopped?.latched === 1 ||
        loading ||
        (counts?.total ?? 0) >= MAX_ACTIVE_RUNS ||
        (counts?.bot ?? 0) >= MAX_ACTIVE_RUNS_PER_BOT
      )
        return receiptOf({
          commandId,
          replayed: false,
          accepted: false,
          error: "session load blocked by stop-all or active provider operation",
          effects: [],
        });
      run(
        db,
        "UPDATE runs SET provider_state=json_set(provider_state,'$.loadStatus','loading') WHERE id=?",
        [command.runId],
      );
      return receiptOf({
        commandId,
        replayed: false,
        accepted: true,
        runId: command.runId,
        taskId: Schema.decodeUnknownSync(TaskId)(target.task_id),
        effects: ["load_session"],
      });
    }
    case "stop_all":
      return stopAll(db, commandId, input);
    default: {
      const _exhaustive: never = command;
      throw new StoreError(`unhandled command ${JSON.stringify(_exhaustive)}`);
    }
  }
};

const submitTask = (
  db: DatabaseSync,
  commandId: CommandId,
  input: ApplyInput,
  command: typeof SubmitTask.Type,
): CommandReceipt => {
  ownerOnly(input.principal, "submit_task");
  if (command.attachments || command.mcpServers)
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      errorCode: "unsupported-capability",
      error: "attachments and MCP configuration are not available through Agentis",
      effects: [],
    });
  const bot = command.bot ?? "mara";
  if (bot !== "mara" && bot !== "ivo") {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "unsupported-provider: unknown bot",
      errorCode: "unsupported-provider",
      effects: [],
    });
  }
  const provider = input.provider === "fake" ? "fake" : bot === "ivo" ? "cursor" : "codex";
  const stop = row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id = 1", []);
  if (stop?.latched === 1) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "stop-all is latched",
      effects: [],
    });
  }
  const active = row<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM runs WHERE status IN ('queued','running','waiting_approval','waiting_input','reconciling') OR json_extract(provider_state, '$.loadStatus') = 'loading'",
    [],
  );
  if ((active?.n ?? 0) >= MAX_ACTIVE_RUNS) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "global run concurrency exceeded",
      effects: [],
    });
  }
  const perBot = row<{ n: number }>(
    db,
    "SELECT COUNT(*) AS n FROM runs WHERE json_extract(frozen_json, '$.bot') = ? AND (status IN ('queued','running','waiting_approval','waiting_input','reconciling') OR json_extract(provider_state, '$.loadStatus') = 'loading')",
    [bot],
  );
  if ((perBot?.n ?? 0) >= MAX_ACTIVE_RUNS_PER_BOT) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "per-bot run concurrency exceeded",
      effects: [],
    });
  }
  const taskId = newTaskId();
  const threadId = newThreadId();
  const runId = newRunId();
  const workspaceId = join(input.workspaceId, "runs", runId);
  const frozen: FrozenConfig = {
    bot,
    mode: command.mode ?? "agent",
    provider,
    transport:
      provider === "codex"
        ? CODEX_TRANSPORT
        : provider === "cursor"
          ? "acp-v1-jsonl-stdio"
          : "fake-in-process",
    executableVersion:
      provider === "codex" ? CODEX_CLI_PIN : provider === "cursor" ? CURSOR_CLI_PIN : "fake-1",
    model:
      provider === "codex"
        ? "gpt-5.6-sol"
        : provider === "cursor"
          ? "gpt-5.6-sol[context=272k,reasoning=medium,fast=false]"
          : "fake",
    ...(provider === "codex" ? { effort: "medium" } : {}),
    executionBoundary: input.executionBoundary,
    authMode: provider === "codex" ? CODEX_AUTH_MODE : provider === "cursor" ? "api-key" : "none",
    workspaceId,
    deadlineMs: RUN_DEADLINE_MS,
    actionBudget: MAX_ACTIONS_PER_RUN,
  };
  run(
    db,
    `INSERT INTO tasks (id, brief, owner_session, bot_name, bot_role, status, action_count, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', 0, ?)`,
    [
      taskId,
      command.brief,
      input.principal.sessionId,
      bot,
      bot === "mara" ? "coordinator" : "specialist",
      input.nowMs,
    ],
  );
  run(db, "INSERT INTO threads (id, task_id, created_at) VALUES (?, ?, ?)", [
    threadId,
    taskId,
    input.nowMs,
  ]);
  run(
    db,
    `INSERT INTO runs (id, task_id, thread_id, status, waiting_reason, frozen_json, provider_session_id, fixture, action_count, deadline_at, created_at)
     VALUES (?, ?, ?, 'queued', 'none', ?, NULL, ?, 0, ?, ?)`,
    [
      runId,
      taskId,
      threadId,
      JSON.stringify(frozen),
      command.fixture ?? null,
      input.nowMs + RUN_DEADLINE_MS,
      input.nowMs,
    ],
  );
  message(db, {
    threadId,
    taskId,
    runId,
    authorKind: "human",
    authorName: "owner",
    body: command.brief,
    nowMs: input.nowMs,
  });
  const intentId = newActionIntentId();
  run(
    db,
    `INSERT INTO pending_actions (id, run_id, kind, state, payload, approval_id, created_at)
     VALUES (?, ?, 'launch', 'pending', ?, NULL, ?)`,
    [intentId, runId, JSON.stringify({ taskId, threadId }), input.nowMs],
  );
  emit(
    db,
    "task_submitted",
    { taskId, runId, threadId, owner: input.principal.sessionId, bot, commandId },
    input.nowMs,
  );
  return receiptOf({
    commandId,
    replayed: false,
    accepted: true,
    taskId,
    runId,
    threadId,
    effects: ["launch"],
  });
};

const resolveApproval = (
  db: DatabaseSync,
  commandId: CommandId,
  input: ApplyInput,
  command: typeof ResolveApproval.Type,
): CommandReceipt => {
  ownerOnly(input.principal, "resolve_approval");
  const approval = row<{
    id: string;
    run_id: string;
    task_id: string;
    state: string;
    expires_at: number;
    argument_digest: string;
  }>(db, "SELECT * FROM approvals WHERE id = ?", [command.approvalId]);
  if (!approval) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "approval not found",
      effects: [],
    });
  }
  if (approval.state !== "pending") {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: `approval already ${approval.state}`,
      approvalId: command.approvalId,
      effects: [],
    });
  }
  if (approval.expires_at <= input.nowMs) {
    expireApprovalAndRun(db, approval, input.nowMs, commandId);
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "approval expired",
      approvalId: command.approvalId,
      runId: approval.run_id as RunId,
      taskId: approval.task_id as TaskId,
      effects: ["interrupt_provider"],
    });
  }
  const runStatus = row<{ status: string }>(db, "SELECT status FROM runs WHERE id = ?", [
    approval.run_id,
  ]);
  if (runStatus?.status === "interrupted") {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "run interrupted; provider session lost on restart",
      approvalId: command.approvalId,
      runId: approval.run_id as RunId,
      taskId: approval.task_id as TaskId,
      effects: [],
    });
  }
  const next = command.decision;
  run(db, "UPDATE approvals SET state = ?, resolver = ? WHERE id = ? AND state = 'pending'", [
    next,
    input.principal.sessionId,
    approval.id,
  ]);
  const changed = db.prepare("SELECT changes() AS n").get() as { n: number };
  if (changed.n !== 1) {
    throw new StoreError("approval compare-and-set lost");
  }
  run(db, "UPDATE pending_actions SET state = ? WHERE approval_id = ? AND state = 'pending'", [
    next,
    approval.id,
  ]);
  const runRow = row<{ thread_id: string }>(db, "SELECT thread_id FROM runs WHERE id = ?", [
    approval.run_id,
  ]);
  message(db, {
    threadId: runRow?.thread_id ?? "",
    taskId: approval.task_id,
    runId: approval.run_id,
    authorKind: "human",
    authorName: "owner",
    body: `approval ${next}`,
    nowMs: input.nowMs,
  });
  emit(
    db,
    "approval_resolved",
    { approvalId: approval.id, decision: next, runId: approval.run_id, commandId },
    input.nowMs,
  );
  if (next === "denied") {
    run(db, "UPDATE runs SET status = 'failed', waiting_reason = 'none' WHERE id = ?", [
      approval.run_id,
    ]);
    run(db, "UPDATE tasks SET status = 'failed' WHERE id = ?", [approval.task_id]);
    return receiptOf({
      commandId,
      replayed: false,
      accepted: true,
      approvalId: command.approvalId,
      runId: approval.run_id as RunId,
      taskId: approval.task_id as TaskId,
      effects: ["reject_tool"],
    });
  }
  run(db, "UPDATE runs SET status = 'running', waiting_reason = 'none' WHERE id = ?", [
    approval.run_id,
  ]);
  return receiptOf({
    commandId,
    replayed: false,
    accepted: true,
    approvalId: command.approvalId,
    runId: approval.run_id as RunId,
    taskId: approval.task_id as TaskId,
    effects: ["dispatch_tool"],
  });
};

const answerInput = (
  db: DatabaseSync,
  commandId: CommandId,
  input: ApplyInput,
  command: typeof AnswerInput.Type,
): CommandReceipt => {
  ownerOnly(input.principal, "answer_input");
  const current = row<{ id: string; status: string; thread_id: string; task_id: string }>(
    db,
    "SELECT id, status, thread_id, task_id FROM runs WHERE id = ?",
    [command.runId],
  );
  if (!current || current.status !== "waiting_input") {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "run is not waiting for input",
      runId: command.runId,
      effects: [],
    });
  }
  run(db, "UPDATE runs SET status = 'running', waiting_reason = 'none' WHERE id = ?", [current.id]);
  message(db, {
    threadId: current.thread_id,
    taskId: current.task_id,
    runId: current.id,
    authorKind: "human",
    authorName: "owner",
    body: JSON.stringify(command.answers),
    nowMs: input.nowMs,
  });
  emit(
    db,
    "input_answered",
    { runId: current.id, answers: command.answers, commandId },
    input.nowMs,
  );
  return receiptOf({
    commandId,
    replayed: false,
    accepted: true,
    runId: command.runId,
    taskId: current.task_id as TaskId,
    effects: ["resume_input"],
  });
};

const cancelRun = (
  db: DatabaseSync,
  commandId: CommandId,
  input: ApplyInput,
  command: typeof CancelRun.Type,
): CommandReceipt => {
  ownerOnly(input.principal, "cancel_run");
  const current = row<{ id: string; status: string; task_id: string }>(
    db,
    "SELECT id, status, task_id FROM runs WHERE id = ?",
    [command.runId],
  );
  if (!current) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: "run not found",
      runId: command.runId,
      effects: [],
    });
  }
  if (
    current.status === "succeeded" ||
    current.status === "failed" ||
    current.status === "canceled"
  ) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: `run already ${current.status}`,
      runId: command.runId,
      effects: [],
    });
  }
  run(db, "UPDATE runs SET status = 'canceled', waiting_reason = 'none' WHERE id = ?", [
    current.id,
  ]);
  if (
    !rejectHandoff(db, command.runId, "rejected", "owner canceled before acceptance", input.nowMs)
  )
    run(db, "UPDATE tasks SET status = 'canceled' WHERE id = ?", [current.task_id]);
  run(
    db,
    "UPDATE pending_actions SET state = 'canceled' WHERE run_id = ? AND state IN ('pending','allowed')",
    [current.id],
  );
  emit(db, "run_canceled", { runId: current.id, commandId }, input.nowMs);
  return receiptOf({
    commandId,
    replayed: false,
    accepted: true,
    runId: command.runId,
    taskId: current.task_id as TaskId,
    effects: ["interrupt_provider"],
  });
};

const stopAll = (db: DatabaseSync, commandId: CommandId, input: ApplyInput): CommandReceipt => {
  ownerOnly(input.principal, "stop_all");
  run(db, "UPDATE stop_all SET latched = 1, updated_at = ? WHERE id = 1", [input.nowMs]);
  const active = rows<{ id: string; task_id: string }>(
    db,
    "SELECT id, task_id FROM runs WHERE status IN ('queued','running','waiting_approval','waiting_input','reconciling')",
  );
  for (const item of active) {
    run(db, "UPDATE runs SET status = 'canceled', waiting_reason = 'none' WHERE id = ?", [item.id]);
    if (!rejectHandoff(db, item.id as RunId, "rejected", "stop-all before acceptance", input.nowMs))
      run(db, "UPDATE tasks SET status = 'canceled' WHERE id = ?", [item.task_id]);
    run(
      db,
      "UPDATE pending_actions SET state = 'canceled' WHERE run_id = ? AND state IN ('pending','allowed')",
      [item.id],
    );
  }
  run(
    db,
    "UPDATE runs SET provider_state=json_set(provider_state,'$.loadStatus','failed') WHERE json_extract(provider_state,'$.loadStatus')='loading'",
    [],
  );
  emit(db, "stop_all", { canceled: active.map((item) => item.id), commandId }, input.nowMs);
  return receiptOf({
    commandId,
    replayed: false,
    accepted: true,
    effects: ["interrupt_provider"],
  });
};

const readSnapshot = (db: DatabaseSync): Snapshot => {
  const schema = row<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'schema_id'", []);
  const stop = row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id = 1", []);
  const tasks = rows<{
    id: string;
    brief: string;
    owner_session: string;
    bot_name: string;
    bot_role: string;
    status: string;
    action_count: number;
  }>(db, "SELECT * FROM tasks ORDER BY created_at");
  const runRows = rows<{
    id: string;
    task_id: string;
    status: string;
    waiting_reason: string;
    frozen_json: string;
    provider_state: string;
    provider_session_id: string | null;
    fixture: string | null;
    action_count: number;
    deadline_at: number;
  }>(db, "SELECT * FROM runs ORDER BY created_at");
  const pending = rows<{
    id: string;
    run_id: string;
    kind: string;
    state: string;
    payload: string;
    approval_id: string | null;
  }>(db, "SELECT * FROM pending_actions ORDER BY created_at");
  const artifacts = rows<{
    id: string;
    task_id: string;
    run_id: string;
    author: string;
    source: string;
    media_type: string;
    sha256: string;
    byte_size: number;
    path: string;
  }>(db, "SELECT * FROM artifacts ORDER BY created_at");
  const messages = rows<{
    id: string;
    thread_id: string;
    task_id: string;
    run_id: string | null;
    author_kind: string;
    author_name: string;
    body: string;
  }>(db, "SELECT * FROM messages ORDER BY created_at");
  const events = rows<{ seq: number; id: string; type: string; body: string }>(
    db,
    "SELECT seq, id, type, body FROM events ORDER BY seq",
  );
  return {
    schemaId: schema?.value ?? "",
    stopAll: stop?.latched === 1,
    handoffs: handoffs(db),
    tasks: tasks.map((item) => ({
      id: item.id as TaskId,
      brief: item.brief,
      ownerSession: item.owner_session,
      botName: item.bot_name,
      botRole: item.bot_role,
      status: item.status,
      actionCount: item.action_count,
    })),
    runs: runRows.map((item) => ({
      id: item.id as RunId,
      taskId: item.task_id as TaskId,
      status: Schema.decodeUnknownSync(RunStatus)(item.status),
      waitingReason: item.waiting_reason,
      frozen: Schema.decodeUnknownSync(FrozenConfig)(JSON.parse(item.frozen_json)),
      providerState: Schema.decodeUnknownSync(ProviderState)(JSON.parse(item.provider_state)),
      providerSessionId: item.provider_session_id,
      fixture: Schema.decodeUnknownSync(Schema.NullOr(FixtureKind))(item.fixture),
      actionCount: item.action_count,
      deadlineAt: item.deadline_at,
    })),
    pending: pending.map((item) => ({
      id: item.id as ActionIntentId,
      runId: item.run_id as RunId,
      kind: item.kind,
      state: Schema.decodeUnknownSync(ActionState)(item.state),
      payload: item.payload,
      approvalId: (item.approval_id as ApprovalId | null) ?? null,
    })),
    artifacts: artifacts.map((item) => ({
      id: item.id,
      taskId: item.task_id as TaskId,
      runId: item.run_id as RunId,
      author: item.author,
      source: item.source,
      mediaType: item.media_type,
      sha256: item.sha256,
      byteSize: item.byte_size,
      path: item.path,
    })),
    messages: messages.map((item) => ({
      id: item.id,
      threadId: item.thread_id,
      taskId: item.task_id as TaskId,
      runId: item.run_id,
      authorKind: item.author_kind,
      authorName: item.author_name,
      body: item.body,
    })),
    events,
  };
};

const isTerminal = (status: string) =>
  status === "succeeded" ||
  status === "failed" ||
  status === "canceled" ||
  status === "interrupted";

const interruptActive = (db: DatabaseSync, nowMs: number): RunId[] => {
  const active = rows<{ id: string }>(
    db,
    "SELECT id FROM runs WHERE status IN ('queued','running','waiting_approval','waiting_input','reconciling')",
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of active) {
      run(
        db,
        "UPDATE runs SET status = 'interrupted', waiting_reason = 'interrupted' WHERE id = ?",
        [item.id],
      );
    }
    run(
      db,
      "UPDATE runs SET provider_state=json_set(provider_state,'$.loadStatus','failed') WHERE json_extract(provider_state,'$.loadStatus')='loading'",
      [],
    );
    emit(db, "daemon_restart", { interrupted: active.map((item) => item.id) }, nowMs);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return active.map((item) => item.id as RunId);
};

export const mutateForEngine = (storePath: string) => {
  const db = new DatabaseSync(storePath);
  const active = (runId: RunId) => {
    const current = row<{ status: string }>(db, "SELECT status FROM runs WHERE id = ?", [runId]);
    const stopped = row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id = 1", []);
    return (
      current !== undefined &&
      !isTerminal(current.status) &&
      current.status !== "interrupted" &&
      stopped?.latched !== 1
    );
  };
  return {
    isActive: active,
    handoff: (runId: RunId) => handoffForRun(db, runId),
    decideHandoff: (runId: RunId, sessionId: string, text: string, nowMs: number) =>
      withTxn(db, () => decideHandoff(db, runId, sessionId, text, nowMs)),
    claimDraft: (runId: RunId) =>
      withTxn(
        db,
        () =>
          active(runId) && handoffForRun(db, runId)?.state === "accepted" && claimDraft(db, runId),
      ),
    peerProgress: (runId: RunId, body: string, nowMs: number) =>
      withTxn(db, () => {
        const h = handoffForRun(db, runId);
        if (!h || h.state !== "accepted" || !active(runId)) return;
        emit(
          db,
          "peer_progress",
          { taskId: h.taskId, threadId: h.threadId, runId, author: "ivo", body },
          nowMs,
        );
      }),
    isLoading: (runId: RunId) => {
      const current = row<{ loading: number; stopped: number }>(
        db,
        "SELECT json_extract(provider_state,'$.loadStatus')='loading' AS loading, (SELECT latched FROM stop_all WHERE id=1) AS stopped FROM runs WHERE id=?",
        [runId],
      );
      return current?.loading === 1 && current.stopped === 0;
    },
    providerState: (runId: RunId, change: (state: ProviderState) => ProviderState) =>
      withTxn(db, () => {
        const current = row<{ provider_state: string }>(
          db,
          "SELECT provider_state FROM runs WHERE id = ?",
          [runId],
        );
        if (!current) return;
        const state = Schema.decodeUnknownSync(ProviderState)(JSON.parse(current.provider_state));
        run(db, "UPDATE runs SET provider_state = ? WHERE id = ?", [
          JSON.stringify(change(state)),
          runId,
        ]);
      }),
    markRunning: (runId: RunId, providerSessionId: string, nowMs: number) =>
      withTxn(db, () => {
        if (!active(runId)) return false;
        run(
          db,
          "UPDATE runs SET status = 'running', waiting_reason = 'none', provider_session_id = ? WHERE id = ?",
          [providerSessionId, runId],
        );
        run(
          db,
          "UPDATE pending_actions SET state = 'claimed' WHERE run_id = ? AND kind = 'launch' AND state = 'pending'",
          [runId],
        );
        emit(db, "run_running", { runId, providerSessionId }, nowMs);
        return true;
      }),
    waitApproval: (input: {
      runId: RunId;
      taskId: TaskId;
      tool: string;
      argumentDigest: string;
      nowMs: number;
    }) =>
      withTxn(db, () => {
        if (!active(input.runId)) return null;
        const approvalId = newApprovalId();
        const intentId = newActionIntentId();
        run(
          db,
          `INSERT INTO approvals (id, run_id, task_id, state, tool, argument_digest, expires_at, resolver, created_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, ?)`,
          [
            approvalId,
            input.runId,
            input.taskId,
            input.tool,
            input.argumentDigest,
            input.nowMs + APPROVAL_TTL_MS,
            input.nowMs,
          ],
        );
        run(
          db,
          `INSERT INTO pending_actions (id, run_id, kind, state, payload, approval_id, created_at)
         VALUES (?, ?, 'tool', 'pending', ?, ?, ?)`,
          [intentId, input.runId, JSON.stringify({ tool: input.tool }), approvalId, input.nowMs],
        );
        run(
          db,
          "UPDATE runs SET status = 'waiting_approval', waiting_reason = 'approval' WHERE id = ?",
          [input.runId],
        );
        emit(
          db,
          "waiting_approval",
          { runId: input.runId, approvalId, tool: input.tool },
          input.nowMs,
        );
        return approvalId;
      }),
    waitInput: (runId: RunId, prompt: string, nowMs: number) =>
      withTxn(db, () => {
        if (!active(runId)) return;
        run(db, "UPDATE runs SET status = 'waiting_input', waiting_reason = 'input' WHERE id = ?", [
          runId,
        ]);
        emit(db, "waiting_input", { runId, prompt }, nowMs);
      }),
    complete: (input: {
      runId: RunId;
      taskId: TaskId;
      author: string;
      source: string;
      mediaType: string;
      sha256: string;
      byteSize: number;
      path: string;
      nowMs: number;
    }) =>
      withTxn(db, () => {
        const current = row<{ status: string }>(db, "SELECT status FROM runs WHERE id = ?", [
          input.runId,
        ]);
        if (!current || !active(input.runId)) {
          return null;
        }
        const handoff = handoffForRun(db, input.runId);
        if (handoff && handoff.state !== "accepted") return null;
        const artifactId = newArtifactId();
        run(
          db,
          `INSERT INTO artifacts (id, task_id, run_id, author, source, media_type, sha256, byte_size, path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            artifactId,
            input.taskId,
            input.runId,
            input.author,
            input.source,
            input.mediaType,
            input.sha256,
            input.byteSize,
            input.path,
            input.nowMs,
          ],
        );
        run(db, "UPDATE runs SET status = 'succeeded', waiting_reason = 'none' WHERE id = ?", [
          input.runId,
        ]);
        run(db, "UPDATE tasks SET status = 'completed' WHERE id = ?", [input.taskId]);
        emit(db, "run_succeeded", { runId: input.runId, artifactId }, input.nowMs);
        if (handoff) {
          message(db, {
            threadId: handoff.threadId,
            taskId: handoff.taskId,
            runId: input.runId,
            authorKind: "bot",
            authorName: "ivo",
            body: `Draft returned: ${artifactId}`,
            nowMs: input.nowMs,
          });
          emit(
            db,
            "handoff_artifact",
            {
              handoffId: handoff.id,
              taskId: handoff.taskId,
              threadId: handoff.threadId,
              runId: input.runId,
              author: "ivo",
              artifactId,
            },
            input.nowMs,
          );
        }
        return artifactId;
      }),
    fail: (runId: RunId, taskId: TaskId, error: string, nowMs: number) =>
      withTxn(db, () => {
        const current = row<{ status: string }>(db, "SELECT status FROM runs WHERE id = ?", [
          runId,
        ]);
        if (!current || !active(runId)) {
          return;
        }
        if (rejectHandoff(db, runId, "rejected", error, nowMs)) return;
        run(db, "UPDATE runs SET status = 'failed', waiting_reason = 'none' WHERE id = ?", [runId]);
        run(db, "UPDATE tasks SET status = 'failed' WHERE id = ?", [taskId]);
        emit(db, "run_failed", { runId, error }, nowMs);
      }),
    bumpAction: (runId: RunId, taskId: TaskId) =>
      withTxn(db, () => {
        if (!active(runId)) return { exhausted: true as const };
        const current = row<{ action_count: number; frozen_json: string }>(
          db,
          "SELECT action_count, frozen_json FROM runs WHERE id = ?",
          [runId],
        );
        const budget = current
          ? (JSON.parse(current.frozen_json) as FrozenConfig).actionBudget
          : MAX_ACTIONS_PER_RUN;
        const task = row<{ action_count: number }>(
          db,
          "SELECT action_count FROM tasks WHERE id=?",
          [taskId],
        );
        if (
          (current?.action_count ?? 0) >= budget ||
          (task?.action_count ?? 0) >= MAX_ACTIONS_PER_TASK
        ) {
          return { exhausted: true as const };
        }
        run(db, "UPDATE runs SET action_count = action_count + 1 WHERE id = ?", [runId]);
        run(db, "UPDATE tasks SET action_count = action_count + 1 WHERE id = ?", [taskId]);
        return { exhausted: false as const };
      }),
    close: () => {
      db.close();
    },
  };
};

export type RunSweepEffect = {
  readonly runId: RunId;
  readonly effects: readonly string[];
};

export const sweepRunTimeouts = (storePath: string, nowMs: number): readonly RunSweepEffect[] => {
  const db = new DatabaseSync(storePath);
  try {
    return withTxn(db, () => {
      const effects: RunSweepEffect[] = [];
      for (const handoff of handoffs(db)) {
        if (
          handoff.state === "proposed" &&
          handoff.expiresAt <= nowMs &&
          rejectHandoff(db, handoff.recipientRunId, "expired", "acceptance timed out", nowMs)
        )
          effects.push({ runId: handoff.recipientRunId, effects: ["interrupt_provider"] });
      }
      const overdue = rows<{ id: string; task_id: string }>(
        db,
        `SELECT id, task_id FROM runs
         WHERE status IN ('queued','running','waiting_approval','waiting_input','reconciling')
           AND deadline_at <= ?`,
        [nowMs],
      );
      for (const item of overdue) {
        run(db, "UPDATE runs SET status = 'failed', waiting_reason = 'none' WHERE id = ?", [
          item.id,
        ]);
        run(db, "UPDATE tasks SET status = 'failed' WHERE id = ?", [item.task_id]);
        emit(db, "run_failed", { runId: item.id, error: "run deadline exceeded" }, nowMs);
        effects.push({ runId: item.id as RunId, effects: ["interrupt_provider"] });
      }
      const expired = rows<{ id: string; run_id: string; task_id: string }>(
        db,
        `SELECT id, run_id, task_id FROM approvals
         WHERE state = 'pending' AND expires_at <= ?`,
        [nowMs],
      );
      for (const item of expired) {
        expireApprovalAndRun(db, item, nowMs);
        effects.push({ runId: item.run_id as RunId, effects: ["interrupt_provider"] });
      }
      return effects;
    });
  } finally {
    db.close();
  }
};
