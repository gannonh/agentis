import { Schema } from "effect";

const brand = <Name extends string>(name: Name) => Schema.String.pipe(Schema.brand(name));
const nonEmpty = Schema.String.pipe(Schema.minLength(1));

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
export const EvidenceId = brand("EvidenceId");
export type EvidenceId = typeof EvidenceId.Type;
export const BotConfigRevisionId = brand("BotConfigRevisionId");
export type BotConfigRevisionId = typeof BotConfigRevisionId.Type;
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
export const IdempotencyKey = brand("IdempotencyKey");
export type IdempotencyKey = typeof IdempotencyKey.Type;
export const Cursor = Schema.String.pipe(
  Schema.pattern(/^(0|[1-9][0-9]*)$/),
  Schema.brand("Cursor"),
);
export type Cursor = typeof Cursor.Type;

export const PrincipalKind = Schema.Literal("owner", "bot");
export type PrincipalKind = typeof PrincipalKind.Type;

export const ExecutionBoundary = Schema.Literal(
  "docker-desktop-run-container",
  "docker-fixture-container",
  "unverified-host-scratch",
);
export type ExecutionBoundary = typeof ExecutionBoundary.Type;

export const ProviderKind = Schema.Literal("fake", "codex", "claude");
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
  "confirmed",
);
export type ActionState = typeof ActionState.Type;

export const WaitingReason = Schema.Literal("approval", "input", "interrupted", "none");
export type WaitingReason = typeof WaitingReason.Type;

export const Citation = Schema.Struct({
  label: nonEmpty,
  excerpt: nonEmpty,
  url: Schema.optional(Schema.String),
});
export type Citation = typeof Citation.Type;

export const PastedSource = Schema.Struct({
  kind: Schema.Literal("pasted"),
  label: nonEmpty,
  text: nonEmpty,
  citations: Schema.Array(Citation),
});
export const GithubBriefingSource = Schema.Struct({
  kind: Schema.Literal("github_briefing"),
  label: nonEmpty,
  repository: nonEmpty,
  revision: nonEmpty,
  url: Schema.optional(Schema.String),
  text: nonEmpty,
  citations: Schema.Array(Citation),
});
export const SourcePacket = Schema.Union(PastedSource, GithubBriefingSource);
export type SourcePacket = typeof SourcePacket.Type;
export const SourceKind = Schema.Literal("pasted", "github_briefing");
export type SourceKind = typeof SourceKind.Type;

export const FrozenConfig = Schema.Struct({
  bot: Schema.Literal("mara", "ivo"),
  role: Schema.Literal("coordinator", "specialist"),
  mode: Schema.Literal("agent", "plan"),
  provider: ProviderKind,
  transport: Schema.String,
  executableVersion: Schema.String,
  model: Schema.String,
  effort: Schema.optional(Schema.String),
  skills: Schema.Array(Schema.String),
  grants: Schema.Array(Schema.String),
  publicConfig: Schema.Record({ key: Schema.String, value: Schema.String }),
  executionBoundary: ExecutionBoundary,
  executionLocation: Schema.String,
  authMode: Schema.String,
  workspaceId: Schema.String,
  deadlineMs: Schema.Number,
  actionBudget: Schema.Number,
});
export type FrozenConfig = typeof FrozenConfig.Type;

