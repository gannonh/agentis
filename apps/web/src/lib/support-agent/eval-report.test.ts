import { describe, expect, test } from "vitest"

import {
  supportAgentEvalQuestions,
  type SupportAgentEvalQuestion,
} from "./eval-fixtures"
import { createSupportAgentEvalReport } from "./eval-report"
import type { SupportAgentEvalRun } from "./eval-runner"

describe("support-agent eval report", () => {
  test("aggregates per-question and per-model scoring evidence", () => {
    const setupQuestion = supportAgentEvalQuestions[0]!
    const releaseQuestion = supportAgentEvalQuestions[3]!
    const run: SupportAgentEvalRun = {
      results: [
        {
          candidate: {
            id: "openai-gpt-5-mini",
            label: "GPT-5 mini",
            provider: "openai",
            model: "gpt-5-mini",
            hasApiKey: true,
            costNote: "low-cost candidate",
          },
          questionId: setupQuestion.id,
          answer: "Product documentation sample setup answer with citation_chunk_product_docs_setup.",
          provenance: [
            {
              id: "citation_chunk_product_docs_setup",
              knowledgeSourceId: "knowledge_product_docs",
              title: "Product documentation sample",
              excerpt: "Select Product documentation sample during setup.",
            },
          ],
          latencyMs: 125,
        },
        {
          candidate: {
            id: "openai-gpt-5.1-mini",
            label: "GPT-5.1 mini",
            provider: "openai",
            model: "gpt-5.1-mini",
            hasApiKey: true,
            costNote: "comparison candidate",
          },
          questionId: releaseQuestion.id,
          answer: "May selected documentation context from the Agentis GUI.",
          provenance: [
            {
              id: "citation_chunk_release_notes_may",
              knowledgeSourceId: "knowledge_release_notes",
              title: "Release notes sample",
              excerpt: "May release notes summarize the newest support-agent changes.",
            },
          ],
          latencyMs: 250,
        },
      ],
    }

    const report = createSupportAgentEvalReport({
      generatedAt: "2026-05-14T00:00:00.000Z",
      questions: [setupQuestion, releaseQuestion],
      run,
      execution: {
        completed: true,
        command: "pnpm --filter web support-agent:eval",
        credentialState: "configured",
        notes: "Live run completed with local OpenAI credentials.",
      },
    })

    expect(report.execution).toEqual({
      completed: true,
      command: "pnpm --filter web support-agent:eval",
      candidateModels: ["openai:gpt-5-mini", "openai:gpt-5.1-mini"],
      credentialState: "configured",
      notes: "Live run completed with local OpenAI credentials.",
    })
    expect(report.results).toHaveLength(2)
    expect(report.results[0]?.scores).toEqual({
      correctness: {
        status: "pass",
        requiredTerms: ["Product documentation sample", "setup"],
        matchedTerms: ["Product documentation sample", "setup"],
        notes: "Answer contains required eval terms.",
      },
      grounding: {
        status: "pass",
        expectedSourceIds: ["citation_chunk_product_docs_setup"],
        returnedSourceIds: ["citation_chunk_product_docs_setup"],
        notes: "Answer should cite the product docs setup excerpt.",
      },
      latency: {
        milliseconds: 125,
        notes: "Measured around the support-agent runtime boundary.",
      },
      cost: {
        notes: "low-cost candidate",
      },
    })
    expect(report.summary.byCandidate).toEqual([
      {
        candidateId: "openai-gpt-5-mini",
        questions: 1,
        correctnessPasses: 1,
        groundingPasses: 1,
        averageLatencyMs: 125,
        costNote: "low-cost candidate",
      },
      {
        candidateId: "openai-gpt-5.1-mini",
        questions: 1,
        correctnessPasses: 1,
        groundingPasses: 1,
        averageLatencyMs: 250,
        costNote: "comparison candidate",
      },
    ])
  })

  test("fails grounding when answer is not grounded even if expected sources are returned", () => {
    const setupQuestion = supportAgentEvalQuestions[0]!
    const run: SupportAgentEvalRun = {
      results: [
        {
          candidate: {
            id: "openai-gpt-5-mini",
            label: "GPT-5 mini",
            provider: "openai",
            model: "gpt-5-mini",
            hasApiKey: true,
            costNote: "low-cost candidate",
          },
          questionId: setupQuestion.id,
          answer: "Unsupported generic response.",
          provenance: [
            {
              id: "citation_chunk_product_docs_setup",
              knowledgeSourceId: "knowledge_product_docs",
              title: "Product documentation sample",
              excerpt: "Select Product documentation sample during setup.",
            },
          ],
          latencyMs: 50,
        },
      ],
    }

    const report = createSupportAgentEvalReport({
      generatedAt: "2026-05-14T00:00:00.000Z",
      questions: [setupQuestion],
      run,
      execution: {
        completed: true,
        command: "pnpm --filter web support-agent:eval",
        credentialState: "configured",
        notes: "Live run completed with local OpenAI credentials.",
      },
    })

    expect(report.results[0]?.scores.correctness).toMatchObject({
      status: "fail",
      matchedTerms: [],
      notes: "Answer is missing one or more required eval terms.",
    })
    expect(report.results[0]?.scores.grounding).toMatchObject({
      status: "fail",
      returnedSourceIds: ["citation_chunk_product_docs_setup"],
    })
  })

  test("fails grounding when no expected source IDs are configured", () => {
    const setupQuestion = supportAgentEvalQuestions[0]!
    const questionWithoutExpectedSources: SupportAgentEvalQuestion = {
      ...setupQuestion,
      id: "support-agent-eval-no-sources",
      expectedGrounding: {
        ...setupQuestion.expectedGrounding,
        requiredSourceIds: [],
      },
    }
    const run: SupportAgentEvalRun = {
      results: [
        {
          candidate: {
            id: "openai-gpt-5-mini",
            label: "GPT-5 mini",
            provider: "openai",
            model: "gpt-5-mini",
            hasApiKey: true,
            costNote: "low-cost candidate",
          },
          questionId: questionWithoutExpectedSources.id,
          answer: "Product documentation sample setup answer.",
          provenance: [
            {
              id: "citation_chunk_product_docs_setup",
              knowledgeSourceId: "knowledge_product_docs",
              title: "Product documentation sample",
              excerpt: "Select Product documentation sample during setup.",
            },
          ],
          latencyMs: 50,
        },
      ],
    }

    const report = createSupportAgentEvalReport({
      generatedAt: "2026-05-14T00:00:00.000Z",
      questions: [questionWithoutExpectedSources],
      run,
      execution: {
        completed: true,
        command: "pnpm --filter web support-agent:eval",
        credentialState: "configured",
        notes: "Live run completed with local OpenAI credentials.",
      },
    })

    expect(report.results[0]?.scores.grounding).toMatchObject({
      status: "fail",
      expectedSourceIds: [],
    })
  })

  test("fails loudly when a run references an unknown eval question", () => {
    const setupQuestion = supportAgentEvalQuestions[0]!
    const run: SupportAgentEvalRun = {
      results: [
        {
          candidate: {
            id: "openai-gpt-5-mini",
            label: "GPT-5 mini",
            provider: "openai",
            model: "gpt-5-mini",
            hasApiKey: true,
            costNote: "low-cost candidate",
          },
          questionId: "unknown-question",
          answer: "Product documentation sample setup answer.",
          provenance: [],
          latencyMs: 50,
        },
      ],
    }

    expect(() =>
      createSupportAgentEvalReport({
        generatedAt: "2026-05-14T00:00:00.000Z",
        questions: [setupQuestion],
        run,
        execution: {
          completed: true,
          command: "pnpm --filter web support-agent:eval",
          credentialState: "configured",
          notes: "Live run completed with local OpenAI credentials.",
        },
      })
    ).toThrow("Unknown support-agent eval question: unknown-question")
  })
})
