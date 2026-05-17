export type HostedSupportAgentDeploymentState =
  | "configured"
  | "deploying"
  | "deployed"
  | "failed"
  | "unavailable"

export type HostedSupportAgentDeploymentFailureCode =
  | "HOSTED_DEPLOYMENT_CONFIG_MISSING"
  | "HOSTED_DEPLOYMENT_SECRET_MISSING"
  | "HOSTED_DEPLOYMENT_RUNTIME_UNAVAILABLE"
  | "HOSTED_DEPLOYMENT_CHAT_UNREACHABLE"
  | "HOSTED_DEPLOYMENT_STATUS_UNAVAILABLE"

export type HostedSupportAgentDeploymentFailure = {
  code: HostedSupportAgentDeploymentFailureCode
  title: string
  userMessage: string
  maintainerMessage: string
  retryable: boolean
}

export type HostedSupportAgentDeploymentStatus = {
  state: HostedSupportAgentDeploymentState
  title: string
  userMessage: string
  maintainerMessage: string
  retryable: boolean
  deployment?: {
    id: string
    publicName: string
    chatUrl?: string
  }
  failure?: HostedSupportAgentDeploymentFailure
}

export type HostedSupportAgentDeploymentFailureInput = {
  code: HostedSupportAgentDeploymentFailureCode
  cause?: unknown
}

export type HostedSupportAgentDeploymentStatusInput = {
  state: HostedSupportAgentDeploymentState
  deployment?: HostedSupportAgentDeploymentStatus["deployment"]
  failure?: HostedSupportAgentDeploymentFailure
}

const FAILURE_MESSAGES: Record<
  HostedSupportAgentDeploymentFailureCode,
  HostedSupportAgentDeploymentFailure
> = {
  HOSTED_DEPLOYMENT_CONFIG_MISSING: {
    code: "HOSTED_DEPLOYMENT_CONFIG_MISSING",
    title: "Deployment config missing",
    userMessage: "The hosted support agent is not configured yet.",
    maintainerMessage:
      "Complete the support-agent configuration step, then rerun the Cloudflare preview deployment command.",
    retryable: false,
  },
  HOSTED_DEPLOYMENT_SECRET_MISSING: {
    code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
    title: "Server-side secret binding missing",
    userMessage: "The hosted support agent could not be deployed.",
    maintainerMessage:
      "Set the required server-side support-agent secret bindings, then rerun the Cloudflare preview deployment command.",
    retryable: false,
  },
  HOSTED_DEPLOYMENT_RUNTIME_UNAVAILABLE: {
    code: "HOSTED_DEPLOYMENT_RUNTIME_UNAVAILABLE",
    title: "Hosted runtime unavailable",
    userMessage: "The hosted support agent could not answer right now.",
    maintainerMessage:
      "Inspect the hosted runtime health and provider connectivity, then retry the hosted chat request.",
    retryable: true,
  },
  HOSTED_DEPLOYMENT_CHAT_UNREACHABLE: {
    code: "HOSTED_DEPLOYMENT_CHAT_UNREACHABLE",
    title: "Hosted chat unreachable",
    userMessage: "The hosted support agent chat could not be opened.",
    maintainerMessage:
      "Check the hosted chat URL and Cloudflare preview deployment, then retry the hosted chat check.",
    retryable: true,
  },
  HOSTED_DEPLOYMENT_STATUS_UNAVAILABLE: {
    code: "HOSTED_DEPLOYMENT_STATUS_UNAVAILABLE",
    title: "Status endpoint unavailable",
    userMessage: "The hosted support agent status could not be inspected.",
    maintainerMessage:
      "Check the hosted status endpoint and Cloudflare preview deployment URL, then retry status inspection.",
    retryable: true,
  },
}

export function createHostedSupportAgentDeploymentFailure({
  code,
}: HostedSupportAgentDeploymentFailureInput): HostedSupportAgentDeploymentFailure {
  return FAILURE_MESSAGES[code]
}

export function createHostedSupportAgentDeploymentStatus({
  state,
  deployment,
  failure,
}: HostedSupportAgentDeploymentStatusInput): HostedSupportAgentDeploymentStatus {
  switch (state) {
    case "configured":
      return {
        state,
        title: "Deployment configured",
        userMessage: "The support agent is configured and ready to deploy.",
        maintainerMessage:
          "Run the Cloudflare preview deployment command when server-side bindings are set.",
        retryable: true,
        deployment,
      }
    case "deploying":
      return {
        state,
        title: "Deployment in progress",
        userMessage: "The hosted support agent is deploying.",
        maintainerMessage:
          "Wait for the Cloudflare preview deploy to finish, then inspect status again.",
        retryable: true,
        deployment,
      }
    case "deployed":
      return {
        state,
        title: "Deployment ready",
        userMessage: "The hosted support agent is ready to chat.",
        maintainerMessage:
          "Open the hosted chat URL and run the hosted acceptance script.",
        retryable: false,
        deployment,
      }
    case "failed":
      return {
        state,
        title: "Deployment failed",
        userMessage:
          failure?.userMessage ?? "The hosted support agent could not be deployed.",
        maintainerMessage:
          failure?.maintainerMessage ??
          "Inspect the Cloudflare preview deployment output, then retry deployment.",
        retryable: failure?.retryable ?? true,
        deployment,
        failure,
      }
    case "unavailable":
      return {
        state,
        title: "Deployment status unavailable",
        userMessage:
          failure?.userMessage ??
          "The hosted support agent status could not be inspected.",
        maintainerMessage:
          failure?.maintainerMessage ??
          "Check the hosted status endpoint and Cloudflare preview deployment URL, then retry status inspection.",
        retryable: failure?.retryable ?? true,
        failure,
      }
    /* v8 ignore next 4 -- TypeScript exhaustiveness guard for future state additions. */
    default: {
      const exhaustiveCheck: never = state
      return exhaustiveCheck
    }
  }
}
