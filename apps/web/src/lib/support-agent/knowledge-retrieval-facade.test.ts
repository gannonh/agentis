import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createSupportKnowledgeRetrievalFacade } from "./knowledge-retrieval-facade"
import type { SupportAgentDeploymentScope } from "./knowledge-contracts"
import { supportAgentBillingDeploymentId } from "./knowledge-deployment-scope"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"
import type { LocalKnowledgeRetrievalAdapter } from "./local-knowledge-retrieval-adapter"

describe("support knowledge retrieval facade", () => {
  test("returns normalized chunks for eligible demo sources", async () => {
    const facade = createSupportKnowledgeRetrievalFacade()
    const result = await facade.retrieveForChatRequest(
      supportAgentChatRequestFixture
    )

    expect(result.chunks.length).toBeGreaterThan(0)
    expect(result.citations[0]).toMatchObject({
      knowledgeSourceId: "knowledge_product_docs",
      chunkId: expect.any(String),
      sourceVersionId: "ksrcv_product_docs_2026_05_19",
    })
    expect(JSON.stringify(result.citations)).not.toContain("contentText")
  })

  test("does not call adapter for unknown deployment sources", async () => {
    const retrieve = vi.fn<LocalKnowledgeRetrievalAdapter["retrieve"]>(async () => [])
    const scope: SupportAgentDeploymentScope = {
      organizationId: "org_agentis_demo",
      deploymentId: supportAgentBillingDeploymentId,
      agentId: "agent_support_template",
    }
    const facade = createSupportKnowledgeRetrievalFacade({
      adapter: { retrieve },
      resolveScope: () => scope,
    })

    await expect(
      facade.retrieveForChatRequest({
        ...supportAgentChatRequestFixture,
        knowledgeSourceIds: ["knowledge_release_notes"],
      })
    ).rejects.toMatchObject({
      code: "SUPPORT_KNOWLEDGE_SCOPE_MISMATCH",
    })
    expect(retrieve).not.toHaveBeenCalled()
  })

  test("fails closed before adapter when lifecycle blocks retrieval", async () => {
    const retrieve = vi.fn<LocalKnowledgeRetrievalAdapter["retrieve"]>(async () => [])
    const facade = createSupportKnowledgeRetrievalFacade({
      adapter: { retrieve },
    })

    const originalRequire = await import("./knowledge-source-registry")
    const spy = vi
      .spyOn(originalRequire, "requireSupportKnowledgeRegistryRecord")
      .mockReturnValue({
        organizationId: "org_agentis_demo",
        deploymentId: "deployment_support_demo",
        agentId: "agent_support_template",
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
      facade.retrieveForChatRequest(supportAgentChatRequestFixture)
    ).rejects.toBeInstanceOf(SupportKnowledgeRuntimeError)

    expect(retrieve).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
