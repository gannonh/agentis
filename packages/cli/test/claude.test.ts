import { spawn } from "node:child_process";
import * as claudeContainer from "../src/claude-container.js";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  return (await response.json()) as {
    runs: {
      id: string;
      status: string;
      providerSessionId: string | null;
      frozen: unknown;
      providerState: {
        loadStatus: string;
        pendingPrompt: string | null;
        failure: string | null;
        history: string[];
      };
    }[];
    pending: { approvalId: string | null; state: string; runId: string }[];
    artifacts: { taskId: string; runId: string; source: string; sha256: string; path: string }[];
  };
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
  delete process.env.AGENTIS_CODEX_STUB;
  delete process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS;
});

describe("Claude SDK bridge", () => {
  it("routes ivo over SDK bridge and retains negotiated capabilities", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke", bot: "ivo" },
      });
      expect(submitted.json.accepted).toBe(true);
      const state = await waitFor(endpoint, owner.token, (state) =>
        state.runs.some((run) => run.status === "succeeded"),
      );
      expect(state.artifacts[0]?.source).toBe("claude");
      expect(readFileSync(state.artifacts[0]?.path ?? "", "utf8")).toBe("CLAUDE_OK");
      expect(state.runs[0]?.providerSessionId).toBe("claude-session-1");
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("answers Claude permissions without dispatching the Codex run", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "CANCEL", bot: "mara" },
      });
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "ALLOW", bot: "ivo" },
      });
      const waiting = await waitFor(endpoint, owner.token, (state) =>
        state.runs.some(
          (run) => run.id === submitted.json.runId && run.status === "waiting_approval",
        ),
      );
      const approval = waiting.pending.find(
        (action) => action.runId === submitted.json.runId && action.approvalId,
      );
      const allowed = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: approval?.approvalId,
          decision: "allowed",
        },
      });
      expect(allowed.json.accepted).toBe(true);
      const done = await waitFor(endpoint, owner.token, (state) =>
        state.runs.some((run) => run.id === submitted.json.runId && run.status === "succeeded"),
      );
      expect(done.runs.find((run) => run.id !== submitted.json.runId)?.status).toBe(
        "waiting_input",
      );
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });

  it("loads a completed session without another prompt or duplicated history", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke", bot: "ivo" },
      });
      await waitFor(endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const loaded = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: submitted.json.runId },
      });
      expect(loaded.json.accepted).toBe(true);
      const state = await statusOf(endpoint, owner.token);
      expect(state.artifacts).toHaveLength(1);
      expect(state.runs[0]?.providerState.failure).toBeNull();
      expect(state.runs[0]?.providerState.history).toHaveLength(2);
      expect(state.runs[0]?.status).toBe("succeeded");
      expect(state.runs[0]?.providerSessionId).toBe("claude-session-1");
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it.each(["BLUE", "Other color", "BLUE, RED"])(
    "preserves native question fields and answer %s",
    async (selected) => {
      process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(
        new URL("./claude-stub.mjs", import.meta.url),
      );
      const { endpoint, server, owner } = await boot();
      try {
        await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", bot: "ivo", brief: "QUESTION" },
        });
        const waiting = await waitFor(
          endpoint,
          owner.token,
          (state) => state.runs[0]?.status === "waiting_input",
        );
        expect(JSON.parse(waiting.runs[0]?.providerState.pendingPrompt ?? "{}")).toMatchObject({
          questions: [{ question: "Pick color" }],
        });
        await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: {
            kind: "answer_input",
            runId: waiting.runs[0]?.id,
            answers: { "Pick color": selected },
          },
        });
        const done = await waitFor(
          endpoint,
          owner.token,
          (state) => state.runs[0]?.status === "succeeded",
        );
        expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toContain(
          JSON.stringify({ "Pick color": selected }).slice(1, -1),
        );
        expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toContain('"header":"Color"');
        expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toContain(
          '"multiSelect":false',
        );
      } finally {
        await server.close();
        delete process.env.AGENTIS_CLAUDE_STUB;
      }
    },
  );
  it.each([
    ["AUTH", "auth-unavailable"],
    ["BAD_AUTH_SOURCE", "unsupported-capability"],
    ["BAD_INVENTORY", "unsupported-capability"],
    ["QUOTA", "quota"],
    ["CRASH", "crash"],
    ["MALFORMED", "malformed-response"],
    ["EMPTY", "malformed-response"],
  ])("records %s without a successful artifact", async (brief, failure) => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief },
      });
      const state = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "failed",
      );
      expect(state.runs[0]?.providerState.failure).toBe(failure);
      expect(state.artifacts).toHaveLength(0);
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });

  it("loads newly persisted native history after cancel without creating output", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "QUESTION" },
      });
      const waiting = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_input",
      );
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: waiting.runs[0]?.id },
      });
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: waiting.runs[0]?.id },
      });
      const loaded = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.providerState.loadStatus !== "loading",
      );
      expect(loaded.runs[0]?.providerState.loadStatus).toBe("succeeded");
      expect(loaded.runs[0]?.providerState.history).toHaveLength(1);
      expect(loaded.runs[0]?.status).toBe("canceled");
      expect(loaded.artifacts).toHaveLength(0);
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("keeps HTTP serving when provider cleanup throws", async () => {
    const { endpoint, server, owner } = await boot();
    const report = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    vi.spyOn(claudeContainer, "spawnClaudeInContainer").mockImplementation((input) => {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL("./claude-stub.mjs", import.meta.url))],
        { cwd: input.workspace, stdio: ["pipe", "pipe", "pipe"] },
      );
      return {
        child,
        stop: () => {
          child.kill("SIGTERM");
          throw new Error("Docker unavailable");
        },
      };
    });
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "QUESTION" },
      });
      const waiting = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_input",
      );
      const canceled = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: waiting.runs[0]?.id },
      });
      expect(canceled.json.accepted).toBe(true);
      expect((await statusOf(endpoint, owner.token)).runs[0]?.status).toBe("canceled");
      expect(report).toHaveBeenCalled();
    } finally {
      await server.close();
      vi.restoreAllMocks();
    }
  });
  it("records startup failure for both launch and load without losing a completed result", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "smoke" },
      });
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded",
      );
      delete process.env.AGENTIS_CLAUDE_STUB;
      vi.spyOn(claudeContainer, "spawnClaudeInContainer").mockImplementation(() => {
        throw new Error("auth volume unavailable");
      });
      const receipt = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: done.runs[0]?.id },
      });
      expect(receipt.status).toBe(200);
      expect(receipt.json).toMatchObject({ accepted: true, effects: ["load_session"] });
      const loaded = await statusOf(endpoint, owner.token);
      expect(loaded.runs[0]?.providerState).toMatchObject({
        loadStatus: "failed",
        failure: "auth-unavailable",
      });
      expect(loaded.runs[0]?.status).toBe("succeeded");
      expect(loaded.artifacts).toEqual(done.artifacts);
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "smoke" },
      });
      const failed = await statusOf(endpoint, owner.token);
      expect(failed.runs[1]?.status).toBe("failed");
      expect(failed.runs[1]?.providerState.failure).toBe("auth-unavailable");
    } finally {
      vi.restoreAllMocks();
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("loads a completed session after its execution deadline", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "smoke" },
      });
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded",
      );
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 16 * 60 * 1000);
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: done.runs[0]?.id },
      });
      const loaded = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.providerState.loadStatus !== "loading",
      );
      expect(loaded.runs[0]?.providerState.loadStatus).toBe("succeeded");
    } finally {
      vi.restoreAllMocks();
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("terminates the active provider when an expired approval decision is rejected", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner, dataRoot } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "ALLOW" },
      });
      const waiting = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_approval",
      );
      const pid = Number(
        readFileSync(
          join(dataRoot, "scratch", "runs", waiting.runs[0]!.id, "provider.pid"),
          "utf8",
        ),
      );
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);
      const receipt = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: waiting.pending.find((action) => action.approvalId)?.approvalId,
          decision: "allowed",
        },
      });
      vi.restoreAllMocks();
      expect(receipt.json.accepted).toBe(false);
      expect(receipt.json.effects).toContain("interrupt_provider");
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(() => process.kill(pid, 0)).toThrow();
      const expired = await statusOf(endpoint, owner.token);
      expect(expired.runs[0]?.status).toBe("failed");
      expect(expired.pending.find((action) => action.approvalId)?.state).toBe("expired");
      expect(expired.artifacts).toHaveLength(0);
    } finally {
      vi.restoreAllMocks();
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("stop-all cancels both providers and late replies cannot revive them", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "mara", brief: "CANCEL" },
      });
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "QUESTION" },
      });
      await waitFor(
        endpoint,
        owner.token,
        (state) =>
          state.runs.length === 2 && state.runs.every((run) => run.status === "waiting_input"),
      );
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "stop_all" },
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const stopped = await statusOf(endpoint, owner.token);
      expect(stopped.runs.map((run) => run.status)).toEqual(["canceled", "canceled"]);
      expect(stopped.artifacts).toHaveLength(0);
      const late = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "answer_input",
          runId: stopped.runs[1]?.id,
          answers: { "Pick color": "BLUE" },
        },
      });
      expect(late.json.accepted).toBe(false);
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("claims session loads and rejects concurrent provider operations", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "SLOW_LOAD" },
      });
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded",
      );
      const first = command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: done.runs[0]?.id },
      });
      await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.providerState.loadStatus === "loading",
      );
      const duplicate = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: done.runs[0]?.id },
      });
      expect(duplicate.json.accepted).toBe(false);
      const busy = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "overlap" },
      });
      expect(busy.json.accepted).toBe(false);
      await first;
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "stop_all" },
      });
      const stopped = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: done.runs[0]?.id },
      });
      expect(stopped.json.accepted).toBe(false);
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("rejects unsupported attachments and MCP instead of dropping them", async () => {
    const { endpoint, server, owner } = await boot();
    try {
      for (const extra of [
        { mode: "plan" },
        { attachments: [{ type: "image", data: "sample" }] },
        { mcpServers: [{ name: "sample", type: "http", url: "https://example.com" }] },
      ]) {
        const response = await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", bot: "ivo", brief: "unsupported", ...extra },
        });
        expect(response.json).toMatchObject({
          accepted: false,
          errorCode: "unsupported-capability",
        });
      }
    } finally {
      await server.close();
    }
  });

  it("terminates a denied provider before admitting another run", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner, dataRoot } = await boot();
    try {
      const old = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "ALLOW" },
      });
      const waiting = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_approval",
      );
      const approval = waiting.pending.find((action) => action.approvalId);
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "resolve_approval", approvalId: approval?.approvalId, decision: "denied" },
      });
      const next = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "smoke" },
      });
      expect(next.json.accepted).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(
        existsSync(
          join(dataRoot, "scratch", "runs", String(old.json.runId), "denied-provider-continued"),
        ),
      ).toBe(false);
      expect(
        existsSync(join(dataRoot, "scratch", "runs", String(old.json.runId), "hello.md")),
      ).toBe(false);
      const state = await statusOf(endpoint, owner.token);
      expect(state.artifacts.every((artifact) => artifact.runId !== old.json.runId)).toBe(true);
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("does not let a second provider request replace the approved action", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "OVERLAP" },
      });
      const waiting = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_approval",
      );
      const approvals = waiting.pending.filter((action) => action.approvalId);
      expect(approvals).toHaveLength(1);
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: approvals[0]?.approvalId,
          decision: "allowed",
        },
      });
      const done = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded",
      );
      expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toContain('"behavior":"allow"');
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
  it("keeps ordinary error text drafts and rejects the observed proxy failure", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "ERROR_DRAFT" },
      });
      const draft = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded" || state.runs[0]?.status === "failed",
      );
      expect(draft.runs[0]?.status).toBe("succeeded");
      expect(readFileSync(draft.artifacts[0]?.path ?? "", "utf8")).toBe("Error: file missing");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", bot: "ivo", brief: "PROXY_ERROR" },
      });
      const failed = await waitFor(
        endpoint,
        owner.token,
        (state) => state.runs[1]?.status === "failed",
      );
      expect(failed.artifacts).toHaveLength(1);
    } finally {
      await server.close();
      delete process.env.AGENTIS_CLAUDE_STUB;
    }
  });
});
