import { describe, expect, test } from "vitest"

import {
  supportAgentChatRequestFixture,
  supportAgentChatResponseFixture,
} from "./chat-fixtures"
import { createLocalSupportAgentResponder } from "./local-responder"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"
import {
  SupportAgentRuntimeError,
  toSupportAgentFailureState,
} from "./runtime-boundary"
import type { SupportKnowledgeRuntimeErrorCode } from "./knowledge-contracts"

const forbiddenPatterns = [
  /sk-[A-Za-z0-9]+/,
  /vector:\/\//,
  /r2:\/\//,
  /s3:\/\//,
  /providerResourceId/,
  /providerVectorId/,
  /storageUri/,
  /contentText/,
  /embeddingMetadata/,
  /rawDiagnostics/,
  /stack trace/i,
  /SUPPORT_AGENT_DEPLOYMENT_SECRET/,
]

function expectBrowserSafeSerializedPayload(serialized: string): void {
  for (const pattern of forbiddenPatterns) {
    expect(serialized).not.toMatch(pattern)
  }
}

describe("provenance browser safety", () => {
  test("grounded chat response sources stay browser-safe", () => {
    expectBrowserSafeSerializedPayload(
      JSON.stringify(supportAgentChatResponseFixture)
    )
  })

  test("local demo responder returns browser-safe provenance", async () => {
    const responder = createLocalSupportAgentResponder()
    const response = await responder.respond({
      ...supportAgentChatRequestFixture,
      messageId: "message_user_provenance_safety",
    })

    expect(response.sources.length).toBeGreaterThan(0)
    expectBrowserSafeSerializedPayload(JSON.stringify(response))
  })

  test("knowledge failure payloads stay browser-safe", () => {
    const codes: SupportKnowledgeRuntimeErrorCode[] = [
      "SUPPORT_KNOWLEDGE_MISSING_CONTENT",
      "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE",
      "SUPPORT_KNOWLEDGE_STALE_SOURCE",
      "SUPPORT_KNOWLEDGE_DELETION_PENDING",
      "SUPPORT_KNOWLEDGE_SOURCE_DELETED",
      "SUPPORT_KNOWLEDGE_SCOPE_MISMATCH",
      "SUPPORT_KNOWLEDGE_ADAPTER_ERROR",
    ]

    for (const code of codes) {
      const failure = toSupportAgentFailureState(
        new SupportKnowledgeRuntimeError({ code })
      )

      expectBrowserSafeSerializedPayload(
        JSON.stringify({
          title: failure.title,
          userMessage: failure.userMessage,
          maintainerMessage: failure.maintainerMessage,
          runtimeCode: failure.runtimeCode,
        })
      )
    }
  })

  test("provenance-unavailable failure omits raw provider diagnostics", () => {
    const failure = toSupportAgentFailureState(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVENANCE_UNAVAILABLE",
        message:
          "Provider answer omitted provenance for citation_chunk_product_docs_setup",
      })
    )

    expect(failure.kind).toBe("provenance-unavailable")
    expectBrowserSafeSerializedPayload(JSON.stringify(failure))
    expect(JSON.stringify(failure)).not.toContain(
      "citation_chunk_product_docs_setup"
    )
  })
})
