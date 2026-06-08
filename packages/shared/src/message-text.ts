import type { MessagePart } from "./schemas.js"

function hasToolResultParts(parts: MessagePart[]): boolean {
  return parts.some((part) => part.type === "tool-result")
}

export function looksLikeRawToolProviderJson(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return false
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false
    }
    const record = parsed as Record<string, unknown>
    if ("results" in record && ("query" in record || "provider" in record)) {
      return true
    }
    if (
      "documentId" in record &&
      ("viewPath" in record || "title" in record || "currentVersion" in record)
    ) {
      return true
    }
    if ("toolCallId" in record && "toolName" in record) {
      return true
    }
    return false
  } catch {
    return false
  }
}

export function shouldSuppressTextForToolResults(
  text: string,
  parts: MessagePart[]
): boolean {
  if (!hasToolResultParts(parts)) return false
  const trimmed = text.trim()
  if (!trimmed) return false
  return looksLikeRawToolProviderJson(trimmed)
}
