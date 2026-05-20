import { describe, expect, test } from "vitest"

import { toBrowserSafeSupportAgentApiError } from "./browser-safe-error"
import {
  SupportAgentRuntimeError,
  toSupportAgentFailureState,
} from "./runtime-boundary"

describe("browser-safe support-agent API errors", () => {
  test("returns typed public messages without leaking raw runtime details", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID",
        message:
          "Invalid AI Search binding env.SUPPORT_AGENT_AI_SEARCH namespace=secret-ns token=sk-live",
      })
    )
    const error = toBrowserSafeSupportAgentApiError(failure)

    expect(error).toEqual({
      runtimeCode: "SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID",
      title: "Knowledge search not configured",
      userMessage: "Knowledge search is not configured for this deployment yet.",
      maintainerMessage:
        "Add the Cloudflare AI Search Worker binding and rerun the AI Search configuration check.",
      message: "Knowledge search is not configured for this deployment yet.",
    })
    expect(JSON.stringify(error)).not.toContain("sk-live")
    expect(JSON.stringify(error)).not.toContain("secret-ns")
    expect(JSON.stringify(error)).not.toContain("env.")
  })

  test("maps provider configuration failures without exposing secret-bearing runtime messages", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Missing OpenAI API key sk-provider-secret",
      })
    )
    const error = toBrowserSafeSupportAgentApiError(failure)

    expect(error.message).toBe(error.userMessage)
    expect(JSON.stringify(error)).not.toContain("sk-provider-secret")
  })
})
