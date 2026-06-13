import type { Message } from "@workspace/shared"
import {
  getTextFromMessageParts,
  getVisibleMessageText,
} from "@workspace/shared"

export function getTranscriptText(message: Message): string {
  return getTextFromMessageParts(message.parts)
}

export function getDisplayTranscriptText(message: Message): string {
  return getVisibleMessageText(message)
}

export function messageHasVisibleContent(message: Message): boolean {
  if (
    message.status === "failed" ||
    message.status === "aborted" ||
    message.status === "streaming"
  ) {
    return true
  }
  const text = getDisplayTranscriptText(message)
  if (text.trim()) return true
  return message.parts.some(
    (part) =>
      part.type === "tool-result" ||
      part.type === "tool-error" ||
      (part.type === "tool-call" && message.status === "streaming")
  )
}
