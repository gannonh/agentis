import type { Message, MessagePart } from "./schemas.js"
import {
  shouldSuppressTextForToolResults,
  stripRedundantArtifactLinkLines,
} from "./message-text.js"

const PREVIEW_MAX_LENGTH = 160

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

function getVisibleMessageText(message: Message): string {
  const text = getTextFromParts(message.parts)
  if (shouldSuppressTextForToolResults(text, message.parts)) {
    return ""
  }
  const hasToolParts = message.parts.some(
    (part) =>
      part.type === "tool-call" ||
      part.type === "tool-result" ||
      part.type === "tool-error"
  )
  const normalized =
    message.role === "assistant" && hasToolParts
      ? stripRedundantArtifactLinkLines(text)
      : text
  return normalized.trim()
}

function lastMessageTextByRole(
  messages: Message[],
  role: Message["role"]
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== role) continue
    const text = getVisibleMessageText(message)
    if (text) return summarizeThreadPreview(text)
  }
  return null
}

export function threadListSummaryFromMessages(
  messages: Pick<Message, "role" | "parts">[]
): string | null {
  const typedMessages = messages as Message[]
  return (
    lastMessageTextByRole(typedMessages, "assistant") ??
    lastMessageTextByRole(typedMessages, "user")
  )
}
