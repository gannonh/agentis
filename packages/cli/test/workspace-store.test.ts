// @vitest-environment jsdom

import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CommandReceipt,
  PublicArtifact,
  WorkspaceSnapshot,
  type Transition,
} from "../src/schema.js";
import {
  MAX_TEXT_PREVIEW_BYTES,
  WorkspaceStore,
  type BrowserBindings,
  type WorkspaceApi,
} from "../web/src/workspace-store.js";

const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

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
    this.dispatchEvent(new MessageEvent("transition", { data: JSON.stringify(value) }));
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

const artifact = (id: string, byteSize = 1) =>
  Schema.decodeUnknownSync(PublicArtifact)({
    id,
    taskId: "task_one",
    runId: "run_one",
    author: "mara",
    source: "fake",
    mediaType: "text/markdown",
    sha256: `digest-${id}`,
    byteSize,
    citations: [],
    createdAt: 1,
    metadataUrl: `/v1/artifacts/${id}`,
    contentUrl: `/v1/artifacts/${id}/content`,
  });

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

  it("deduplicates transition cursors", async () => {
    const initial = snapshot("1");
    const changed = snapshot("2");
    const test = harness([initial, changed]);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    const event = Schema.decodeUnknownSync((await import("../src/schema.js")).Transition)({
      cursor: "2",
      id: "event_two",
      event: { kind: "workspace_changed", reason: "task_submitted" },
      createdAt: 2,
    });
    test.streams[0]?.source.transition(event);
    test.streams[0]?.source.transition(event);
    await vi.waitFor(() => expect(test.api.status).toHaveBeenCalledTimes(2));

    store.dispose();
  });

  it("accepts a lower snapshot cursor after bounded regressions", async () => {
    const test = harness([snapshot("5"), snapshot("3"), snapshot("4"), snapshot("2")]);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    expect(store.getState().snapshot?.cursor).toBe("5");
    await store.refresh();
    expect(test.api.status).toHaveBeenCalledTimes(4);
    expect(store.getState().snapshot?.cursor).toBe("2");
    store.dispose();
  });

  it("returns an accepted receipt and completes the form when its refresh fails", async () => {
    const test = harness([snapshot("1")]);
    const accepted = Schema.decodeUnknownSync(CommandReceipt)({
      commandId: "command_one",
      replayed: false,
      accepted: true,
      taskId: "task_one",
      effects: ["launch"],
    });
    test.command.mockResolvedValueOnce(accepted);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    vi.mocked(test.api.status).mockRejectedValueOnce(new Error("snapshot temporarily unavailable"));
    const completed = vi.fn();

    const receipt = await store.sendCommand(
      "Submit request",
      {
        kind: "submit_task",
        brief: "One task",
        source: { kind: "pasted", label: "Notes", text: "Source", citations: [] },
      },
      completed,
    );

    expect(receipt).toEqual(accepted);
    expect(completed).toHaveBeenCalledWith(accepted);
    expect(store.getState()).toMatchObject({
      error: "snapshot temporarily unavailable",
      retryLabel: null,
    });
    store.dispose();
  });

  it("records a failed connection check without rejecting the click action", async () => {
    const test = harness([snapshot("1")]);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    vi.mocked(test.api.status).mockRejectedValueOnce(new Error("connection probe failed"));

    await expect(store.checkConnection()).resolves.toBeUndefined();
    expect(store.getState().error).toBe("connection probe failed");
    store.dispose();
  });

  it("does not retain a command retry when the CSRF cookie is unavailable", async () => {
    const test = harness([snapshot("1")]);
    const store = new WorkspaceStore(test.api, {
      ...test.browser,
      location: { ...test.browser.location, hash: "" },
      cookie: () => "",
    });
    await store.start();

    await store.sendCommand("Submit request", { kind: "stop_all" });
    expect(test.command).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      error: "This owner session is missing its CSRF token. Open a new agentis web URL.",
      retryLabel: null,
    });
    store.dispose();
  });

  it("retains one command key, body, and completion across a transient retry", async () => {
    const test = harness([snapshot("1"), snapshot("2")]);
    const accepted = Schema.decodeUnknownSync(CommandReceipt)({
      commandId: "command_one",
      replayed: false,
      accepted: true,
      taskId: "task_one",
      effects: ["launch"],
    });
    test.command
      .mockRejectedValueOnce(new Error("network interrupted"))
      .mockResolvedValueOnce(accepted);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    const completed = vi.fn();

    await store.sendCommand(
      "Submit request",
      {
        kind: "submit_task",
        brief: "One task",
        source: { kind: "pasted", label: "Notes", text: "Source", citations: [] },
      },
      completed,
    );
    expect(store.getState().retryLabel).toBe("Submit request");
    await store.sendCommand("Different command", { kind: "stop_all" });
    expect(test.command).toHaveBeenCalledTimes(1);
    const retried = await store.retryCommand();
    expect(retried).toEqual(accepted);
    expect(test.command).toHaveBeenCalledTimes(2);
    expect(test.command.mock.calls[1]?.[1]).toEqual(test.command.mock.calls[0]?.[1]);
    expect(test.command.mock.calls[0]?.[1].idempotencyKey).toBe("web_stable-command-key");
    expect(completed).toHaveBeenCalledOnce();
    expect(completed).toHaveBeenCalledWith(accepted);

    const callsBeforeRefresh = test.command.mock.calls.length;
    await store.refresh();
    expect(test.command).toHaveBeenCalledTimes(callsBeforeRefresh);
    store.dispose();
  });

  it("keeps oversized text artifacts download-only without fetching their bytes", async () => {
    const test = harness([snapshot("1")]);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();
    await store.openArtifact(artifact("artifact_large", MAX_TEXT_PREVIEW_BYTES + 1));
    expect(store.getState().artifactPreview?.status).toBe("download_only");
    expect(test.api.artifactBytes).not.toHaveBeenCalled();
    store.dispose();
  });

  it("does not reopen an artifact closed while its bytes are loading", async () => {
    const test = harness([snapshot("1")]);
    const loading = deferred<ArrayBuffer>();
    vi.mocked(test.api.artifactBytes).mockReturnValueOnce(loading.promise);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();

    const opened = store.openArtifact(artifact("artifact_a"));
    store.closeArtifact();
    loading.resolve(new TextEncoder().encode("A").buffer);
    await opened;

    expect(store.getState().artifactPreview).toBeNull();
    store.dispose();
  });

  it("ignores an older artifact response after a newer artifact opens", async () => {
    const test = harness([snapshot("1")]);
    const first = deferred<ArrayBuffer>();
    const second = deferred<ArrayBuffer>();
    vi.mocked(test.api.artifactBytes)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const store = new WorkspaceStore(test.api, test.browser);
    await store.start();

    const openingFirst = store.openArtifact(artifact("artifact_a"));
    const openingSecond = store.openArtifact(artifact("artifact_b"));
    second.resolve(new TextEncoder().encode("B").buffer);
    await openingSecond;
    first.reject(new Error("older preview failed"));
    await openingFirst;

    expect(store.getState().artifactPreview).toMatchObject({
      artifact: { id: "artifact_b" },
      status: "ready",
      text: "B",
    });
    store.dispose();
  });
});
