import { scheduler } from "node:timers/promises";
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, symlinkSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Snapshot } from "../src/schema.js";
import { sweepRunTimeouts, openStore } from "../src/store.js";
import { loadOrCreateOwner } from "../src/auth.js";
import { startServer } from "../src/http.js";
import { newIdempotencyKey } from "../src/ids.js";

const stub = fileURLToPath(new URL("./codex-stub.mjs", import.meta.url));

const port = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("no port"));
        return;
      }
      const value = address.port;
      server.close((error) => (error ? reject(error) : resolve(value)));
    });
  });

const boot = async () => {
  process.env.AGENTIS_CODEX_STUB = stub;
  process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS = "5000";
  const dataRoot = mkdtempSync(join(tmpdir(), "agentis-codex-"));
  const endpoint = new URL(`http://127.0.0.1:${await port()}`);
  const server = await Effect.runPromise(
    startServer({
      endpoint,
      dataRoot,
      workspace: join(dataRoot, "scratch"),
      provider: "codex",
      executionBoundary: "unverified-host-scratch",
    }),
  );
  const owner = await Effect.runPromise(loadOrCreateOwner(dataRoot));
  return { endpoint, server, owner, dataRoot };
};

const command = async (endpoint: URL, token: string, body: unknown) => {
  const response = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
};

const statusOf = async (endpoint: URL, token: string) => {
  const response = await fetch(new URL("/v1/status", endpoint), {
    headers: { authorization: `Bearer ${token}` },
  });
  return Schema.decodeUnknownSync(Snapshot)(await response.json());
};

