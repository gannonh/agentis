import type { ModelMessage, UIMessage } from "ai"
import {
  shouldSuppressTextForToolResults,
  stripRedundantArtifactLinkLines,
  type Message,
  type MessagePart,
} from "@workspace/shared"
import { summarizeToolOutput } from "../composio/sanitize.js"
import { isPendingApprovalOutput } from "../workspaces/workspace-mutation-output.js"

export function getTextFromParts(parts: MessagePart[]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

export function hasToolParts(parts: MessagePart[]) {
  return parts.some(
    (part) =>
      part.type === "tool-call" ||
      part.type === "tool-result" ||
      part.type === "tool-error"
  )
}

export function normalizeAssistantText(text: string) {
  return stripRedundantArtifactLinkLines(
    text
    .replace(
      /\[([^\]]+)\]\(https?:\/\/yourworkspaceurl\/library\?documentId=([\w-]+)[^)]*\)/gi,
      "[$1](/documents/$2)"
    )
    .replace(
      /https?:\/\/yourworkspaceurl\/library\?documentId=([\w-]+)[^\s)\]]*/gi,
      "/documents/$1"
    )
    .replace(
      /\[([^\]]+)\]\(https?:\/\/yourworkspaceurl\/documents\/([\w-]+)[^)]*\)/gi,
      "[$1](/documents/$2)"
    )
    .replace(
      /https?:\/\/yourworkspaceurl\/documents\/([\w-]+)[^\s)\]]*/gi,
      "/documents/$1"
    )
    .replace(/https?:\/\/yourworkspaceurl(\/[^\s)\]]*)/gi, "$1")
  ).trim()
}

export function setTextPart(
  parts: MessagePart[],
  text: string,
  options?: { normalize?: boolean }
): MessagePart[] {
  const nonText = parts.filter((part) => part.type !== "text")
  const normalizedText =
    options?.normalize === false ? text : normalizeAssistantText(text)
  return normalizedText
    ? [{ type: "text", text: normalizedText }, ...nonText]
    : nonText
}

function renderToolSummary(output: unknown): string {
  const summary = summarizeToolOutput(output)
  if (summary === undefined) return ""
  if (typeof summary === "string") return summary
  return JSON.stringify(summary) ?? ""
}

function formatToolResultsForModel(parts: MessagePart[]) {
  return parts
    .filter((part) => part.type === "tool-result")
    .map(
      (part) => `Tool ${part.toolName} result: ${renderToolSummary(part.output)}`
    )
    .filter((line) => line.length > 0)
    .join("\n")
}

function renderToolErrorDetails(details: unknown): string {
  if (details === undefined) return ""
  try {
    return ` Details: ${JSON.stringify(details)}`
  } catch {
    return ` Details: ${String(details)}`
  }
}

function formatToolErrorsForModel(parts: MessagePart[]) {
  return parts
    .filter((part) => part.type === "tool-error")
    .map((part) => {
      const code = part.code ? ` (${part.code})` : ""
      return `Tool ${part.toolName} error${code}: ${part.error}${renderToolErrorDetails(
        part.details
      )}`
    })
    .join("\n")
}

export function stripRedundantToolJsonText(parts: MessagePart[]): MessagePart[] {
  const text = getTextFromParts(parts)
  if (!shouldSuppressTextForToolResults(text, parts)) {
    return parts
  }
  return setTextPart(parts, "")
}

export function formatToolResultFallback(parts: MessagePart[]): string | null {
  const toolResult = [...parts]
    .reverse()
    .find((part) => part.type === "tool-result")
  if (!toolResult || toolResult.type !== "tool-result") return null
  const summary = summarizeToolOutput(toolResult.output)
  if (summary === undefined || summary === null) return null
  if (typeof summary === "string") return summary
  try {
    return JSON.stringify(summary, null, 2)
  } catch {
    return String(summary)
  }
}

export function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => {
      const text = getTextFromParts(message.parts)
      const toolSummary = formatToolResultsForModel(message.parts)
      const toolErrors = formatToolErrorsForModel(message.parts)
      const content = [text, toolSummary, toolErrors]
        .filter(Boolean)
        .join("\n\n")
      return {
        role: message.role,
        content,
      }
    })
    .filter((message) => message.content.length > 0) as ModelMessage[]
}

export function toUiMessages(messages: Message[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts
      .filter((part) => part.type === "text")
      .map((part) => ({ type: "text" as const, text: part.text })),
  }))
}

function hasPendingApprovalPart(parts: MessagePart[]) {
  return parts.some(
    (part) => part.type === "tool-result" && isPendingApprovalOutput(part.output)
  )
}

export function suppressTextForPendingApproval(parts: MessagePart[]) {
  return hasPendingApprovalPart(parts) ? setTextPart(parts, "") : parts
}

export function hasPendingApprovalInParts(parts: MessagePart[]) {
  return hasPendingApprovalPart(parts)
}
