import { describe, expect, test, vi } from "vitest"

import { supportAgentEvalQuestions } from "./eval-fixtures"
import { runSupportAgentModelCandidateEvals } from "./eval-runner"

describe("support-agent eval runner", () => {
  test("executes every eval question for each configured model candidate", async () => {
    const firstGenerateText = vi.fn(async ({ prompt }) => ({
      text: `first model answer for ${prompt}`,
    }))
    const secondGenerateText = vi.fn(async ({ prompt }) => ({
      text: `second model answer for ${prompt}`,
    }))

    const run = await runSupportAgentModelCandidateEvals({
      candidates: [
        {
          id: "openai-gpt-5-mini",
          label: "GPT-5 mini",
          provider: { provider: "openai", model: "gpt-5-mini", apiKey: "sk-test-1" },
          generateText: firstGenerateText,
          costNote: "low-cost candidate",
        },
        {
          id: "openai-gpt-5.1-mini",
          label: "GPT-5.1 mini",
          provider: { provider: "openai", model: "gpt-5.1-mini", apiKey: "sk-test-2" },
          generateText: secondGenerateText,
          costNote: "comparison candidate",
        },
      ],
      questions: supportAgentEvalQuestions,
      clock: createIncrementingClock(),
    })

    expect(firstGenerateText).toHaveBeenCalledTimes(supportAgentEvalQuestions.length)
    expect(secondGenerateText).toHaveBeenCalledTimes(supportAgentEvalQuestions.length)
    expect(run.results).toHaveLength(supportAgentEvalQuestions.length * 2)
    expect(run.results[0]).toMatchObject({
      candidate: {
        id: "openai-gpt-5-mini",
        provider: "openai",
        model: "gpt-5-mini",
        hasApiKey: true,
      },
      questionId: supportAgentEvalQuestions[0]?.id,
      answer: expect.stringContaining("first model answer"),
      provenance: [
        {
          id: "citation_chunk_product_docs_setup",
          knowledgeSourceId: "knowledge_product_docs",
          title: "Product documentation sample",
        },
      ],
    })
  })

  test("uses a runtime clock when no test clock is provided", async () => {
    const generateText = vi.fn(async () => ({
      text: "Product documentation sample setup answer.",
    }))

    const run = await runSupportAgentModelCandidateEvals({
      candidates: [
        {
          id: "openai-gpt-5-mini",
          label: "GPT-5 mini",
          provider: { provider: "openai", model: "gpt-5-mini", apiKey: "sk-test-1" },
          generateText,
          costNote: "low-cost candidate",
        },
        {
          id: "openai-gpt-5.1-mini",
          label: "GPT-5.1 mini",
          provider: { provider: "openai", model: "gpt-5.1-mini", apiKey: "sk-test-2" },
          generateText,
          costNote: "comparison candidate",
        },
      ],
      questions: [supportAgentEvalQuestions[0]!],
    })

    expect(run.results[0]?.latencyMs).toBeGreaterThanOrEqual(0)
  })

  test("fails loudly before running when provider config is missing", async () => {
    const generateText = vi.fn(async () => ({ text: "unused" }))

    await expect(
      runSupportAgentModelCandidateEvals({
        candidates: [
          {
            id: "missing-model",
            label: "Missing model",
            provider: { provider: "openai", apiKey: "sk-test" },
            generateText,
            costNote: "missing model should fail",
          },
          {
            id: "configured-model",
            label: "Configured model",
            provider: { provider: "openai", model: "gpt-5-mini", apiKey: "sk-test" },
            generateText,
            costNote: "configured candidate",
          },
        ],
        questions: supportAgentEvalQuestions,
      })
    ).rejects.toThrow(
      "Support-agent eval candidate missing-model requires provider, model, and API key. Missing: model."
    )
    expect(generateText).not.toHaveBeenCalled()
  })

  test("fails loudly before running when provider is unsupported", async () => {
    const generateText = vi.fn(async () => ({ text: "unused" }))

    await expect(
      runSupportAgentModelCandidateEvals({
        candidates: [
          {
            id: "anthropic-model",
            label: "Anthropic model",
            provider: {
              provider: "anthropic",
              model: "claude-sonnet-4.5",
              apiKey: "sk-test",
            },
            generateText,
            costNote: "unsupported provider should fail",
          },
          {
            id: "configured-model",
            label: "Configured model",
            provider: { provider: "openai", model: "gpt-5-mini", apiKey: "sk-test" },
            generateText,
            costNote: "configured candidate",
          },
        ],
        questions: supportAgentEvalQuestions,
      })
    ).rejects.toThrow(
      "Support-agent eval candidate anthropic-model requires provider, model, and API key."
    )
    expect(generateText).not.toHaveBeenCalled()
  })

  test("requires at least two configured model candidates", async () => {
    const generateText = vi.fn(async () => ({ text: "unused" }))

    await expect(
      runSupportAgentModelCandidateEvals({
        candidates: [
          {
            id: "single-model",
            label: "Single model",
            provider: { provider: "openai", model: "gpt-5-mini", apiKey: "sk-test" },
            generateText,
            costNote: "single candidate",
          },
        ],
        questions: supportAgentEvalQuestions,
      })
    ).rejects.toThrow(
      "Support-agent evals require at least two configured model candidates."
    )
    expect(generateText).not.toHaveBeenCalled()
  })
})

function createIncrementingClock(): () => number {
  let value = 0
  return () => {
    value += 25
    return value
  }
}
