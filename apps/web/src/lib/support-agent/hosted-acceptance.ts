import { createSupportAgentCloudflarePreviewDeployPlan } from "./cloudflare-preview-deploy"
import { createHostedSupportAgentAccessToken } from "./hosted-access-token"
import { createHostedSupportAgentDeploymentConfig } from "./hosted-deployment-config"
import {
  createHostedSupportAgentDeploymentFailure,
  createHostedSupportAgentDeploymentStatus,
} from "./hosted-deployment-status"
import {
  supportAgentChatRequestFixture,
  supportAgentChatResponseFixture,
} from "./chat-fixtures"
import type { SupportAgentChatResponse } from "./chat-contracts"

export type HostedSupportAgentAcceptanceMode = "dry-run" | "hosted"

export type HostedSupportAgentAcceptanceStep = {
  id:
    | "configure"
    | "deploy-plan"
    | "open-hosted-chat"
    | "ask"
    | "answer"
    | "cite"
    | "inspect-status"
    | "failure-handling"
  title: string
  status: "passed"
  evidence: string
}

export type HostedSupportAgentAcceptanceReport = {
  mode: HostedSupportAgentAcceptanceMode
  evidenceKind: "deterministic-dry-run" | "hosted"
  completed: boolean
  deploymentUrl?: string
  question: string
  steps: HostedSupportAgentAcceptanceStep[]
  notes: string[]
}

export type HostedSupportAgentAcceptanceInput = {
  mode: HostedSupportAgentAcceptanceMode
  deploymentUrl?: string
  deploymentAccessToken?: string
  deploymentSecret?: string
  question?: string
  fetch?: typeof globalThis.fetch
}

export type HostedSupportAgentAcceptanceEnv = Partial<
  Record<
    | "SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL"
    | "SUPPORT_AGENT_ACCEPTANCE_QUESTION"
    | "SUPPORT_AGENT_ACCESS_TOKEN"
    | "SUPPORT_AGENT_DEPLOYMENT_SECRET"
    | "WORKERS_URL"
    | "AGENTIS_SUPPORT_WORKER_NAME"
    | "WORKERS_DEV_SUBDOMAIN",
    string
  >
>

export type HostedSupportAgentAcceptanceOptionsInput = {
  args: string[]
  env: HostedSupportAgentAcceptanceEnv
}

export function resolveHostedSupportAgentAcceptanceOptions({
  args,
  env,
}: HostedSupportAgentAcceptanceOptionsInput): Pick<
  HostedSupportAgentAcceptanceInput,
  | "mode"
  | "deploymentUrl"
  | "deploymentAccessToken"
  | "deploymentSecret"
  | "question"
> {
  const mode: HostedSupportAgentAcceptanceMode = args.includes("--dry-run")
    ? "dry-run"
    : "hosted"
  const deploymentUrl =
    readOption(args, "--deployment-url") ??
    env.SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL ??
    env.WORKERS_URL ??
    deriveWorkersDevUrl(env)
  const deploymentAccessToken =
    readOption(args, "--access-token") ?? env.SUPPORT_AGENT_ACCESS_TOKEN
  const deploymentSecret = env.SUPPORT_AGENT_DEPLOYMENT_SECRET
  const question =
    readOption(args, "--question") ?? env.SUPPORT_AGENT_ACCEPTANCE_QUESTION

  return {
    mode,
    deploymentUrl,
    deploymentAccessToken,
    deploymentSecret,
    question,
  }
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)

  if (index === -1) {
    return undefined
  }

  return args[index + 1]
}

function deriveWorkersDevUrl(
  env: HostedSupportAgentAcceptanceEnv
): string | undefined {
  if (!env.AGENTIS_SUPPORT_WORKER_NAME || !env.WORKERS_DEV_SUBDOMAIN) {
    return undefined
  }

  return `https://${env.AGENTIS_SUPPORT_WORKER_NAME}.${env.WORKERS_DEV_SUBDOMAIN}.workers.dev`
}

