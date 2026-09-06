import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { mutateForEngine, type Store } from "./store.js";
import type { FixtureKind, RunId, TaskId } from "./schema.js";
import { spawnCodex } from "./codex.js";

export type DriveInput = {
  readonly store: Store;
  readonly runId: RunId;
  readonly taskId: TaskId;
  readonly fixture: FixtureKind | null;
  readonly provider: "fake" | "codex";
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

const driveFake = (input: DriveInput): Effect.Effect<void, Error> =>
  Effect.try({
    try: () => {
      const engine = mutateForEngine(input.store.path);
      try {
        mkdirSync(input.workspace, { recursive: true, mode: 0o700 });
        engine.markRunning(input.runId, `fake:${input.runId}`, input.nowMs);
        const fixture = input.fixture ?? "smoke";
        if (fixture === "allow" || fixture === "deny") {
          engine.bumpAction(input.runId, input.taskId);
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
