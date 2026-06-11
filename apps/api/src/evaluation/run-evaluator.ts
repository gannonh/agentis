import {
  runEvaluationSchema,
  type RunEvaluation,
  type RubricCriterion,
} from "@workspace/shared"
import { nowIso } from "../lib/ids.js"
import type { Repositories } from "../repositories/index.js"

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

// NOTE: placeholder stub — scores are hash-derived, not quality-based.
// Replace with real LLM evaluation before exposing to end users.
function deterministicCriterionScore(runId: string, criterionId: string): number {
  const hash = hashSeed(`${runId}:${criterionId}`)
  return 55 + (hash % 46)
}

function feedbackForCriterion(criterionName: string, score: number): string {
  if (score >= 90) {
    return `Strong performance on ${criterionName}.`
  }
  if (score >= 80) {
    return `Met expectations for ${criterionName}.`
  }
  if (score >= 70) {
    return `Partially met ${criterionName}; tighten the response next time.`
  }
  return `Needs improvement on ${criterionName}.`
}

function weightedScore(
  criteria: Array<{ score: number; weight: number }>
): number {
  const totalWeight = criteria.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight === 0) return 0
  const weightedTotal = criteria.reduce(
    (sum, entry) => sum + entry.score * entry.weight,
    0
  )
  return Math.round(weightedTotal / totalWeight)
}

export function buildRunEvaluation(input: {
  runId: string
  rubricId: string
  rubricName: string
  criteria: RubricCriterion[]
}): RunEvaluation {
  const criteria = input.criteria.map((criterion) => {
    const score = deterministicCriterionScore(input.runId, criterion.id)
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      weight: criterion.weight,
      score,
      feedback: feedbackForCriterion(criterion.name, score),
    }
  })

  return runEvaluationSchema.parse({
    rubricId: input.rubricId,
    rubricName: input.rubricName,
    score: weightedScore(criteria),
    criteria,
    evaluatedAt: nowIso(),
  })
}

export function evaluateCompletedRun(
  repos: Repositories,
  runId: string
): RunEvaluation | null {
  const run = repos.runs.getById(runId)
  if (!run || run.status !== "completed" || run.evaluation) {
    return null
  }
  if (!run.agentId) {
    return null
  }

  const rubric = repos.rubrics.getPrimaryForAgent(run.agentId)
  if (!rubric || rubric.criteria.length === 0) {
    return null
  }

  const evaluation = buildRunEvaluation({
    runId,
    rubricId: rubric.id,
    rubricName: rubric.name,
    criteria: rubric.criteria,
  })
  repos.runs.saveEvaluation(runId, evaluation)
  return evaluation
}
