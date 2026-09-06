import { Schema } from "effect";

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

export const ProviderKind = Schema.Literal("fake", "codex");
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
export const Command = Schema.Union(SubmitTask, ResolveApproval, AnswerInput, CancelRun, StopAll);
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
