import {
  searchWebOutputSchema,
  type MessagePart,
  type SearchWebOutput,
  type Thread,
} from "@workspace/shared"
import type { DocumentService } from "../documents/document-service.js"
import { looksLikeResearchBriefIntent } from "../native-tools/native-tool-capability-catalog.js"
import type { Repositories } from "../repositories/index.js"

function parseSearchWebOutput(output: unknown): SearchWebOutput | null {
  const parsed = searchWebOutputSchema.safeParse(output)
  return parsed.success ? parsed.data : null
}

function collectSearchResults(parts: MessagePart[]): SearchWebOutput[] {
  const outputs: SearchWebOutput[] = []
  for (const part of parts) {
    if (part.type !== "tool-result" || part.toolName !== "searchWeb") continue
    const parsed = parseSearchWebOutput(part.output)
    if (parsed) outputs.push(parsed)
  }
  return outputs
}

function uniqueSearchResults(searches: SearchWebOutput[]) {
  const seen = new Set<string>()
  const results: SearchWebOutput["results"] = []
  for (const search of searches) {
    for (const result of search.results) {
      if (seen.has(result.url)) continue
      seen.add(result.url)
      results.push(result)
    }
  }
  return results
}

export function inferResearchBriefTitle(prompt: string): string {
  const topicMatch = prompt.match(
    /research\s+(?:how|what|why|whether)?\s*(.+?)(?:\.|,| and create|\s+then\b)/i
  )
  const topic = topicMatch?.[1]?.trim()
  if (topic && topic.length <= 80) {
    return `Research brief: ${topic}`
  }
  return "Research brief"
}

function buildResearchBriefMarkdown(input: {
  title: string
  prompt: string
  results: SearchWebOutput["results"]
}): string {
  const sourceLines =
    input.results.length > 0
      ? input.results
          .map((result) => {
            const snippet = result.snippet?.trim()
            return snippet
              ? `- [${result.title}](${result.url}): ${snippet}`
              : `- [${result.title}](${result.url})`
          })
          .join("\n")
      : "_No web sources were returned._"

  return `# ${input.title}

## Overview

This brief synthesizes web research for: ${input.prompt.trim()}

## Key sources

${sourceLines}

## Notes

Review linked sources before acting on these findings.`
}

export function runHasResearchBriefDocument(
  repos: Repositories,
  runId: string,
  threadId: string
): boolean {
  return repos.documents
    .list({ threadId })
    .some((document) => document.runId === runId)
}

function hasSuccessfulCreateDocumentResult(parts: MessagePart[]): boolean {
  return parts.some((part) => {
    if (part.type !== "tool-result" || part.toolName !== "createDocument") {
      return false
    }
    const output = part.output
    if (!output || typeof output !== "object") return false
    return typeof (output as Record<string, unknown>).documentId === "string"
  })
}

export function finalizeResearchBriefIfNeeded(input: {
  repos: Repositories
  documentService: DocumentService
  thread: Thread
  runId: string
  latestUserPrompt: string
  assistantParts: MessagePart[]
  documentsPermitted?: boolean
}): { assistantParts: MessagePart[]; created: boolean } {
  if (input.documentsPermitted === false) {
    return { assistantParts: input.assistantParts, created: false }
  }
  if (!looksLikeResearchBriefIntent(input.latestUserPrompt)) {
    return { assistantParts: input.assistantParts, created: false }
  }
  if (hasSuccessfulCreateDocumentResult(input.assistantParts)) {
    return { assistantParts: input.assistantParts, created: false }
  }
  if (runHasResearchBriefDocument(input.repos, input.runId, input.thread.id)) {
    return { assistantParts: input.assistantParts, created: false }
  }

  const searches = collectSearchResults(input.assistantParts)
  if (searches.length === 0) {
    return { assistantParts: input.assistantParts, created: false }
  }

  const results = uniqueSearchResults(searches).slice(0, 12)
  const title = inferResearchBriefTitle(input.latestUserPrompt)
  const generated = input.documentService.registerGenerated({
    title,
    description: "Research brief synthesized from web search results",
    content: buildResearchBriefMarkdown({
      title,
      prompt: input.latestUserPrompt,
      results,
    }),
    threadId: input.thread.id,
    projectId: input.thread.projectId ?? undefined,
    runId: input.runId,
    changeSummary: "Synthesized research brief from web search results",
  })

  if (!generated.ok) {
    const toolParts = input.assistantParts.filter((part) => part.type !== "text")
    const failureText = `I searched the web but could not save the research brief to the Library: ${generated.message}`
    return {
      assistantParts: [{ type: "text", text: failureText }, ...toolParts],
      created: false,
    }
  }

  input.repos.steps.create({
    runId: input.runId,
    type: "tool-result",
    status: "completed",
    title: `Document created: ${generated.document.title}`,
    payload: {
      documentId: generated.document.id,
      title: generated.document.title,
      visibilityScope: generated.document.visibilityScope,
      currentVersion: generated.currentVersion,
      viewPath: `/documents/${generated.document.id}`,
    },
  })

  const summaryText = `I searched the web (${searches.length} quer${searches.length === 1 ? "y" : "ies"}) and saved a research brief to the Library: **${generated.document.title}**. Open it at [/documents/${generated.document.id}](/documents/${generated.document.id}).`
  const toolParts = input.assistantParts.filter((part) => part.type !== "text")

  return {
    assistantParts: [{ type: "text", text: summaryText }, ...toolParts],
    created: true,
  }
}
