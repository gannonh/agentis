import {
  staticArtifactMetadataSchema,
  type ArtifactDetailResponse,
} from "@workspace/shared"

export function staticArtifactSummary(detail: ArtifactDetailResponse): string {
  const parsed = staticArtifactMetadataSchema.safeParse(detail.artifact.metadata)
  if (!parsed.success) return `${detail.artifact.type} · static artifact`
  return [
    parsed.data.artifactType,
    parsed.data.renderMode,
    parsed.data.theme,
    parsed.data.slideCount ? `${parsed.data.slideCount} slides` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}
