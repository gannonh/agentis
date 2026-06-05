import { useMemo, useState } from "react"
import {
  staticArtifactMetadataSchema,
  type ArtifactDetailResponse,
  type StaticArtifactRenderMode,
  type StaticArtifactType,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type PreviewAssetReference = {
  assetId: string
  slideIndex?: number
  storageKey: string
  mimeType: string
  sizeBytes: number
  altText?: string
}

type PreviewMetadata = {
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
  theme?: string
  slideCount?: number
  assetReferences: PreviewAssetReference[]
  provider?: string
  safetyValidationResult: { errors: string[]; warnings: string[] }
  generationWarnings: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function lenientStaticMetadata(value: unknown): PreviewMetadata | null {
  if (!isRecord(value)) return null
  if (value.artifactType !== "webpage" && value.artifactType !== "slides") {
    return null
  }
  if (value.renderMode !== "html" && value.renderMode !== "polishedImage") {
    return null
  }
  const assetReferences = Array.isArray(value.assetReferences)
    ? value.assetReferences.flatMap((asset) => {
        if (!isRecord(asset) || typeof asset.assetId !== "string") return []
        return [
          {
            assetId: asset.assetId,
            slideIndex:
              typeof asset.slideIndex === "number" ? asset.slideIndex : undefined,
            storageKey:
              typeof asset.storageKey === "string" ? asset.storageKey : "hidden",
            mimeType:
              typeof asset.mimeType === "string" ? asset.mimeType : "application/octet-stream",
            sizeBytes: typeof asset.sizeBytes === "number" ? asset.sizeBytes : 0,
            altText: typeof asset.altText === "string" ? asset.altText : undefined,
          },
        ]
      })
    : []
  const safety = isRecord(value.safetyValidationResult)
    ? value.safetyValidationResult
    : {}

  return {
    artifactType: value.artifactType,
    renderMode: value.renderMode,
    theme: typeof value.theme === "string" ? value.theme : undefined,
    slideCount: typeof value.slideCount === "number" ? value.slideCount : undefined,
    assetReferences,
    provider: typeof value.provider === "string" ? value.provider : undefined,
    safetyValidationResult: {
      errors: stringArray(safety.errors),
      warnings: stringArray(safety.warnings),
    },
    generationWarnings: stringArray(value.generationWarnings),
  }
}

function staticMetadata(detail: ArtifactDetailResponse): PreviewMetadata | null {
  const parsed = staticArtifactMetadataSchema.safeParse(detail.artifact.metadata)
  if (parsed.success) return parsed.data
  return lenientStaticMetadata(detail.artifact.metadata)
}

function issueFromMetadata(metadata: PreviewMetadata | null): {
  code: string
  message: string
} | null {
  if (!metadata) {
    return {
      code: "static_artifact_asset_missing",
      message: "Static artifact metadata is missing or invalid.",
    }
  }

  const details = [
    ...metadata.safetyValidationResult.errors,
    ...metadata.generationWarnings,
  ]
  const providerIssue = details.find((detail) =>
    /provider.*unavailable|static_artifact_provider_unavailable/i.test(detail)
  )
  if (providerIssue) {
    return {
      code: "static_artifact_provider_unavailable",
      message:
        providerIssue === "static_artifact_provider_unavailable"
          ? "Image generation provider is unavailable for polished slides."
          : providerIssue,
    }
  }

  const imageIssue = details.find((detail) =>
    /image.*generation|static_artifact_image_generation_failed/i.test(detail)
  )
  if (imageIssue) {
    return {
      code: "static_artifact_image_generation_failed",
      message: imageIssue,
    }
  }

  return null
}

function PreviewIssue({ code, message }: { code: string; message: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium text-amber-700 dark:text-amber-400">{code}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
    </div>
  )
}

function StaticHtmlFrame({
  title,
  html,
  mode,
}: {
  title: string
  html: string
  mode: "webpage" | "slides"
}) {
  const isSlides = mode === "slides"
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {isSlides
          ? "Keyboard navigation runs inside an isolated static preview."
          : "Scrollable static webpage preview"}
      </p>
      <iframe
        title={isSlides ? `${title} HTML slide deck` : `${title} static webpage`}
        srcDoc={html}
        sandbox={isSlides ? "allow-scripts" : ""}
        className={cn(
          "w-full rounded-lg border border-border bg-white",
          isSlides ? "aspect-video min-h-[420px]" : "h-[70vh]"
        )}
      />
    </div>
  )
}

function assetUrl(artifactId: string, assetId: string) {
  return `/api/artifacts/${artifactId}/assets/${encodeURIComponent(assetId)}`
}

function PolishedImageDeck({
  artifactId,
  metadata,
}: {
  artifactId: string
  metadata: PreviewMetadata | null
}) {
  const [index, setIndex] = useState(0)
  const [missingAsset, setMissingAsset] = useState(false)
  const assets = useMemo(
    () =>
      [...(metadata?.assetReferences ?? [])].sort(
        (left, right) => (left.slideIndex ?? 0) - (right.slideIndex ?? 0)
      ),
    [metadata]
  )
  const issue = issueFromMetadata(metadata)

  if (issue && assets.length === 0) {
    return <PreviewIssue code={issue.code} message={issue.message} />
  }
  if (assets.length === 0) {
    return (
      <PreviewIssue
        code="static_artifact_asset_missing"
        message="No persisted slide assets were found for this polished image deck."
      />
    )
  }

  const current = assets[Math.min(index, assets.length - 1)]
  const move = (delta: number) => {
    setIndex((value) => Math.max(0, Math.min(value + delta, assets.length - 1)))
  }

  return (
    <div
      role="region"
      aria-label="Polished image slide deck"
      tabIndex={0}
      className="space-y-3 outline-none"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === " ") move(1)
        if (event.key === "ArrowLeft") move(-1)
      }}
    >
      {missingAsset ? (
        <PreviewIssue
          code="static_artifact_asset_missing"
          message="A persisted slide asset could not be loaded."
        />
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
        <img
          src={assetUrl(artifactId, current.assetId)}
          alt={current.altText ?? `Slide ${index + 1}`}
          className="aspect-video w-full object-contain"
          onError={() => setMissingAsset(true)}
        />
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <Button size="sm" variant="outline" disabled={index === 0} onClick={() => move(-1)}>
          Previous
        </Button>
        <span className="text-muted-foreground">
          {index + 1} / {assets.length}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={index === assets.length - 1}
          onClick={() => move(1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export function StaticArtifactPreview({
  detail,
}: {
  detail: ArtifactDetailResponse
}) {
  const metadata = staticMetadata(detail)
  if (!metadata) {
    return (
      <PreviewIssue
        code="static_artifact_invalid_type"
        message="This artifact does not include static artifact metadata."
      />
    )
  }

  if (metadata.artifactType === "webpage") {
    return (
      <StaticHtmlFrame
        title={detail.artifact.title}
        html={detail.content ?? ""}
        mode="webpage"
      />
    )
  }

  if (metadata.renderMode === "html") {
    return (
      <StaticHtmlFrame
        title={detail.artifact.title}
        html={detail.content ?? ""}
        mode="slides"
      />
    )
  }

  return <PolishedImageDeck artifactId={detail.artifact.id} metadata={metadata} />
}
