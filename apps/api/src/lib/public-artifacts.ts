import {
  artifactPublicSchema,
  type Artifact,
  type ArtifactPublic,
} from "@workspace/shared"

export function toPublicArtifact(artifact: Artifact): ArtifactPublic {
  return artifactPublicSchema.parse(artifact)
}
