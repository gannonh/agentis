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

export type CloudflarePreviewDeploymentRequestInput = {
  config: HostedSupportAgentDeploymentConfig
  deploymentId: string
  publicName: string
  secretReferences: {
    providerApiKeyBinding: string
    deploymentSecretBinding: string
  }
}

export type CloudflarePreviewDeploymentRequest = {
  command: {
    package: "web"
    script: "support-agent:deploy:preview"
  }
  target: {
    platform: "cloudflare"
    environment: "preview"
  }
  deployment: {
    id: string
    publicName: string
    templateId: HostedSupportAgentDeploymentConfig["template"]["id"]
    templateName: string
  }
  runtime: HostedSupportAgentDeploymentConfig["runtime"] & {
    credentials: "server-side"
  }
  knowledge: HostedSupportAgentDeploymentConfig["knowledge"]
  secrets: CloudflarePreviewDeploymentRequestInput["secretReferences"]
}

export function createHostedSupportAgentDeploymentConfig({
  templateName,
  knowledgeSources,
}: HostedSupportAgentDeploymentConfigInput): HostedSupportAgentDeploymentConfig {
  if (knowledgeSources.length === 0) {
    throw new Error("knowledgeSources must contain at least one entry")
  }

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

export function createCloudflarePreviewDeploymentRequest({
  config,
  deploymentId,
  publicName,
  secretReferences,
}: CloudflarePreviewDeploymentRequestInput): CloudflarePreviewDeploymentRequest {
  return {
    command: {
      package: "web",
      script: "support-agent:deploy:preview",
    },
    target: {
      platform: "cloudflare",
      environment: "preview",
    },
    deployment: {
      id: deploymentId,
      publicName,
      templateId: config.template.id,
      templateName: config.template.name,
    },
    runtime: {
      adapter: config.runtime.adapter,
      requestContract: config.runtime.requestContract,
      credentials: config.deployment.credentials,
    },
    knowledge: config.knowledge,
    secrets: secretReferences,
  }
}
