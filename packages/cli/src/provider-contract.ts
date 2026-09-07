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
  reason: Schema.Literal("advertised", "documented-unproven", "not-advertised", "not-negotiated"),
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

export const normalizedHistory = (history: readonly string[]): string => {
  const normalized: unknown[] = [];
  let message = { kind: "", text: "" };
  const tools = new Map<string, Record<string, unknown>>();
  for (const entry of history) {
    const decoded: unknown = JSON.parse(entry);
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded))
      throw new Error("malformed session history");
    const record = Schema.decodeUnknownSync(
      Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    )(decoded);
    if (
      [
        "agent_thought_chunk",
        "session_info_update",
        "available_commands_update",
        "current_mode_update",
        "config_option_update",
        "usage_update",
      ].includes(String(record.sessionUpdate))
    )
      continue;
    if (
      (record.sessionUpdate === "agent_message_chunk" ||
        record.sessionUpdate === "user_message_chunk") &&
      record.content &&
      typeof record.content === "object" &&
      "text" in record.content &&
      typeof record.content.text === "string"
    ) {
      if (message.kind === record.sessionUpdate) message.text += record.content.text;
      else {
        message = { kind: record.sessionUpdate, text: record.content.text };
        normalized.push(message);
      }
    } else {
      message = { kind: "", text: "" };
      if (
        (record.sessionUpdate === "tool_call" || record.sessionUpdate === "tool_call_update") &&
        typeof record.toolCallId === "string"
      ) {
        const { toolCallId, sessionUpdate: _update, ...details } = record;
        const existing = tools.get(toolCallId);
        if (existing) Object.assign(existing, details);
        else {
          const tool = { kind: "tool", ...details };
          tools.set(toolCallId, tool);
          normalized.push(tool);
        }
      } else {
        const { toolCallId: _toolId, ...rest } = record;
        normalized.push(rest);
      }
    }
  }
  return JSON.stringify(normalized);
};

export const safeFailureDetail = (error: string): string => {
  if (error === "session history mismatch") return error;
  if (error.includes("unsupported ACP version")) return "unsupported ACP version";
  if (error.includes("timed out")) return "provider operation timed out";
  return classifyFailure(error);
};