const UnsupportedAttachment = Schema.Record({ key: Schema.String, value: Schema.String });
export const SubmitTask = Schema.Struct({
  kind: Schema.Literal("submit_task"),
  brief: nonEmpty,
  outcome: Schema.optional(nonEmpty),
  constraints: Schema.optional(Schema.Array(nonEmpty)),
  source: Schema.optional(SourcePacket),
  coordinator: Schema.optional(Schema.Literal("mara")),
  bot: Schema.optional(Schema.String),
  attachments: Schema.optional(Schema.Array(UnsupportedAttachment)),
  mcpServers: Schema.optional(Schema.Array(UnsupportedAttachment)),
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
export const StopAll = Schema.Struct({ kind: Schema.Literal("stop_all") });
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
  sender: Schema.Literal("mara"),
  recipient: Schema.Literal("ivo"),
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

export const Evidence = Schema.Struct({
  id: EvidenceId,
  source: SourceKind,
  label: Schema.String,
  repository: Schema.optional(Schema.String),
  revision: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  contentDigest: Schema.String,
  byteSize: Schema.Number,
  citations: Schema.Array(Citation),
  createdAt: Schema.Number,
});
export type Evidence = typeof Evidence.Type;

export const BotConfigRevision = Schema.Struct({
  id: BotConfigRevisionId,
  bot: Schema.Literal("mara", "ivo"),
  role: Schema.Literal("coordinator", "specialist"),
  provider: ProviderKind,
  model: Schema.String,
  effort: Schema.optional(Schema.String),
  skills: Schema.Array(Schema.String),
  grants: Schema.Array(Schema.String),
  publicConfig: Schema.Record({ key: Schema.String, value: Schema.String }),
  executionBoundary: ExecutionBoundary,
  executionLocation: Schema.String,
  authMode: Schema.String,
  createdAt: Schema.Number,
});
export type BotConfigRevision = typeof BotConfigRevision.Type;

export const PendingActionRow = Schema.Struct({
  id: ActionIntentId,
  runId: RunId,
  kind: Schema.String,
  state: ActionState,
  detail: Schema.String,
  approvalId: Schema.NullOr(ApprovalId),
});
export type PendingActionRow = typeof PendingActionRow.Type;

export const MessageKind = Schema.Literal(
  "request",
  "question",
  "answer",
  "progress",
  "approval",
  "handoff",
  "result",
  "failure",
  "system",
);
export const MessageImportance = Schema.Literal("routine", "decision", "blocking", "result");
export const MessageAuthorRole = Schema.Literal("operator", "coordinator", "specialist", "system");
export const MessageRow = Schema.Struct({
  id: MessageId,
  threadId: ThreadId,
  taskId: TaskId,
  runId: Schema.NullOr(RunId),
  authorKind: Schema.Literal("human", "bot", "system"),
  authorName: Schema.Literal("owner", "mara", "ivo", "agentis"),
  authorRole: MessageAuthorRole,
  kind: MessageKind,
  importance: MessageImportance,
  body: Schema.String,
  createdAt: Schema.Number,
});
export type MessageRow = typeof MessageRow.Type;
export type MessageAuthorRole = typeof MessageAuthorRole.Type;

export const ThreadRow = Schema.Struct({
  id: ThreadId,
  taskId: TaskId,
  createdAt: Schema.Number,
});
export type ThreadRow = typeof ThreadRow.Type;

export const SourceAcknowledgement = Schema.Struct({
  source: SourceKind,
  acknowledgedAt: Schema.Number,
});
export type SourceAcknowledgement = typeof SourceAcknowledgement.Type;
export const OwnerSession = Schema.Struct({
  expiresAt: Schema.Number,
  provider: Schema.Struct({
    kind: ProviderKind,
    model: Schema.String,
    authMode: Schema.String,
    executionLocation: Schema.String,
    eligible: Schema.Boolean,
    ineligibleReason: Schema.NullOr(Schema.String),
    acknowledgedAt: Schema.NullOr(Schema.Number),
  }),
  sources: Schema.Array(SourceAcknowledgement),
});
export type OwnerSession = typeof OwnerSession.Type;

export const PublicTask = Schema.Struct({
  id: TaskId,
  threadId: ThreadId,
  outcome: Schema.String,
  requestedBy: Schema.Literal("owner"),
  currentOwner: Schema.Literal("mara", "ivo"),
  ownerRole: Schema.Literal("coordinator", "specialist"),
  workspaceRef: Schema.String,
  constraints: Schema.Array(Schema.String),
  evidence: Schema.Array(EvidenceId),
  currentRunId: RunId,
  latestArtifactId: Schema.NullOr(ArtifactId),
  status: Schema.Literal("open", "running", "completed", "failed", "canceled"),
  actionCount: Schema.Number,
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
});
export type PublicTask = typeof PublicTask.Type;
export const PendingQuestion = Schema.Struct({
  key: nonEmpty,
  prompt: nonEmpty,
  options: Schema.Array(nonEmpty),
});
export type PendingQuestion = typeof PendingQuestion.Type;
export const PendingPrompt = Schema.Struct({
  kind: Schema.Literal("questions"),
  questions: Schema.Array(PendingQuestion).pipe(Schema.minItems(1)),
});
export type PendingPrompt = typeof PendingPrompt.Type;
export const PublicRun = Schema.Struct({
  id: RunId,
  taskId: TaskId,
  threadId: ThreadId,
  botConfigRevisionId: BotConfigRevisionId,
  status: RunStatus,
  waitingReason: WaitingReason,
  providerLoadStatus: Schema.Literal("idle", "loading", "succeeded", "failed"),
  pendingPrompt: Schema.NullOr(PendingPrompt),
  failure: Schema.NullOr(Schema.String),
  actionCount: Schema.Number,
  queuedAt: Schema.Number,
  startedAt: Schema.NullOr(Schema.Number),
  deadlineAt: Schema.Number,
  completedAt: Schema.NullOr(Schema.Number),
});
export type PublicRun = typeof PublicRun.Type;
export const PublicArtifact = Schema.Struct({
  id: ArtifactId,
  taskId: TaskId,
  runId: RunId,
  author: Schema.Literal("mara", "ivo"),
  source: ProviderKind,
  mediaType: Schema.String,
  sha256: Schema.String,
  byteSize: Schema.Number,
  citations: Schema.Array(Citation),
  createdAt: Schema.Number,
  metadataUrl: Schema.String,
  contentUrl: Schema.String,
});
export type PublicArtifact = typeof PublicArtifact.Type;
export const PublicHandoff = HandoffRow.pipe(
  Schema.pick(
    "id",
    "taskId",
    "threadId",
    "sourceRunId",
    "recipientRunId",
    "sender",
    "recipient",
    "context",
    "state",
    "expiresAt",
    "grants",
    "onwardDelegation",
  ),
);
export type PublicHandoff = typeof PublicHandoff.Type;

export const WorkspaceSnapshot = Schema.Struct({
  schemaId: Schema.String,
  cursor: Cursor,
  stopAll: Schema.Boolean,
  session: OwnerSession,
  tasks: Schema.Array(PublicTask),
  threads: Schema.Array(ThreadRow),
  handoffs: Schema.Array(PublicHandoff),
  runs: Schema.Array(PublicRun),
  botConfigRevisions: Schema.Array(BotConfigRevision),
  evidence: Schema.Array(Evidence),
  pending: Schema.Array(PendingActionRow),
  artifacts: Schema.Array(PublicArtifact),
  messages: Schema.Array(MessageRow),
});
export type WorkspaceSnapshot = typeof WorkspaceSnapshot.Type;

export const TransitionReason = Schema.Literal(
  "task_submitted",
  "run_running",
  "waiting_approval",
  "approval_resolved",
  "waiting_input",
  "input_answered",
  "run_canceled",
  "stop_all",
  "daemon_restart",
  "run_succeeded",
  "run_failed",
  "handoff_proposed",
  "handoff_accepted",
  "handoff_rejected",
  "handoff_expired",
  "handoff_artifact",
  "peer_progress",
  "setup_acknowledged",
);
export const Transition = Schema.Struct({
  cursor: Cursor,
  id: EventId,
  event: Schema.Struct({ kind: Schema.Literal("workspace_changed"), reason: TransitionReason }),
  createdAt: Schema.Number,
});
export type Transition = typeof Transition.Type;

export const BootstrapIssue = Schema.Struct({ url: Schema.String, expiresAt: Schema.Number });
export type BootstrapIssue = typeof BootstrapIssue.Type;
export const BootstrapExchange = Schema.Struct({ code: nonEmpty });
export const BootstrapExchangeResult = Schema.Struct({
  csrfToken: nonEmpty,
  expiresAt: Schema.Number,
});
export const StatusQuery = Schema.Struct({
  checkConnection: Schema.optional(Schema.Literal("true")),
});
export const SetupAcknowledgement = Schema.Struct({
  provider: ProviderKind,
  sources: Schema.Array(SourceKind),
});
export const ArtifactPath = Schema.Struct({ id: ArtifactId });
export const EventsQuery = Schema.Struct({ cursor: Cursor });
const apiError = <Code extends string>(code: Code) =>
  Schema.Struct({ code: Schema.Literal(code), message: Schema.String });
export const BadRequestApiError = apiError("bad_request");
export const UnauthorizedApiError = apiError("unauthorized");
export const ForbiddenApiError = apiError("forbidden");
export const NotFoundApiError = apiError("not_found");
export const ConflictApiError = apiError("conflict");
export const CursorExpiredApiError = apiError("cursor_expired");
export const ResyncRequiredApiError = apiError("resync_required");
export const PayloadTooLargeApiError = apiError("payload_too_large");
export const InternalApiError = apiError("internal_error");
export const ApiError = Schema.Union(
  BadRequestApiError,
  UnauthorizedApiError,
  ForbiddenApiError,
  NotFoundApiError,
  ConflictApiError,
  CursorExpiredApiError,
  ResyncRequiredApiError,
  PayloadTooLargeApiError,
  InternalApiError,
);
export type ApiError = typeof ApiError.Type;
