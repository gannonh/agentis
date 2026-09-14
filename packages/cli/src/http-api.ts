import {
  HttpApiBuilder,
  HttpServer,
  HttpServerResponse,
  OpenApi,
} from "@effect/platform";
import { createHash, randomBytes } from "node:crypto";
import { Effect, Layer, Schema } from "effect";
import { AgentisApi, AgentisJsonApi, type RequestHeaders } from "./api.js";
import { parseAuthorization, type OwnerSession as OwnerCredential } from "./auth.js";
import { applyReceiptEffects } from "./engine.js";
import {
  CommandReceipt,
  PublicArtifact,
  type ExecutionBoundary,
  type ProviderKind,
} from "./schema.js";
import type { ArtifactRow, BrowserRuntime, Principal, Store } from "./store.js";
import {
  API_FAMILY,
  BROWSER_BOOTSTRAP_TTL_MS,
  BROWSER_SESSION_TTL_MS,
  CODEX_AUTH_MODE,
  PACKAGE_VERSION,
  SCHEMA_ID,
} from "./versions.js";

export const SESSION_COOKIE = "agentis_session";
export const CSRF_COOKIE = "agentis_csrf";

type HeaderValues = typeof RequestHeaders.Type;

export type HttpApiDependencies = {
  readonly endpoint: URL;
  readonly workspace: string;
  readonly provider: ProviderKind;
  readonly executionBoundary: ExecutionBoundary;
  readonly owner: OwnerCredential;
  readonly store: Store;
};

export type RequestAuthority =
  | { readonly channel: "cli"; readonly principal: Principal }
  | {
      readonly channel: "browser";
      readonly principal: Principal;
      readonly tokenHash: string;
    };

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const apiError = <Code extends string>(code: Code, message: string) => ({ code, message });
const unauthorized = (message = "authentication required") => apiError("unauthorized", message);
const forbidden = (message: string) => apiError("forbidden", message);
const conflict = (message: string) => apiError("conflict", message);
const notFound = (message: string) => apiError("not_found", message);
type AuthorizationError =
  | ReturnType<typeof unauthorized>
  | ReturnType<typeof forbidden>
  | ReturnType<typeof conflict>;

const cookies = (header: string | undefined) => {
  const result = new Map<string, string>();
  for (const part of header?.split(";") ?? []) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      result.set(name, decodeURIComponent(value));
    } catch {
      continue;
    }
  }
  return result;
};

export const browserRuntime = (
  provider: ProviderKind,
  executionBoundary: ExecutionBoundary,
): BrowserRuntime => ({
  provider,
  model: provider === "codex" ? "gpt-5.6-sol" : provider === "claude" ? "claude-sonnet-5" : "fake",
  authMode: provider === "codex" ? CODEX_AUTH_MODE : provider === "claude" ? "api-key" : "none",
  executionLocation:
    executionBoundary === "docker-fixture-container"
      ? "isolated fixture container"
      : executionBoundary === "docker-desktop-run-container"
        ? "local provider container"
        : "local daemon scratch",
  eligible: provider === "codex" || provider === "fake",
});

export const authorizeRead = (
  dependencies: HttpApiDependencies,
  headers: HeaderValues,
): Effect.Effect<RequestAuthority, AuthorizationError> =>
  Effect.gen(function* () {
    if (headers.authorization !== undefined) {
      const principal = parseAuthorization(headers.authorization, dependencies.owner);
      if (!principal) return yield* Effect.fail(unauthorized());
      if (principal.kind !== "owner") {
        return yield* Effect.fail(forbidden("owner session required"));
      }
      return { channel: "cli", principal } satisfies RequestAuthority;
    }
    const sessionToken = cookies(headers.cookie).get(SESSION_COOKIE);
    if (!sessionToken) return yield* Effect.fail(unauthorized());
    const tokenHash = hash(sessionToken);
    const session = yield* dependencies.store
      .authenticateBrowser({ tokenHash, nowMs: Date.now() })
      .pipe(Effect.mapError((error) => conflict(error.message)));
    if (!session) return yield* Effect.fail(unauthorized("browser session expired"));
    return {
      channel: "browser",
      tokenHash,
      principal: {
        kind: "owner",
        sessionId: session.ownerSession,
        channel: "browser",
        browserSessionHash: tokenHash,
      },
    } satisfies RequestAuthority;
  });

