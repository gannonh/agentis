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
import { writeScratchFile } from "./scratch-file.js";
import {
  newActionIntentId,
  newApprovalId,
  newArtifactId,
  newBotConfigRevisionId,
  newCommandId,
  newEvidenceId,
  newRunId,
  newTaskId,
  newThreadId,
} from "./ids.js";
import {
  ActionState,
  AnswerInput,
  ArtifactId,
  BotConfigRevisionId,
  Citation,
  CancelRun,
  Command,
  CommandReceipt,
  Cursor,
  ExecutionBoundary,
  EvidenceId,
  FixtureKind,
  FrozenConfig,
  ProviderKind,
  ResolveApproval,
  RunStatus,
  SubmitTask,
  SourceKind,
  type ActionIntentId,
  type ApprovalId,
  type CommandId,
  type HandoffRow,
  type IdempotencyKey,
  type PrincipalKind,
  type SourcePacket,
  RunId,
  TaskId,
} from "./schema.js";
import {
  APPROVAL_TTL_MS,
  CLAUDE_CLI_PIN,
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
  readonly channel?: "cli" | "browser";
  readonly browserSessionHash?: string;
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
  readonly threadId: string;
  readonly outcome: string;
  readonly requestedBy: "owner";
  readonly currentOwner: "mara" | "ivo";
  readonly ownerRole: "coordinator" | "specialist";
  readonly ownerSession: string;
  readonly botName: string;
  readonly botRole: string;
  readonly workspaceRef: string;
  readonly constraints: readonly string[];
  readonly evidence: readonly EvidenceId[];
  readonly currentRunId: RunId;
  readonly latestArtifactId: ArtifactId | null;
  readonly status: string;
  readonly actionCount: number;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type RunRow = {
  readonly id: RunId;
  readonly taskId: TaskId;
  readonly threadId: string;
  readonly botConfigRevisionId: BotConfigRevisionId;
  readonly status: typeof RunStatus.Type;
  readonly waitingReason: string;
  readonly frozen: FrozenConfig;
  readonly providerState: ProviderState;
  readonly providerSessionId: string | null;
  readonly fixture: typeof FixtureKind.Type | null;
  readonly actionCount: number;
  readonly deadlineAt: number;
  readonly queuedAt: number;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly providerLoadStatus: ProviderState["loadStatus"];
  readonly pendingPrompt: string | null;
  readonly failure: string | null;
};

export type PendingActionRow = {
  readonly id: typeof ActionIntentId.Type;
  readonly runId: RunId;
  readonly kind: string;
  readonly state: typeof ActionState.Type;
  readonly payload: string;
  readonly detail: string;
  readonly approvalId: ApprovalId | null;
};

export type ArtifactRow = {
  readonly id: ArtifactId;
  readonly taskId: TaskId;
  readonly runId: RunId;
  readonly author: string;
  readonly source: string;
  readonly mediaType: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly path: string;
  readonly citations: readonly Citation[];
  readonly createdAt: number;
  readonly metadataUrl: string;
  readonly contentUrl: string;
};

export type MessageRow = {
  readonly id: string;
  readonly threadId: string;
  readonly taskId: TaskId;
  readonly runId: string | null;
  readonly authorKind: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly kind: string;
  readonly importance: string;
  readonly dedupeKey: string;
  readonly body: string;
  readonly createdAt: number;
};

export type EvidenceRow = {
  readonly id: EvidenceId;
  readonly taskId: TaskId;
  readonly source: typeof SourceKind.Type;
  readonly label: string;
  readonly repository?: string;
  readonly revision?: string;
  readonly url?: string;
  readonly contentDigest: string;
  readonly byteSize: number;
  readonly path: string;
  readonly citations: readonly Citation[];
  readonly createdAt: number;
};

export type BotConfigRevisionRow = {
  readonly id: BotConfigRevisionId;
  readonly frozen: FrozenConfig;
  readonly createdAt: number;
  readonly bot: "mara" | "ivo";
  readonly role: "coordinator" | "specialist";
  readonly provider: typeof ProviderKind.Type;
  readonly model: string;
  readonly effort?: string;
  readonly skills: readonly string[];
  readonly grants: readonly string[];
  readonly publicConfig: Readonly<Record<string, string>>;
  readonly executionBoundary: typeof ExecutionBoundary.Type;
  readonly executionLocation: string;
  readonly authMode: string;
};

export type Snapshot = {
  readonly schemaId: string;
  readonly cursor: typeof Cursor.Type;
  readonly stopAll: boolean;
  readonly tasks: readonly TaskRow[];
  readonly handoffs: readonly HandoffRow[];
  readonly runs: readonly RunRow[];
  readonly pending: readonly PendingActionRow[];
  readonly artifacts: readonly ArtifactRow[];
  readonly messages: readonly MessageRow[];
  readonly events: readonly EventRow[];
  readonly evidence: readonly EvidenceRow[];
  readonly botConfigRevisions: readonly BotConfigRevisionRow[];
};

export type EventRow = {
  readonly seq: number;
  readonly id: string;
  readonly type: string;
  readonly body: string;
  readonly createdAt: number;
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
  thread_id TEXT NOT NULL UNIQUE,
  outcome TEXT NOT NULL,
  owner_session TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  bot_role TEXT NOT NULL,
  workspace_ref TEXT NOT NULL,
  constraints_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  current_run_id TEXT NOT NULL,
  latest_artifact_id TEXT,
  status TEXT NOT NULL,
  action_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
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
  bot_config_revision_id TEXT NOT NULL,
  status TEXT NOT NULL,
  waiting_reason TEXT NOT NULL,
  frozen_json TEXT NOT NULL,
  provider_state TEXT NOT NULL DEFAULT '{"loadStatus":"idle","capabilities":[],"history":[],"pendingPrompt":null,"failure":null}',
  provider_session_id TEXT,
  fixture TEXT,
  action_count INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  run_id TEXT,
  author_kind TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  kind TEXT NOT NULL,
  importance TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
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
  citations_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bot_config_revisions (
  id TEXT PRIMARY KEY,
  bot TEXT NOT NULL,
  role TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  effort TEXT,
  skills_json TEXT NOT NULL,
  grants_json TEXT NOT NULL,
  public_config_json TEXT NOT NULL,
  execution_boundary TEXT NOT NULL,
  execution_location TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  frozen_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS task_sources (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  source TEXT NOT NULL,
  label TEXT NOT NULL,
  repository TEXT,
  revision TEXT,
  url TEXT,
  content_digest TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  path TEXT NOT NULL,
  citations_json TEXT NOT NULL,
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
CREATE TABLE IF NOT EXISTS browser_bootstraps (
  code_hash TEXT PRIMARY KEY,
  owner_session TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE TABLE IF NOT EXISTS browser_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_hash TEXT NOT NULL,
  owner_session TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_acknowledged_at INTEGER,
  source_acknowledgements_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
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
            effects: [],
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
  const provider = input.provider === "fake" ? "fake" : bot === "ivo" ? "claude" : "codex";
  if (input.principal.channel === "browser") {
    const browser = input.principal.browserSessionHash
      ? row<{
          provider: string;
          provider_acknowledged_at: number | null;
          source_acknowledgements_json: string;
          expires_at: number;
        }>(db, "SELECT * FROM browser_sessions WHERE token_hash = ?", [
          input.principal.browserSessionHash,
        ])
      : undefined;
    const sourceKind = command.source?.kind;
    const acknowledgedSources = browser
      ? Schema.decodeUnknownSync(Schema.Array(SourceKind))(
          JSON.parse(browser.source_acknowledgements_json),
        )
      : [];
    if (
      !browser ||
      browser.expires_at <= input.nowMs ||
      browser.provider !== input.provider ||
      browser.provider_acknowledged_at === null ||
      !sourceKind ||
      !acknowledgedSources.includes(sourceKind) ||
      bot !== "mara"
    ) {
      return receiptOf({
        commandId,
        replayed: false,
        accepted: false,
        error: "browser submission requires acknowledged eligible provider and source authority",
        effects: [],
      });
    }
  }
  if (provider === "claude" && command.mode === "plan")
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      errorCode: "unsupported-capability",
      error: "native plan mode is unavailable",
      effects: [],
    });
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
  const evidenceId = newEvidenceId();
  const configRevisionId = newBotConfigRevisionId();
  const workspaceId = join(input.workspaceId, "runs", runId);
  const source: SourcePacket = command.source ?? {
    kind: "pasted",
    label: "CLI brief",
    text: command.brief,
    citations: [],
  };
  const outcome = command.outcome ?? command.brief;
  const providerBrief = command.source
    ? `${outcome}\n\nRead-only ${source.label}:\n${source.text}`
    : command.brief;
  const frozen: FrozenConfig = {
    bot,
    role: bot === "mara" ? "coordinator" : "specialist",
    mode: command.mode ?? "agent",
    provider,
    transport:
      provider === "codex"
        ? CODEX_TRANSPORT
        : provider === "claude"
          ? "claude-sdk-jsonl-stdio"
          : "fake-in-process",
    executableVersion:
      provider === "codex" ? CODEX_CLI_PIN : provider === "claude" ? CLAUDE_CLI_PIN : "fake-1",
    model:
      provider === "codex" ? "gpt-5.6-sol" : provider === "claude" ? "claude-sonnet-5" : "fake",
    ...(provider !== "fake" ? { effort: "medium" } : {}),
    skills: bot === "mara" ? ["coordinate", "business-brief"] : ["specialist-draft"],
    grants: ["read:provided-source", "write:task-artifact"],
    publicConfig: { sourceMode: "materialized-read-only" },
    executionBoundary: input.executionBoundary,
    executionLocation:
      input.executionBoundary === "docker-fixture-container"
        ? "isolated fixture container"
        : input.executionBoundary === "docker-desktop-run-container"
          ? "local provider container"
          : "local daemon scratch",
    authMode: provider === "codex" ? CODEX_AUTH_MODE : provider === "claude" ? "api-key" : "none",
    workspaceId,
    deadlineMs: RUN_DEADLINE_MS,
    actionBudget: MAX_ACTIONS_PER_RUN,
  };
  mkdirSync(join(workspaceId, "sources"), { recursive: true, mode: 0o700 });
  const sourcePath = join(workspaceId, "sources", `${evidenceId}.txt`);
  writeScratchFile(sourcePath, source.text);
  const sourceDigest = createHash("sha256").update(source.text).digest("hex");
  run(
    db,
    `INSERT INTO bot_config_revisions
       (id, bot, role, provider, model, effort, skills_json, grants_json, public_config_json,
        execution_boundary, execution_location, auth_mode, frozen_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      configRevisionId,
      frozen.bot,
      frozen.role,
      frozen.provider,
      frozen.model,
      frozen.effort ?? null,
      JSON.stringify(frozen.skills),
      JSON.stringify(frozen.grants),
      JSON.stringify(frozen.publicConfig),
      frozen.executionBoundary,
      frozen.executionLocation,
      frozen.authMode,
      JSON.stringify(frozen),
      input.nowMs,
    ],
  );
  run(
    db,
    `INSERT INTO task_sources
       (id, task_id, source, label, repository, revision, url, content_digest, byte_size, path,
        citations_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      evidenceId,
      taskId,
      source.kind,
      source.label,
      source.kind === "github_briefing" ? source.repository : null,
      source.kind === "github_briefing" ? source.revision : null,
      source.kind === "github_briefing" ? (source.url ?? null) : null,
      sourceDigest,
      Buffer.byteLength(source.text),
      sourcePath,
      JSON.stringify(source.citations),
      input.nowMs,
    ],
  );
  run(
    db,
    `INSERT INTO tasks
       (id, brief, thread_id, outcome, owner_session, bot_name, bot_role, workspace_ref,
        constraints_json, evidence_json, current_run_id, latest_artifact_id, status, action_count,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'open', 0, ?, ?)`,
    [
      taskId,
      providerBrief,
      threadId,
      outcome,
      input.principal.sessionId,
      bot,
      bot === "mara" ? "coordinator" : "specialist",
      `task:${taskId}`,
      JSON.stringify(command.constraints ?? []),
      JSON.stringify([evidenceId]),
      runId,
      input.nowMs,
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
    `INSERT INTO runs
       (id, task_id, thread_id, bot_config_revision_id, status, waiting_reason, frozen_json,
        provider_session_id, fixture, action_count, deadline_at, created_at, started_at, completed_at)
     VALUES (?, ?, ?, ?, 'queued', 'none', ?, NULL, ?, 0, ?, ?, NULL, NULL)`,
    [
      runId,
      taskId,
      threadId,
      configRevisionId,
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
    kind: "request",
    importance: "decision",
    dedupeKey: `request:${commandId}`,
    body: outcome,
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
  const runStatus = row<{ status: string }>(db, "SELECT status FROM runs WHERE id = ?", [
    approval.run_id,
  ]);
  const stopped = row<{ latched: number }>(db, "SELECT latched FROM stop_all WHERE id=1");
  if (runStatus?.status !== "waiting_approval" || stopped?.latched === 1) {
    return receiptOf({
      commandId,
      replayed: false,
      accepted: false,
      error: `run ${runStatus?.status ?? "missing"}; approval no longer actionable`,
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
  run(
    db,
    "UPDATE runs SET provider_state=json_set(provider_state,'$.pendingPrompt',null) WHERE id=?",
    [approval.run_id],
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
  run(
    db,
    "UPDATE runs SET status = 'running', waiting_reason = 'none', provider_state=json_set(provider_state,'$.pendingPrompt',null) WHERE id = ?",
    [current.id],
  );
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
    !rejectHandoff(
      db,
      command.runId,
      "rejected",
      "canceled",
      "owner canceled before acceptance",
      input.nowMs,
    )
  )
    run(db, "UPDATE tasks SET status = 'canceled' WHERE id = ?", [current.task_id]);
  run(
    db,
    "UPDATE pending_actions SET state = 'canceled' WHERE run_id = ? AND state IN ('pending','allowed')",
    [current.id],
  );
  run(db, "UPDATE approvals SET state='canceled' WHERE run_id=? AND state='pending'", [current.id]);
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
    if (
      !rejectHandoff(
        db,
        item.id as RunId,
        "rejected",
        "canceled",
        "stop-all before acceptance",
        input.nowMs,
      )
    )
      run(db, "UPDATE tasks SET status = 'canceled' WHERE id = ?", [item.task_id]);
    run(
      db,
      "UPDATE pending_actions SET state = 'canceled' WHERE run_id = ? AND state IN ('pending','allowed')",
      [item.id],
    );
  }
  run(db, "UPDATE approvals SET state='canceled' WHERE state='pending'", []);
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
    thread_id: string;
    outcome: string;
    owner_session: string;
    bot_name: string;
    bot_role: string;
    workspace_ref: string;
    constraints_json: string;
    evidence_json: string;
    current_run_id: string;
    latest_artifact_id: string | null;
    status: string;
    action_count: number;
    created_at: number;
    updated_at: number;
  }>(db, "SELECT * FROM tasks ORDER BY created_at");
  const runRows = rows<{
    id: string;
    task_id: string;
    thread_id: string;
    bot_config_revision_id: string;
    status: string;
    waiting_reason: string;
    frozen_json: string;
    provider_state: string;
    provider_session_id: string | null;
    fixture: string | null;
    action_count: number;
    deadline_at: number;
    created_at: number;
    started_at: number | null;
    completed_at: number | null;
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
    citations_json: string;
    created_at: number;
  }>(db, "SELECT * FROM artifacts ORDER BY created_at");
  const messages = rows<{
    id: string;
    thread_id: string;
    task_id: string;
    run_id: string | null;
    author_kind: string;
    author_name: string;
    author_role: string;
    kind: string;
    importance: string;
    dedupe_key: string;
    body: string;
    created_at: number;
  }>(db, "SELECT * FROM messages ORDER BY created_at");
  const events = rows<{
    seq: number;
    id: string;
    type: string;
    body: string;
    created_at: number;
  }>(db, "SELECT seq, id, type, body, created_at FROM events ORDER BY seq");
  const evidence = rows<{
    id: string;
    task_id: string;
    source: string;
    label: string;
    repository: string | null;
    revision: string | null;
    url: string | null;
    content_digest: string;
    byte_size: number;
    path: string;
    citations_json: string;
    created_at: number;
  }>(db, "SELECT * FROM task_sources ORDER BY created_at");
  const revisions = rows<{
    id: string;
    bot: string;
    role: string;
    provider: string;
    model: string;
    effort: string | null;
    skills_json: string;
    grants_json: string;
    public_config_json: string;
    execution_boundary: string;
    execution_location: string;
    auth_mode: string;
    frozen_json: string;
    created_at: number;
  }>(db, "SELECT * FROM bot_config_revisions ORDER BY created_at");
  return {
    schemaId: schema?.value ?? "",
    cursor: Schema.decodeUnknownSync(Cursor)(String(events.at(-1)?.seq ?? 0)),
    stopAll: stop?.latched === 1,
    handoffs: handoffs(db),
    tasks: tasks.map((item) => ({
      id: item.id as TaskId,
      brief: item.brief,
      threadId: item.thread_id,
      outcome: item.outcome,
      requestedBy: "owner",
      currentOwner: item.bot_name === "ivo" ? "ivo" : "mara",
      ownerRole: item.bot_role === "specialist" ? "specialist" : "coordinator",
      ownerSession: item.owner_session,
      botName: item.bot_name,
      botRole: item.bot_role,
      workspaceRef: item.workspace_ref,
      constraints: Schema.decodeUnknownSync(Schema.Array(Schema.String))(
        JSON.parse(item.constraints_json),
      ),
      evidence: Schema.decodeUnknownSync(Schema.Array(EvidenceId))(JSON.parse(item.evidence_json)),
      currentRunId: Schema.decodeUnknownSync(RunId)(item.current_run_id),
      latestArtifactId: Schema.decodeUnknownSync(Schema.NullOr(ArtifactId))(
        item.latest_artifact_id,
      ),
      status: item.status,
      actionCount: item.action_count,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
    runs: runRows.map((item) => ({
      id: item.id as RunId,
      taskId: item.task_id as TaskId,
      threadId: item.thread_id,
      botConfigRevisionId: Schema.decodeUnknownSync(BotConfigRevisionId)(
        item.bot_config_revision_id,
      ),
      status: Schema.decodeUnknownSync(RunStatus)(item.status),
      waitingReason: item.waiting_reason,
      frozen: Schema.decodeUnknownSync(FrozenConfig)(JSON.parse(item.frozen_json)),
      providerState: Schema.decodeUnknownSync(ProviderState)(JSON.parse(item.provider_state)),
      providerSessionId: item.provider_session_id,
      fixture: Schema.decodeUnknownSync(Schema.NullOr(FixtureKind))(item.fixture),
      actionCount: item.action_count,
      deadlineAt: item.deadline_at,
      queuedAt: item.created_at,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      providerLoadStatus: Schema.decodeUnknownSync(ProviderState)(JSON.parse(item.provider_state))
        .loadStatus,
      pendingPrompt: Schema.decodeUnknownSync(ProviderState)(JSON.parse(item.provider_state))
        .pendingPrompt,
      failure:
        Schema.decodeUnknownSync(ProviderState)(JSON.parse(item.provider_state)).failureDetail ??
        Schema.decodeUnknownSync(ProviderState)(JSON.parse(item.provider_state)).failure,
    })),
    pending: pending.map((item) => ({
      id: item.id as ActionIntentId,
      runId: item.run_id as RunId,
      kind: item.kind,
      state: Schema.decodeUnknownSync(ActionState)(item.state),
      payload: item.payload,
      detail: item.payload,
      approvalId: (item.approval_id as ApprovalId | null) ?? null,
    })),
    artifacts: artifacts.map((item) => ({
      id: Schema.decodeUnknownSync(ArtifactId)(item.id),
      taskId: item.task_id as TaskId,
      runId: item.run_id as RunId,
      author: item.author,
      source: item.source,
      mediaType: item.media_type,
      sha256: item.sha256,
      byteSize: item.byte_size,
      path: item.path,
      citations: Schema.decodeUnknownSync(Schema.Array(Citation))(JSON.parse(item.citations_json)),
      createdAt: item.created_at,
      metadataUrl: `/v1/artifacts/${item.id}`,
      contentUrl: `/v1/artifacts/${item.id}/content`,
    })),
    messages: messages.map((item) => ({
      id: item.id,
      threadId: item.thread_id,
      taskId: item.task_id as TaskId,
      runId: item.run_id,
      authorKind: item.author_kind,
      authorName: item.author_name,
      authorRole: item.author_role,
      kind: item.kind,
      importance: item.importance,
      dedupeKey: item.dedupe_key,
      body: item.body,
      createdAt: item.created_at,
    })),
    events: events.map((item) => ({
      seq: item.seq,
      id: item.id,
      type: item.type,
      body: item.body,
      createdAt: item.created_at,
    })),
    evidence: evidence.map((item) => ({
      id: Schema.decodeUnknownSync(EvidenceId)(item.id),
      taskId: Schema.decodeUnknownSync(TaskId)(item.task_id),
      source: Schema.decodeUnknownSync(SourceKind)(item.source),
      label: item.label,
      ...(item.repository === null ? {} : { repository: item.repository }),
      ...(item.revision === null ? {} : { revision: item.revision }),
      ...(item.url === null ? {} : { url: item.url }),
      contentDigest: item.content_digest,
      byteSize: item.byte_size,
      path: item.path,
      citations: Schema.decodeUnknownSync(Schema.Array(Citation))(JSON.parse(item.citations_json)),
      createdAt: item.created_at,
    })),
    botConfigRevisions: revisions.map((item) => ({
      id: Schema.decodeUnknownSync(BotConfigRevisionId)(item.id),
      frozen: Schema.decodeUnknownSync(FrozenConfig)(JSON.parse(item.frozen_json)),
      bot: Schema.decodeUnknownSync(Schema.Literal("mara", "ivo"))(item.bot),
      role: Schema.decodeUnknownSync(Schema.Literal("coordinator", "specialist"))(item.role),
      provider: Schema.decodeUnknownSync(ProviderKind)(item.provider),
      model: item.model,
      ...(item.effort === null ? {} : { effort: item.effort }),
      skills: Schema.decodeUnknownSync(Schema.Array(Schema.String))(JSON.parse(item.skills_json)),
      grants: Schema.decodeUnknownSync(Schema.Array(Schema.String))(JSON.parse(item.grants_json)),
      publicConfig: Schema.decodeUnknownSync(
        Schema.Record({ key: Schema.String, value: Schema.String }),
      )(JSON.parse(item.public_config_json)),
      executionBoundary: Schema.decodeUnknownSync(ExecutionBoundary)(item.execution_boundary),
      executionLocation: item.execution_location,
      authMode: item.auth_mode,
      createdAt: item.created_at,
    })),
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
        message(db, {
          threadId: h.threadId,
          taskId: h.taskId,
          runId,
          authorKind: "bot",
          authorName: "ivo",
          kind: "progress",
          importance: "routine",
          dedupeKey: `peer:${runId}:${digest(body)}`,
          body,
          nowMs,
        });
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
          "UPDATE runs SET status = 'running', waiting_reason = 'none', provider_session_id = ?, started_at=COALESCE(started_at,?) WHERE id = ?",
          [providerSessionId, nowMs, runId],
        );
        run(db, "UPDATE tasks SET status='running',updated_at=? WHERE current_run_id=?", [
          nowMs,
          runId,
        ]);
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
        const current = row<{ thread_id: string }>(db, "SELECT thread_id FROM runs WHERE id=?", [
          input.runId,
        ]);
        message(db, {
          threadId: current?.thread_id ?? "",
          taskId: input.taskId,
          runId: input.runId,
          authorKind: "bot",
          authorName: "mara",
          kind: "approval",
          importance: "blocking",
          dedupeKey: `approval:${approvalId}`,
          body: `Approval required for ${input.tool}`,
          nowMs: input.nowMs,
        });
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
        const current = row<{ thread_id: string; task_id: string; frozen_json: string }>(
          db,
          "SELECT thread_id,task_id,frozen_json FROM runs WHERE id=?",
          [runId],
        );
        if (current) {
          const frozen = Schema.decodeUnknownSync(FrozenConfig)(JSON.parse(current.frozen_json));
          message(db, {
            threadId: current.thread_id,
            taskId: current.task_id,
            runId,
            authorKind: "bot",
            authorName: frozen.bot,
            kind: "question",
            importance: "blocking",
            dedupeKey: `question:${runId}:${digest(prompt)}`,
            body: prompt,
            nowMs,
          });
        }
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
        const source = row<{ citations_json: string }>(
          db,
          "SELECT citations_json FROM task_sources WHERE task_id=? ORDER BY created_at LIMIT 1",
          [input.taskId],
        );
        const citations = source?.citations_json ?? "[]";
        run(
          db,
          `INSERT INTO artifacts
             (id, task_id, run_id, author, source, media_type, sha256, byte_size, path,
              citations_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            citations,
            input.nowMs,
          ],
        );
        run(
          db,
          "UPDATE runs SET status='succeeded',waiting_reason='none',completed_at=? WHERE id=?",
          [input.nowMs, input.runId],
        );
        run(
          db,
          "UPDATE tasks SET status='completed',latest_artifact_id=?,updated_at=? WHERE id=?",
          [artifactId, input.nowMs, input.taskId],
        );
        emit(db, "run_succeeded", { runId: input.runId, artifactId }, input.nowMs);
        const task = row<{ thread_id: string }>(db, "SELECT thread_id FROM tasks WHERE id=?", [
          input.taskId,
        ]);
        message(db, {
          threadId: task?.thread_id ?? handoff?.threadId ?? "",
          taskId: input.taskId,
          runId: input.runId,
          authorKind: "bot",
          authorName: input.author === "ivo" ? "ivo" : "mara",
          kind: "result",
          importance: "result",
          dedupeKey: `result:${input.runId}`,
          body: `Result ready: ${artifactId}`,
          nowMs: input.nowMs,
        });
        if (handoff) {
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
        if (rejectHandoff(db, runId, "rejected", "failed", error, nowMs)) return;
        const currentTask = row<{ thread_id: string; bot_name: string }>(
          db,
          "SELECT thread_id,bot_name FROM tasks WHERE id=?",
          [taskId],
        );
        run(db, "UPDATE runs SET status='failed',waiting_reason='none',completed_at=? WHERE id=?", [
          nowMs,
          runId,
        ]);
        run(db, "UPDATE tasks SET status='failed',updated_at=? WHERE id=?", [nowMs, taskId]);
        message(db, {
          threadId: currentTask?.thread_id ?? "",
          taskId,
          runId,
          authorKind: "bot",
          authorName: currentTask?.bot_name === "ivo" ? "ivo" : "mara",
          kind: "failure",
          importance: "blocking",
          dedupeKey: `failure:${runId}:${digest(error)}`,
          body: error,
          nowMs,
        });
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
          rejectHandoff(
            db,
            handoff.recipientRunId,
            "expired",
            "failed",
            "acceptance timed out",
            nowMs,
          )
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
