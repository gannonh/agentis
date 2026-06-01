import type { DocumentPublic as Document, DocumentType } from "@workspace/shared"

export const PROJECT_DOCUMENT_TYPES: DocumentType[] = [
  "markdown",
  "webpage",
  "slides",
  "table",
]

export const PROJECT_FILE_TYPES: DocumentType[] = ["image", "video", "other"]

export function isProjectDocument(document: Document) {
  return PROJECT_DOCUMENT_TYPES.includes(document.documentType)
}

export function isProjectFile(document: Document) {
  return PROJECT_FILE_TYPES.includes(document.documentType)
}