const authorizeBrowserMutation = (
  dependencies: HttpApiDependencies,
  headers: HeaderValues,
) =>
  Effect.gen(function* () {
    const authority = yield* authorizeRead(dependencies, headers);
    if (authority.channel !== "browser") {
      return yield* Effect.fail(forbidden("browser session required"));
    }
    if (headers.origin !== dependencies.endpoint.origin) {
      return yield* Effect.fail(forbidden("exact browser Origin required"));
    }
    const csrfCookie = cookies(headers.cookie).get(CSRF_COOKIE);
    const csrfHeader = headers["x-agentis-csrf"];
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return yield* Effect.fail(forbidden("CSRF token mismatch"));
    }
    const session = yield* dependencies.store
      .authenticateBrowser({
        tokenHash: authority.tokenHash,
        csrfHash: hash(csrfHeader),
        nowMs: Date.now(),
      })
      .pipe(Effect.mapError((error) => conflict(error.message)));
    if (!session) return yield* Effect.fail(forbidden("CSRF token mismatch"));
    return authority;
  });

export const authorizeMutation = (
  dependencies: HttpApiDependencies,
  headers: HeaderValues,
) =>
  Effect.gen(function* () {
    const authority = yield* authorizeRead(dependencies, headers);
    if (authority.channel === "cli") return authority;
    return yield* authorizeBrowserMutation(dependencies, headers);
  });

const statusFor = (dependencies: HttpApiDependencies, authority: RequestAuthority) =>
  dependencies.store
    .workspaceSnapshot({
      ...(authority.channel === "browser"
        ? { tokenHash: authority.tokenHash }
        : { ownerSession: authority.principal.sessionId }),
      nowMs: Date.now(),
      runtime: browserRuntime(dependencies.provider, dependencies.executionBoundary),
    })
    .pipe(Effect.mapError((error) => conflict(error.message)));

const publicArtifact = (artifact: ArtifactRow) =>
  Schema.decodeUnknownSync(PublicArtifact)({
    id: artifact.id,
    taskId: artifact.taskId,
    runId: artifact.runId,
    author: artifact.author,
    source: artifact.source,
    mediaType: artifact.mediaType,
    sha256: artifact.sha256,
    byteSize: artifact.byteSize,
    citations: artifact.citations,
    createdAt: artifact.createdAt,
    metadataUrl: artifact.metadataUrl,
    contentUrl: artifact.contentUrl,
  });

