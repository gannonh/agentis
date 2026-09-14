import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "@effect/platform";
import { Schema } from "effect";
import {
  ArtifactId,
  BadRequestApiError,
  BootstrapExchange,
  BootstrapExchangeResult,
  BootstrapIssue,
  CommandReceipt,
  CommandRequest,
  ConflictApiError,
  CursorExpiredApiError,
  EventsQuery,
  ForbiddenApiError,
  Health,
  NotFoundApiError,
  OwnerSession,
  InternalApiError,
  PayloadTooLargeApiError,
  PublicArtifact,
  ResyncRequiredApiError,
  SetupAcknowledgement,
  UnauthorizedApiError,
  WorkspaceSnapshot,
} from "./schema.js";

export const RequestHeaders = Schema.Struct({
  authorization: Schema.optional(Schema.String),
  cookie: Schema.optional(Schema.String),
  origin: Schema.optional(Schema.String),
  "x-agentis-csrf": Schema.optional(Schema.String),
});

const ArtifactPath = Schema.Struct({ id: ArtifactId });
const OpenApiDocument = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export const JsonApiGroup = HttpApiGroup.make("json")
  .add(HttpApiEndpoint.get("health", "/v1/health").addSuccess(Health))
  .add(
    HttpApiEndpoint.post("issueBootstrap", "/v1/browser/bootstrap")
      .setHeaders(RequestHeaders)
      .addSuccess(BootstrapIssue),
  )
  .add(
    HttpApiEndpoint.post("exchangeBootstrap", "/v1/browser/session")
      .setHeaders(RequestHeaders)
      .setPayload(BootstrapExchange)
      .addSuccess(BootstrapExchangeResult),
  )
  .add(
    HttpApiEndpoint.get("session", "/v1/browser/session")
      .setHeaders(RequestHeaders)
      .addSuccess(OwnerSession),
  )
  .add(
    HttpApiEndpoint.post("acknowledgeSetup", "/v1/browser/setup")
      .setHeaders(RequestHeaders)
      .setPayload(SetupAcknowledgement)
      .addSuccess(OwnerSession),
  )
  .add(
    HttpApiEndpoint.get("status", "/v1/status")
      .setHeaders(RequestHeaders)
      .addSuccess(WorkspaceSnapshot),
  )
  .add(
    HttpApiEndpoint.post("command", "/v1/commands")
      .setHeaders(RequestHeaders)
      .setPayload(CommandRequest)
      .addSuccess(CommandReceipt)
      .addError(CommandReceipt, { status: 409 }),
  )
  .add(
    HttpApiEndpoint.get("artifact", "/v1/artifacts/:id")
      .setHeaders(RequestHeaders)
      .setPath(ArtifactPath)
      .addSuccess(PublicArtifact),
  )
  .add(HttpApiEndpoint.get("openApi", "/v1/openapi.json").addSuccess(OpenApiDocument));

export const RawApiGroup = HttpApiGroup.make("raw")
  .add(
    HttpApiEndpoint.get("events", "/v1/events")
      .setHeaders(RequestHeaders)
      .setUrlParams(EventsQuery)
      .addSuccess(HttpApiSchema.Text({ contentType: "text/event-stream" })),
  )
  .add(
    HttpApiEndpoint.get("artifactContent", "/v1/artifacts/:id/content")
      .setHeaders(RequestHeaders)
      .setPath(ArtifactPath)
      .addSuccess(HttpApiSchema.Uint8Array({ contentType: "application/octet-stream" })),
  );

const ApiWithErrors = HttpApi.make("agentis")
  .addError(BadRequestApiError, { status: 400 })
  .addError(UnauthorizedApiError, { status: 401 })
  .addError(ForbiddenApiError, { status: 403 })
  .addError(NotFoundApiError, { status: 404 })
  .addError(ConflictApiError, { status: 409 })
  .addError(CursorExpiredApiError, { status: 410 })
  .addError(ResyncRequiredApiError, { status: 409 })
  .addError(PayloadTooLargeApiError, { status: 413 })
  .addError(InternalApiError, { status: 500 });

export const AgentisJsonApi = ApiWithErrors.add(JsonApiGroup);
export const AgentisApi = ApiWithErrors.add(JsonApiGroup).add(RawApiGroup);

export const RAW_ROUTE_KEYS = [
  "GET /v1/events",
  "GET /v1/artifacts/:id/content",
] as const;
