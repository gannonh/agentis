import type { Message } from "@workspace/shared"
import {
  shouldSuppressTextForToolResults,
  stripRedundantArtifactLinkLines,
} from "@workspace/shared"

export function getTranscriptText(message: Message): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

export function getDisplayTranscriptText(message: Message): string {
  const text = getTranscriptText(message)
  if (shouldSuppressTextForToolResults(text, message.parts)) {
    return ""
  }
  return stripRedundantArtifactLinkLines(text).trim()
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
