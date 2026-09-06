import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { mutateForEngine, type Store } from "./store.js";
import type { Command, CommandReceipt, ExecutionBoundary, FixtureKind, RunId, TaskId } from "./schema.js";
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
  readonly provider: "fake" | "codex";
  readonly executionBoundary: typeof ExecutionBoundary.Type;
  readonly workspace: string;
  readonly nowMs: number;
  readonly brief: string;
};

export const driveAfterCommit = (input: DriveInput): Effect.Effect<void, Error> => {
  if (input.provider === "codex") {
    return spawnCodex(input);
  }
  return driveFake(input);
};

export const applyReceiptEffects = async (input: {
  readonly store: Store;
  readonly receipt: CommandReceipt;
  readonly command: Command;
  readonly provider: "fake" | "codex";
  readonly workspace: string;
  readonly nowMs: number;
}): Promise<void> => {
  const { receipt, store, provider, workspace, nowMs, command } = input;
  const drive = (
    fixture: FixtureKind | null,
    brief: string,
    executionBoundary: typeof ExecutionBoundary.Type,
  ) => {
    if (!receipt.runId || !receipt.taskId) {
      return Promise.resolve();
    }
    return Effect.runPromise(
      driveAfterCommit({
        store,
        runId: receipt.runId,
        taskId: receipt.taskId,
        fixture,
        provider,
        executionBoundary,
        workspace,
        nowMs,
        brief,
      }),
    );
  };
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
      await drive(
        run?.fixture ?? null,
        snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
        run?.frozen.executionBoundary ?? "unverified-host-scratch",
      );
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
    if (provider === "codex") {
      resolveCodexApproval(receipt.runId, "allowed");
    } else {
      const snapshot = await Effect.runPromise(store.snapshot());
      await Effect.runPromise(
        finishAllowedFake({
          store,
          runId: receipt.runId,
          taskId: receipt.taskId,
          fixture: "allow",
          provider,
          executionBoundary: "unverified-host-scratch",
          workspace,
          nowMs,
          brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
        }),
      );
    }
  }
  if (receipt.accepted && receipt.effects.includes("reject_tool") && receipt.runId) {
    resolveCodexApproval(receipt.runId, "denied");
  }
  if (
    receipt.accepted &&
    receipt.effects.includes("resume_input") &&
    receipt.runId &&
    receipt.taskId
  ) {
    if (provider === "codex" && command.kind === "answer_input") {
      answerCodexInput(receipt.runId, command.answers);
    } else {
      const snapshot = await Effect.runPromise(store.snapshot());
      await Effect.runPromise(
        finishInputFake({
          store,
          runId: receipt.runId,
          taskId: receipt.taskId,
          fixture: "input",
          provider,
          executionBoundary: "unverified-host-scratch",
          workspace,
          nowMs,
          brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
        }),
      );
    }
  }
  if (receipt.accepted && receipt.effects.includes("interrupt_provider")) {
    if (receipt.runId) {
      interruptCodex(receipt.runId);
    } else {
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

export const finishInputFake = (input: DriveInput): Effect.Effect<void, Error> =>
  finishAllowedFake(input);

const writeArtifact = (engine: ReturnType<typeof mutateForEngine>, input: DriveInput) => {
  const path = join(input.workspace, "hello.md");
  const body = `# ${input.brief}\n`;
  writeFileSync(path, body, { mode: 0o600 });
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
