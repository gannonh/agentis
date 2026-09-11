import { interruptClaude } from "./claude.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Effect, Schema } from "effect";
import { loadOrCreateOwner, parseAuthorization } from "./auth.js";
import { applyReceiptEffects } from "./engine.js";
import { interruptCodex } from "./codex.js";
import {
  CommandRequest,
  CommandReceipt,
  Health,
  type EventRow,
  type ExecutionBoundary,
  type ProviderKind,
} from "./schema.js";
import { openStore, sweepRunTimeouts, type Snapshot, type Store } from "./store.js";
import { API_FAMILY, PACKAGE_VERSION, SCHEMA_ID } from "./versions.js";

export type ServeOptions = {
  readonly endpoint: URL;
  readonly dataRoot: string;
  readonly workspace: string;
  readonly provider: typeof ProviderKind.Type;
  readonly executionBoundary: typeof ExecutionBoundary.Type;
};

export type RunningServer = {
  readonly close: () => Promise<void>;
  readonly store: Store;
};

const readBody = (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });

const json = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(`${JSON.stringify(body)}\n`);
};

const loopback = (hostname: string) => hostname === "127.0.0.1" || hostname === "localhost";

const applySweepEffects = (store: Store, executionBoundary: typeof ExecutionBoundary.Type) => {
  const swept = sweepRunTimeouts(store.path, Date.now());
  for (const item of swept) {
    if (item.effects.includes("interrupt_provider")) {
      interruptClaude(item.runId);
      interruptCodex(item.runId, executionBoundary);
    }
  }
};

const cleanupPersistedRunContainers = (runs: Snapshot["runs"]) => {
  for (const run of runs) {
    interruptClaude(run.id);
    interruptCodex(run.id, run.frozen.executionBoundary);
  }
};

export const startServer = (options: ServeOptions): Effect.Effect<RunningServer, Error> =>
  Effect.gen(function* () {
    if (!loopback(options.endpoint.hostname)) {
      return yield* Effect.fail(new Error("endpoint must be loopback"));
    }
    if (!options.endpoint.port) {
      return yield* Effect.fail(new Error("endpoint must include an explicit port"));
    }
    const owner = yield* loadOrCreateOwner(options.dataRoot);
    const store = yield* openStore(options.dataRoot);
    yield* store.interruptActiveRuns(Date.now());
    const recovered = yield* store.snapshot();
    cleanupPersistedRunContainers(recovered.runs);
    const sweepTimer = setInterval(() => {
      applySweepEffects(store, options.executionBoundary);
    }, 1000);
    const server = createServer((request, response) => {
      void handle(request, response).catch((error: unknown) => {
        json(response, 500, { error: String(error) });
      });
    });
    const handle = async (request: IncomingMessage, response: ServerResponse) => {
      const host = request.headers.host ?? "";
      const expectedHost = `${options.endpoint.hostname}:${options.endpoint.port}`;
      if (host !== expectedHost && host !== `localhost:${options.endpoint.port}`) {
        json(response, 400, { error: "invalid Host" });
        return;
      }
      const origin = request.headers.origin;
      if (
        origin &&
        origin !== options.endpoint.origin &&
        origin !== `http://localhost:${options.endpoint.port}`
      ) {
        json(response, 403, { error: "invalid Origin" });
        return;
      }
      const url = new URL(request.url ?? "/", options.endpoint);
      if (url.pathname === "/v1/health" && request.method === "GET") {
        json(
          response,
          200,
          Schema.encodeSync(Health)({
            ok: true,
            schemaId: SCHEMA_ID,
            apiFamily: API_FAMILY,
            node: process.version,
            packageVersion: PACKAGE_VERSION,
          }),
        );
        return;
      }
      const principal = parseAuthorization(request.headers.authorization, owner);
      if (!principal) {
        json(response, 401, { error: "authentication required" });
        return;
      }
      if (url.pathname === "/v1/status" && request.method === "GET") {
        if (principal.kind !== "owner") {
          json(response, 403, { error: "owner session required" });
          return;
        }
        const snapshot = await Effect.runPromise(store.snapshot());
        json(response, 200, snapshot);
        return;
      }
      if (url.pathname === "/v1/events" && request.method === "GET") {
        if (principal.kind !== "owner") {
          json(response, 403, { error: "owner session required" });
          return;
        }
        let cursor = Number(url.searchParams.get("cursor") ?? "0");
        response.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        const writeEvents = (events: readonly EventRow[]) => {
          for (const event of events.filter((item) => item.seq > cursor)) {
            response.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
            cursor = event.seq;
          }
        };
        const snapshot = await Effect.runPromise(store.snapshot());
        writeEvents(snapshot.events);
        const poll = setInterval(async () => {
          if (response.writableEnded) {
            clearInterval(poll);
            return;
          }
          applySweepEffects(store, options.executionBoundary);
          const live = await Effect.runPromise(store.snapshot());
          writeEvents(live.events);
        }, 250);
        request.on("close", () => {
          clearInterval(poll);
          if (!response.writableEnded) {
            response.end();
          }
        });
        return;
      }
      if (url.pathname === "/v1/commands" && request.method === "POST") {
        const raw = JSON.parse(await readBody(request)) as unknown;
        const parsed = Schema.decodeUnknownSync(CommandRequest)(raw);
        let receipt: typeof CommandReceipt.Type;
        try {
          receipt = await Effect.runPromise(
            store.applyCommand({
              principal,
              idempotencyKey: parsed.idempotencyKey,
              command: parsed.command,
              nowMs: Date.now(),
              provider: options.provider,
              executionBoundary: options.executionBoundary,
              workspaceId: options.workspace,
            }),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          json(response, message.includes("bot cannot") ? 403 : 409, { error: message });
          return;
        }
        await applyReceiptEffects({
          store,
          receipt,
          command: parsed.command,
          provider: options.provider,
          executionBoundary: options.executionBoundary,
          nowMs: Date.now(),
        });
        json(response, receipt.accepted ? 200 : 409, Schema.encodeSync(CommandReceipt)(receipt));
        return;
      }
      json(response, 404, { error: "not found" });
    };
    yield* Effect.tryPromise({
      try: () =>
        new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          server.listen(Number(options.endpoint.port), options.endpoint.hostname, () => resolve());
        }),
      catch: (error) => (error instanceof Error ? error : new Error(String(error))),
    });
    return {
      store,
      close: async () => {
        clearInterval(sweepTimer);
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await Effect.runPromise(store.interruptActiveRuns(Date.now()));
        const snapshot = await Effect.runPromise(store.snapshot());
        cleanupPersistedRunContainers(snapshot.runs);
        await Effect.runPromise(store.close());
      },
    };
  });
