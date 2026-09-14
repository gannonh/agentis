import type { ServerResponse } from "node:http";
import { Effect, Either, Schema } from "effect";
import { Cursor, type Transition } from "./schema.js";
import { ReplayCursorError, type Store } from "./store.js";
import { EVENT_SUBSCRIBER_LIMIT } from "./versions.js";

type Subscriber = {
  readonly response: ServerResponse;
  readonly queue: Transition[];
  acceptedCursor: number;
  active: boolean;
  draining: boolean;
  closed: boolean;
};

export type SubscriptionResult =
  | { readonly ok: true; readonly close: () => void }
  | {
      readonly ok: false;
      readonly code: "cursor_expired" | "resync_required";
      readonly message: string;
    };

const frame = (transition: Transition) =>
  `id: ${transition.cursor}\nevent: transition\ndata: ${JSON.stringify(transition)}\n\n`;

export class TransitionHub {
  readonly #subscribers = new Set<Subscriber>();
  readonly #timer: NodeJS.Timeout;
  #pumping = false;
  #closed = false;

  constructor(readonly store: Store) {
    this.#timer = setInterval(() => void this.#pump(), 100);
    this.#timer.unref();
  }

  async subscribe(response: ServerResponse, cursor: Cursor): Promise<SubscriptionResult> {
    if (this.#closed) {
      return { ok: false, code: "resync_required", message: "event stream is shutting down" };
    }
    const subscriber: Subscriber = {
      response,
      queue: [],
      acceptedCursor: Number(cursor),
      active: false,
      draining: false,
      closed: false,
    };
    this.#subscribers.add(subscriber);
    const replay = await Effect.runPromise(Effect.either(this.store.transitionsAfter(cursor)));
    if (Either.isLeft(replay)) {
      this.#subscribers.delete(subscriber);
      const error = replay.left;
      return {
        ok: false,
        code: error instanceof ReplayCursorError ? error.code : "resync_required",
        message: error.message,
      };
    }
    if (subscriber.closed || this.#closed) {
      this.#subscribers.delete(subscriber);
      return { ok: false, code: "resync_required", message: "event stream closed" };
    }
    response.writeHead(200, {
      "cache-control": "no-cache, no-store",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    });
    response.flushHeaders();
    response.write(": connected\n\n");
    subscriber.active = true;
    for (const transition of replay.right.events) this.#enqueue(subscriber, transition);
    void this.#pump();
    return { ok: true, close: () => this.#closeSubscriber(subscriber) };
  }

  async #pump() {
    if (this.#pumping || this.#closed) return;
    const subscribers = [...this.#subscribers].filter(
      (subscriber) => subscriber.active && !subscriber.closed,
    );
    if (subscribers.length === 0) return;
    this.#pumping = true;
    try {
      const minimum = Math.min(...subscribers.map((subscriber) => subscriber.acceptedCursor));
      const replay = await Effect.runPromise(
        Effect.either(
          this.store.transitionsAfter(Schema.decodeUnknownSync(Cursor)(String(minimum))),
        ),
      );
      if (Either.isLeft(replay)) {
        for (const subscriber of subscribers) this.#overflow(subscriber, replay.left.message);
        return;
      }
      for (const transition of replay.right.events) {
        const sequence = Number(transition.cursor);
        for (const subscriber of subscribers) {
          if (sequence > subscriber.acceptedCursor) this.#enqueue(subscriber, transition);
        }
      }
    } finally {
      this.#pumping = false;
    }
  }

  #enqueue(subscriber: Subscriber, transition: Transition) {
    if (subscriber.closed || Number(transition.cursor) <= subscriber.acceptedCursor) return;
    subscriber.acceptedCursor = Number(transition.cursor);
    if (subscriber.queue.length >= EVENT_SUBSCRIBER_LIMIT) {
      this.#overflow(subscriber, "subscriber could not keep up with retained transitions");
      return;
    }
    subscriber.queue.push(transition);
    this.#flush(subscriber);
  }

  #flush(subscriber: Subscriber) {
    if (subscriber.closed || subscriber.draining) return;
    while (subscriber.queue.length > 0) {
      const transition = subscriber.queue.shift();
      if (!transition) return;
      if (!subscriber.response.write(frame(transition))) {
        subscriber.draining = true;
        subscriber.response.once("drain", () => {
          subscriber.draining = false;
          this.#flush(subscriber);
        });
        return;
      }
    }
  }

  #overflow(subscriber: Subscriber, message: string) {
    if (subscriber.closed) return;
    subscriber.closed = true;
    this.#subscribers.delete(subscriber);
    subscriber.queue.length = 0;
    subscriber.response.write(
      `event: resync_required\ndata: ${JSON.stringify({
        code: "resync_required",
        message,
      })}\n\n`,
    );
    subscriber.response.end();
  }

  #closeSubscriber(subscriber: Subscriber) {
    if (subscriber.closed) return;
    subscriber.closed = true;
    this.#subscribers.delete(subscriber);
    subscriber.queue.length = 0;
    if (!subscriber.response.writableEnded) subscriber.response.end();
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    clearInterval(this.#timer);
    for (const subscriber of this.#subscribers) this.#closeSubscriber(subscriber);
  }
}
