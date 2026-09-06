import { randomUUID } from "node:crypto";
import { Schema } from "effect";
import {
  ActionIntentId,
  ApprovalId,
  ArtifactId,
  CommandId,
  EventId,
  IdempotencyKey,
  MessageId,
  RunId,
  SessionId,
  TaskId,
  ThreadId,
} from "./schema.js";

const mint = <A>(schema: Schema.Schema<A, string>) => Schema.decodeSync(schema)(randomUUID());

export const newTaskId = () => mint(TaskId);
export const newRunId = () => mint(RunId);
export const newThreadId = () => mint(ThreadId);
export const newMessageId = () => mint(MessageId);
export const newArtifactId = () => mint(ArtifactId);
export const newCommandId = () => mint(CommandId);
export const newApprovalId = () => mint(ApprovalId);
export const newActionIntentId = () => mint(ActionIntentId);
export const newSessionId = () => mint(SessionId);
export const newEventId = () => mint(EventId);
export const newIdempotencyKey = () => mint(IdempotencyKey);
