import type { SupportAgentEvalQuestion } from "./eval-fixtures"
import type { SupportAgentEvalRun, SupportAgentEvalResult } from "./eval-runner"

export type SupportAgentEvalStatus = "pass" | "fail"

export type SupportAgentEvalReport = {
  generatedAt: string
  execution: {
    completed: boolean
    command: string
    candidateModels: string[]
    credentialState: "configured" | "missing"
    notes: string
  }
  results: SupportAgentEvalReportResult[]
  summary: {
    byCandidate: SupportAgentEvalCandidateSummary[]
  }
}

export type SupportAgentEvalReportResult = SupportAgentEvalResult & {
  scores: {
    correctness: {
      status: SupportAgentEvalStatus
      requiredTerms: string[]
      matchedTerms: string[]
      notes: string
    }
    grounding: {
      status: SupportAgentEvalStatus
      expectedSourceIds: string[]
      returnedSourceIds: string[]
      notes: string
    }
    latency: {
      milliseconds: number
      notes: string
    }
    cost: {
      notes: string
    }
  }
}

export type SupportAgentEvalCandidateSummary = {
  candidateId: string
  questions: number
  correctnessPasses: number
  groundingPasses: number
  averageLatencyMs: number
  costNote: string
}

export function createSupportAgentEvalReport({
  generatedAt,
  questions,
  run,
  execution,
}: {
  generatedAt: string
  questions: SupportAgentEvalQuestion[]
  run: SupportAgentEvalRun
  execution: {
    completed: boolean
    command: string
    credentialState: "configured" | "missing"
    notes: string
  }
}): SupportAgentEvalReport {
  const questionsById = new Map(questions.map((question) => [question.id, question]))
  const results = run.results.map((result) => {
    const question = questionsById.get(result.questionId)

    if (!question) {
      throw new Error(`Unknown support-agent eval question: ${result.questionId}`)
    }

    return {
      ...result,
      scores: scoreSupportAgentEvalResult(result, question),
    }
  })

  return {
    generatedAt,
    execution: {
      ...execution,
      candidateModels: collectCandidateModels(run.results),
    },
    results,
    summary: {
      byCandidate: summarizeByCandidate(results),
    },
  }
}

function scoreSupportAgentEvalResult(
  result: SupportAgentEvalResult,
  question: SupportAgentEvalQuestion
): SupportAgentEvalReportResult["scores"] {
  const normalizedAnswer = result.answer.toLowerCase()
  const matchedTerms = question.expectedAnswerTerms.filter((term) =>
    normalizedAnswer.includes(term.toLowerCase())
  )
  const returnedSourceIds = result.provenance.map((source) => source.id)
  const expectedSourceIds = question.expectedGrounding.requiredSourceIds
  const returnedSourceIdSet = new Set(returnedSourceIds)
  const hasAllRequiredAnswerTerms =
    matchedTerms.length === question.expectedAnswerTerms.length
  const allExpectedSourcesReturned =
    expectedSourceIds.length > 0 &&
    expectedSourceIds.every((sourceId) => returnedSourceIdSet.has(sourceId))

  return {
    correctness: {
      status: hasAllRequiredAnswerTerms ? "pass" : "fail",
      requiredTerms: question.expectedAnswerTerms,
      matchedTerms,
      notes: hasAllRequiredAnswerTerms
        ? "Answer contains required eval terms."
        : "Answer is missing one or more required eval terms.",
    },
    grounding: {
      status:
        hasAllRequiredAnswerTerms && allExpectedSourcesReturned ? "pass" : "fail",
      expectedSourceIds,
      returnedSourceIds,
      notes: question.expectedGrounding.notes,
    },
    latency: {
      milliseconds: result.latencyMs,
      notes: "Measured around the support-agent runtime boundary.",
    },
    cost: {
      notes: result.candidate.costNote,
    },
  }
}

function collectCandidateModels(results: SupportAgentEvalResult[]): string[] {
  return [
    ...new Set(
      results.map((result) =>
        [result.candidate.provider, result.candidate.model].join(":")
      )
    ),
  ]
}

function summarizeByCandidate(
  results: SupportAgentEvalReportResult[]
): SupportAgentEvalCandidateSummary[] {
  const resultsByCandidate = new Map<string, SupportAgentEvalReportResult[]>()

  for (const result of results) {
    resultsByCandidate.set(result.candidate.id, [
      ...(resultsByCandidate.get(result.candidate.id) ?? []),
      result,
    ])
  }

  return [...resultsByCandidate.entries()].map(([candidateId, candidateResults]) => ({
    candidateId,
    questions: candidateResults.length,
    correctnessPasses: candidateResults.filter(
      (result) => result.scores.correctness.status === "pass"
    ).length,
    groundingPasses: candidateResults.filter(
      (result) => result.scores.grounding.status === "pass"
    ).length,
    averageLatencyMs: average(
      candidateResults.map((result) => result.scores.latency.milliseconds)
    ),
    costNote: candidateResults[0]!.candidate.costNote,
  }))
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
