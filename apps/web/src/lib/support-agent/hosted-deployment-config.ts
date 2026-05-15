import type { SupportAgentKnowledgeSourceSelection } from "./chat-contracts"

export type HostedSupportAgentRuntimeAdapter = "flue-support-agent"

export type HostedSupportAgentDeploymentConfigInput = {
  templateName: string
  knowledgeSources: SupportAgentKnowledgeSourceSelection[]
}

export type HostedSupportAgentDeploymentConfig = {
  template: {
    id: "agent_support_template"
    name: string
  }
  runtime: {
    adapter: HostedSupportAgentRuntimeAdapter
    requestContract: "SupportAgentChatRequest"
  }
  knowledge: {
    sourceIds: string[]
    contextReferences: Array<{
      knowledgeSourceId: string
      type: SupportAgentKnowledgeSourceSelection["contextReference"]["type"]
      path: string
    }>
  }
  deployment: {
    target: "cloudflare-preview"
    intent: "prepare-hosted-preview"
    credentials: "server-side"
  }
}

export function createHostedSupportAgentDeploymentConfig({
  templateName,
  knowledgeSources,
}: HostedSupportAgentDeploymentConfigInput): HostedSupportAgentDeploymentConfig {
  return {
    template: {
      id: "agent_support_template",
      name: templateName,
    },
    runtime: {
      adapter: "flue-support-agent",
      requestContract: "SupportAgentChatRequest",
    },
    knowledge: {
      sourceIds: knowledgeSources.map((source) => source.id),
      contextReferences: knowledgeSources.map((source) => ({
        knowledgeSourceId: source.id,
        type: source.contextReference.type,
        path: source.contextReference.path,
      })),
    },
    deployment: {
      target: "cloudflare-preview",
      intent: "prepare-hosted-preview",
      credentials: "server-side",
    },
  }
}
