import { createConfiguredSupportAgentRuntime } from "./configured-runtime"
import type { SupportAgentEvalQuestion } from "./eval-fixtures"
import type { SupportAgentTextGenerator } from "./model-runtime"
import {
  resolveSupportAgentProviderConfig,
  toPublicSupportAgentProviderConfig,
  type PublicSupportAgentProviderConfig,
  type SupportAgentProviderConfigInput,
} from "./provider-config"
import { respondWithSupportAgentRuntime } from "./runtime-boundary"

export type SupportAgentEvalModelCandidate = {
  id: string
  label: string
  provider: SupportAgentProviderConfigInput
  generateText: SupportAgentTextGenerator
  costNote: string
}

export type SupportAgentEvalResult = {
  candidate: PublicSupportAgentProviderConfig & {
    id: string
    label: string
    costNote: string
  }
  questionId: string
  answer: string
  provenance: Array<{
    id: string
    knowledgeSourceId: string
    title: string
    excerpt: string
  }>
  latencyMs: number
}

export type SupportAgentEvalRun = {
  results: SupportAgentEvalResult[]
}

export async function runSupportAgentModelCandidateEvals({
  candidates,
  questions,
  clock = () => performance.now(),
}: {
  candidates: SupportAgentEvalModelCandidate[]
  questions: SupportAgentEvalQuestion[]
  clock?: () => number
}): Promise<SupportAgentEvalRun> {
  const candidateConfigs = candidates.map((candidate) => {
    const configResult = resolveSupportAgentProviderConfig(candidate.provider)

    if (!configResult.ok) {
      const missingFields =
        configResult.error.code === "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING"
          ? ` Missing: ${configResult.error.missingFields.join(", ")}.`
          : ""

      throw new Error(
        `Support-agent eval candidate ${candidate.id} requires provider, model, and API key.${missingFields}`
      )
    }

    return {
      candidate,
      providerConfig: configResult.config,
      publicConfig: toPublicSupportAgentProviderConfig(configResult.config),
    }
  })

  if (candidateConfigs.length < 2) {
    throw new Error(
      "Support-agent evals require at least two configured model candidates."
    )
  }

  const results: SupportAgentEvalResult[] = []

  for (const { candidate, publicConfig } of candidateConfigs) {
    const runtime = createConfiguredSupportAgentRuntime({
      mode: "model",
      provider: candidate.provider,
      generateText: candidate.generateText,
    })

    for (const question of questions) {
      const startedAt = clock()
      const response = await respondWithSupportAgentRuntime(
        runtime,
        question.request
      )
      const finishedAt = clock()

      results.push({
        candidate: {
          id: candidate.id,
          label: candidate.label,
          costNote: candidate.costNote,
          ...publicConfig,
        },
        questionId: question.id,
        answer: response.answer,
        provenance: response.sources,
        latencyMs: Math.max(0, finishedAt - startedAt),
      })
    }
  }

  return { results }
}
