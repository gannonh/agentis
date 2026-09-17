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
import { readVerifiedFile } from "./verified-file.js";
import { mutateForEngine, type Snapshot, type Store } from "./store.js";
import { classifyFailure } from "./provider-contract.js";
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
  readonly workspaceRoot: string;
  readonly nowMs: number;
  readonly brief: string;
  readonly loadSession?: boolean;
};

const constraintBlock = (constraints: readonly string[]) =>
  constraints.length === 0
    ? ""
    : `\n\nOperator constraints:\n${constraints.map((constraint) => `- ${constraint}`).join("\n")}`;

type ProviderBrief =
  | { readonly ok: true; readonly brief: string }
  | { readonly ok: false; readonly error: string };

const providerBrief = (snapshot: Snapshot, runId: RunId, workspaceRoot: string): ProviderBrief => {
  const run = snapshot.runs.find((item) => item.id === runId);
  const task = run ? snapshot.tasks.find((item) => item.id === run.taskId) : undefined;
  const evidenceId = task?.evidence[0];
  const evidence = evidenceId
    ? snapshot.evidence.find((item) => item.id === evidenceId)
    : undefined;
  if (!run || !task || !evidence) return { ok: true, brief: task?.brief ?? "" };
  const bytes = readVerifiedFile({
    path: evidence.path,
    root: workspaceRoot,
    byteSize: evidence.byteSize,
    sha256: evidence.contentDigest,
  });
  if (!bytes) return { ok: false, error: "materialized source is missing or changed" };
  const text = bytes.toString("utf8");
  const constraints = constraintBlock(task.constraints);
  return {
    ok: true,
    brief:
      evidence.label === "CLI brief" && text === task.brief
        ? `${task.brief}${constraints}`
        : `${task.outcome}${constraints}\n\nRead-only ${evidence.label}:\n${text}`,
  };
};

const failRun = (store: Store, runId: RunId, taskId: TaskId, error: string) => {
  const engine = mutateForEngine(store.path);
  try {
    if (engine.isActive(runId)) {
      engine.fail(runId, taskId, error, Date.now());
      return;
    }
    engine.providerState(runId, (state) =>
      state.loadStatus === "loading"
        ? {
            ...state,
            failure: classifyFailure(error),
            failureDetail: error,
            pendingPrompt: null,
            loadStatus: "failed",
          }
        : state,
    );
  } finally {
    engine.close();
  }
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
  readonly workspaceRoot: string;
}): Promise<void> => {
  const { receipt, store, executionBoundary, nowMs, command, workspaceRoot } = input;
  const initial = await Effect.runPromise(store.snapshot());
  const selected = initial.runs.find((run) => run.id === receipt.runId);
  const provider = selected?.frozen.provider ?? input.provider;
  const launchPending =
    receipt.replayed &&
    receipt.runId !== undefined &&
    initial.pending.some(
      (action) =>
        action.runId === receipt.runId && action.kind === "launch" && action.state === "pending",
    );
  if (
    receipt.accepted &&
    !receipt.replayed &&
    receipt.effects.includes("load_session") &&
    selected
  ) {
    const brief = providerBrief(initial, selected.id, workspaceRoot);
    if (!brief.ok) {
      failRun(store, selected.id, selected.taskId, brief.error);
      return;
    }
    await Effect.runPromise(
      driveAfterCommit({
        store,
        runId: selected.id,
        taskId: selected.taskId,
        fixture: selected.fixture,
        provider: selected.frozen.provider,
        executionBoundary: selected.frozen.executionBoundary,
        workspace: selected.frozen.workspaceId,
        workspaceRoot,
        nowMs,
        brief: brief.brief,
        loadSession: true,
      }),
    ).catch(() => undefined);
    return;
  }
  if (
    receipt.accepted &&
    ((receipt.effects.includes("launch") && !receipt.replayed) || launchPending) &&
    receipt.runId &&
    receipt.taskId
  ) {
    const snapshot = await Effect.runPromise(store.snapshot());
    const run = snapshot.runs.find((item) => item.id === receipt.runId);
    try {
      if (run) {
        const brief = providerBrief(snapshot, run.id, workspaceRoot);
        if (!brief.ok) {
          failRun(store, receipt.runId, receipt.taskId, brief.error);
          return;
        }
        await Effect.runPromise(
          driveAfterCommit({
            store,
            runId: receipt.runId,
            taskId: receipt.taskId,
            fixture: run.fixture,
            provider,
            executionBoundary: run.frozen.executionBoundary,
            workspace: run.frozen.workspaceId,
            workspaceRoot,
            nowMs,
            brief: brief.brief,
          }),
        );
      }
    } catch (error) {
      failRun(
        store,
        receipt.runId,
        receipt.taskId,
        error instanceof Error ? error.message : String(error),
      );
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
      const brief = providerBrief(snapshot, run.id, workspaceRoot);
      if (!brief.ok) {
        failRun(store, run.id, receipt.taskId, brief.error);
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
          workspaceRoot,
          nowMs,
          brief: brief.brief,
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
      const brief = providerBrief(snapshot, run.id, workspaceRoot);
      if (!brief.ok) {
        failRun(store, run.id, receipt.taskId, brief.error);
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
          workspaceRoot,
          nowMs,
          brief: brief.brief,
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
    source: input.provider === "codex" ? "codex" : "fake",
    mediaType: "text/markdown",
    sha256,
    byteSize: Buffer.byteLength(body),
    path,
    nowMs: Date.now(),
  });
};
