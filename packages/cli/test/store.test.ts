import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { newApprovalId, newIdempotencyKey, newRunId, newSessionId } from "../src/ids.js";
import { mutateForEngine, openStore, type ApplyInput, type Principal } from "../src/store.js";
import { EVENT_REPLAY_LIMIT, SCHEMA_ID } from "../src/versions.js";
import { Cursor, type Command, type SourcePacket } from "../src/schema.js";

const owner = (): Principal => ({ kind: "owner", sessionId: newSessionId() });
const bot = (): Principal => ({ kind: "bot", sessionId: "bot-token" });
const tempRoot = () => mkdtempSync(join(tmpdir(), "agentis-store-"));

const sourceCases: readonly { readonly name: string; readonly source: SourcePacket }[] = [
  {
    name: "pasted business input",
    source: {
      kind: "pasted",
      label: "Campaign notes",
      text: "Launch in Portland with a $4,000 ceiling.",
      citations: [{ label: "Operator note", excerpt: "$4,000 ceiling" }],
    },
  },
  {
    name: "GitHub briefing packet",
    source: {
      kind: "github_briefing",
      label: "Release briefing",
      repository: "agentis-labs/example",
      revision: "0123456789abcdef",
      url: "https://github.com/agentis-labs/example/tree/0123456789abcdef",
      text: "Summarize the retained workflow changes.",
      citations: [
        {
          label: "README.md:12",
          excerpt: "Retain task results across refresh.",
          url: "https://github.com/agentis-labs/example/blob/0123456789abcdef/README.md#L12",
        },
      ],
    },
  },
];

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
  it.each(sourceCases)(
    "persists $name as a referenced source with an exercised config revision",
    async ({ source }) => {
      const root = tempRoot();
      const store = await Effect.runPromise(openStore(root));
      const principal = owner();
      const receipt = await Effect.runPromise(
        store.applyCommand({
          principal,
          idempotencyKey: newIdempotencyKey(),
          command: {
            kind: "submit_task",
            brief: "Prepare the launch brief",
            outcome: "A cited launch brief",
            constraints: ["Read-only source", "No external writes"],
            coordinator: "mara",
            source,
            fixture: "cancel",
          },
          nowMs: 1_000,
          provider: "fake",
          executionBoundary: "unverified-host-scratch",
          workspaceId: join(root, "scratch"),
        }),
      );
      const snapshot = await Effect.runPromise(store.snapshot());
      await Effect.runPromise(store.close());

      expect(receipt.accepted).toBe(true);
      expect(snapshot.tasks[0]).toMatchObject({
        outcome: "A cited launch brief",
        currentOwner: "mara",
        ownerRole: "coordinator",
        constraints: ["Read-only source", "No external writes"],
        currentRunId: receipt.runId,
      });
      expect(snapshot.tasks[0]?.evidence).toEqual([snapshot.evidence[0]?.id]);
      expect(snapshot.evidence[0]).toMatchObject({
        source: source.kind,
        label: source.label,
        citations: source.citations,
        byteSize: Buffer.byteLength(source.text),
        contentDigest: createHash("sha256").update(source.text).digest("hex"),
      });
      expect(readFileSync(snapshot.evidence[0]?.path ?? "", "utf8")).toBe(source.text);
      expect(snapshot.botConfigRevisions).toHaveLength(1);
      expect(snapshot.botConfigRevisions[0]).toMatchObject({
        bot: "mara",
        role: "coordinator",
        provider: "fake",
        skills: ["coordinate", "business-brief"],
        grants: ["read:provided-source", "write:task-artifact"],
      });
      expect(snapshot.runs[0]?.botConfigRevisionId).toBe(snapshot.botConfigRevisions[0]?.id);
      expect(snapshot.messages).toHaveLength(1);
      expect(snapshot.messages[0]).toMatchObject({
        threadId: receipt.threadId,
        kind: "request",
        importance: "decision",
        body: "A cited launch brief",
      });
    },
  );

  it("admits two distinct bots and freezes the selected provider", async () => {
    const root = tempRoot();
    const store = await Effect.runPromise(openStore(root));
    const base = {
      principal: owner(),
      nowMs: Date.now(),
      provider: "codex" as const,
      executionBoundary: "unverified-host-scratch" as const,
      workspaceId: join(root, "scratch"),
    };
    const first = await Effect.runPromise(
      store.applyCommand({
        ...base,
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "one", bot: "mara" },
      }),
    );
    const second = await Effect.runPromise(
      store.applyCommand({
        ...base,
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "two", bot: "ivo" },
      }),
    );
    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    const snapshot = await Effect.runPromise(store.snapshot());
    expect(snapshot.runs.map((run) => run.frozen.provider)).toEqual(["codex", "claude"]);
    expect(snapshot.tasks.map((task) => task.botName)).toEqual(["mara", "ivo"]);
    await Effect.runPromise(store.close());
  });

  it("does not resurrect a stopped run from delayed provider callbacks", async () => {
    const root = tempRoot();
    const submitted = await apply(root, { kind: "submit_task", brief: "stop" });
    if (!submitted.runId || !submitted.taskId) throw new Error("missing run");
    await apply(root, { kind: "stop_all" });
    const engine = mutateForEngine(join(root, "state.sqlite"));
    engine.markRunning(submitted.runId, "late-session", Date.now());
    engine.waitInput(submitted.runId, "late question", Date.now());
    engine.waitApproval({
      runId: submitted.runId,
      taskId: submitted.taskId,
      tool: "late",
      argumentDigest: "late",
      nowMs: Date.now(),
    });
    expect(engine.bumpAction(submitted.runId, submitted.taskId).exhausted).toBe(true);
    engine.close();
    const store = await Effect.runPromise(openStore(root));
    const state = await Effect.runPromise(store.snapshot());
    expect(state.runs[0]?.status).toBe("canceled");
    expect(state.runs[0]?.providerSessionId).toBeNull();
    expect(state.pending.some((action) => action.state === "pending")).toBe(false);
    await Effect.runPromise(store.close());
  });

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
    await expect(Effect.runPromise(openStore(root))).rejects.toThrow(
      /unsupported schema agentis.v1/,
    );
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
    expect(replay.effects).toEqual([]);
    await expect(
      Effect.runPromise(
        store.applyCommand({
          ...base,
          command: { kind: "submit_task", brief: "two", fixture: "smoke" },
        }),
      ),
    ).rejects.toThrow(/different payload/);
    const snapshot = await Effect.runPromise(store.snapshot(true));
    expect(snapshot.tasks).toHaveLength(1);
    expect(snapshot.runs).toHaveLength(1);
    expect(snapshot.evidence).toHaveLength(1);
    expect(snapshot.botConfigRevisions).toHaveLength(1);
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.events.filter((event) => event.type === "task_submitted")).toHaveLength(1);
    await Effect.runPromise(store.close());
  });

  it("freezes a distinct workspace root for every Run", async () => {
    const root = tempRoot();
    const workspaceRoot = join(root, "scratch");
    const store = await Effect.runPromise(openStore(root));
    const base: Omit<ApplyInput, "command" | "idempotencyKey"> = {
      principal: owner(),
      nowMs: Date.now(),
      provider: "fake",
      executionBoundary: "unverified-host-scratch",
      workspaceId: workspaceRoot,
    };
    const first = await Effect.runPromise(
      store.applyCommand({
        ...base,
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "one", fixture: "smoke" },
      }),
    );
    expect(first.runId).toBeDefined();
    if (!first.runId) {
      throw new Error("first Run was not created");
    }
    await Effect.runPromise(
      store.applyCommand({
        ...base,
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: first.runId },
      }),
    );
    const second = await Effect.runPromise(
      store.applyCommand({
        ...base,
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "two", fixture: "smoke" },
      }),
    );
    const snapshot = await Effect.runPromise(store.snapshot());
    await Effect.runPromise(store.close());

    const firstRun = snapshot.runs.find((run) => run.id === first.runId);
    const secondRun = snapshot.runs.find((run) => run.id === second.runId);
    expect(firstRun?.frozen.workspaceId).toBe(join(workspaceRoot, "runs", first.runId ?? ""));
    expect(secondRun?.frozen.workspaceId).toBe(join(workspaceRoot, "runs", second.runId ?? ""));
    expect(firstRun?.frozen.workspaceId).not.toBe(secondRun?.frozen.workspaceId);
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

  it("exchanges a bootstrap once and projects only browser-safe persisted state", async () => {
    const root = tempRoot();
    const store = await Effect.runPromise(openStore(root));
    const ownerSession = newSessionId();
    await Effect.runPromise(
      store.issueBrowserBootstrap({
        codeHash: "bootstrap-hash",
        ownerSession,
        nowMs: 1_000,
        expiresAt: 61_000,
      }),
    );
    expect(
      await Effect.runPromise(
        store.exchangeBrowserBootstrap({
          codeHash: "bootstrap-hash",
          tokenHash: "session-hash",
          csrfHash: "csrf-hash",
          provider: "fake",
          nowMs: 2_000,
          expiresAt: 3_602_000,
        }),
      ),
    ).toBe(true);
    expect(
      await Effect.runPromise(
        store.exchangeBrowserBootstrap({
          codeHash: "bootstrap-hash",
          tokenHash: "replay-hash",
          csrfHash: "replay-csrf",
          provider: "fake",
          nowMs: 2_001,
          expiresAt: 3_602_001,
        }),
      ),
    ).toBe(false);
    expect(
      await Effect.runPromise(
        store.authenticateBrowser({
          tokenHash: "session-hash",
          csrfHash: "wrong-hash",
          nowMs: 2_100,
        }),
      ),
    ).toBeNull();
    expect(
      await Effect.runPromise(
        store.acknowledgeBrowserSetup({
          tokenHash: "session-hash",
          provider: "fake",
          sources: ["pasted", "github_briefing"],
          nowMs: 2_200,
        }),
      ),
    ).toBe(true);

    const sourceText = "private source packet text";
    const receipt = await Effect.runPromise(
      store.applyCommand({
        principal: {
          kind: "owner",
          sessionId: ownerSession,
          channel: "browser",
          browserSessionHash: "session-hash",
        },
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "submit_task",
          brief: "Prepare a retained result",
          outcome: "A safe public result",
          coordinator: "mara",
          source: {
            kind: "pasted",
            label: "Private packet",
            text: sourceText,
            citations: [{ label: "Owner note", excerpt: "retained result" }],
          },
        },
        nowMs: 2_300,
        provider: "fake",
        executionBoundary: "unverified-host-scratch",
        workspaceId: join(root, "scratch"),
      }),
    );
    expect(receipt.accepted).toBe(true);
    const projected = await Effect.runPromise(
      store.workspaceSnapshot({
        tokenHash: "session-hash",
        nowMs: 2_400,
        runtime: {
          provider: "fake",
          model: "fake",
          authMode: "none",
          executionLocation: "local daemon scratch",
          eligible: true,
          ineligibleReason: null,
        },
      }),
    );
    const encoded = JSON.stringify(projected);
    expect(projected.session.provider.acknowledgedAt).toBe(2_200);
    expect(projected.session.sources.map((item) => item.source)).toEqual([
      "pasted",
      "github_briefing",
    ]);
    expect(projected.threads).toHaveLength(1);
    expect(projected.tasks[0]?.outcome).toBe("A safe public result");
    expect(encoded).not.toContain(sourceText);
    expect(encoded).not.toContain(ownerSession);
    expect(encoded).not.toContain(join(root, "scratch"));
    expect(encoded).not.toContain("providerState");
    expect(encoded).not.toContain("dedupeKey");
    expect(encoded).not.toContain("frozen");
    await Effect.runPromise(store.close());
  });

  it("keeps transitions durable while enforcing a logical replay floor", async () => {
    const root = tempRoot();
    const store = await Effect.runPromise(openStore(root));
    const db = new DatabaseSync(store.path);
    const insert = db.prepare(
      "INSERT INTO events (id, type, body, created_at) VALUES (?, 'peer_progress', '{}', ?)",
    );
    for (let index = 1; index <= EVENT_REPLAY_LIMIT + 2; index += 1) {
      insert.run(`event_${index}`, index);
    }
    db.close();
    const cursorError = await Effect.runPromise(
      Effect.flip(store.transitionsAfter(Schema.decodeUnknownSync(Cursor)("0"))),
    );
    expect(cursorError).toMatchObject({ code: "cursor_expired" });
    const window = await Effect.runPromise(
      store.transitionsAfter(Schema.decodeUnknownSync(Cursor)("128")),
    );
    expect(window.cursor).toBe("130");
    expect(window.events.map((event) => event.cursor)).toEqual(["129", "130"]);
    expect(window.events.every((event) => event.event.reason === "peer_progress")).toBe(true);
    const retained = new DatabaseSync(store.path);
    expect(
      (retained.prepare("SELECT COUNT(*) AS count FROM events").get() as { count: number }).count,
    ).toBe(EVENT_REPLAY_LIMIT + 2);
    retained.close();
    await Effect.runPromise(store.close());
  });

  it("removes a staged source blob when submission rolls back", async () => {
    const root = tempRoot();
    const store = await Effect.runPromise(openStore(root));
    const db = new DatabaseSync(store.path);
    db.exec(`CREATE TRIGGER fail_source BEFORE INSERT ON task_sources
      BEGIN SELECT RAISE(ABORT, 'source failure'); END`);
    db.close();
    await expect(
      Effect.runPromise(
        store.applyCommand({
          principal: owner(),
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", brief: "will roll back" },
          nowMs: Date.now(),
          provider: "fake",
          executionBoundary: "unverified-host-scratch",
          workspaceId: join(root, "scratch"),
        }),
      ),
    ).rejects.toThrow(/source failure/);
    const files = readdirSync(join(root, "scratch", "runs"), { recursive: true });
    expect(files.filter((path) => String(path).endsWith(".txt"))).toEqual([]);
    const snapshot = await Effect.runPromise(store.snapshot());
    expect(snapshot.tasks).toEqual([]);
    expect(snapshot.evidence).toEqual([]);
    await Effect.runPromise(store.close());
  });
});
