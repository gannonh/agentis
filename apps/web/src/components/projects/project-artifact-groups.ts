import type { ArtifactPublic as Artifact, ArtifactType } from "@workspace/shared"

export const PROJECT_DOCUMENT_TYPES: ArtifactType[] = [
  "document",
  "webpage",
  "slides",
  "table",
]

export const PROJECT_FILE_TYPES: ArtifactType[] = ["image", "video", "other"]

export function isProjectDocument(artifact: Artifact) {
  return PROJECT_DOCUMENT_TYPES.includes(artifact.type)
}

export function isProjectFile(artifact: Artifact) {
  return PROJECT_FILE_TYPES.includes(artifact.type)
}
