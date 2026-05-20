import { describe, expect, test } from "vitest"

import {
  SupportAgentRuntimeError,
  toSupportAgentFailureState,
} from "./runtime-boundary"

describe("support-agent failure state contract", () => {
  test("maps missing provider configuration to an actionable typed state", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Missing OpenAI API key sk-live-secret",
      })
    )

    expect(failure).toEqual({
      kind: "provider-configuration-missing",
      runtimeCode: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
      title: "Provider configuration missing",
      userMessage:
        "The support agent needs provider credentials before it can answer.",
      maintainerMessage:
        "Set the support-agent provider environment variables, then retry the local demo.",
      retryable: false,
    })
    expect(JSON.stringify(failure)).not.toContain("sk-live-secret")
  })

  test("maps context preparation failures to a distinct typed state without leaking raw runtime details", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN",
        message:
          "Unknown support-agent knowledge source: /private/tmp/customer-stacktrace.log",
      })
    )

    expect(failure.kind).toBe("context-preparation-failed")
    expect(failure.runtimeCode).toBe("SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN")
    expect(failure.userMessage).toBe(
      "The selected documentation could not be prepared for this question."
    )
    expect(failure.maintainerMessage).toBe(
      "Check that each selected source ID and local documentation path is registered for the demo."
    )
    expect(JSON.stringify(failure)).not.toContain("/private/tmp")
    expect(JSON.stringify(failure)).not.toContain("stacktrace")
  })

  test("maps model generation failures to retryable typed state", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CALL_FAILED",
        message: "Provider failed with token hf_secret and stack trace",
      })
    )

    expect(failure.kind).toBe("model-generation-failed")
    expect(failure.runtimeCode).toBe("SUPPORT_AGENT_PROVIDER_CALL_FAILED")
    expect(failure.userMessage).toBe(
      "The support agent could not generate an answer right now."
    )
    expect(failure.maintainerMessage).toBe(
      "Inspect provider connectivity and retry the same question after the provider recovers."
    )
    expect(failure.retryable).toBe(true)
    expect(JSON.stringify(failure)).not.toContain("hf_secret")
    expect(JSON.stringify(failure)).not.toContain("stack trace")
  })

  test("maps unavailable provenance to a distinct typed state for citation failures", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE",
        message: "Provider answer omitted provenance for source_product_docs_setup",
      })
    )

    expect(failure.kind).toBe("provenance-unavailable")
    expect(failure.runtimeCode).toBe("SUPPORT_AGENT_PROVENANCE_UNAVAILABLE")
    expect(failure.userMessage).toBe(
      "The support agent answered without citation data, so the answer was not shown."
    )
    expect(failure.maintainerMessage).toBe(
      "Verify the runtime returned provenance for every selected demo source before accepting the answer."
    )
    expect(JSON.stringify(failure)).not.toContain("source_product_docs_setup")
  })

  test("maps unknown runtime error codes to the generic model-generation failure", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_RATE_LIMITED" as never,
        message: "Provider rate limited with sk-live-secret",
      })
    )

    expect(failure.kind).toBe("model-generation-failed")
    expect(failure.runtimeCode).toBe("SUPPORT_AGENT_RATE_LIMITED")
    expect(failure.userMessage).toBe(
      "The support agent could not generate an answer right now."
    )
    expect(JSON.stringify(failure)).not.toContain("sk-live-secret")
  })

  test("maps AI Search configuration failures to browser-safe knowledge configuration state", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID",
        message:
          "Invalid binding env.SUPPORT_AGENT_AI_SEARCH namespace=secret-ns token=sk-live",
      })
    )

    expect(failure).toEqual({
      kind: "knowledge-search-configuration-missing",
      runtimeCode: "SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID",
      title: "Knowledge search not configured",
      userMessage: "Knowledge search is not configured for this deployment yet.",
      maintainerMessage:
        "Add the Cloudflare AI Search Worker binding and rerun the AI Search configuration check.",
      retryable: false,
    })
    expect(JSON.stringify(failure)).not.toContain("sk-live")
    expect(JSON.stringify(failure)).not.toContain("secret-ns")
  })

  test("maps HTTP-originated knowledge runtime codes to knowledge retrieval failures", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE" as never,
        message: "Knowledge search is unavailable right now.",
      })
    )

    expect(failure).toEqual({
      kind: "knowledge-retrieval-failed",
      runtimeCode: "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE",
      title: "Knowledge retrieval unavailable",
      userMessage: "Knowledge search is unavailable right now.",
      maintainerMessage:
        "Check deployment source registry eligibility, index status, and adapter health before retrying.",
      retryable: true,
    })
  })

  test("maps unknown runtime failures to sanitized generic generation state", () => {
    const failure = toSupportAgentFailureState(
      new Error("Unhandled runtime failure with sk-live-secret")
    )

    expect(failure).toEqual({
      kind: "model-generation-failed",
      title: "Answer generation failed",
      userMessage: "The support agent could not generate an answer right now.",
      maintainerMessage:
        "Inspect the runtime logs for the failed local demo request, then retry after the runtime recovers.",
      retryable: true,
    })
    expect(JSON.stringify(failure)).not.toContain("sk-live-secret")
  })
})
