import type { DocumentPublic as Document } from "@workspace/shared"

export function isProjectDocument(document: Document) {
  return document.type === "document"
}

export function isProjectFile() {
  return false
}
