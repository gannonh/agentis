import type {
  HostedSupportAgentChatRuntimeHandoff,
  SupportAgentKnowledgeSourceSelection,
} from "./chat-contracts"

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

export type HostedSupportAgentChatRuntimeHandoffInput = {
  config: HostedSupportAgentDeploymentConfig
  deployment: {
    id: string
    publicName: string
    url: string
  }
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

export function createHostedSupportAgentChatRuntimeHandoff({
  config,
  deployment,
}: HostedSupportAgentChatRuntimeHandoffInput): HostedSupportAgentChatRuntimeHandoff {
  const deploymentUrl = new URL(deployment.url)
  const chatUrl = new URL("/support-agent/chat", deploymentUrl)
  const apiEndpoint = new URL("/api/support-agent/respond", deploymentUrl)

  return {
    deployment: {
      id: deployment.id,
      publicName: deployment.publicName,
      chatUrl: chatUrl.toString(),
    },
    template: config.template,
    runtime: {
      adapter: config.runtime.adapter,
      requestContract: config.runtime.requestContract,
      apiEndpoint: apiEndpoint.toString(),
      credentials: config.deployment.credentials,
    },
    knowledge: config.knowledge,
  }
}
