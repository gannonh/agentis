import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Either, Schema } from "effect";
import { RequestHeaders } from "./api.js";
import { loadOrCreateOwner } from "./auth.js";
import {
  authorizeRead,
  browserRuntime,
  makeHttpApiHandler,
  type HttpApiDependencies,
} from "./http-api.js";
import { interruptClaude } from "./claude.js";
import { interruptCodex } from "./codex.js";
import { ArtifactId, Cursor, type ExecutionBoundary, type ProviderKind } from "./schema.js";
import { TransitionHub } from "./sse.js";
import { openStore, sweepRunTimeouts, type Snapshot, type Store } from "./store.js";
import { openVerifiedFile } from "./verified-file.js";

export type ServeOptions = {
  readonly endpoint: URL;
  readonly dataRoot: string;
  readonly workspace: string;
  readonly provider: ProviderKind;
  readonly executionBoundary: ExecutionBoundary;
};

export type RunningServer = {
  readonly close: () => Promise<void>;
  readonly store: Store;
};

export const RAW_HANDLER_ROUTE_KEYS = [
  "GET /v1/events",
  "GET /v1/artifacts/:id/content",
] as const;

const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

class RequestBodyTooLargeError extends Error {}

const apiErrorStatus = (code: string) => {
  switch (code) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "cursor_expired":
      return 410;
    case "conflict":
    case "resync_required":
      return 409;
    default:
      return 400;
  }
};

const json = (response: ServerResponse, status: number, value: unknown) => {
  if (response.headersSent || response.writableEnded) return;
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(`${JSON.stringify(value)}\n`);
};

const body = (request: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    request.on("data", (chunk: Buffer | string) => {
      const bytes = Buffer.from(chunk);
      size += bytes.byteLength;
      if (size > MAX_JSON_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(bytes);
    });
    request.on("end", () => {
      if (tooLarge) reject(new RequestBodyTooLargeError("request body exceeds 2 MiB"));
      else resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });

const nodeHeaders = (request: IncomingMessage) => {
  const headers = new Headers();
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const name = request.rawHeaders[index];
    const value = request.rawHeaders[index + 1];
    if (name !== undefined && value !== undefined) headers.append(name, value);
  }
  return headers;
};

const webRequest = async (request: IncomingMessage, endpoint: URL) => {
  const method = request.method ?? "GET";
  const payload = method === "GET" || method === "HEAD" ? undefined : await body(request);
  return new Request(new URL(request.url ?? "/", endpoint), {
    method,
    headers: nodeHeaders(request),
    ...(payload === undefined || payload.byteLength === 0
      ? {}
      : { body: payload.toString("utf8") }),
  });
};

const writeWebResponse = async (source: Response, target: ServerResponse) => {
  for (const [name, value] of source.headers) {
    if (name !== "set-cookie") target.setHeader(name, value);
  }
  const setCookies = source.headers.getSetCookie();
  if (setCookies.length > 0) target.setHeader("set-cookie", setCookies);
  target.writeHead(source.status);
  if (!source.body) {
    target.end();
    return;
  }
  target.end(Buffer.from(await source.arrayBuffer()));
};

const requestHeaders = (request: IncomingMessage) =>
  Schema.decodeUnknownSync(RequestHeaders)({
    ...(request.headers.authorization === undefined
      ? {}
      : { authorization: request.headers.authorization }),
    ...(request.headers.cookie === undefined ? {} : { cookie: request.headers.cookie }),
    ...(request.headers.origin === undefined ? {} : { origin: request.headers.origin }),
    ...(request.headers["x-agentis-csrf"] === undefined
      ? {}
      : { "x-agentis-csrf": request.headers["x-agentis-csrf"] }),
  });

const applySweepEffects = (store: Store, executionBoundary: ExecutionBoundary) => {
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

const isJsonRoute = (method: string, pathname: string) => {
  if (
    (method === "GET" &&
      [
        "/v1/health",
        "/v1/browser/session",
        "/v1/status",
        "/v1/openapi.json",
      ].includes(pathname)) ||
    (method === "POST" &&
      [
        "/v1/browser/bootstrap",
        "/v1/browser/session",
        "/v1/browser/setup",
        "/v1/commands",
      ].includes(pathname))
  ) {
    return true;
  }
  return method === "GET" && /^\/v1\/artifacts\/[^/]+$/.test(pathname);
};

const authenticateRaw = async (
  dependencies: HttpApiDependencies,
  request: IncomingMessage,
  response: ServerResponse,
) => {
  const result = await Effect.runPromise(
    Effect.either(authorizeRead(dependencies, requestHeaders(request))),
  );
  if (Either.isRight(result)) return result.right;
  json(response, apiErrorStatus(result.left.code), result.left);
  return null;
};

const serveEvents = async (
  dependencies: HttpApiDependencies,
  hub: TransitionHub,
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
) => {
  if (!(await authenticateRaw(dependencies, request, response))) return;
  const value = url.searchParams.get("cursor");
  let cursor: Cursor;
  try {
    cursor = Schema.decodeUnknownSync(Cursor)(value);
  } catch {
    json(response, 400, { code: "bad_request", message: "cursor is required" });
    return;
  }
  const subscription = await hub.subscribe(response, cursor);
  if (!subscription.ok) {
    json(response, apiErrorStatus(subscription.code), subscription);
    return;
  }
  request.once("close", subscription.close);
};

const serveArtifact = async (
  dependencies: HttpApiDependencies,
  request: IncomingMessage,
  response: ServerResponse,
  artifactId: string,
) => {
  if (!(await authenticateRaw(dependencies, request, response))) return;
  const artifact = await Effect.runPromise(
    dependencies.store.artifact(Schema.decodeUnknownSync(ArtifactId)(artifactId)),
  );
  if (!artifact) {
    json(response, 404, { code: "not_found", message: "artifact not found" });
    return;
  }
  const verified = await openVerifiedFile({
    path: artifact.path,
    root: dependencies.workspace,
    byteSize: artifact.byteSize,
    sha256: artifact.sha256,
  });
  if (!verified) {
    json(response, 409, {
      code: "conflict",
      message: "artifact content is missing or failed integrity verification",
    });
    return;
  }
  const previewable = ["text/plain", "text/markdown", "application/json"].includes(
    artifact.mediaType,
  );
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-disposition": previewable
      ? `inline; filename="${artifact.id}.txt"`
      : `attachment; filename="${artifact.id}"`,
    "content-length": String(verified.byteSize),
    "content-type": artifact.mediaType,
    "x-content-type-options": "nosniff",
  });
  const stream = verified.handle.createReadStream({ autoClose: true, start: 0 });
  stream.once("error", () => response.destroy());
  response.once("close", () => stream.destroy());
  stream.pipe(response);
};

