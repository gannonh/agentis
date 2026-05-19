import type { SupportAgentChatRequest } from "./chat-contracts"
import type { SupportAgentDeploymentScope } from "./knowledge-contracts"

export const supportAgentDemoOrganizationId = "org_agentis_demo"

export const supportAgentDemoDeploymentId = "deployment_support_demo"

export const supportAgentBillingDeploymentId = "deployment_billing_support_preview"

export function resolveSupportAgentDeploymentScope(
  request: SupportAgentChatRequest
): SupportAgentDeploymentScope {
  return {
    organizationId: supportAgentDemoOrganizationId,
    deploymentId: request.deploymentId ?? supportAgentDemoDeploymentId,
    agentId: request.agentId,
  }
}
