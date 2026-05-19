import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { resolveSupportAgentDeploymentScope } from "./knowledge-deployment-scope"
import {
  supportAgentBillingDeploymentId,
  supportAgentDemoDeploymentId,
} from "./knowledge-deployment-scope"
import {
  getSupportKnowledgeRegistryRecord,
  listSupportKnowledgeRegistryRecords,
  requireSupportKnowledgeRegistryRecord,
} from "./knowledge-source-registry"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"

describe("support knowledge source registry", () => {
  test("demo deployment includes product docs and release notes", () => {
    const scope = resolveSupportAgentDeploymentScope(
      supportAgentChatRequestFixture,
      supportAgentDemoDeploymentId
    )
    const records = listSupportKnowledgeRegistryRecords(scope)

    expect(records.map((record) => record.knowledgeSourceId).sort()).toEqual([
      "knowledge_product_docs",
      "knowledge_release_notes",
    ])
  })

  test("billing deployment assigns only product documentation", () => {
    const scope = resolveSupportAgentDeploymentScope(
      supportAgentChatRequestFixture,
      supportAgentBillingDeploymentId
    )
    const records = listSupportKnowledgeRegistryRecords(scope)

    expect(records).toHaveLength(1)
    expect(records[0]?.knowledgeSourceId).toBe("knowledge_product_docs")
    expect(
      getSupportKnowledgeRegistryRecord(scope, "knowledge_release_notes")
    ).toBeUndefined()
  })

  test("unknown deployment or source IDs fail closed", () => {
    const scope = resolveSupportAgentDeploymentScope(
      supportAgentChatRequestFixture,
      "deployment_unknown"
    )

    expect(listSupportKnowledgeRegistryRecords(scope)).toEqual([])
    expect(() =>
      requireSupportKnowledgeRegistryRecord(
        resolveSupportAgentDeploymentScope(
          supportAgentChatRequestFixture,
          supportAgentDemoDeploymentId
        ),
        "knowledge_unknown"
      )
    ).toThrow(SupportKnowledgeRuntimeError)
  })
})