const webRoot = () => {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const candidates = [join(moduleDirectory, "web"), join(moduleDirectory, "../web")];
  return candidates.find((candidate) => existsSync(join(candidate, "index.html"))) ?? null;
};

const staticHeaders = {
  "content-security-policy":
    "default-src 'self'; base-uri 'none'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

const mediaType = (path: string) => {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "text/html; charset=utf-8";
  }
};

const serveStatic = (response: ServerResponse, pathname: string) => {
  const root = webRoot();
  if (!root) {
    json(response, 404, { code: "not_found", message: "browser bundle is unavailable" });
    return;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    json(response, 400, { code: "bad_request", message: "invalid path" });
    return;
  }
  const requested = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = join(root, requested);
  const relation = relative(root, candidate);
  const safe = relation !== ".." && !relation.startsWith(`..${sep}`) && !isAbsolute(relation);
  if (!safe || !existsSync(candidate) || !statSync(candidate).isFile()) {
    json(response, 404, { code: "not_found", message: "browser asset not found" });
    return;
  }
  const selected = candidate;
  response.writeHead(200, {
    ...staticHeaders,
    "cache-control": selected.endsWith("index.html")
      ? "no-store"
      : "public, max-age=31536000, immutable",
    "content-type": mediaType(selected),
  });
  response.end(readFileSync(selected));
};

export const startServer = (options: ServeOptions): Effect.Effect<RunningServer, Error> =>
  Effect.gen(function* () {
    if (options.endpoint.hostname !== "127.0.0.1" && options.endpoint.hostname !== "localhost") {
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
    const dependencies: HttpApiDependencies = {
      ...options,
      owner,
      store,
      runtime: browserRuntime(options.provider, options.executionBoundary, options.dataRoot),
    };
    const api = makeHttpApiHandler(dependencies);
    const hub = new TransitionHub(store);
    const sweepTimer = setInterval(() => {
      applySweepEffects(store, options.executionBoundary);
    }, 1000);
    sweepTimer.unref();
    const server = createServer((request, response) => {
      void (async () => {
        if (request.headers.host !== options.endpoint.host) {
          json(response, 400, { code: "bad_request", message: "invalid Host" });
          return;
        }
        const origin = request.headers.origin;
        if (origin !== undefined && origin !== options.endpoint.origin) {
          json(response, 403, { code: "forbidden", message: "invalid Origin" });
          return;
        }
        const url = new URL(request.url ?? "/", options.endpoint);
        const method = request.method ?? "GET";
        if (method === "GET" && url.pathname === "/v1/events") {
          await serveEvents(dependencies, hub, request, response, url);
          return;
        }
        const content = /^\/v1\/artifacts\/([^/]+)\/content$/.exec(url.pathname);
        if (method === "GET" && content?.[1]) {
          await serveArtifact(dependencies, request, response, content[1]);
          return;
        }
        if (isJsonRoute(method, url.pathname)) {
          const result = await api.handler(await webRequest(request, options.endpoint));
          await writeWebResponse(result, response);
          return;
        }
        if (method === "GET" && !url.pathname.startsWith("/v1/")) {
          serveStatic(response, url.pathname);
          return;
        }
        json(response, 404, { code: "not_found", message: "not found" });
      })().catch((error: unknown) => {
        if (error instanceof RequestBodyTooLargeError) {
          json(response, 413, {
            code: "payload_too_large",
            message: "JSON request bodies are limited to 2 MiB.",
          });
          return;
        }
        process.stderr.write("HTTP request failed\n");
        json(response, 500, {
          code: "internal_error",
          message: "The daemon could not complete the request.",
        });
      });
    });
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
        hub.close();
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await api.dispose();
        await Effect.runPromise(store.interruptActiveRuns(Date.now()));
        const snapshot = await Effect.runPromise(store.snapshot());
        cleanupPersistedRunContainers(snapshot.runs);
        await Effect.runPromise(store.close());
      },
    };
  });
