import {
  spawnClaude,
  resolveClaudeApproval,
  answerClaudeInput,
  interruptClaude,
  interruptAllClaude,
} from "./claude.js";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { writeScratchFile } from "./scratch-file.js";
import { mutateForEngine, type Store } from "./store.js";
import type {
  Command,
  CommandReceipt,
  ExecutionBoundary,
  FixtureKind,
  RunId,
  TaskId,
} from "./schema.js";
import {
  answerCodexInput,
  interruptAllCodex,
  interruptCodex,
  resolveCodexApproval,
  spawnCodex,
} from "./codex.js";

export type DriveInput = {
  readonly store: Store;
  readonly runId: RunId;
  readonly taskId: TaskId;
  readonly fixture: FixtureKind | null;
  readonly provider: "fake" | "codex" | "claude";
  readonly executionBoundary: typeof ExecutionBoundary.Type;
  readonly workspace: string;
  readonly nowMs: number;
  readonly brief: string;
  readonly loadSession?: boolean;
};

export const driveAfterCommit = (input: DriveInput): Effect.Effect<void, Error> => {
  if (input.provider === "claude") return spawnClaude(input);
  if (input.provider === "codex") {
    return spawnCodex(input);
  }
  return driveFake(input);
};

export const applyReceiptEffects = async (input: {
  readonly store: Store;
  readonly receipt: CommandReceipt;
  readonly command: Command;
  readonly provider: "fake" | "codex" | "claude";
  readonly executionBoundary: typeof ExecutionBoundary.Type;
  readonly nowMs: number;
}): Promise<void> => {
  const { receipt, store, executionBoundary, nowMs, command } = input;
  const initial = await Effect.runPromise(store.snapshot());
  const selected = initial.runs.find((run) => run.id === receipt.runId);
  const provider = selected?.frozen.provider ?? input.provider;
  if (
    receipt.accepted &&
    !receipt.replayed &&
    receipt.effects.includes("load_session") &&
    selected
  ) {
    await Effect.runPromise(
      driveAfterCommit({
        store,
        runId: selected.id,
        taskId: selected.taskId,
        fixture: selected.fixture,
        provider: selected.frozen.provider,
        executionBoundary: selected.frozen.executionBoundary,
        workspace: selected.frozen.workspaceId,
        nowMs,
        brief: initial.tasks.find((task) => task.id === selected.taskId)?.brief ?? "",
        loadSession: true,
      }),
    ).catch(() => undefined);
    return;
  }
  if (
    receipt.accepted &&
    !receipt.replayed &&
    receipt.effects.includes("launch") &&
    receipt.runId &&
    receipt.taskId
  ) {
    const snapshot = await Effect.runPromise(store.snapshot());
    const run = snapshot.runs.find((item) => item.id === receipt.runId);
    try {
      if (run) {
        await Effect.runPromise(
          driveAfterCommit({
            store,
            runId: receipt.runId,
            taskId: receipt.taskId,
            fixture: run.fixture,
            provider,
            executionBoundary: run.frozen.executionBoundary,
            workspace: run.frozen.workspaceId,
            nowMs,
            brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
          }),
        );
      }
    } catch {
      return;
    }
  }
  if (
    receipt.accepted &&
    receipt.effects.includes("dispatch_tool") &&
    receipt.runId &&
    receipt.taskId
  ) {
    if (provider === "claude") {
      await resolveClaudeApproval(receipt.runId, "allowed");
    } else if (provider === "codex") {
      resolveCodexApproval(receipt.runId, "allowed");
    } else {
      const snapshot = await Effect.runPromise(store.snapshot());
      const run = snapshot.runs.find((item) => item.id === receipt.runId);
      if (!run) {
        return;
      }
      await Effect.runPromise(
        finishAllowedFake({
          store,
          runId: receipt.runId,
          taskId: receipt.taskId,
          fixture: "allow",
          provider,
          executionBoundary: "unverified-host-scratch",
          workspace: run.frozen.workspaceId,
          nowMs,
          brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
        }),
      );
    }
  }
  if (receipt.accepted && receipt.effects.includes("reject_tool") && receipt.runId) {
    if (provider === "claude") await resolveClaudeApproval(receipt.runId, "denied");
    else resolveCodexApproval(receipt.runId, "denied");
  }
  if (
    receipt.accepted &&
    receipt.effects.includes("resume_input") &&
    receipt.runId &&
    receipt.taskId
  ) {
    if (provider === "claude" && command.kind === "answer_input") {
      answerClaudeInput(receipt.runId, command.answers);
    } else if (provider === "codex" && command.kind === "answer_input") {
      answerCodexInput(receipt.runId, command.answers);
    } else {
      const snapshot = await Effect.runPromise(store.snapshot());
      const run = snapshot.runs.find((item) => item.id === receipt.runId);
      if (!run) {
        return;
      }
      await Effect.runPromise(
        finishAllowedFake({
          store,
          runId: receipt.runId,
          taskId: receipt.taskId,
          fixture: "input",
          provider,
          executionBoundary: "unverified-host-scratch",
          workspace: run.frozen.workspaceId,
          nowMs,
          brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
        }),
      );
    }
  }
  if (receipt.effects.includes("interrupt_provider")) {
    if (receipt.runId) {
      interruptClaude(receipt.runId);
      interruptCodex(receipt.runId, executionBoundary);
    } else {
      interruptAllClaude();
      interruptAllCodex();
    }
  }
};

const driveFake = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      const engine = mutateForEngine(input.store.path);
      try {
        mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
        engine.markRunning(input.runId, `fake:${input.runId}`, input.nowMs);
        const fixture = input.fixture ?? "smoke";
        if (fixture === "allow" || fixture === "deny") {
          const budget = engine.bumpAction(input.runId, input.taskId);
          if (budget.exhausted) {
            engine.fail(input.runId, input.taskId, "action budget exhausted", input.nowMs);
            return;
          }
          engine.waitApproval({
            runId: input.runId,
            taskId: input.taskId,
            tool: "scratch-write",
            argumentDigest: createHash("sha256").update("hello.md").digest("hex"),
            nowMs: input.nowMs,
          });
          return;
        }
        if (fixture === "input") {
          engine.waitInput(input.runId, "choose color", input.nowMs);
          return;
        }
        if (fixture === "cancel") {
          engine.waitInput(input.runId, "waiting for cancel", input.nowMs);
          return;
        }
        writeArtifact(engine, input);
      } finally {
        engine.close();
      }
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

export const finishAllowedFake = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      const engine = mutateForEngine(input.store.path);
      try {
        writeArtifact(engine, input);
      } finally {
        engine.close();
      }
    },
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

const writeArtifact = (engine: ReturnType<typeof mutateForEngine>, input: DriveInput) => {
  const path = join(input.workspace, "hello.md");
  const body = `# ${input.brief}\n`;
  writeScratchFile(path, body);
  const sha256 = createHash("sha256").update(body).digest("hex");
  engine.complete({
    runId: input.runId,
    taskId: input.taskId,
    author: "mara",
    source: input.provider === "codex" ? "codex" : "fake",
    mediaType: "text/markdown",
    sha256,
    byteSize: Buffer.byteLength(body),
    path,
    nowMs: Date.now(),
  });
};
