import type { ArtifactDetailResponse } from "@workspace/shared"
import { appMetadataSchema } from "@workspace/shared"

export function appArtifactSummary(detail: ArtifactDetailResponse): string {
  const parsed = appMetadataSchema.safeParse(detail.artifact.metadata)
  if (!parsed.success) return "Interactive App artifact"
  const validation = parsed.data.bundleValidation
  if (validation.status === "failed") {
    return "App bundle failed validation"
  }
  return "Interactive App with mutable runtime state"
}
