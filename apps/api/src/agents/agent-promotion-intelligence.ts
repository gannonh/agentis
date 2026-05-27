import type { AgentPromotionDraft, Message, Thread } from "@workspace/shared"

function messageText(message: Message): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim()
}

export function firstUserText(messages: Message[]): string | null {
  const user = messages.find((message) => message.role === "user")
  const text = user ? messageText(user) : ""
  return text || null
}

function stripTerminalPunctuation(text: string): string {
  return text.replace(/[.!?]+$/u, "").trim()
}

function lowerFirst(text: string): string {
  return text ? text[0].toLowerCase() + text.slice(1) : text
}

function splitStepsFromText(text: string): string[] {
  return stripTerminalPunctuation(text)
    .split(/\bthen\b|[.\n,]|\band\b/iu)
    .map((step) => stripTerminalPunctuation(step.trim()))
    .filter(Boolean)
}

function splitRepeatedSteps(messages: Message[]): string[] {
  return messages.flatMap((message) => splitStepsFromText(messageText(message)))
}

export function buildDraftIntelligence(
  thread: Pick<Thread, "model">,
  messages: Message[],
  toolGrants: AgentPromotionDraft["toolGrants"]
): AgentPromotionDraft["intelligence"] {
  const sourceText = firstUserText(messages)
  const purpose = sourceText ?? "Use the source thread context."
  const promptPurpose = sourceText
    ? stripTerminalPunctuation(sourceText)
    : "use the source thread context"

  return {
    suggestedPurpose: purpose,
    repeatedSteps: splitRepeatedSteps(messages),
    requiredTools: toolGrants,
    suggestedPrompt: sourceText
      ? `Use the source thread context to ${lowerFirst(promptPurpose)}.`
      : "Use the source thread context.",
    modelRecommendation: {
      model: thread.model,
      reason: "Uses the model from the source thread.",
    },
    rubricCriteria: [
      "Uses the source thread context",
      "Completes the repeated steps consistently",
      "Explains tool usage and assumptions",
    ],
  }
}
