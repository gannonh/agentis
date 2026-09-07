import { Schema } from "effect";
import { ProviderState } from "./provider-contract.js";

const brand = <Name extends string>(name: Name) => Schema.String.pipe(Schema.brand(name));

export const TaskId = brand("TaskId");
export type TaskId = typeof TaskId.Type;
export const RunId = brand("RunId");
export type RunId = typeof RunId.Type;
export const ThreadId = brand("ThreadId");
export type ThreadId = typeof ThreadId.Type;
export const MessageId = brand("MessageId");
export type MessageId = typeof MessageId.Type;
export const ArtifactId = brand("ArtifactId");
export type ArtifactId = typeof ArtifactId.Type;
export const CommandId = brand("CommandId");
export type CommandId = typeof CommandId.Type;
export const ApprovalId = brand("ApprovalId");
export type ApprovalId = typeof ApprovalId.Type;
export const ActionIntentId = brand("ActionIntentId");
export type ActionIntentId = typeof ActionIntentId.Type;
export const SessionId = brand("SessionId");
export type SessionId = typeof SessionId.Type;
export const EventId = brand("EventId");
export type EventId = typeof EventId.Type;
export const ProviderSessionId = brand("ProviderSessionId");
export type ProviderSessionId = typeof ProviderSessionId.Type;
export const IdempotencyKey = brand("IdempotencyKey");
export type IdempotencyKey = typeof IdempotencyKey.Type;

export const PrincipalKind = Schema.Literal("owner", "bot");
export type PrincipalKind = typeof PrincipalKind.Type;

export const ExecutionBoundary = Schema.Literal(
  "docker-desktop-run-container",
  "unverified-host-scratch",
);
export type ExecutionBoundary = typeof ExecutionBoundary.Type;

export const ProviderKind = Schema.Literal("fake", "codex", "cursor");
export type ProviderKind = typeof ProviderKind.Type;

export const FixtureKind = Schema.Literal("smoke", "allow", "deny", "input", "cancel");
export type FixtureKind = typeof FixtureKind.Type;

export const RunStatus = Schema.Literal(
  "queued",
  "running",
  "waiting_approval",
  "waiting_input",
  "interrupted",
  "reconciling",
  "succeeded",
  "failed",
  "canceled",
);
export type RunStatus = typeof RunStatus.Type;

export const ActionState = Schema.Literal(
  "pending",
  "allowed",
  "denied",
  "expired",
  "canceled",
  "claimed",
  "unknown",
  "confirmed",
);
export type ActionState = typeof ActionState.Type;

export const WaitingReason = Schema.Literal(
  "approval",
  "input",
  "interrupted",
  "unknown_outcome",
  "none",
);
export type WaitingReason = typeof WaitingReason.Type;

export const FrozenConfig = Schema.Struct({
  bot: Schema.Literal("mara", "ivo"),
  mode: Schema.Literal("agent", "plan"),
  provider: ProviderKind,
  transport: Schema.String,
  executableVersion: Schema.String,
  model: Schema.String,
  effort: Schema.optional(Schema.String),
  executionBoundary: ExecutionBoundary,
  authMode: Schema.String,
  workspaceId: Schema.String,
  deadlineMs: Schema.Number,
  actionBudget: Schema.Number,
});
export type FrozenConfig = typeof FrozenConfig.Type;

export const SubmitTask = Schema.Struct({
  kind: Schema.Literal("submit_task"),
  brief: Schema.String,
  bot: Schema.optional(Schema.String),
  attachments: Schema.optional(Schema.Array(Schema.Unknown)),
  mcpServers: Schema.optional(Schema.Array(Schema.Unknown)),
  mode: Schema.optional(Schema.Literal("agent", "plan")),
  fixture: Schema.optional(FixtureKind),
});
export const ResolveApproval = Schema.Struct({
  kind: Schema.Literal("resolve_approval"),
  approvalId: ApprovalId,
  decision: Schema.Literal("allowed", "denied"),
});
export const AnswerInput = Schema.Struct({
  kind: Schema.Literal("answer_input"),
  runId: RunId,
  answers: Schema.Record({ key: Schema.String, value: Schema.String }),
});
export const CancelRun = Schema.Struct({
  kind: Schema.Literal("cancel_run"),
  runId: RunId,
});
export const StopAll = Schema.Struct({
  kind: Schema.Literal("stop_all"),
});
export const LoadSession = Schema.Struct({ kind: Schema.Literal("load_session"), runId: RunId });
export const ProposeHandoff = Schema.Struct({
  kind: Schema.Literal("propose_handoff"),
  sourceRunId: RunId,
  recipient: Schema.Literal("ivo"),
  context: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(16000)),
});
export const HandoffRow = Schema.Struct({
  id: Schema.String,
  taskId: TaskId,
  threadId: ThreadId,
  sourceRunId: RunId,
  recipientRunId: RunId,
  context: Schema.String,
  state: Schema.Literal("proposed", "accepted", "rejected", "expired"),
  expiresAt: Schema.Number,
  grants: Schema.Literal("draft_only"),
  onwardDelegation: Schema.Literal(false),
});
export type HandoffRow = typeof HandoffRow.Type;
export const Command = Schema.Union(
  SubmitTask,
  ProposeHandoff,
  ResolveApproval,
  AnswerInput,
  CancelRun,
  StopAll,
  LoadSession,
);
export type Command = typeof Command.Type;

