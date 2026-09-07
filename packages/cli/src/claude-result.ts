import type { SDKResultSuccess, SDKResultError } from "@anthropic-ai/claude-agent-sdk";

export const claudeResultText = (
  message:
    | Pick<SDKResultSuccess, "subtype" | "is_error" | "result" | "api_error_status">
    | Pick<SDKResultError, "subtype" | "errors">,
): string => {
  if (message.subtype === "success" && !message.is_error) return message.result;
  const status = "api_error_status" in message ? message.api_error_status : null;
  const detail = message.subtype === "success" ? message.result : message.errors.join(" ");
  if (status === 401 || status === 403 || /auth|credential|api.key/i.test(detail))
    throw new Error("auth-unavailable");
  if (status === 429 || /quota|rate.limit|credit balance/i.test(detail)) throw new Error("quota");
  throw new Error("provider-error");
};
