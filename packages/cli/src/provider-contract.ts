import { Schema } from "effect";

export const Capability = Schema.Struct({
  name: Schema.Literal(
    "session-loading",
    "permissions",
    "questions",
    "plans",
    "mcp-http",
    "mcp-sse",
    "images",
    "audio",
    "embedded-context",
    "usage",
  ),
  operation: Schema.optional(Schema.Literal("available", "unavailable")),
  state: Schema.Literal("negotiated", "documented", "unavailable"),
  reason: Schema.Literal(
    "advertised",
    "documented-unproven",
    "not-advertised",
    "not-negotiated",
    "native-plan-output-without-blocking-approval",
  ),
});
export const ProviderState = Schema.Struct({
  loadStatus: Schema.Literal("idle", "loading", "succeeded", "failed"),
  capabilities: Schema.Array(Capability),
  history: Schema.Array(Schema.String),
  pendingPrompt: Schema.NullOr(Schema.String),
  failureDetail: Schema.optional(Schema.NullOr(Schema.String)),
  loadHistory: Schema.optional(Schema.Array(Schema.String)),
  failure: Schema.NullOr(
    Schema.Literal(
      "auth-unavailable",
      "quota",
      "crash",
      "malformed-response",
      "unsupported-capability",
      "provider-error",
    ),
  ),
});
export type ProviderState = typeof ProviderState.Type;
export const emptyProviderState = (): ProviderState => ({
  loadStatus: "idle",
  capabilities: [],
  history: [],
  pendingPrompt: null,
  failure: null,
});
export const classifyFailure = (error: string): NonNullable<ProviderState["failure"]> =>
  /auth|credential|api.key|login/i.test(error)
    ? "auth-unavailable"
    : /quota|rate.limit|429/i.test(error)
      ? "quota"
      : /exit|closed|crash/i.test(error)
        ? "crash"
        : /json|parse|malformed|invalid/i.test(error)
          ? "malformed-response"
          : /unsupported/i.test(error)
            ? "unsupported-capability"
            : "provider-error";

export const documentedCapabilities = (
  names: readonly (typeof Capability.Type.name)[],
): readonly (typeof Capability.Type)[] =>
  names.map((name) => ({
    name,
    operation: ["session-loading", "permissions", "questions", "plans"].includes(name)
      ? ("available" as const)
      : ("unavailable" as const),
    state: "documented",
    reason: "documented-unproven",
  }));
