import type { MessageTextSource } from "./message-text.js"
import { getVisibleMessageText } from "./message-text.js"

const PREVIEW_MAX_LENGTH = 160

export function summarizeThreadPreview(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (!trimmed) return ""
  if (trimmed.length <= PREVIEW_MAX_LENGTH) return trimmed
  return `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 3)}...`
}

export function threadListSummaryFromMessages(
  messages: MessageTextSource[]
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
