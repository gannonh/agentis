import type { DocumentPublic as Document } from "@workspace/shared"

export function documentSourceLabel(document: Document) {
  if (document.agentId || document.agentNameSnapshot) {
    return "Agent generated"
  }
  return "User upload"
}

export function documentScopeLabel(document: Document) {
  switch (document.visibilityScope) {
    case "global":
      return "Global"
    case "project":
      return "Project"
    case "thread":
      return "Thread"
  }
}

export function documentProvenanceLines(document: Document) {
  const lines: string[] = [documentSourceLabel(document)]
  if (document.agentNameSnapshot) {
    lines.push(document.agentNameSnapshot)
  }
  if (document.threadTitleSnapshot) {
    lines.push(document.threadTitleSnapshot)
  }
  if (document.projectNameSnapshot) {
    lines.push(document.projectNameSnapshot)
  }
  return lines
}

export function isMarkdownEditable(document: Document) {
  return document.documentType === "markdown" && document.contentFormat !== "binary"
}
