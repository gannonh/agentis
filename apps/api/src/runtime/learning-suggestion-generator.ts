import type { MessagePart, Run, Thread } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"
import { getTextFromParts } from "./run-message-adapters.js"

const LEARNING_TRIGGER_PATTERN =
  /\b(remember|prefer|always|never|from now on|keep in mind)\b/i

function inferSuggestionTitle(prompt: string): string {
  if (LEARNING_TRIGGER_PATTERN.test(prompt)) {
    return "Capture stated preference"
  }
  return "Review conversation insight"
}

function inferSuggestionContent(input: {
  latestUserPrompt: string
  assistantText: string
}): string | null {
  const prompt = input.latestUserPrompt.trim()
  if (!prompt) return null

  if (LEARNING_TRIGGER_PATTERN.test(prompt)) {
    return `User preference from thread: ${prompt}`
  }

  const assistantText = input.assistantText.trim()
  if (assistantText.length >= 40) {
    const excerpt = assistantText.slice(0, 240).trim()
    return `Conversation takeaway: ${excerpt}${assistantText.length > 240 ? "…" : ""}`
  }

  return null
}

export function maybeGenerateLearningSuggestions(input: {
  repos: Repositories
  mockRuntime: boolean
  run: Run
  thread: Thread
  latestUserPrompt: string
  assistantParts: MessagePart[]
}): void {
  const assistantText = getTextFromParts(input.assistantParts)
  const content =
    input.mockRuntime && input.latestUserPrompt.trim()
      ? `Mock-runtime review candidate from prompt: ${input.latestUserPrompt.trim()}`
      : inferSuggestionContent({
          latestUserPrompt: input.latestUserPrompt,
          assistantText,
        })

  if (!content) return

  input.repos.learningSuggestions.create({
    suggestionType: "memory",
    title: inferSuggestionTitle(input.latestUserPrompt),
    content,
    confidence: input.mockRuntime ? 0.85 : 0.72,
    sourceThreadId: input.thread.id,
    sourceThreadTitle: input.thread.title,
    agentId: input.run.agentId ?? input.thread.agentId ?? null,
  })
}