const waitFor = async (
  endpoint: URL,
  token: string,
  match: (snap: Awaited<ReturnType<typeof statusOf>>) => boolean,
) => {
  const deadline = Date.now() + 4000;
  let snap = await statusOf(endpoint, token);
  while (!match(snap)) {
    if (Date.now() > deadline) {
      throw new Error(`codex stub timed out: ${JSON.stringify(snap.runs)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
    snap = await statusOf(endpoint, token);
  }
  return snap;
};

afterEach(() => {
  delete process.env.AGENTIS_CURSOR_STUB;
  delete process.env.AGENTIS_CODEX_STUB;
  delete process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS;
});

describe("bounded handoff", () => {
  it("returns Ivo's accepted draft to Mara's original conversation exactly once", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const proposal = {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "Write a concise specialist draft",
        },
      };
      const accepted = await command(endpoint, owner.token, proposal);
      expect(accepted.json.accepted).toBe(true);
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[1]?.status === "succeeded",
      );
      expect(done.artifacts).toHaveLength(2);
      expect(done.tasks[0]?.botName).toBe("ivo");
      expect(done.runs[0]?.frozen.bot).toBe("mara");
      expect(done.handoffs[0]).toMatchObject({
        state: "accepted",
        grants: "draft_only",
        onwardDelegation: false,
      });
      expect(
        done.messages
          .filter((message) => message.authorName === "ivo")
          .every((message) => message.threadId === source.json.threadId),
      ).toBe(true);
      expect(
        done.events.some(
          (event) =>
            event.type === "peer_progress" &&
            JSON.parse(event.body).threadId === source.json.threadId,
        ),
      ).toBe(true);
      expect(done.pending.filter((action) => action.kind === "handoff_draft")).toHaveLength(1);
      expect(done.runs[1]?.actionCount).toBe(2);
      const prompts = readFileSync(
        join(done.runs[1]?.frozen.workspaceId ?? "", "prompts.jsonl"),
        "utf8",
      )
        .trim()
        .split("\n");
      expect(prompts).toHaveLength(2);
      expect(JSON.parse(prompts[1] ?? "{}").prompt[0].text).toContain("KAT3242_OK");
      expect(done.artifacts[1]?.taskId).toBe(source.json.taskId);
      expect(readFileSync(done.artifacts[1]?.path ?? "", "utf8")).toBe("SPECIALIST_DRAFT");
      expect((await command(endpoint, owner.token, proposal)).json.replayed).toBe(true);
      expect(
        (await command(endpoint, owner.token, { ...proposal, idempotencyKey: newIdempotencyKey() }))
          .json.accepted,
      ).toBe(false);
      expect((await statusOf(endpoint, owner.token)).runs).toHaveLength(2);
    } finally {
      await server.close();
    }
  });
  it.each([
    "REJECT_HANDOFF",
    "MALFORMED_HANDOFF",
    "WRONG_HANDOFF",
    "QUOTED_HANDOFF",
    "TOOL_HANDOFF",
    "WRONG_SESSION_HANDOFF",
  ])("keeps Mara's ownership and result on %s", async (context) => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const proposal = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context,
        },
      });
      expect(proposal.json.accepted).toBe(true);
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[1]?.status === "failed",
      );
      expect(done.tasks[0]).toMatchObject({ botName: "mara", status: "completed" });
      expect(done.artifacts).toHaveLength(1);
      expect(done.handoffs[0]?.state).toBe("rejected");
      expect(
        done.runs[1]?.providerState.history.filter(
          (raw) => JSON.parse(raw).sessionUpdate === "user_message_chunk",
        ),
      ).toHaveLength(1);
    } finally {
      await server.close();
    }
  });
  it("expires a proposal before a late provider accepts without losing the source", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "DELAY_HANDOFF",
        },
      });
      sweepRunTimeouts(server.store.path, Date.now() + 61000);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const done = await statusOf(endpoint, owner.token);
      expect(done.handoffs[0]?.state).toBe("expired");
      expect(done.tasks[0]).toMatchObject({ botName: "mara", status: "completed" });
      expect(done.artifacts).toHaveLength(1);
      expect(done.runs[1]?.actionCount).toBe(1);
    } finally {
      await server.close();
    }
  });
  it.each(["cancel_run", "stop_all"])(
    "%s before acceptance retains the coordinator result",
    async (kind) => {
      process.env.AGENTIS_CURSOR_STUB = fileURLToPath(
        new URL("./cursor-stub.mjs", import.meta.url),
      );
      const { endpoint, server, owner } = await boot();
      try {
        const source = await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", brief: "smoke" },
        });
        await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
        const proposed = await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: {
            kind: "propose_handoff",
            sourceRunId: source.json.runId,
            recipient: "ivo",
            context: "DELAY_HANDOFF",
          },
        });
        await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind, ...(kind === "cancel_run" ? { runId: proposed.json.runId } : {}) },
        });
        await new Promise((resolve) => setTimeout(resolve, 350));
        const done = await statusOf(endpoint, owner.token);
        expect(done.tasks[0]).toMatchObject({ botName: "mara", status: "completed" });
        expect(done.handoffs[0]?.state).toBe("rejected");
        expect(done.artifacts).toHaveLength(1);
        expect(done.pending.some((action) => action.kind === "handoff_draft")).toBe(false);
      } finally {
        await server.close();
      }
    },
  );

  it("denies guessed Bot identities even when replaying an owner's handoff key", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const body = {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "DELAY_HANDOFF",
        },
      };
      await command(endpoint, owner.token, body);
      const replay = await fetch(new URL("/v1/commands", endpoint), {
        method: "POST",
        headers: { authorization: "Bot ivo", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(replay.status).toBe(403);
    } finally {
      await server.close();
    }
  });

  it("stop-all after acceptance commit prevents the pending draft from dispatching", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      let resume = () => {};
      const immediate = vi.spyOn(scheduler, "yield").mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resume = resolve;
          }),
      );
      try {
        await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: {
            kind: "propose_handoff",
            sourceRunId: source.json.runId,
            recipient: "ivo",
            context: "normal draft",
          },
        });
        await waitFor(endpoint, owner.token, (state) => state.handoffs[0]?.state === "accepted");
        await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "stop_all" },
        });
        immediate.mockRestore();
        resume();
        await new Promise((resolve) => setTimeout(resolve, 30));
        const stopped = await statusOf(endpoint, owner.token);
        expect(stopped.tasks[0]).toMatchObject({ botName: "ivo", status: "canceled" });
        expect(stopped.runs[1]?.actionCount).toBe(1);
        expect(stopped.artifacts).toHaveLength(1);
        expect(stopped.pending.find((action) => action.kind === "handoff_draft")?.state).toBe(
          "canceled",
        );
      } finally {
        immediate.mockRestore();
      }
    } finally {
      await server.close();
    }
  });
  it("preserves transferred ownership and replay receipts when the store reopens", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner, dataRoot } = await boot();
    const source = await command(endpoint, owner.token, {
      idempotencyKey: newIdempotencyKey(),
      command: { kind: "submit_task", brief: "smoke" },
    });
    await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
    await command(endpoint, owner.token, {
      idempotencyKey: newIdempotencyKey(),
      command: {
        kind: "propose_handoff",
        sourceRunId: source.json.runId,
        recipient: "ivo",
        context: "normal draft",
      },
    });
    const before = await waitFor(
      endpoint,
      owner.token,
      (state) => state.runs[1]?.status === "succeeded",
    );
    await server.close();
    const reopened = await Effect.runPromise(openStore(dataRoot));
    try {
      const after = await Effect.runPromise(reopened.snapshot());
      expect(after.tasks).toEqual(before.tasks);
      expect(after.handoffs).toEqual(before.handoffs);
      expect(after.artifacts).toEqual(before.artifacts);
      expect(after.runs[1]?.actionCount).toBe(2);
    } finally {
      await Effect.runPromise(reopened.close());
    }
  });
  it("counts active Ivo work and refuses onward handoff from a specialist", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const busy = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "QUESTION" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[1]?.status === "waiting_input");
      const body = {
        kind: "propose_handoff",
        sourceRunId: source.json.runId,
        recipient: "ivo",
        context: "draft",
      };
      expect(
        (
          await command(endpoint, owner.token, {
            idempotencyKey: newIdempotencyKey(),
            command: body,
          })
        ).json.accepted,
      ).toBe(false);
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: busy.json.runId },
      });
      const accepted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: body,
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[2]?.status === "succeeded");
      const onward = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { ...body, sourceRunId: accepted.json.runId },
      });
      expect(onward.json.accepted).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("denies native permission requests without creating an owner approval or granting tools", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "PERMISSION_HANDOFF",
        },
      });
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[1]?.status === "succeeded",
      );
      expect(done.pending.some((action) => action.approvalId)).toBe(false);
      expect(readFileSync(done.artifacts[1]?.path ?? "", "utf8")).toContain(
        '"outcome":"cancelled"',
      );
    } finally {
      await server.close();
    }
  });
  it("loads the completed recipient session without redispatching its draft", async () => {
    process.env.AGENTIS_CURSOR_STUB = fileURLToPath(new URL("./cursor-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "draft",
        },
      });
      const before = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[1]?.status === "succeeded",
      );
      const recipient = before.runs[1];
      const loaded = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: recipient?.id },
      });
      expect(loaded.json.accepted).toBe(true);
      const after = await statusOf(endpoint, owner.token);
      expect(after.runs[1]?.providerState.loadStatus).toBe("succeeded");
      expect(after.runs[1]?.providerState.history).toEqual(recipient?.providerState.history);
      expect(after.runs[1]?.providerSessionId).toBe(recipient?.providerSessionId);
      expect(after.runs[1]?.id).toBe(recipient?.id);
      expect(after.artifacts).toEqual(before.artifacts);
      expect(after.handoffs).toEqual(before.handoffs);
      expect(after.messages).toEqual(before.messages);
      expect(
        readFileSync(join(recipient?.frozen.workspaceId ?? "", "prompts.jsonl"), "utf8")
          .trim()
          .split("\n"),
      ).toHaveLength(2);
    } finally {
      await server.close();
    }
  });
  it.each(["changed", "oversized", "symlink"])(
    "rejects a %s source artifact without launching Ivo",
    async (kind) => {
      process.env.AGENTIS_CURSOR_STUB = fileURLToPath(
        new URL("./cursor-stub.mjs", import.meta.url),
      );
      const { endpoint, server, owner, dataRoot } = await boot();
      try {
        const source = await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", brief: "smoke" },
        });
        const before = await waitFor(
          endpoint,
          owner.token,
          (state) => state.runs[0]?.status === "succeeded",
        );
        const path = before.artifacts[0]?.path ?? "";
        if (kind === "symlink") {
          const target = join(dataRoot, "redirected-draft.md");
          writeFileSync(target, readFileSync(path));
          unlinkSync(path);
          symlinkSync(target, path);
        } else writeFileSync(path, kind === "oversized" ? "x".repeat(70000) : "CHANGED_OK");
        const proposal = await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: {
            kind: "propose_handoff",
            sourceRunId: source.json.runId,
            recipient: "ivo",
            context: "draft",
          },
        });
        expect(proposal.json.accepted).toBe(false);
        const after = await statusOf(endpoint, owner.token);
        expect(after.runs).toHaveLength(1);
        expect(after.handoffs).toHaveLength(0);
        expect(after.tasks).toEqual(before.tasks);
      } finally {
        await server.close();
      }
    },
  );
});
