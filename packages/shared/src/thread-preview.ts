import type { Message, MessagePart } from "./schemas.js"
import {
  shouldSuppressTextForToolResults,
  stripRedundantArtifactLinkLines,
} from "./message-text.js"

const PREVIEW_MAX_LENGTH = 160

type ThreadSummaryMessage = Pick<Message, "role" | "parts">

export function summarizeThreadPreview(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (!trimmed) return ""
  if (trimmed.length <= PREVIEW_MAX_LENGTH) return trimmed
  return `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 3)}...`
}

function getTextFromParts(parts: MessagePart[]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function hasToolParts(parts: MessagePart[]): boolean {
  return parts.some(
    (part) =>
      part.type === "tool-call" ||
      part.type === "tool-result" ||
      part.type === "tool-error"
  )
}

function getVisibleMessageText(message: ThreadSummaryMessage): string {
  const text = getTextFromParts(message.parts)
  if (shouldSuppressTextForToolResults(text, message.parts)) {
    return ""
  }
  const normalized =
    message.role === "assistant" && hasToolParts(message.parts)
      ? stripRedundantArtifactLinkLines(text)
      : text
  return normalized.trim()
}

export function threadListSummaryFromMessages(
  messages: ThreadSummaryMessage[]
): string | null {
  let userFallback: string | null = null

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    const text = getVisibleMessageText(message)
    if (!text) continue

    const preview = summarizeThreadPreview(text)
    if (message.role === "assistant") return preview
    if (message.role === "user" && userFallback === null) {
      userFallback = preview
    }
  }

  return userFallback
}
