import type { Message, MessagePart } from "@workspace/shared"

export function getTranscriptText(message: Message): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function hasToolResultParts(parts: MessagePart[]): boolean {
  return parts.some((part) => part.type === "tool-result")
}

function looksLikeToolProviderJson(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) return true
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>
        if ("results" in record && ("query" in record || "provider" in record)) {
          return true
        }
        if ("documentId" in record || "toolCallId" in record) {
          return true
        }
        return Object.keys(record).length > 0
      }
    } catch {
      return false
    }
  }

  return false
}

export function shouldSuppressTextForToolResults(
  text: string,
  parts: MessagePart[]
): boolean {
  if (!hasToolResultParts(parts)) return false
  const trimmed = text.trim()
  if (!trimmed) return false
  return looksLikeToolProviderJson(trimmed)
}

export function getDisplayTranscriptText(message: Message): string {
  const text = getTranscriptText(message)
  if (shouldSuppressTextForToolResults(text, message.parts)) {
    return ""
  }
  return text
}

export function messageHasVisibleContent(message: Message): boolean {
  const text = getDisplayTranscriptText(message)
  if (text.trim()) return true
  return message.parts.some(
    (part) =>
      part.type === "tool-result" ||
      part.type === "tool-error" ||
      (part.type === "tool-call" && message.status === "streaming")
  )
}
