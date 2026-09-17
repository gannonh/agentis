import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "../src/schema.js";
import type { Snapshot } from "../src/store.js";
import { newIdempotencyKey } from "../src/ids.js";
import { boot, command, publicStatusOf, waitFor, type Daemon } from "./helpers/daemon.js";

afterEach(() => {
  delete process.env.AGENTIS_CLAUDE_STUB;
  delete process.env.AGENTIS_CODEX_STUB;
  delete process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS;
});

type PublicMessage = WorkspaceSnapshot["messages"][number];

const expectKindAuthorPairs = (messages: readonly PublicMessage[], expected: readonly string[]) => {
  expect(
    messages.map((message) => `${message.kind} ${message.authorName}/${message.authorRole}`).sort(),
  ).toEqual([...expected].sort());
};

const driveApproval = async (
  daemon: Daemon,
  input: { brief: string; decision: "allowed" | "denied"; status: "succeeded" | "failed" },
) => {
  const { endpoint, owner, store } = daemon;
  await command(endpoint, owner.token, {
    idempotencyKey: newIdempotencyKey(),
    command: { kind: "submit_task", brief: input.brief },
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
    command: { kind: "resolve_approval", approvalId, decision: input.decision },
  });
  await waitFor(store, endpoint, owner.token, (state) => state.runs[0]?.status === input.status);
};

describe("message author and role pairs", () => {
  it("pairs approval and result messages with their authors through the public status snapshot", async () => {
    const daemon = await boot();
    try {
      await driveApproval(daemon, {
        brief: "ALLOW python once",
        decision: "allowed",
        status: "succeeded",
      });
      const snapshot = await publicStatusOf(daemon.endpoint, daemon.owner.token);
      expectKindAuthorPairs(snapshot.messages, [
        "request owner/operator",
        "approval mara/coordinator",
        "approval owner/operator",
        "result mara/coordinator",
      ]);
    } finally {
      await daemon.server.close();
    }
  });

  it("pairs a denied-approval failure message with its system author through the public status snapshot", async () => {
    const daemon = await boot();
    try {
      await driveApproval(daemon, {
        brief: "DENY python once",
        decision: "denied",
        status: "failed",
      });
      const snapshot = await publicStatusOf(daemon.endpoint, daemon.owner.token);
      expectKindAuthorPairs(snapshot.messages, [
        "request owner/operator",
        "approval mara/coordinator",
        "approval owner/operator",
        "failure agentis/system",
      ]);
    } finally {
      await daemon.server.close();
    }
  });

  it("pairs handoff messages with their authors through the public status snapshot", async () => {
    process.env.AGENTIS_CLAUDE_STUB = fileURLToPath(new URL("./claude-stub.mjs", import.meta.url));
    const daemon = await boot();
    const wait = (match: (state: Snapshot) => boolean) =>
      waitFor(daemon.store, daemon.endpoint, daemon.owner.token, match);
    try {
      const source = await command(daemon.endpoint, daemon.owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await wait((state) => state.runs[0]?.status === "succeeded");
      await command(daemon.endpoint, daemon.owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "propose_handoff",
          sourceRunId: source.json.runId,
          recipient: "ivo",
          context: "Write a concise specialist draft",
        },
      });
      await wait((state) => state.runs[1]?.status === "succeeded");

      const snapshot = await publicStatusOf(daemon.endpoint, daemon.owner.token);
      expectKindAuthorPairs(snapshot.messages, [
        "request owner/operator",
        "result mara/coordinator",
        "handoff mara/coordinator",
        "handoff ivo/specialist",
        "progress ivo/specialist",
        "result ivo/specialist",
      ]);
    } finally {
      await daemon.server.close();
    }
  });
});
