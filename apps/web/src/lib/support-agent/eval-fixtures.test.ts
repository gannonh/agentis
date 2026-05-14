import { describe, expect, test } from "vitest"

import {
  supportAgentEvalQuestions,
  supportAgentEvalScoringDimensions,
} from "./eval-fixtures"

describe("support-agent eval fixtures", () => {
  test("defines at least 10 runnable questions with grounding criteria", () => {
    expect(supportAgentEvalQuestions).toHaveLength(10)

    for (const question of supportAgentEvalQuestions) {
      expect(question.id).toMatch(/^support-agent-eval-/)
      expect(question.request.question.trim()).toBeTruthy()
      expect(question.expectedGrounding.requiredKnowledgeSourceIds.length).toBeGreaterThan(0)
      expect(question.expectedGrounding.requiredSourceIds.length).toBeGreaterThan(0)
      expect(question.expectedAnswerTerms.length).toBeGreaterThan(0)
    }
  })

  test("declares scoring dimensions for correctness, grounding, latency, and cost", () => {
    expect(supportAgentEvalScoringDimensions).toEqual([
      "correctness",
      "grounding",
      "latency",
      "cost",
    ])
  })
})
