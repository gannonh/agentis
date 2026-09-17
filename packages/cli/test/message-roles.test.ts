import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "../src/schema.js";
import { newIdempotencyKey } from "../src/ids.js";
import { boot, command, publicStatusOf, waitFor } from "./helpers/daemon.js";

afterEach(() => {
  delete process.env.AGENTIS_CLAUDE_STUB;
  delete process.env.AGENTIS_CODEX_STUB;
  delete process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS;
});

const AUTHOR_ROLES = {
  owner: "operator",
  mara: "coordinator",
  ivo: "specialist",
  agentis: "system",
} as const;

type PublicMessage = WorkspaceSnapshot["messages"][number];

const authorRoles = (messages: readonly PublicMessage[]) =>
  messages.map((message) => `${message.authorName}/${message.authorRole}`);

const kindAuthorPairs = (messages: readonly PublicMessage[]) =>
  messages.map((message) => `${message.kind} ${message.authorName}/${message.authorRole}`);

const expectAuthorRoleInvariant = (messages: readonly PublicMessage[]) => {
  expect(authorRoles(messages)).toEqual(
    messages.map((message) => `${message.authorName}/${AUTHOR_ROLES[message.authorName]}`),
  );
};

const expectKindAuthorPairs = (messages: readonly PublicMessage[], expected: readonly string[]) => {
  expect(kindAuthorPairs(messages).sort()).toEqual([...expected].sort());
};

describe("message author and role pairs", () => {
  it("pairs approval and result messages with their authors through the public status snapshot", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "ALLOW python once" },
      });
      const waiting = await waitFor(
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_approval",
      );
      const approvalId = waiting.pending.find((action) => action.approvalId)?.approvalId;
      if (!approvalId) throw new Error("missing pending approval");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "resolve_approval", approvalId, decision: "allowed" },
      });
      await waitFor(store, endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");

      const snapshot = await publicStatusOf(endpoint, owner.token);
      expectAuthorRoleInvariant(snapshot.messages);
      expectKindAuthorPairs(snapshot.messages, [
        "request owner/operator",
        "approval mara/coordinator",
        "approval owner/operator",
        "result mara/coordinator",
      ]);
    } finally {
      await server.close();
    }
  });

  it("pairs a denied-approval failure message with its system author through the public status snapshot", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "DENY python once" },
      });
      const waiting = await waitFor(
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "waiting_approval",
      );
      const approvalId = waiting.pending.find((action) => action.approvalId)?.approvalId;
      if (!approvalId) throw new Error("missing pending approval");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "resolve_approval", approvalId, decision: "denied" },
      });
      await waitFor(store, endpoint, owner.token, (state) => state.runs[0]?.status === "failed");

      const snapshot = await publicStatusOf(endpoint, owner.token);
      expectAuthorRoleInvariant(snapshot.messages);
      expectKindAuthorPairs(snapshot.messages, [
        "request owner/operator",
        "approval mara/coordinator",
        "approval owner/operator",
        "failure agentis/system",
      ]);
    } finally {
      await server.close();
    }
  });

  it("pairs handoff messages with their authors through the public status snapshot", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const { endpoint, server, owner, store } = await boot();
    try {
      const source = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(store, endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "Write a concise specialist draft",
        },
      });
      await waitFor(store, endpoint, owner.token, (state) => state.runs[1]?.status === "succeeded");

      const snapshot = await publicStatusOf(endpoint, owner.token);
      expectAuthorRoleInvariant(snapshot.messages);
      expectKindAuthorPairs(snapshot.messages, [
        "request owner/operator",
        "result mara/coordinator",
        "handoff mara/coordinator",
        "handoff ivo/specialist",
        "progress ivo/specialist",
        "result ivo/specialist",
      ]);
    } finally {
      await server.close();
    }
  });
});
