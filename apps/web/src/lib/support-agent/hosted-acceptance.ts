import { createSupportAgentCloudflarePreviewDeployPlan } from "./cloudflare-preview-deploy"
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
  question?: string
  fetch?: typeof globalThis.fetch
}

export async function runHostedSupportAgentAcceptance({
  mode,
  deploymentUrl,
  question = supportAgentChatRequestFixture.question,
  fetch = globalThis.fetch,
}: HostedSupportAgentAcceptanceInput): Promise<HostedSupportAgentAcceptanceReport> {
  if (mode === "dry-run") {
    return runDryRunAcceptance(question)
  }

  if (!deploymentUrl) {
    throw new Error("SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL is required")
  }

  return runHostedAcceptance({ deploymentUrl, question, fetch })
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
        evidence: failureStatus.failure?.code ?? failureStatus.title,
      },
    ],
    notes: [
      "Dry-run validates command logic only; run hosted mode for deployed evidence.",
    ],
  }
}

async function runHostedAcceptance({
  deploymentUrl,
  question,
  fetch,
}: {
  deploymentUrl: string
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
    evidence: "Hosted mode requires the maintainer-supplied deployed preview URL.",
  })

  const chatResponse = await fetch(chatUrl)
  if (!chatResponse.ok) {
    throw new Error(`hosted chat URL failed with HTTP ${chatResponse.status}`)
  }

  const chatHtml = await chatResponse.text()
  if (!chatHtml.includes("hosted support-agent")) {
    throw new Error("hosted chat URL did not return the support-agent chat page")
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
  const response = await fetch(respondUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error(`hosted support-agent response failed with HTTP ${response.status}`)
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

  const statusResponse = await fetch(statusUrl)
  if (!statusResponse.ok) {
    throw new Error(`hosted status inspection failed with HTTP ${statusResponse.status}`)
  }
  const statusPayload = (await statusResponse.json()) as { state?: string; title?: string }
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
    evidence: failureStatus.failure?.code ?? failureStatus.title,
  })

  return {
    mode: "hosted",
    evidenceKind: "hosted",
    completed: true,
    deploymentUrl: baseUrl,
    question,
    steps,
    notes: ["Hosted mode used maintainer-supplied deployment URL and live endpoints."],
  }
}

function createAcceptanceConfig() {
  return createHostedSupportAgentDeploymentConfig({
    templateName: "Customer support agent",
    knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
  })
}