export const CommandRequest = Schema.Struct({
  idempotencyKey: IdempotencyKey,
  command: Command,
});
export type CommandRequest = typeof CommandRequest.Type;

export const CommandReceipt = Schema.Struct({
  commandId: CommandId,
  replayed: Schema.Boolean,
  accepted: Schema.Boolean,
  error: Schema.optional(Schema.String),
  errorCode: Schema.optional(Schema.Literal("unsupported-provider", "unsupported-capability")),
  handoffId: Schema.optional(Schema.String),
  taskId: Schema.optional(TaskId),
  runId: Schema.optional(RunId),
  threadId: Schema.optional(ThreadId),
  approvalId: Schema.optional(ApprovalId),
  artifactId: Schema.optional(ArtifactId),
  effects: Schema.Array(Schema.String),
});
export type CommandReceipt = typeof CommandReceipt.Type;

export const Health = Schema.Struct({
  ok: Schema.Boolean,
  schemaId: Schema.String,
  apiFamily: Schema.String,
  node: Schema.String,
  packageVersion: Schema.String,
});
export type Health = typeof Health.Type;

export const EventRow = Schema.Struct({
  seq: Schema.Number,
  id: Schema.String,
  type: Schema.String,
  body: Schema.String,
});
export type EventRow = typeof EventRow.Type;

export const TaskRow = Schema.Struct({
  id: TaskId,
  brief: Schema.String,
  ownerSession: Schema.String,
  botName: Schema.String,
  botRole: Schema.String,
  status: Schema.String,
  actionCount: Schema.Number,
});
export type TaskRow = typeof TaskRow.Type;

export const RunRow = Schema.Struct({
  id: RunId,
  taskId: TaskId,
  status: RunStatus,
  waitingReason: WaitingReason,
  frozen: FrozenConfig,
  providerState: ProviderState,
  providerSessionId: Schema.NullOr(Schema.String),
  fixture: Schema.NullOr(FixtureKind),
  actionCount: Schema.Number,
  deadlineAt: Schema.Number,
});
export type RunRow = typeof RunRow.Type;

export const PendingActionRow = Schema.Struct({
  id: ActionIntentId,
  runId: RunId,
  kind: Schema.String,
  state: ActionState,
  payload: Schema.String,
  approvalId: Schema.NullOr(ApprovalId),
});
export type PendingActionRow = typeof PendingActionRow.Type;

export const ArtifactRow = Schema.Struct({
  id: Schema.String,
  taskId: TaskId,
  runId: RunId,
  author: Schema.String,
  source: Schema.String,
  mediaType: Schema.String,
  sha256: Schema.String,
  byteSize: Schema.Number,
  path: Schema.String,
});
export type ArtifactRow = typeof ArtifactRow.Type;

export const MessageRow = Schema.Struct({
  id: Schema.String,
  threadId: Schema.String,
  taskId: TaskId,
  runId: Schema.NullOr(Schema.String),
  authorKind: Schema.String,
  authorName: Schema.String,
  body: Schema.String,
});
export type MessageRow = typeof MessageRow.Type;

export const Snapshot = Schema.Struct({
  schemaId: Schema.String,
  stopAll: Schema.Boolean,
  tasks: Schema.Array(TaskRow),
  handoffs: Schema.Array(HandoffRow),
  runs: Schema.Array(RunRow),
  pending: Schema.Array(PendingActionRow),
  artifacts: Schema.Array(ArtifactRow),
  messages: Schema.Array(MessageRow),
  events: Schema.Array(EventRow),
});
export type Snapshot = typeof Snapshot.Type;
