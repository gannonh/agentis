import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
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

      const events = await fetch(new URL("/v1/events?cursor=0", endpoint), {
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const text = await events.text();
      expect(text).toMatch(/task_submitted/);
    } finally {
      await server.close();
    }
  });
});
