import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { newApprovalId, newIdempotencyKey, newRunId, newSessionId } from "../src/ids.js";
import { openStore, type ApplyInput, type Principal } from "../src/store.js";
import { SCHEMA_ID } from "../src/versions.js";
import type { Command } from "../src/schema.js";

const owner = (): Principal => ({ kind: "owner", sessionId: newSessionId() });
const bot = (): Principal => ({ kind: "bot", sessionId: "bot-token" });
const tempRoot = () => mkdtempSync(join(tmpdir(), "agentis-store-"));

const apply = async (root: string, command: Command, principal: Principal = owner()) => {
  const store = await Effect.runPromise(openStore(root));
  const input: ApplyInput = {
    principal,
    idempotencyKey: newIdempotencyKey(),
    command,
    nowMs: Date.now(),
    provider: "fake",
    executionBoundary: "unverified-host-scratch",
    workspaceId: join(root, "scratch"),
  };
  try {
    return await Effect.runPromise(store.applyCommand(input));
  } finally {
    await Effect.runPromise(store.close());
  }
};

describe("store", () => {
  it("refuses an unsupported schema", async () => {
    const root = tempRoot();
    const first = await Effect.runPromise(openStore(root));
    await Effect.runPromise(first.close());
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(join(root, "state.sqlite"));
    db.prepare("UPDATE meta SET value = 'agentis.v1' WHERE key = 'schema_id'").run();
    db.close();
    await expect(Effect.runPromise(openStore(root))).rejects.toThrow(
      /unsupported schema agentis.v1/,
    );
  });

  it("refuses unsupported schema before creating current tables", async () => {
    const root = tempRoot();
    const { DatabaseSync } = await import("node:sqlite");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(root, { recursive: true });
    const path = join(root, "state.sqlite");
    const db = new DatabaseSync(path);
    db.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.prepare("INSERT INTO meta (key, value) VALUES ('schema_id', 'agentis.v1')").run();
    db.close();
    await expect(Effect.runPromise(openStore(root))).rejects.toThrow(/unsupported schema agentis.v1/);
    const after = new DatabaseSync(path);
    const tables = after
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((item) => item.name)).toEqual(["meta"]);
    after.close();
  });

  it("replays the same idempotency key and rejects a changed payload", async () => {
    const root = tempRoot();
    const store = await Effect.runPromise(openStore(root));
    const key = newIdempotencyKey();
    const base: Omit<ApplyInput, "command"> = {
      principal: owner(),
      idempotencyKey: key,
      nowMs: Date.now(),
      provider: "fake",
      executionBoundary: "unverified-host-scratch",
      workspaceId: join(root, "scratch"),
    };
    const first = await Effect.runPromise(
      store.applyCommand({
        ...base,
        command: { kind: "submit_task", brief: "one", fixture: "smoke" },
      }),
    );
    const replay = await Effect.runPromise(
      store.applyCommand({
        ...base,
        command: { kind: "submit_task", brief: "one", fixture: "smoke" },
      }),
    );
    expect(replay.commandId).toBe(first.commandId);
    expect(replay.taskId).toBe(first.taskId);
    await expect(
      Effect.runPromise(
        store.applyCommand({
          ...base,
          command: { kind: "submit_task", brief: "two", fixture: "smoke" },
        }),
      ),
    ).rejects.toThrow(/different payload/);
    await Effect.runPromise(store.close());
  });

  it("rejects bot approval and launch", async () => {
    const root = tempRoot();
    await expect(
      apply(root, { kind: "submit_task", brief: "nope", fixture: "smoke" }, bot()),
    ).rejects.toThrow(/bot cannot submit_task/);
    await expect(
      apply(
        root,
        { kind: "resolve_approval", approvalId: newApprovalId(), decision: "allowed" },
        bot(),
      ),
    ).rejects.toThrow(/bot cannot resolve_approval/);
    await expect(
      apply(root, { kind: "answer_input", runId: newRunId(), answers: { color: "Blue" } }, bot()),
    ).rejects.toThrow(/bot cannot answer_input/);
    await expect(apply(root, { kind: "cancel_run", runId: newRunId() }, bot())).rejects.toThrow(
      /bot cannot cancel_run/,
    );
    await expect(apply(root, { kind: "stop_all" }, bot())).rejects.toThrow(/bot cannot stop_all/);
  });

  it("does not claim a pending launch across reopen", async () => {
    const root = tempRoot();
    const submitted = await apply(root, { kind: "submit_task", brief: "hold", fixture: "cancel" });
    const reopened = await Effect.runPromise(openStore(root));
    const interrupted = await Effect.runPromise(reopened.interruptActiveRuns(Date.now()));
    const snapshot = await Effect.runPromise(reopened.snapshot());
    await Effect.runPromise(reopened.close());
    expect(submitted.runId).toBeDefined();
    expect(interrupted).toContain(submitted.runId);
    const pending = snapshot.pending.find((item) => item.runId === submitted.runId);
    expect(pending?.state).toBe("pending");
    expect(pending?.kind).toBe("launch");
    expect(snapshot.schemaId).toBe(SCHEMA_ID);
  });

  it("latches stop-all and refuses a later submit", async () => {
    const root = tempRoot();
    const stopped = await apply(root, { kind: "stop_all" });
    expect(stopped.accepted).toBe(true);
    const next = await apply(root, { kind: "submit_task", brief: "after stop", fixture: "smoke" });
    expect(next.accepted).toBe(false);
    expect(next.error).toMatch(/stop-all/);
  });
});
