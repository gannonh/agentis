// @vitest-environment jsdom

import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PublicArtifact,
  WorkspaceSnapshot,
  type CommandReceipt,
  type Transition,
} from "../src/schema.js";
import {
  MAX_TEXT_PREVIEW_BYTES,
  WorkspaceStore,
  type BrowserBindings,
  type WorkspaceApi,
} from "../web/src/workspace-store.js";

const snapshot = (cursor: string) =>
  Schema.decodeUnknownSync(WorkspaceSnapshot)({
    schemaId: "agentis.v2.gate1",
    cursor,
    stopAll: false,
    session: {
      expiresAt: 99_999,
      provider: {
        kind: "fake",
        model: "fake",
        authMode: "none",
        executionLocation: "local daemon scratch",
        eligible: true,
        ineligibleReason: null,
        acknowledgedAt: 1,
      },
      sources: [{ source: "pasted", acknowledgedAt: 1 }],
    },
    tasks: [],
    threads: [],
    handoffs: [],
    runs: [],
    botConfigRevisions: [],
    evidence: [],
    pending: [],
    artifacts: [],
    messages: [],
  });

class FakeEventSource extends EventTarget {
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly close = vi.fn();

  transition(value: Transition) {
    this.dispatchEvent(
      new MessageEvent("transition", { data: JSON.stringify(value) }),
    );
  }

  fail() {
    this.onerror?.(new Event("error"));
  }
}

const harness = (status: ReturnType<typeof snapshot>[]) => {
  const streams: Array<{ url: string; source: FakeEventSource }> = [];
  const replaced: string[] = [];
  const order: string[] = [];
  const command = vi.fn<WorkspaceApi["command"]>();
  const api = {
    exchangeBootstrap: vi.fn(async (code: string) => {
      order.push(`exchange:${code}`);
      return { csrfToken: "csrf", expiresAt: 99_999 };
    }),
    session: vi.fn(async () => status[0]!.session),
    acknowledgeSetup: vi.fn(async () => status[0]!.session),
    status: vi.fn(async () => status.shift() ?? snapshot("99")),
    command,
    artifactBytes: vi.fn(async () => new ArrayBuffer(0)),
  } as unknown as WorkspaceApi;
  const browser: BrowserBindings = {
    location: {
      hash: "#bootstrap=one-use-secret&view=room",
      pathname: "/",
      search: "?task=task_one",
      origin: "http://127.0.0.1:4312",
    },
    replaceUrl: (url) => {
      order.push("fragment-removed");
      replaced.push(url);
    },
    cookie: () => "agentis_csrf=csrf",
    createEventSource: (url) => {
      const source = new FakeEventSource();
      streams.push({ url, source });
      return source as unknown as EventSource;
    },
    randomUuid: () => "stable-command-key",
  };
  return { api, browser, command, order, replaced, streams };
};

afterEach(() => {
  vi.useRealTimers();
});

describe("WorkspaceStore", () => {
  it("removes the bootstrap secret before exchange and resnapshots with a fresh cursor after stream failure", async () => {
    vi.useFakeTimers();
    const first = snapshot("1");
    const afterExpiry = snapshot("7");
    const test = harness([first, afterExpiry]);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    expect(test.order).toEqual(["fragment-removed", "exchange:one-use-secret"]);
    expect(test.replaced).toEqual(["/?task=task_one#view=room"]);
    expect(test.streams[0]?.url).toBe("/v1/events?cursor=1");

    test.streams[0]?.source.fail();
    expect(store.getState().stream).toBe("reconnecting");
    await vi.advanceTimersByTimeAsync(500);
    expect(test.api.status).toHaveBeenCalledTimes(2);
    expect(test.streams[1]?.url).toBe("/v1/events?cursor=7");
    store.dispose();
  });

  it("deduplicates transition cursors and retains one command key and body across retry", async () => {
    const initial = snapshot("1");
    const changed = snapshot("2");
    const afterCommand = snapshot("3");
    const test = harness([initial, changed, afterCommand]);
    const accepted = Schema.decodeUnknownSync(
      Schema.Struct({
        commandId: Schema.String,
        replayed: Schema.Boolean,
        accepted: Schema.Boolean,
        taskId: Schema.String,
        effects: Schema.Array(Schema.String),
      }),
    )({
      commandId: "command_one",
      replayed: false,
      accepted: true,
      taskId: "task_one",
      effects: ["launch"],
    }) as unknown as CommandReceipt;
    test.command.mockRejectedValueOnce(new Error("network interrupted")).mockResolvedValueOnce(accepted);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    const event = Schema.decodeUnknownSync(
      (await import("../src/schema.js")).Transition,
    )({
      cursor: "2",
      id: "event_two",
      event: { kind: "workspace_changed", reason: "task_submitted" },
      createdAt: 2,
    });
    test.streams[0]?.source.transition(event);
    test.streams[0]?.source.transition(event);
    await vi.waitFor(() => expect(test.api.status).toHaveBeenCalledTimes(2));

    await store.sendCommand("Submit request", {
      kind: "submit_task",
      brief: "One task",
      source: { kind: "pasted", label: "Notes", text: "Source", citations: [] },
    });
    expect(store.getState().retryLabel).toBe("Submit request");
    await store.retryCommand();
    expect(test.command).toHaveBeenCalledTimes(2);
    expect(test.command.mock.calls[1]?.[1]).toEqual(test.command.mock.calls[0]?.[1]);
    expect(test.command.mock.calls[0]?.[1].idempotencyKey).toBe("web_stable-command-key");

    const callsBeforeRefresh = test.command.mock.calls.length;
    await store.refresh();
    expect(test.command).toHaveBeenCalledTimes(callsBeforeRefresh);
    store.dispose();
  });

  it("keeps oversized text artifacts download-only without fetching their bytes", async () => {
    const test = harness([snapshot("1")]);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    const artifact = Schema.decodeUnknownSync(PublicArtifact)({
      id: "artifact_large",
      taskId: "task_one",
      runId: "run_one",
      author: "mara",
      source: "fake",
      mediaType: "text/markdown",
      sha256: "digest",
      byteSize: MAX_TEXT_PREVIEW_BYTES + 1,
      citations: [],
      createdAt: 1,
      metadataUrl: "/v1/artifacts/artifact_large",
      contentUrl: "/v1/artifacts/artifact_large/content",
    });
    await store.openArtifact(artifact);
    expect(store.getState().artifactPreview?.status).toBe("download_only");
    expect(test.api.artifactBytes).not.toHaveBeenCalled();
    store.dispose();
  });
});
