import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";
import { Effect, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Cursor, Transition } from "../src/schema.js";
import { TransitionHub } from "../src/sse.js";
import type { Store } from "../src/store.js";
import { EVENT_SUBSCRIBER_QUEUE_LIMIT } from "../src/versions.js";

class TestResponse extends EventEmitter {
  readonly frames: string[] = [];
  writableEnded = false;

  constructor(readonly slow: boolean) {
    super();
  }

  writeHead() {
    return this;
  }

  flushHeaders() {}

  write(value: string) {
    this.frames.push(String(value));
    return !this.slow || String(value).startsWith(": connected");
  }

  end() {
    this.writableEnded = true;
    this.emit("close");
    return this;
  }
}

afterEach(() => vi.useRealTimers());

describe("TransitionHub", () => {
  it("resyncs one bounded slow subscriber without blocking a fast peer and closes promptly", async () => {
    vi.useFakeTimers();
    let live = false;
    const events = Array.from({ length: EVENT_SUBSCRIBER_QUEUE_LIMIT + 2 }, (_, index) =>
      Schema.decodeUnknownSync(Transition)({
        cursor: String(index + 1),
        id: `event_${index + 1}`,
        event: { kind: "workspace_changed", reason: "peer_progress" },
        createdAt: index,
      }),
    );
    const store = {
      transitionsAfter: () =>
        Effect.succeed({
          events: live ? events : [],
        }),
    } as unknown as Store;
    const hub = new TransitionHub(store);
    const slow = new TestResponse(true);
    const fast = new TestResponse(false);
    const cursor = Schema.decodeUnknownSync(Cursor)("0");
    expect(await hub.subscribe(slow as unknown as ServerResponse, cursor)).toMatchObject({
      ok: true,
    });
    expect(await hub.subscribe(fast as unknown as ServerResponse, cursor)).toMatchObject({
      ok: true,
    });

    live = true;
    await vi.advanceTimersByTimeAsync(100);
    expect(slow.frames.join("")).toContain("event: resync_required");
    expect(slow.writableEnded).toBe(true);
    expect(fast.frames.filter((frame) => frame.startsWith("id: "))).toHaveLength(events.length);
    expect(fast.writableEnded).toBe(false);

    hub.close();
    expect(fast.writableEnded).toBe(true);
  });
});
