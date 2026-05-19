import type { SupportAgentDeploymentScope } from "./knowledge-contracts"
import type {
  SupportKnowledgeSourceRegistryRecord,
  SupportKnowledgeSourceVersion,
} from "./knowledge-contracts"
import { SupportKnowledgeRuntimeError } from "./knowledge-runtime-error"
import {
  supportAgentBillingDeploymentId,
  supportAgentDemoDeploymentId,
  supportAgentDemoOrganizationId,
} from "./knowledge-deployment-scope"

const demoTimestamp = "2026-05-19T00:00:00.000Z"

const productDocsVersionId = "ksrcv_product_docs_2026_05_19"
const releaseNotesVersionId = "ksrcv_release_notes_2026_05_19"

const supportKnowledgeSourceVersions: SupportKnowledgeSourceVersion[] = [
  {
    sourceVersionId: productDocsVersionId,
    knowledgeSourceId: "knowledge_product_docs",
    versionLabel: "May 19 demo",
    contentHash: "hash_product_docs_v1",
    createdAt: demoTimestamp,
    selectedAt: demoTimestamp,
    freshnessStatus: "fresh",
    parseStatus: "parsed",
    indexStatus: "indexed",
  },
  {
    sourceVersionId: releaseNotesVersionId,
    knowledgeSourceId: "knowledge_release_notes",
    versionLabel: "May 19 demo",
    contentHash: "hash_release_notes_v1",
    createdAt: demoTimestamp,
    selectedAt: demoTimestamp,
    freshnessStatus: "fresh",
    parseStatus: "parsed",
    indexStatus: "indexed",
  },
]

const supportKnowledgeSourceRegistry: SupportKnowledgeSourceRegistryRecord[] = [
  {
    organizationId: supportAgentDemoOrganizationId,
    deploymentId: supportAgentDemoDeploymentId,
    agentId: "agent_support_template",
    knowledgeSourceId: "knowledge_product_docs",
    sourceType: "local-documentation",
    displayTitle: "Product documentation sample",
    description: "Product setup, billing, and troubleshooting articles.",
    lifecycleState: "active",
    activeVersionId: productDocsVersionId,
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
  },
  {
    organizationId: supportAgentDemoOrganizationId,
    deploymentId: supportAgentDemoDeploymentId,
    agentId: "agent_support_template",
    knowledgeSourceId: "knowledge_release_notes",
    sourceType: "local-documentation",
    displayTitle: "Release notes sample",
    description: "Recent product updates and support-agent changes.",
    lifecycleState: "active",
    activeVersionId: releaseNotesVersionId,
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
  },
  {
    organizationId: supportAgentDemoOrganizationId,
    deploymentId: supportAgentBillingDeploymentId,
    agentId: "agent_support_template",
    knowledgeSourceId: "knowledge_product_docs",
    sourceType: "local-documentation",
    displayTitle: "Product documentation sample",
    description: "Billing-focused deployment uses product docs only.",
    lifecycleState: "active",
    activeVersionId: productDocsVersionId,
    createdAt: demoTimestamp,
    updatedAt: demoTimestamp,
  },
]

export function listSupportKnowledgeRegistryRecords(
  scope: SupportAgentDeploymentScope
): SupportKnowledgeSourceRegistryRecord[] {
  return supportKnowledgeSourceRegistry.filter(
    (record) =>
      record.organizationId === scope.organizationId &&
      record.deploymentId === scope.deploymentId &&
      record.agentId === scope.agentId
  )
}

export function getSupportKnowledgeRegistryRecord(
  scope: SupportAgentDeploymentScope,
  knowledgeSourceId: string
): SupportKnowledgeSourceRegistryRecord | undefined {
  return listSupportKnowledgeRegistryRecords(scope).find(
    (record) => record.knowledgeSourceId === knowledgeSourceId
  )
}

export function getSupportKnowledgeSourceVersion(
  sourceVersionId: string
): SupportKnowledgeSourceVersion | undefined {
  return supportKnowledgeSourceVersions.find(
    (version) => version.sourceVersionId === sourceVersionId
  )
}

export function requireSupportKnowledgeRegistryRecord(
  scope: SupportAgentDeploymentScope,
  knowledgeSourceId: string
): SupportKnowledgeSourceRegistryRecord {
  const record = getSupportKnowledgeRegistryRecord(scope, knowledgeSourceId)

  if (!record) {
    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_SCOPE_MISMATCH",
    })
  }

  return record
}

export function requireSupportKnowledgeSourceVersion(
  sourceVersionId: string
): SupportKnowledgeSourceVersion {
  const version = getSupportKnowledgeSourceVersion(sourceVersionId)

  if (!version) {
    throw new SupportKnowledgeRuntimeError({
      code: "SUPPORT_KNOWLEDGE_MISSING_CONTENT",
    })
  }

  return version
}
