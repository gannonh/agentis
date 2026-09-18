import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { newIdempotencyKey, newSessionId } from "../src/ids.js";
import { openStore, type Principal } from "../src/store.js";
import { message } from "../src/store-db.js";

const owner = (): Principal => ({ kind: "owner", sessionId: newSessionId() });
const tempRoot = () => mkdtempSync(join(tmpdir(), "agentis-store-db-"));

describe("store-db", () => {
  it("ignores a duplicate dedupe key and inserts messages without one", async () => {
    const root = tempRoot();
    const store = await Effect.runPromise(openStore(root));
    const receipt = await Effect.runPromise(
      store.applyCommand({
        principal: owner(),
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "dedupe submit", fixture: "cancel" },
        nowMs: 1_000,
        provider: "fake",
        executionBoundary: "unverified-host-scratch",
        workspaceId: join(root, "scratch"),
      }),
    );
    const { threadId, taskId, runId } = receipt;
    if (!threadId || !taskId || !runId) throw new Error("missing ids");
    const base: Parameters<typeof message>[1] = {
      threadId,
      taskId,
      runId,
      authorKind: "bot",
      authorName: "mara",
      authorRole: "coordinator",
      kind: "progress",
      body: "dedupe probe",
      nowMs: 2_000,
    };
    const db = new DatabaseSync(store.path);
    try {
      expect(message(db, { ...base, dedupeKey: "dedupe-probe:once" })).toBe(true);
      expect(message(db, { ...base, dedupeKey: "dedupe-probe:once" })).toBe(false);
      expect(message(db, { ...base, body: "plain insert", nowMs: 3_000 })).toBe(true);
      expect(message(db, { ...base, body: "plain insert", nowMs: 4_000 })).toBe(true);
    } finally {
      db.close();
    }
    try {
      const snapshot = await Effect.runPromise(store.snapshot());
      expect(
        snapshot.messages
          .map((item) => item.body)
          .filter((body) => body === "dedupe probe" || body === "plain insert"),
      ).toEqual(["dedupe probe", "plain insert", "plain insert"]);
    } finally {
      await Effect.runPromise(store.close());
    }
  });
});
