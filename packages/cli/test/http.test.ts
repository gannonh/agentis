import { Snapshot } from "../src/schema.js";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { describe, expect, it, vi } from "vitest";
import { loadOrCreateOwner } from "../src/auth.js";
import { startServer } from "../src/http.js";
import { newIdempotencyKey } from "../src/ids.js";

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
  const dataRoot = mkdtempSync(join(tmpdir(), "agentis-http-"));
  const endpoint = new URL(`http://127.0.0.1:${await port()}`);
  const server = await Effect.runPromise(
    startServer({
      endpoint,
      dataRoot,
      workspace: join(dataRoot, "scratch"),
      provider: "fake",
      executionBoundary: "unverified-host-scratch",
    }),
  );
  const owner = await Effect.runPromise(loadOrCreateOwner(dataRoot));
  return { endpoint, server, owner, dataRoot };
};

const command = async (endpoint: URL, token: string, body: unknown, header = `Bearer ${token}`) => {
  const response = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: header },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
};

describe("http", () => {
  it("rejects guessed-auth-free commands and bot approvals", async () => {
    const { endpoint, server, owner } = await boot();
    try {
      const anon = await fetch(new URL("/v1/status", endpoint));
      expect(anon.status).toBe(401);
      const botSubmit = await command(
        endpoint,
        owner.token,
        {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", brief: "x", fixture: "smoke" },
        },
        "Bot not-an-owner",
      );
      expect(botSubmit.status).toBe(403);
      expect(String(botSubmit.json.error)).toMatch(/bot cannot/);
      const ownerSubmit = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "allow for bot deny", fixture: "allow" },
      });
      const pending = await fetch(new URL("/v1/status", endpoint), {
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const snap = (await pending.json()) as {
        pending: { approvalId: string | null; state: string }[];
      };
      const approval = snap.pending.find((item) => item.approvalId);
      const botAllow = await command(
        endpoint,
        owner.token,
        {
          idempotencyKey: newIdempotencyKey(),
          command: {
            kind: "resolve_approval",
            approvalId: approval?.approvalId,
            decision: "allowed",
          },
        },
        "Bot not-an-owner",
      );
      expect(botAllow.status).toBe(403);
      expect(ownerSubmit.json.accepted).toBe(true);
      const doctor = await fetch(new URL("/v1/health", endpoint));
      expect(doctor.ok).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("completes smoke, allow, deny, input, and cancel fixtures", async () => {
    const { endpoint, server, owner } = await boot();
    try {
      const smoke = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke brief", fixture: "smoke" },
      });
      expect(smoke.status).toBe(200);
      expect(smoke.json.accepted).toBe(true);
      const afterSmoke = await fetch(new URL("/v1/status", endpoint), {
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const smokeSnap = (await afterSmoke.json()) as {
        artifacts: { source: string; runId: string; taskId: string }[];
      };
      expect(smokeSnap.artifacts[0]?.source).toBe("fake");
      expect(smokeSnap.artifacts[0]?.runId).toBe(smoke.json.runId);

      const _allow = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "allow brief", fixture: "allow" },
      });
      const status1 = await fetch(new URL("/v1/status", endpoint), {
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const snap1 = (await status1.json()) as {
        pending: { approvalId: string | null; state: string }[];
      };
      const approval = snap1.pending.find((item) => item.state === "pending" && item.approvalId);
      expect(approval?.approvalId).toBeTruthy();
      const allowed = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: approval?.approvalId,
          decision: "allowed",
        },
      });
      expect(allowed.json.accepted).toBe(true);

      const deny = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "deny brief", fixture: "deny" },
      });
      void deny;
      const status2 = await fetch(new URL("/v1/status", endpoint), {
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const snap2 = (await status2.json()) as {
        pending: { approvalId: string | null; state: string; runId: string }[];
      };
      const denyApproval = snap2.pending.find(
        (item) => item.state === "pending" && item.approvalId,
      );
      const denied = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: denyApproval?.approvalId,
          decision: "denied",
        },
      });
      expect(denied.json.accepted).toBe(true);

      const input = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "input brief", fixture: "input" },
      });
      const answered = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "answer_input",
          runId: input.json.runId,
          answers: { color: "Blue" },
        },
      });
      expect(answered.json.accepted).toBe(true);

      const cancel = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "cancel brief", fixture: "cancel" },
      });
      const canceled = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: cancel.json.runId },
      });
      expect(canceled.json.accepted).toBe(true);

      const eventsResponse = await fetch(new URL("/v1/events?cursor=0", endpoint), {
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const reader = eventsResponse.body?.getReader();
      if (!reader) {
        throw new Error("missing SSE body");
      }
      const decoder = new TextDecoder();
      let text = "";
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline && !text.includes("task_submitted")) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        text += decoder.decode(value);
      }
      await reader.cancel();
      expect(text).toMatch(/task_submitted/);
    } finally {
      await server.close();
    }
  });
  it.each([
    ["cancel_run", false],
    ["stop_all", false],
    ["cancel_run", true],
    ["stop_all", true],
  ])(
    "rejects late approval after %s with expiry %s without reviving work",
    async (kind, expired) => {
      const { endpoint, server, owner } = await boot();
      const snapshot = async () =>
        Schema.decodeUnknownSync(Snapshot)(
          await (
            await fetch(new URL("/v1/status", endpoint), {
              headers: { authorization: `Bearer ${owner.token}` },
            })
          ).json(),
        );
      try {
        const submitted = await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind: "submit_task", brief: "pending", fixture: "allow" },
        });
        const pending = await snapshot();
        const approval = pending.pending.find((action) => action.approvalId);
        await command(endpoint, owner.token, {
          idempotencyKey: newIdempotencyKey(),
          command: { kind, ...(kind === "cancel_run" ? { runId: submitted.json.runId } : {}) },
        });
        const canceled = await snapshot();
        if (expired) vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);
        for (const decision of ["allowed", "denied"]) {
          const late = await command(endpoint, owner.token, {
            idempotencyKey: newIdempotencyKey(),
            command: { kind: "resolve_approval", approvalId: approval?.approvalId, decision },
          });
          expect(late.json.accepted).toBe(false);
          expect(late.json.effects).toEqual([]);
        }
        const after = await snapshot();
        expect(after.runs).toEqual(canceled.runs);
        expect(after.tasks).toEqual(canceled.tasks);
        expect(after.artifacts).toEqual(canceled.artifacts);
        expect(after.pending).toEqual(canceled.pending);
      } finally {
        vi.restoreAllMocks();
        await server.close();
      }
    },
  );

  it("replays approval receipts without another dispatch effect", async () => {
    const { endpoint, server, owner } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "approve once", fixture: "allow" },
      });
      const snapshot = Schema.decodeUnknownSync(Snapshot)(
        await (
          await fetch(new URL("/v1/status", endpoint), {
            headers: { authorization: `Bearer ${owner.token}` },
          })
        ).json(),
      );
      const body = {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: snapshot.pending.find((action) => action.approvalId)?.approvalId,
          decision: "allowed",
        },
      };
      expect((await command(endpoint, owner.token, body)).json.effects).toContain("dispatch_tool");
      const replay = await command(endpoint, owner.token, body);
      expect(replay.json.replayed).toBe(true);
      expect(replay.json.effects).toEqual([]);
    } finally {
      await server.close();
    }
  });
});