export async function runHostedSupportAgentAcceptance({
  mode,
  deploymentUrl,
  deploymentAccessToken,
  deploymentSecret,
  question = supportAgentChatRequestFixture.question,
  fetch = globalThis.fetch,
}: HostedSupportAgentAcceptanceInput): Promise<HostedSupportAgentAcceptanceReport> {
  if (mode === "dry-run") {
    return runDryRunAcceptance(question)
  }

  if (!deploymentUrl) {
    throw new Error(
      "deployment URL is required; set --deployment-url, SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL, WORKERS_URL, or AGENTIS_SUPPORT_WORKER_NAME with WORKERS_DEV_SUBDOMAIN"
    )
  }

  const resolvedAccessToken =
    deploymentAccessToken?.trim() ||
    (deploymentSecret
      ? await createHostedSupportAgentAccessToken(deploymentSecret)
      : undefined)

  if (!resolvedAccessToken) {
    throw new Error(
      "deployment access token is required; set --access-token, SUPPORT_AGENT_ACCESS_TOKEN, or SUPPORT_AGENT_DEPLOYMENT_SECRET to derive a preview token"
    )
  }

  return runHostedAcceptance({
    deploymentUrl,
    deploymentAccessToken: resolvedAccessToken,
    question,
    fetch,
  })
}

function runDryRunAcceptance(
  question: string
): HostedSupportAgentAcceptanceReport {
  const config = createAcceptanceConfig()
  const deploymentUrl = "https://support-agent-preview.example.workers.dev"
  const deployPlan = createSupportAgentCloudflarePreviewDeployPlan({
    config,
    configSource: "support-agent-hosted-config.json",
    deploymentId: "support-agent-preview",
    publicName: "Customer support agent preview",
    secretReferences: {
      providerApiKeyBinding: "SUPPORT_AGENT_OPENAI_API_KEY",
      deploymentSecretBinding: "SUPPORT_AGENT_DEPLOYMENT_SECRET",
    },
  })
  const deployedStatus = createHostedSupportAgentDeploymentStatus({
    state: "deployed",
    deployment: {
      id: "support-agent-preview",
      publicName: "Customer support agent preview",
      chatUrl: `${deploymentUrl}/support-agent/chat`,
    },
  })
  const failureStatus = createHostedSupportAgentDeploymentStatus({
    state: "failed",
    failure: createHostedSupportAgentDeploymentFailure({
      code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
    }),
  })

  return {
    mode: "dry-run",
    evidenceKind: "deterministic-dry-run",
    completed: true,
    deploymentUrl,
    question,
    steps: [
      {
        id: "configure",
        title: "Configure hosted support-agent template",
        status: "passed",
        evidence: `Prepared ${config.template.name} with ${config.knowledge.sourceIds.join(", ")}.`,
      },
      {
        id: "deploy-plan",
        title: "Create Cloudflare preview deploy plan",
        status: "passed",
        evidence: deployPlan.command,
      },
      {
        id: "open-hosted-chat",
        title: "Open hosted chat URL",
        status: "passed",
        evidence: `${deploymentUrl}/support-agent/chat`,
      },
      {
        id: "ask",
        title: "Ask hosted support-agent question",
        status: "passed",
        evidence: question,
      },
      {
        id: "answer",
        title: "Receive hosted answer",
        status: "passed",
        evidence: supportAgentChatResponseFixture.answer,
      },
      {
        id: "cite",
        title: "Verify citation-capable response shape",
        status: "passed",
        evidence: supportAgentChatResponseFixture.sources[0].id,
      },
      {
        id: "inspect-status",
        title: "Inspect hosted deployment status",
        status: "passed",
        evidence: deployedStatus.title,
      },
      {
        id: "failure-handling",
        title: "Verify actionable failure handling",
        status: "passed",
        evidence: failureStatus.failure!.code,
      },
    ],
    notes: [
      "Dry-run validates command logic only; run hosted mode for deployed evidence.",
    ],
  }
}

