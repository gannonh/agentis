import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Effect, Schema } from "effect";
import { loadOrCreateOwner, parseAuthorization } from "./auth.js";
import { driveAfterCommit, finishAllowedFake, finishInputFake } from "./engine.js";
import { newIdempotencyKey } from "./ids.js";
import {
  CommandRequest,
  CommandReceipt,
  Health,
  type ExecutionBoundary,
  type ProviderKind,
} from "./schema.js";
import { openStore, type Store } from "./store.js";
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
        const cursor = Number(url.searchParams.get("cursor") ?? "0");
        const snapshot = await Effect.runPromise(store.snapshot());
        response.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        for (const event of snapshot.events.filter((item) => item.seq > cursor)) {
          response.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
        }
        response.end();
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
        if (
          receipt.accepted &&
          !receipt.replayed &&
          receipt.effects.includes("launch") &&
          receipt.runId &&
          receipt.taskId
        ) {
          const snapshot = await Effect.runPromise(store.snapshot());
          const run = snapshot.runs.find((item) => item.id === receipt.runId);
          await Effect.runPromise(
            driveAfterCommit({
              store,
              runId: receipt.runId,
              taskId: receipt.taskId,
              fixture: run?.fixture ?? null,
              provider: options.provider,
              workspace: options.workspace,
              nowMs: Date.now(),
              brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
            }),
          );
        }
        if (
          receipt.accepted &&
          receipt.effects.includes("dispatch_tool") &&
          receipt.runId &&
          receipt.taskId
        ) {
          const snapshot = await Effect.runPromise(store.snapshot());
          await Effect.runPromise(
            finishAllowedFake({
              store,
              runId: receipt.runId,
              taskId: receipt.taskId,
              fixture: "allow",
              provider: options.provider,
              workspace: options.workspace,
              nowMs: Date.now(),
              brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
            }),
          );
        }
        if (
          receipt.accepted &&
          receipt.effects.includes("resume_input") &&
          receipt.runId &&
          receipt.taskId
        ) {
          const snapshot = await Effect.runPromise(store.snapshot());
          await Effect.runPromise(
            finishInputFake({
              store,
              runId: receipt.runId,
              taskId: receipt.taskId,
              fixture: "input",
              provider: options.provider,
              workspace: options.workspace,
              nowMs: Date.now(),
              brief: snapshot.tasks.find((item) => item.id === receipt.taskId)?.brief ?? "",
            }),
          );
        }
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
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await Effect.runPromise(store.close());
      },
    };
  });

export const postCommand = async (input: {
  endpoint: URL;
  token: string;
  request: typeof CommandRequest.Type;
  bot?: boolean;
}) => {
  const response = await fetch(new URL("/v1/commands", input.endpoint), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: input.bot ? `Bot ${input.token}` : `Bearer ${input.token}`,
      host: `${input.endpoint.hostname}:${input.endpoint.port}`,
    },
    body: JSON.stringify(input.request),
  });
  return { status: response.status, body: (await response.json()) as unknown };
};

export const freshCommand = (command: (typeof CommandRequest.Type)["command"]) => ({
  idempotencyKey: newIdempotencyKey(),
  command,
});
