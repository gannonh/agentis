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

  test("returns empty retrieval when no knowledge sources are selected", async () => {
    const retrieve = vi.fn<LocalKnowledgeRetrievalAdapter["retrieve"]>(
      async () => []
    )
    const facade = createSupportKnowledgeRetrievalFacade({
      adapter: { retrieve },
    })

    await expect(
      facade.retrieveForChatRequest({
        ...supportAgentChatRequestFixture,
        knowledgeSourceIds: [],
        knowledgeSources: [],
      })
    ).resolves.toEqual({ chunks: [], citations: [] })

    expect(retrieve).not.toHaveBeenCalled()
  })

  test("maps blocked lifecycle and index states to typed errors", async () => {
    const retrieve = vi.fn<LocalKnowledgeRetrievalAdapter["retrieve"]>(
      async () => []
    )
    const facade = createSupportKnowledgeRetrievalFacade({
      adapter: { retrieve },
    })
    const registry = await import("./knowledge-source-registry")

    const cases: Array<{
      lifecycleState:
        | "deleted"
        | "disabled"
        | "stale"
        | "active"
        | "deleting"
      indexStatus: "indexed" | "index_unavailable" | "index_stale"
      code: string
    }> = [
      {
        lifecycleState: "deleted",
        indexStatus: "indexed",
        code: "SUPPORT_KNOWLEDGE_SOURCE_DELETED",
      },
      {
        lifecycleState: "deleting",
        indexStatus: "indexed",
        code: "SUPPORT_KNOWLEDGE_DELETION_PENDING",
      },
      {
        lifecycleState: "disabled",
        indexStatus: "indexed",
        code: "SUPPORT_KNOWLEDGE_SCOPE_MISMATCH",
      },
      {
        lifecycleState: "stale",
        indexStatus: "indexed",
        code: "SUPPORT_KNOWLEDGE_STALE_SOURCE",
      },
      {
        lifecycleState: "active",
        indexStatus: "index_unavailable",
        code: "SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE",
      },
      {
        lifecycleState: "stale",
        indexStatus: "index_stale",
        code: "SUPPORT_KNOWLEDGE_STALE_SOURCE",
      },
    ]

    for (const testCase of cases) {
      const spy = vi
        .spyOn(registry, "requireSupportKnowledgeRegistryRecord")
        .mockReturnValue({
          organizationId: "org_agentis_demo",
          deploymentId: "deployment_support_demo",
          agentId: "agent_support_template",
          knowledgeSourceId: "knowledge_product_docs",
          sourceType: "local-documentation",
          displayTitle: "Product documentation sample",
          description: "Demo",
          lifecycleState: testCase.lifecycleState,
          activeVersionId: "ksrcv_product_docs_2026_05_19",
          createdAt: "2026-05-19T00:00:00.000Z",
          updatedAt: "2026-05-19T00:00:00.000Z",
        })

      vi.spyOn(registry, "getSupportKnowledgeSourceVersion").mockReturnValue({
        sourceVersionId: "ksrcv_product_docs_2026_05_19",
        knowledgeSourceId: "knowledge_product_docs",
        versionLabel: "May 19 demo",
        contentHash: "hash",
        createdAt: "2026-05-19T00:00:00.000Z",
        selectedAt: "2026-05-19T00:00:00.000Z",
        freshnessStatus: "fresh",
        parseStatus: "parsed",
        indexStatus: testCase.indexStatus as "indexed",
      })

      await expect(
        facade.retrieveForChatRequest(supportAgentChatRequestFixture)
      ).rejects.toMatchObject({ code: testCase.code })

      spy.mockRestore()
      vi.restoreAllMocks()
    }
  })

  test("fails when active version does not match the knowledge source", async () => {
    const retrieve = vi.fn<LocalKnowledgeRetrievalAdapter["retrieve"]>(
      async () => []
    )
    const facade = createSupportKnowledgeRetrievalFacade({
      adapter: { retrieve },
    })
    const registry = await import("./knowledge-source-registry")

    vi.spyOn(registry, "requireSupportKnowledgeRegistryRecord").mockReturnValue({
      organizationId: "org_agentis_demo",
      deploymentId: "deployment_support_demo",
      agentId: "agent_support_template",
      knowledgeSourceId: "knowledge_product_docs",
      sourceType: "local-documentation",
      displayTitle: "Product documentation sample",
      description: "Demo",
      lifecycleState: "active",
      activeVersionId: "ksrcv_product_docs_2026_05_19",
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    })
    vi.spyOn(registry, "getSupportKnowledgeSourceVersion").mockReturnValue({
      sourceVersionId: "ksrcv_product_docs_2026_05_19",
      knowledgeSourceId: "knowledge_release_notes",
      versionLabel: "wrong",
      contentHash: "hash",
      createdAt: "2026-05-19T00:00:00.000Z",
      selectedAt: "2026-05-19T00:00:00.000Z",
      freshnessStatus: "fresh",
      parseStatus: "parsed",
      indexStatus: "indexed",
    })

    await expect(
      facade.retrieveForChatRequest(supportAgentChatRequestFixture)
    ).rejects.toMatchObject({ code: "SUPPORT_KNOWLEDGE_MISSING_CONTENT" })

    expect(retrieve).not.toHaveBeenCalled()
  })
})