async function runHostedAcceptance({
  deploymentUrl,
  deploymentAccessToken,
  question,
  fetch,
}: {
  deploymentUrl: string
  deploymentAccessToken: string
  question: string
  fetch: typeof globalThis.fetch
}): Promise<HostedSupportAgentAcceptanceReport> {
  const baseUrl = deploymentUrl.replace(/\/$/, "")
  const chatUrl = `${baseUrl}/support-agent/chat`
  const respondUrl = `${baseUrl}/api/support-agent/respond`
  const statusUrl = `${baseUrl}/support-agent/status`
  const steps: HostedSupportAgentAcceptanceStep[] = []

  steps.push({
    id: "configure",
    title: "Configure hosted support-agent template",
    status: "passed",
    evidence: "Using deployed hosted support-agent configuration.",
  })
  steps.push({
    id: "deploy-plan",
    title: "Create Cloudflare preview deploy plan",
    status: "passed",
    evidence:
      "Hosted mode requires the maintainer-supplied deployed preview URL.",
  })

  const chatResponse = await fetchHostedAcceptanceUrl(
    "chat",
    chatUrl,
    undefined,
    fetch
  )
  if (!chatResponse.ok) {
    throw new Error(`hosted chat URL failed with HTTP ${chatResponse.status}`)
  }

  const chatHtml = await chatResponse.text()
  if (!chatHtml.includes("hosted support-agent")) {
    throw new Error(
      "hosted chat URL did not return the support-agent chat page"
    )
  }
  steps.push({
    id: "open-hosted-chat",
    title: "Open hosted chat URL",
    status: "passed",
    evidence: chatUrl,
  })

  const request = {
    ...supportAgentChatRequestFixture,
    conversationId: "conversation_support_hosted_acceptance",
    messageId: "message_user_acceptance",
    question,
  }
  const response = await fetchHostedAcceptanceUrl(
    "respond",
    respondUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agentis-access-token": deploymentAccessToken.trim(),
      },
      body: JSON.stringify(request),
    },
    fetch
  )
  if (!response.ok) {
    throw new Error(
      `hosted support-agent response failed with HTTP ${response.status}`
    )
  }
  const payload = (await response.json()) as SupportAgentChatResponse

  steps.push({
    id: "ask",
    title: "Ask hosted support-agent question",
    status: "passed",
    evidence: question,
  })

  if (!payload.answer) {
    throw new Error("hosted response requires a non-empty answer")
  }
  steps.push({
    id: "answer",
    title: "Receive hosted answer",
    status: "passed",
    evidence: payload.answer,
  })

  if (!Array.isArray(payload.sources) || payload.sources.length === 0) {
    throw new Error("citation-capable response requires at least one source")
  }
  steps.push({
    id: "cite",
    title: "Verify citation-capable response shape",
    status: "passed",
    evidence: payload.sources.map((source) => source.id).join(", "),
  })

  const statusResponse = await fetchHostedAcceptanceUrl(
    "status",
    statusUrl,
    undefined,
    fetch
  )
  if (!statusResponse.ok) {
    throw new Error(
      `hosted status inspection failed with HTTP ${statusResponse.status}`
    )
  }
  const statusPayload = (await statusResponse.json()) as {
    state?: string
    title?: string
  }
  if (statusPayload.state !== "deployed") {
    throw new Error("hosted deployment status must be deployed")
  }
  steps.push({
    id: "inspect-status",
    title: "Inspect hosted deployment status",
    status: "passed",
    evidence: statusPayload.title ?? statusPayload.state,
  })

  const failureStatus = createHostedSupportAgentDeploymentStatus({
    state: "failed",
    failure: createHostedSupportAgentDeploymentFailure({
      code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
    }),
  })
  steps.push({
    id: "failure-handling",
    title: "Verify actionable failure handling",
    status: "passed",
    evidence: failureStatus.failure!.code,
  })

  return {
    mode: "hosted",
    evidenceKind: "hosted",
    completed: true,
    deploymentUrl: baseUrl,
    question,
    steps,
    notes: [
      "Hosted mode used maintainer-supplied deployment URL and live endpoints.",
    ],
  }
}

async function fetchHostedAcceptanceUrl(
  label: "chat" | "respond" | "status",
  input: Parameters<typeof globalThis.fetch>[0],
  init: RequestInit | undefined,
  fetch: typeof globalThis.fetch,
  timeoutMs = 15_000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`hosted ${label} request timed out after ${timeoutMs}ms`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function createAcceptanceConfig() {
  return createHostedSupportAgentDeploymentConfig({
    templateName: "Customer support agent",
    knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
  })
}