export const makeHttpApiHandler = (dependencies: HttpApiDependencies) => {
  const openApi = OpenApi.fromApi(AgentisApi);
  const handlers = HttpApiBuilder.group(AgentisJsonApi, "json", (group) =>
    group
      .handle("health", () =>
        Effect.succeed({
          ok: true,
          schemaId: SCHEMA_ID,
          apiFamily: API_FAMILY,
          node: process.version,
          packageVersion: PACKAGE_VERSION,
        }),
      )
      .handle("issueBootstrap", ({ headers }) =>
        Effect.gen(function* () {
          const authority = yield* authorizeRead(dependencies, headers);
          if (authority.channel !== "cli") {
            return yield* Effect.fail(forbidden("owner bearer session required"));
          }
          const code = randomBytes(32).toString("base64url");
          const nowMs = Date.now();
          const expiresAt = nowMs + BROWSER_BOOTSTRAP_TTL_MS;
          yield* dependencies.store
            .issueBrowserBootstrap({
              codeHash: hash(code),
              ownerSession: authority.principal.sessionId,
              nowMs,
              expiresAt,
            })
            .pipe(Effect.mapError((error) => conflict(error.message)));
          return { url: `${dependencies.endpoint.origin}/#bootstrap=${code}`, expiresAt };
        }),
      )
      .handle("exchangeBootstrap", ({ headers, payload }) =>
        Effect.gen(function* () {
          if (headers.origin !== dependencies.endpoint.origin) {
            return yield* Effect.fail(forbidden("exact browser Origin required"));
          }
          const sessionToken = randomBytes(32).toString("base64url");
          const csrfToken = randomBytes(32).toString("base64url");
          const nowMs = Date.now();
          const expiresAt = nowMs + BROWSER_SESSION_TTL_MS;
          const exchanged = yield* dependencies.store
            .exchangeBrowserBootstrap({
              codeHash: hash(payload.code),
              tokenHash: hash(sessionToken),
              csrfHash: hash(csrfToken),
              provider: dependencies.provider,
              nowMs,
              expiresAt,
            })
            .pipe(Effect.mapError((error) => conflict(error.message)));
          if (!exchanged) {
            return yield* Effect.fail(conflict("bootstrap code is invalid, expired, or consumed"));
          }
          const response = HttpServerResponse.unsafeJson({ csrfToken, expiresAt });
          return HttpServerResponse.unsafeSetCookie(
            HttpServerResponse.unsafeSetCookie(response, SESSION_COOKIE, sessionToken, {
              expires: new Date(expiresAt),
              httpOnly: true,
              sameSite: "strict",
              path: "/",
            }),
            CSRF_COOKIE,
            csrfToken,
            {
              expires: new Date(expiresAt),
              sameSite: "strict",
              path: "/",
            },
          );
        }),
      )
      .handle("session", ({ headers }) =>
        Effect.gen(function* () {
          const authority = yield* authorizeRead(dependencies, headers);
          if (authority.channel !== "browser") {
            return yield* Effect.fail(forbidden("browser session required"));
          }
          return (yield* statusFor(dependencies, authority)).session;
        }),
      )
      .handle("acknowledgeSetup", ({ headers, payload }) =>
        Effect.gen(function* () {
          const authority = yield* authorizeBrowserMutation(dependencies, headers);
          const runtime = browserRuntime(dependencies.provider, dependencies.executionBoundary);
          if (!runtime.eligible || payload.provider !== runtime.provider) {
            return yield* Effect.fail(
              forbidden("configured provider is not eligible for Mara coordination"),
            );
          }
          const acknowledged = yield* dependencies.store
            .acknowledgeBrowserSetup({
              tokenHash: authority.tokenHash,
              provider: payload.provider,
              sources: payload.sources,
              nowMs: Date.now(),
            })
            .pipe(Effect.mapError((error) => conflict(error.message)));
          if (!acknowledged) return yield* Effect.fail(conflict("setup acknowledgement failed"));
          return (yield* statusFor(dependencies, authority)).session;
        }),
      )
      .handle("status", ({ headers }) =>
        Effect.gen(function* () {
          const authority = yield* authorizeRead(dependencies, headers);
          return yield* statusFor(dependencies, authority);
        }),
      )
      .handle("command", ({ headers, payload }) =>
        Effect.gen(function* () {
          const authority = yield* authorizeMutation(dependencies, headers);
          const nowMs = Date.now();
          const receipt = yield* dependencies.store
            .applyCommand({
              principal: authority.principal,
              idempotencyKey: payload.idempotencyKey,
              command: payload.command,
              nowMs,
              provider: dependencies.provider,
              executionBoundary: dependencies.executionBoundary,
              workspaceId: dependencies.workspace,
            })
            .pipe(
              Effect.mapError((error) =>
                error.message.includes("bot cannot")
                  ? forbidden(error.message)
                  : conflict(error.message),
              ),
            );
          yield* Effect.tryPromise({
            try: () =>
              applyReceiptEffects({
                store: dependencies.store,
                receipt,
                command: payload.command,
                provider: dependencies.provider,
                executionBoundary: dependencies.executionBoundary,
                nowMs: Date.now(),
              }),
            catch: (error) => conflict(error instanceof Error ? error.message : String(error)),
          });
          return receipt.accepted
            ? Schema.decodeUnknownSync(CommandReceipt)(receipt)
            : yield* Effect.fail(Schema.decodeUnknownSync(CommandReceipt)(receipt));
        }),
      )
      .handle("artifact", ({ headers, path }) =>
        Effect.gen(function* () {
          yield* authorizeRead(dependencies, headers);
          const artifact = yield* dependencies.store
            .artifact(path.id)
            .pipe(Effect.mapError((error) => conflict(error.message)));
          if (!artifact) return yield* Effect.fail(notFound("artifact not found"));
          return publicArtifact(artifact);
        }),
      )
      .handle("openApi", () =>
        Effect.succeed(openApi as unknown as Readonly<Record<string, unknown>>),
      ),
  );
  const live = HttpApiBuilder.api(AgentisJsonApi).pipe(Layer.provide(handlers));
  return HttpApiBuilder.toWebHandler(Layer.mergeAll(live, HttpServer.layerContext));
};
