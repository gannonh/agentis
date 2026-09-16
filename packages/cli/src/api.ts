import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
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
  StatusQuery,
  UnauthorizedApiError,
  WorkspaceSnapshot,
  type ApiError,
} from "./schema.js";
import type { StoreError } from "./store.js";

export const API_ERROR_STATUS = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  cursor_expired: 410,
  resync_required: 409,
  payload_too_large: 413,
  internal_error: 500,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export const apiErrorStatus = (code: ApiErrorCode): number => API_ERROR_STATUS[code];

export const internalError = (message: string): typeof InternalApiError.Type => ({
  code: "internal_error",
  message,
});

export const storeFailureApiError = (error: StoreError): ApiError => {
  switch (error.code) {
    case "forbidden":
      return { code: "forbidden", message: error.message };
    case "conflict":
      return { code: "conflict", message: error.message };
    case "internal":
      return { code: "internal_error", message: error.message };
    case "cursor_expired":
      return { code: "cursor_expired", message: error.message };
    case "resync_required":
      return { code: "resync_required", message: error.message };
  }
};

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
      .setUrlParams(StatusQuery)
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
  .addError(BadRequestApiError, { status: API_ERROR_STATUS.bad_request })
  .addError(UnauthorizedApiError, { status: API_ERROR_STATUS.unauthorized })
  .addError(ForbiddenApiError, { status: API_ERROR_STATUS.forbidden })
  .addError(NotFoundApiError, { status: API_ERROR_STATUS.not_found })
  .addError(ConflictApiError, { status: API_ERROR_STATUS.conflict })
  .addError(CursorExpiredApiError, { status: API_ERROR_STATUS.cursor_expired })
  .addError(ResyncRequiredApiError, { status: API_ERROR_STATUS.resync_required })
  .addError(PayloadTooLargeApiError, { status: API_ERROR_STATUS.payload_too_large })
  .addError(InternalApiError, { status: API_ERROR_STATUS.internal_error });

export const AgentisJsonApi = ApiWithErrors.add(JsonApiGroup);
export const AgentisApi = ApiWithErrors.add(JsonApiGroup).add(RawApiGroup);
