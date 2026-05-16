import {
  createCloudflarePreviewDeploymentRequest,
  type CloudflarePreviewDeploymentRequest,
  type HostedSupportAgentDeploymentConfig,
} from "./hosted-deployment-config"

export type SupportAgentCloudflarePreviewDeployPlanInput = {
  config?: HostedSupportAgentDeploymentConfig
  configSource: string
  deploymentId: string
  publicName: string
  secretReferences: {
    providerApiKeyBinding: string
    deploymentSecretBinding: string
  }
}

export type SupportAgentCloudflarePreviewDeployPlan = {
  command: string
  request: CloudflarePreviewDeploymentRequest
  wrangler: {
    command: "wrangler deploy --env preview"
    requiredSecretBindings: string[]
  }
}

export function createSupportAgentCloudflarePreviewDeployPlan({
  config,
  configSource,
  deploymentId,
  publicName,
  secretReferences,
}: SupportAgentCloudflarePreviewDeployPlanInput): SupportAgentCloudflarePreviewDeployPlan {
  if (!config) {
    throw new Error("hosted deployment config is required")
  }

  if (!secretReferences.providerApiKeyBinding.trim()) {
    throw new Error("provider API key secret reference is required")
  }

  if (!secretReferences.deploymentSecretBinding.trim()) {
    throw new Error("deployment secret reference is required")
  }

  const request = createCloudflarePreviewDeploymentRequest({
    config,
    deploymentId,
    publicName,
    secretReferences,
  })

  return {
    command: `pnpm --filter web support-agent:deploy:preview -- --config ${configSource}`,
    request,
    wrangler: {
      command: "wrangler deploy --env preview",
      requiredSecretBindings: [
        secretReferences.providerApiKeyBinding,
        secretReferences.deploymentSecretBinding,
      ],
    },
  }
}
