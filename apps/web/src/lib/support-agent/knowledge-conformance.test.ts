import { afterEach, describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createSupportAgentModelRuntime } from "./model-runtime"
import type { SupportAgentProviderConfig } from "./provider-config"
import { retrieveSupportKnowledge } from "./knowledge-retrieval-facade"
import { resolveSupportAgentDeploymentScope } from "./knowledge-deployment-scope"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"
import * as registry from "./knowledge-source-registry"
import { toSupportAgentFailureState } from "./runtime-boundary"

const config: SupportAgentProviderConfig = {
  provider: "openai",
  model: "test-model",
  apiKey: "sk-conformance-secret",
}

describe("support knowledge conformance", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("missing content fails before model generation", async () => {
    const generateText = vi.fn(async () => ({ text: "should not run" }))
    const runtime = createSupportAgentModelRuntime({ config, generateText })

    vi.spyOn(registry, "getSupportKnowledgeSourceVersion").mockReturnValue({
      sourceVersionId: "ksrcv_missing",
      knowledgeSourceId: "knowledge_product_docs",
      versionLabel: "missing",
      contentHash: "hash",
      createdAt: "2026-05-19T00:00:00.000Z",
      selectedAt: "2026-05-19T00:00:00.000Z",
      freshnessStatus: "fresh",
      parseStatus: "parsed",
      indexStatus: "not_indexed",
    })

    await expect(
      runtime.respond(supportAgentChatRequestFixture)
    ).rejects.toBeInstanceOf(SupportKnowledgeRuntimeError)
    expect(generateText).not.toHaveBeenCalled()
  })

  test("maps knowledge failures to browser-safe failure state", () => {
    const failure = toSupportAgentFailureState(
      new SupportKnowledgeRuntimeError({
        code: "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE",
      })
    )

    expect(failure.kind).toBe("knowledge-retrieval-failed")
    expect(failure.runtimeCode).toBe("SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE")
    expect(JSON.stringify(failure)).not.toContain("vector://")
    expect(JSON.stringify(failure)).not.toContain("sk-")
  })

  test("deletion pending and scope mismatch fail before adapter invocation", async () => {
    const retrieve = vi.fn(async () => [])
    const scope = resolveSupportAgentDeploymentScope(supportAgentChatRequestFixture)

    vi.spyOn(registry, "requireSupportKnowledgeRegistryRecord").mockReturnValue({
      organizationId: scope.organizationId,
      deploymentId: scope.deploymentId,
      agentId: scope.agentId,
      knowledgeSourceId: "knowledge_product_docs",
      sourceType: "local-documentation",
      displayTitle: "Product documentation sample",
      description: "Demo",
      lifecycleState: "delete_requested",
      activeVersionId: "ksrcv_product_docs_2026_05_19",
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    })

    await expect(
      retrieveSupportKnowledge({
        scope,
        knowledgeSourceIds: ["knowledge_product_docs"],
        question: "billing",
        adapter: { retrieve },
      })
    ).rejects.toMatchObject({
      code: "SUPPORT_KNOWLEDGE_DELETION_PENDING",
    })
    expect(retrieve).not.toHaveBeenCalled()
  })

  test("browser responses exclude secret-like adapter substrings", async () => {
    const failure = toSupportAgentFailureState(
      new SupportKnowledgeRuntimeError({
        code: "SUPPORT_KNOWLEDGE_ADAPTER_ERROR",
      })
    )

    const payload = {
      error: {
        runtimeCode: failure.runtimeCode,
        title: failure.title,
        userMessage: failure.userMessage,
        maintainerMessage: failure.maintainerMessage,
      },
    }

    const serialized = JSON.stringify(payload)
    expect(serialized).not.toMatch(/sk-[A-Za-z0-9]+/)
    expect(serialized).not.toContain("vector://")
    expect(serialized).not.toContain("r2://")
    expect(serialized).not.toContain("stack")
  })
})
