import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { newIdempotencyKey } from "../src/ids.js";
import { boot, codexStub, command, publicStatusOf, statusOf, waitFor } from "./helpers/daemon.js";

afterEach(() => {
  delete process.env.AGENTIS_CODEX_STUB;
  delete process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS;
});

describe("codex stub protocol", () => {
  it("includes retained constraints in the coordinator prompt", async () => {
    const { endpoint, server, owner, store, dataRoot } = await boot();
    try {
      const retainedConstraint = "COORDINATOR_CONSTRAINT_731: use only supplied evidence";
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "submit_task",
          brief: "Reply exactly PROMPT_ONLY_MARKER.",
          constraints: [retainedConstraint],
        },
      });
      expect(submitted.json.accepted).toBe(true);
      const snap = await waitFor(
        store,
        endpoint,
        owner.token,
        (value) => value.runs[0]?.status === "succeeded" && value.artifacts.length === 1,
      );
      expect(readFileSync(snap.artifacts[0]?.path ?? "", "utf8")).toBe("KAT3242_OK");
      expect(snap.runs[0]?.providerSessionId).toBe("thread-stub");
      expect(snap.artifacts[0]?.source).toBe("codex");
      expect(snap.artifacts[0]?.author).toBe("mara");
      expect(snap.artifacts[0]?.runId).toBe(submitted.json.runId);
      expect(snap.artifacts[0]?.taskId).toBe(submitted.json.taskId);
      expect(snap.artifacts[0]?.path).toBe(
        join(dataRoot, "scratch", "runs", String(submitted.json.runId), "hello.md"),
      );
      expect(snap.runs[0]?.frozen).toMatchObject({
        provider: "codex",
        executionBoundary: "unverified-host-scratch",
      });
      const prompt = Schema.decodeUnknownSync(Schema.Struct({ text: Schema.String }))(
        JSON.parse(
          readFileSync(
            join(dataRoot, "scratch", "runs", String(submitted.json.runId), "prompts.jsonl"),
            "utf8",
          ).trim(),
        ),
      );
      expect(prompt.text).toBe(
        `Reply exactly PROMPT_ONLY_MARKER.\n\nOperator constraints:\n- ${retainedConstraint}`,
      );
    } finally {
      await server.close();
    }
  });

  it("allows, denies, answers input, and cancels", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      const allow = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "ALLOW python once" },
      });
      const waitingAllow = await waitFor(store, endpoint, owner.token, (value) =>
        value.pending.some((item) => item.state === "pending" && item.approvalId),
      );
      const approval = waitingAllow.pending.find((item) => item.approvalId);
      const allowed = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: approval?.approvalId,
          decision: "allowed",
        },
      });
      expect(allowed.json.accepted).toBe(true);
      const allowDone = await waitFor(store, endpoint, owner.token, (value) =>
        value.runs.some((item) => item.id === allow.json.runId && item.status === "succeeded"),
      );
      expect(
        allowDone.runs.find((item) => item.id === allow.json.runId)?.providerState.pendingPrompt,
      ).toBeNull();

      const deny = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "DENY python once" },
      });
      const waitingDeny = await waitFor(store, endpoint, owner.token, (value) =>
        value.pending.some(
          (item) => item.runId === deny.json.runId && item.state === "pending" && item.approvalId,
        ),
      );
      const denyApproval = waitingDeny.pending.find(
        (item) => item.runId === deny.json.runId && item.approvalId,
      );
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "resolve_approval",
          approvalId: denyApproval?.approvalId,
          decision: "denied",
        },
      });
      const denyDone = await waitFor(store, endpoint, owner.token, (value) =>
        value.runs.some((item) => item.id === deny.json.runId && item.status === "failed"),
      );
      expect(
        denyDone.runs.find((item) => item.id === deny.json.runId)?.providerState.pendingPrompt,
      ).toBeNull();

      const input = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "INPUT choose color" },
      });
      await waitFor(store, endpoint, owner.token, (value) =>
        value.runs.some((item) => item.id === input.json.runId && item.status === "waiting_input"),
      );
      const publicInput = await publicStatusOf(endpoint, owner.token);
      expect(publicInput.runs.find((run) => run.id === input.json.runId)?.pendingPrompt).toEqual({
        kind: "questions",
        questions: [{ key: "color", prompt: "color", options: [] }],
      });
      expect(
        publicInput.messages.find(
          (message) => message.runId === input.json.runId && message.kind === "question",
        )?.body,
      ).toBe("color");
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "answer_input", runId: input.json.runId, answers: { color: "Blue" } },
      });
      const inputDone = await waitFor(store, endpoint, owner.token, (value) =>
        value.runs.some((item) => item.id === input.json.runId && item.status === "succeeded"),
      );
      expect(
        inputDone.runs.find((item) => item.id === input.json.runId)?.providerState.pendingPrompt,
      ).toBeNull();

      const cancel = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "CANCEL wait" },
      });
      await waitFor(store, endpoint, owner.token, (value) =>
        value.runs.some((item) => item.id === cancel.json.runId && item.status === "waiting_input"),
      );
      const canceled = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "cancel_run", runId: cancel.json.runId },
      });
      expect(canceled.json.accepted).toBe(true);
      await waitFor(store, endpoint, owner.token, (value) =>
        value.runs.some((item) => item.id === cancel.json.runId && item.status === "canceled"),
      );
    } finally {
      await server.close();
    }
  });
  it("loads paginated native history without starting another turn", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(store, endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const loaded = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: submitted.json.runId },
      });
      expect(loaded.json.accepted).toBe(true);
      const state = await statusOf(store, endpoint, owner.token);
      expect(state.artifacts).toHaveLength(1);
      expect(state.runs[0]?.providerSessionId).toBe("thread-stub");
    } finally {
      await server.close();
    }
  });
  it("keeps a successful load retry intact after the crashed attempt timeout", async () => {
    const { endpoint, server, owner, store, dataRoot } = await boot();
    process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS = "700";
    try {
      const submitted = await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      await waitFor(store, endpoint, owner.token, (state) => state.runs[0]?.status === "succeeded");
      const crashing = join(dataRoot, "crashing.mjs");
      writeFileSync(
        crashing,
        readFileSync(codexStub, "utf8").replace(
          'if (message.method === "thread/resume") {',
          'if (message.method === "thread/resume") { process.exit(17);',
        ),
      );
      process.env.AGENTIS_CODEX_STUB = crashing;
      const first = command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: submitted.json.runId },
      });
      await waitFor(
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.providerState.loadStatus === "failed",
      );
      process.env.AGENTIS_CODEX_STUB = codexStub;
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "load_session", runId: submitted.json.runId },
      });
      const crashed = await first;
      expect(crashed.status).toBe(200);
      expect(crashed.json).toMatchObject({ accepted: true, effects: ["load_session"] });
      await new Promise((resolve) => setTimeout(resolve, 750));
      const state = await statusOf(store, endpoint, owner.token);
      expect(state.runs[0]?.providerState).toMatchObject({
        loadStatus: "succeeded",
        failure: null,
      });
      expect(state.artifacts).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it("does not let an overlapping input replace a pending permission", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "OVERLAP" },
      });
      const waiting = await waitFor(
        store,
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
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded",
      );
      expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toBe("FIRST_APPROVED");
    } finally {
      await server.close();
    }
  });
  it("classifies the native missing-credential exit as auth-unavailable", async () => {
    const { endpoint, server, owner, store, dataRoot } = await boot();
    const missingAuth = join(dataRoot, "missing-auth.mjs");
    writeFileSync(missingAuth, "process.exit(77);\n");
    process.env.AGENTIS_CODEX_STUB = missingAuth;
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "smoke" },
      });
      const done = await waitFor(
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "failed",
      );
      expect(done.runs[0]?.providerState.failure).toBe("auth-unavailable");
      expect(done.artifacts).toHaveLength(0);
    } finally {
      await server.close();
    }
  });
  it("classifies a protocol quota failure without a successful artifact", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "QUOTA" },
      });
      const done = await waitFor(
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "failed",
      );
      expect(done.runs[0]?.providerState.failure).toBe("quota");
      expect(done.artifacts).toHaveLength(0);
    } finally {
      await server.close();
    }
  });
  it("retains native plan-only output without inventing a blocking approval", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "PLAN_ONLY", mode: "plan" },
      });
      const done = await waitFor(store, endpoint, owner.token, (state) =>
        ["succeeded", "failed"].includes(state.runs[0]?.status ?? ""),
      );
      expect(done.runs[0]?.status).toBe("succeeded");
      expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toBe(
        "# Greeting plan\n1. Draft hello.",
      );
      expect(done.runs[0]?.providerState.history.map((entry) => JSON.parse(entry))).toContainEqual({
        type: "plan",
        id: "plan-stub",
        text: "# Greeting plan\n1. Draft hello.",
      });
      expect(done.pending.filter((action) => action.approvalId)).toHaveLength(0);
      expect(
        done.runs[0]?.providerState.capabilities.find((capability) => capability.name === "plans"),
      ).toMatchObject({
        operation: "unavailable",
        reason: "native-plan-output-without-blocking-approval",
      });
    } finally {
      await server.close();
    }
  });
  it("keeps the first completed plan when the same item is delivered again", async () => {
    const { endpoint, server, owner, store } = await boot();
    try {
      await command(endpoint, owner.token, {
        idempotencyKey: newIdempotencyKey(),
        command: { kind: "submit_task", brief: "PLAN_DUPLICATE", mode: "plan" },
      });
      const done = await waitFor(
        store,
        endpoint,
        owner.token,
        (state) => state.runs[0]?.status === "succeeded",
      );
      expect(done.runs[0]?.providerState.history.map((entry) => JSON.parse(entry))).toEqual([
        { type: "plan", id: "plan-stub", text: "# Greeting plan\n1. Draft hello." },
      ]);
      expect(readFileSync(done.artifacts[0]?.path ?? "", "utf8")).toBe(
        "# Greeting plan\n1. Draft hello.",
      );
    } finally {
      await server.close();
    }
  });
});
