import { createHash } from "node:crypto"
import type {
  Artifact,
  ArtifactVisibilityScope,
  StaticArtifactMetadata,
  StaticArtifactRenderMode,
  StaticArtifactTheme,
  StaticArtifactType,
} from "@workspace/shared"
import {
  staticArtifactMetadataSchema,
  validateStaticArtifactMode,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { ArtifactService, generatedArtifactVisibilityScope } from "../artifacts/artifact-service.js"
import { LocalDocumentStorage } from "../documents/local-document-storage.js"
import { createId, nowIso } from "../lib/ids.js"
import type { Repositories } from "../repositories/index.js"
import { getStaticArtifactDesignGuidance } from "./design-guidance.js"
import type { PolishedSlideProvider } from "./polished-slide-provider.js"
import { UnavailablePolishedSlideProvider } from "./polished-slide-provider.js"
import {
  STATIC_ARTIFACT_DECK_NAVIGATION_SCRIPT,
  validateStaticHtml,
} from "./static-html-validator.js"

export type StaticArtifactRunContext = {
  threadId?: string
  projectId?: string
  runId?: string
}

type StaticArtifactResult<T> = { ok: true; output: T } | StaticArtifactError

type StaticArtifactError = {
  ok: false
  code: string
  message: string
  status?: number
  remediation?: string
}

type StaticArtifactOutput = {
  artifactId: string
  title: string
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
  version: number
  viewPath: string
  downloadPath?: string
  theme: string
  slideCount?: number
  provider?: string
  summary: string
}

type EditStaticArtifactOutput = Omit<StaticArtifactOutput, "downloadPath" | "theme" | "provider" | "slideCount"> & {
  previousVersion: number
}

type FindStaticArtifactsOutput = {
  items: Array<{
    artifactId: string
    title: string
    artifactType: StaticArtifactType
    renderMode: StaticArtifactRenderMode
    version: number
    viewPath: string
    theme?: string
    updatedAt: string
  }>
  resultCount: number
  truncated: boolean
}

type StaticArtifactAssetWrite = {
  storageKey: string
  data: Buffer
}

type StaticArtifactVersionMetadataSnapshot = StaticArtifactMetadata & {
  version: number
  createdAt: string
}

type StaticArtifactMetadataWithHistory = StaticArtifactMetadata & {
  versionHistory?: StaticArtifactVersionMetadataSnapshot[]
}

function staticArtifactError(
  code: string,
  message: string,
  status = 400,
  remediation?: string
): StaticArtifactError {
  return { ok: false, code, message, status, remediation }
}

function links(artifactId: string) {
  return {
    viewPath: `/artifacts/${artifactId}`,
    downloadPath: `/api/artifacts/${artifactId}/download`,
  }
}

function contentHash(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function previewText(content: string, maxChars: number): string | undefined {
  const stripped = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  if (!stripped) return undefined
  return stripped.length > maxChars ? `${stripped.slice(0, maxChars)}…` : stripped
}

function assetExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg"
  if (mimeType === "image/webp") return "webp"
  if (mimeType === "image/gif") return "gif"
  return "png"
}

function sentenceCase(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`
}

function proseTopicList(contentBrief: string): string[] {
  const match =
    /\b(?:including|covering|covers|cover|with sections on|with slides on)\b(?<topics>[\s\S]+)/i.exec(
      contentBrief
    )
  const topics = match?.groups?.topics
  if (!topics) return []

  const normalized = topics
    .replace(/[.?!]\s*$/u, "")
    .replace(/\s+and\s+/gi, ", ")
  const parsed = normalized
    .split(/[,;]+/)
    .map((topic) => sentenceCase(topic.replace(/^[-*\d.\s:]+/, "")))
    .filter((topic) => topic.length > 0)

  return parsed.length > 1 ? parsed : []
}

function slideLines(contentBrief: string): string[] {
  const lines = contentBrief
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-*\d.\s:]+/, "").trim())
    .filter(Boolean)
  if (lines.length > 1) return lines.slice(0, 12)
  const topics = proseTopicList(contentBrief)
  if (topics.length > 0) return topics.slice(0, 12)
  if (lines.length > 0) return lines.slice(0, 12)
  return [contentBrief.trim() || "Static slide"]
}

type SlideSection = {
  title: string
  body: string[]
}

function outlineParagraphs(contentBrief: string): string[][] {
  return contentBrief
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n+/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => sentenceCase(line.replace(/^[-*\d.\s:]+/, "").trim()))
        .filter(Boolean)
    )
    .filter((paragraph) => paragraph.length > 0)
}

function outlineSlideSections(contentBrief: string): SlideSection[] {
  const paragraphs = outlineParagraphs(contentBrief)
  if (paragraphs.length < 2) return []
  const sections: SlideSection[] = []

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    if (!paragraph) continue
    const next = paragraphs[index + 1]

    if (/^title slide$/i.test(paragraph[0] ?? "") && next) {
      sections.push({ title: next[0] ?? paragraph[0]!, body: next.slice(1) })
      index += 1
      continue
    }

    if (paragraph.length === 1 && next && next.length > 1) {
      sections.push({ title: paragraph[0]!, body: next })
      index += 1
      continue
    }

    sections.push({
      title: paragraph[0]!,
      body: paragraph.slice(1),
    })
  }

  return sections.length > 1 && sections.some((section) => section.body.length > 0)
    ? sections.slice(0, 12)
    : []
}

function buildWebpageHtml(input: {
  title: string
  contentBrief: string
  audience?: string
  purpose?: string
  sourceData?: string
  theme: string
  guidance: readonly string[]
}): string {
  const sections = [
    input.audience ? `<p><strong>Audience:</strong> ${escapeHtml(input.audience)}</p>` : "",
    input.purpose ? `<p><strong>Purpose:</strong> ${escapeHtml(input.purpose)}</p>` : "",
    `<section><h2>Brief</h2><p>${escapeHtml(input.contentBrief)}</p></section>`,
    input.sourceData
      ? `<section><h2>Source material</h2><pre>${escapeHtml(input.sourceData)}</pre></section>`
      : "",
  ].join("\n")

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>
:root{font-family:Inter,IBM Plex Sans,system-ui,sans-serif;color:#18202f;background:#f8fafc;}
body{margin:0;}main{max-width:880px;margin:0 auto;padding:48px 24px 72px;}h1{font-size:clamp(2rem,5vw,4rem);line-height:1.02;margin:0 0 16px;}h2{margin-top:40px;}p,pre{font-size:1rem;line-height:1.7;}pre{white-space:pre-wrap;background:#fff;border:1px solid #d9e0ea;border-radius:12px;padding:16px;} .meta{color:#526072;text-transform:uppercase;letter-spacing:.08em;font-size:.78rem;}
</style>
</head>
<body>
<main data-static-artifact="webpage" data-theme="${escapeHtml(input.theme)}">
<p class="meta">Static webpage · ${escapeHtml(input.theme)}</p>
<h1>${escapeHtml(input.title)}</h1>
${sections}
<section><h2>Design guidance</h2><ul>${input.guidance.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
</main>
</body>
</html>`
}

function buildSlidesHtml(input: {
  title: string
  contentBrief: string
  sourceData?: string
  theme: string
}): { html: string; slideCount: number } {
  const structuredSections = outlineSlideSections(input.contentBrief)
  const sections =
    structuredSections.length > 0
      ? structuredSections
      : slideLines(input.contentBrief).map((line, index) => ({
          title: index === 0 ? input.title : line,
          body: index === 0 ? [line] : [],
        }))
  const slides = sections
    .map((section, index) => {
      const body =
        section.body.length > 1
          ? `<ul>${section.body.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
          : section.body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")

      return `<section class="slide" data-slide="${index + 1}">
<p class="eyebrow">${escapeHtml(input.theme)} · ${index + 1}/${sections.length}</p>
<h1>${escapeHtml(section.title)}</h1>
${body}
</section>`
    })
    .join("\n")
  const sourceSlide = input.sourceData
    ? `<section class="slide" data-slide="${sections.length + 1}"><p class="eyebrow">Source</p><pre>${escapeHtml(input.sourceData)}</pre></section>`
    : ""
  const slideCount = sections.length + (input.sourceData ? 1 : 0)

  return {
    slideCount,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>
:root{font-family:Inter,IBM Plex Sans,system-ui,sans-serif;background:#101827;color:#f8fafc;}body{margin:0;overflow:hidden}.deck{height:100vh;display:grid}.slide{display:none;place-content:center;padding:8vw;min-height:100vh;box-sizing:border-box}.slide.active{display:grid}.eyebrow{color:#93a3b8;text-transform:uppercase;letter-spacing:.12em}h1{font-size:clamp(2.25rem,6vw,5.5rem);line-height:1;margin:0 0 24px}p,pre,li{font-size:clamp(1rem,1.8vw,1.35rem);line-height:1.5}ul{margin:0;padding-left:1.4em;max-width:880px;display:grid;gap:.65rem}.counter{position:fixed;right:24px;bottom:20px;color:#93a3b8}
</style>
</head>
<body>
<main class="deck" data-static-artifact="slides" data-theme="${escapeHtml(input.theme)}">
${slides}
${sourceSlide}
</main>
<div class="counter" aria-live="polite"></div>
<script>
${STATIC_ARTIFACT_DECK_NAVIGATION_SCRIPT}
</script>
</body>
</html>`,
  }
}

function generationPath(input: {
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
}): StaticArtifactMetadata["generationPath"] {
  if (input.artifactType === "webpage") return "modelHtml"
  if (input.renderMode === "html") return "modelDeckHtml"
  return "polishedImageSlides"
}

function buildVersionHistoryEntry(
  version: number,
  metadata: StaticArtifactMetadata
): StaticArtifactVersionMetadataSnapshot {
  return {
    ...metadata,
    assetReferences: metadata.assetReferences.map((asset) => ({ ...asset })),
    safetyValidationResult: {
      ...metadata.safetyValidationResult,
      warnings: [...metadata.safetyValidationResult.warnings],
      errors: [...metadata.safetyValidationResult.errors],
    },
    generationWarnings: [...metadata.generationWarnings],
    version,
    createdAt: nowIso(),
  }
}

function parseStaticMetadata(
  artifact: Artifact
): StaticArtifactMetadataWithHistory | null {
  const parsed = staticArtifactMetadataSchema.safeParse(artifact.metadata)
  if (!parsed.success) return null
  const history = Array.isArray(artifact.metadata?.versionHistory)
    ? (artifact.metadata.versionHistory as StaticArtifactMetadataWithHistory["versionHistory"])
    : undefined
  return { ...parsed.data, versionHistory: history }
}

export class StaticArtifactService {
  private readonly storage: LocalDocumentStorage
  private readonly artifactService: ArtifactService
  private readonly polishedSlideProvider: PolishedSlideProvider

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    options: { polishedSlideProvider?: PolishedSlideProvider } = {}
  ) {
    this.storage = new LocalDocumentStorage(config)
    this.artifactService = new ArtifactService(repos)
    this.polishedSlideProvider =
      options.polishedSlideProvider ?? new UnavailablePolishedSlideProvider()
  }

  createStaticArtifact(input: {
    title: string
    description?: string
    artifactType: StaticArtifactType
    renderMode: StaticArtifactRenderMode
    contentBrief: string
    audience?: string
    purpose?: string
    theme?: StaticArtifactTheme
    bespokeStyleBrief?: string
    sourceData?: string
    visibilityScope?: ArtifactVisibilityScope
    projectId?: string
    threadId?: string
    runId?: string
    generatedHtml?: string
  }): StaticArtifactResult<StaticArtifactOutput> {
    const artifactId = createId("artifact")
    const prepared = this.prepareGeneratedContent({
      ...input,
      artifactId,
      version: 1,
    })
    if (!prepared.ok) return prepared

    const provenance = this.artifactService.captureProvenance({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
    })
    if (!provenance.ok) {
      return staticArtifactError(
        "static_artifact_storage_failed",
        provenance.message,
        provenance.status ?? 400
      )
    }

    const visibilityScope = generatedArtifactVisibilityScope({
      visibilityScope: input.visibilityScope,
      projectId: input.projectId,
    })
    const scopeError = this.artifactService.validateScope(visibilityScope, {
      projectId: input.projectId,
      threadId: provenance.provenance.threadId,
    })
    if (scopeError) {
      return staticArtifactError(
        "static_artifact_storage_failed",
        scopeError.message,
        scopeError.status ?? 400
      )
    }

    const storageKey = this.storageKey(artifactId, 1, prepared.contentFormat)
    const data = Buffer.from(prepared.content, "utf8")
    try {
      this.storage.write(storageKey, data)
      for (const asset of prepared.assetWrites) {
        this.storage.write(asset.storageKey, asset.data)
      }
      const metadata = {
        ...prepared.metadata,
        versionHistory: [buildVersionHistoryEntry(1, prepared.metadata)],
      }
      const { artifact } = this.repos.artifacts.createWithInitialVersion({
        id: artifactId,
        title: input.title,
        description: input.description,
        type: input.artifactType,
        contentFormat: prepared.contentFormat,
        mimeType: prepared.mimeType,
        sizeBytes: data.byteLength,
        storageKey,
        previewText: previewText(prepared.content, this.config.documentPreviewMaxChars),
        metadata,
        visibilityScope,
        projectId: input.projectId,
        projectNameSnapshot: provenance.provenance.projectNameSnapshot,
        threadId: provenance.provenance.threadId,
        threadTitleSnapshot: provenance.provenance.threadTitleSnapshot,
        runId: input.runId,
        agentId: provenance.provenance.agentId,
        agentNameSnapshot: provenance.provenance.agentNameSnapshot,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: "Created static artifact",
        createdByRunId: input.runId,
        createdByThreadId: provenance.provenance.threadId,
      })
      return {
        ok: true,
        output: this.createOutput(artifact, prepared.metadata, prepared.summary),
      }
    } catch (cause) {
      this.storage.delete(storageKey)
      for (const asset of prepared.assetWrites) {
        this.storage.delete(asset.storageKey)
      }
      console.error("Failed to persist static artifact", { cause, artifactId })
      return staticArtifactError(
        "static_artifact_storage_failed",
        "Failed to persist static artifact.",
        500
      )
    }
  }

  editStaticArtifact(input: {
    artifactId: string
    contentBrief: string
    changeSummary: string
    theme?: StaticArtifactTheme
    bespokeStyleBrief?: string
    runContext: StaticArtifactRunContext
    generatedHtml?: string
  }): StaticArtifactResult<EditStaticArtifactOutput> {
    const artifact = this.repos.artifacts.getById(input.artifactId)
    if (!artifact || !this.artifactService.canAccess(artifact, input.runContext)) {
      return staticArtifactError(
        "static_artifact_not_found",
        "Static artifact not found.",
        404
      )
    }
    if (artifact.type !== "webpage" && artifact.type !== "slides") {
      return staticArtifactError(
        "static_artifact_invalid_type",
        "Only webpage and slides artifacts can be edited with editStaticArtifact."
      )
    }
    const existingMetadata = parseStaticMetadata(artifact)
    if (!existingMetadata) {
      return staticArtifactError(
        "static_artifact_invalid_type",
        "Artifact is missing static artifact metadata."
      )
    }

    const previousVersion = artifact.currentVersion ?? 0
    const nextVersion = previousVersion + 1
    const prepared = this.prepareGeneratedContent({
      title: artifact.title,
      artifactType: existingMetadata.artifactType,
      renderMode: existingMetadata.renderMode,
      contentBrief: input.contentBrief,
      theme: input.theme ?? existingMetadata.theme,
      bespokeStyleBrief: input.bespokeStyleBrief,
      generatedHtml: input.generatedHtml,
      artifactId: artifact.id,
      version: nextVersion,
    })
    if (!prepared.ok) return prepared
    const storageKey = this.storageKey(artifact.id, nextVersion, prepared.contentFormat)
    const data = Buffer.from(prepared.content, "utf8")
    const metadata = {
      ...prepared.metadata,
      versionHistory: [
        ...(existingMetadata.versionHistory ?? [
          buildVersionHistoryEntry(previousVersion, existingMetadata),
        ]),
        buildVersionHistoryEntry(nextVersion, prepared.metadata),
      ],
    }

    try {
      this.storage.write(storageKey, data)
      for (const asset of prepared.assetWrites) {
        this.storage.write(asset.storageKey, asset.data)
      }
      const updated = this.repos.artifacts.updateWithVersion({
        artifactId: artifact.id,
        version: nextVersion,
        contentHash: contentHash(data),
        contentStorageKey: storageKey,
        changeSummary: input.changeSummary,
        createdByRunId: input.runContext.runId,
        createdByThreadId: input.runContext.threadId,
        sizeBytes: data.byteLength,
        previewText: previewText(prepared.content, this.config.documentPreviewMaxChars),
        metadata,
      })
      if (!updated) {
        this.storage.delete(storageKey)
        for (const asset of prepared.assetWrites) {
          this.storage.delete(asset.storageKey)
        }
        return staticArtifactError(
          "static_artifact_not_found",
          "Static artifact not found.",
          404
        )
      }
      return {
        ok: true,
        output: {
          artifactId: updated.id,
          title: updated.title,
          artifactType: prepared.metadata.artifactType,
          renderMode: prepared.metadata.renderMode,
          previousVersion,
          version: nextVersion,
          viewPath: links(updated.id).viewPath,
          summary: `Edited ${prepared.metadata.artifactType} static artifact.`,
        },
      }
    } catch (cause) {
      this.storage.delete(storageKey)
      for (const asset of prepared.assetWrites) {
        this.storage.delete(asset.storageKey)
      }
      console.error("Failed to update static artifact", { cause, artifactId: artifact.id })
      return staticArtifactError(
        "static_artifact_storage_failed",
        "Failed to update static artifact.",
        500
      )
    }
  }

  findStaticArtifacts(input: {
    query?: string
    artifactType?: StaticArtifactType
    renderMode?: StaticArtifactRenderMode
    visibilityScope?: ArtifactVisibilityScope
    limit?: number
    runContext: StaticArtifactRunContext
  }): StaticArtifactResult<FindStaticArtifactsOutput> {
    if (input.artifactType && input.renderMode) {
      const mode = validateStaticArtifactMode(input.artifactType, input.renderMode)
      if (!mode.ok) return staticArtifactError(mode.code, mode.message)
    }

    const limit = Math.min(input.limit ?? 10, 50)
    const candidateTypes: StaticArtifactType[] = input.artifactType
      ? [input.artifactType]
      : ["webpage", "slides"]
    const matches = candidateTypes
      .flatMap((type) =>
        this.repos.artifacts.list({
          query: input.query,
          type,
          visibilityScope: input.visibilityScope,
        })
      )
      .filter((artifact) => this.artifactService.canAccess(artifact, input.runContext))
      .flatMap((artifact) => {
        const metadata = parseStaticMetadata(artifact)
        if (!metadata) return []
        if (input.renderMode && metadata.renderMode !== input.renderMode) return []
        return [
          {
            artifactId: artifact.id,
            title: artifact.title,
            artifactType: metadata.artifactType,
            renderMode: metadata.renderMode,
            version: artifact.currentVersion ?? 1,
            viewPath: links(artifact.id).viewPath,
            theme: metadata.theme,
            updatedAt: artifact.updatedAt,
          },
        ]
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    return {
      ok: true,
      output: {
        items: matches.slice(0, limit),
        resultCount: Math.min(matches.length, limit),
        truncated: matches.length > limit,
      },
    }
  }

  private prepareGeneratedContent(input: {
    title: string
    artifactType: StaticArtifactType
    renderMode: StaticArtifactRenderMode
    contentBrief: string
    audience?: string
    purpose?: string
    theme?: StaticArtifactTheme
    bespokeStyleBrief?: string
    sourceData?: string
    generatedHtml?: string
    artifactId: string
    version: number
  }):
    | {
        ok: true
        content: string
        contentFormat: "html" | "manifest"
        mimeType: string
        metadata: StaticArtifactMetadata
        summary: string
        assetWrites: StaticArtifactAssetWrite[]
      }
    | StaticArtifactError {
    const mode = validateStaticArtifactMode(input.artifactType, input.renderMode)
    if (!mode.ok) {
      return staticArtifactError(
        mode.code,
        mode.message,
        400,
        "Use renderMode html for webpages or set artifactType to slides."
      )
    }

    let guidance: ReturnType<typeof getStaticArtifactDesignGuidance>
    try {
      guidance = getStaticArtifactDesignGuidance(input)
    } catch (cause) {
      return staticArtifactError(
        "static_artifact_invalid_type",
        cause instanceof Error ? cause.message : "Invalid static artifact type."
      )
    }

    if (input.renderMode === "polishedImage") {
      const availability = this.polishedSlideProvider.availability()
      if (!availability.available) {
        return staticArtifactError(
          availability.code,
          availability.message,
          503,
          availability.remediation
        )
      }
      if (!this.polishedSlideProvider.generateSlides) {
        return staticArtifactError(
          "static_artifact_image_generation_failed",
          `Polished image slide generation through ${availability.provider} is not available in this runtime.`,
          501,
          "Configure a polished slide provider with generation support or use html renderMode."
        )
      }

      const slides = slideLines(input.contentBrief).map((line, index) => ({
        slideIndex: index + 1,
        title: index === 0 ? input.title : line,
        prompt: line,
      }))
      let generatedSlides: ReturnType<NonNullable<PolishedSlideProvider["generateSlides"]>>
      try {
        generatedSlides = this.polishedSlideProvider.generateSlides({
          title: input.title,
          theme: guidance.selectedTheme.id,
          slides,
        })
      } catch (cause) {
        console.error("Failed to generate polished slide images", { cause })
        return staticArtifactError(
          "static_artifact_image_generation_failed",
          "Polished image slide generation failed.",
          502,
          "Try again or use html renderMode for this deck."
        )
      }
      if (generatedSlides.length !== slides.length) {
        return staticArtifactError(
          "static_artifact_image_generation_failed",
          "Polished image slide generation returned an incomplete deck.",
          502,
          "Try again or use html renderMode for this deck."
        )
      }

      const assetReferences = generatedSlides.map((slide) => ({
        assetId: createId("static_asset"),
        slideIndex: slide.slideIndex,
        storageKey: `artifacts/${input.artifactId}/assets/v${input.version}/slide-${slide.slideIndex}.${assetExtension(slide.mimeType)}`,
        mimeType: slide.mimeType,
        sizeBytes: slide.data.byteLength,
        altText: slide.altText,
      }))
      const metadata = staticArtifactMetadataSchema.parse({
        artifactType: input.artifactType,
        renderMode: input.renderMode,
        theme: guidance.selectedTheme.id,
        bespokeStyleBriefSummary: guidance.bespokeStyleBriefSummary,
        generationPath: "polishedImageSlides",
        slideCount: slides.length,
        assetReferences,
        provider: availability.provider,
        providerModel: availability.model,
        safetyValidationResult: {
          status: "passed",
          checkedAt: nowIso(),
          warnings: [],
          errors: [],
        },
        generationWarnings: [],
      })
      const content = JSON.stringify(
        {
          artifactType: input.artifactType,
          renderMode: input.renderMode,
          slideCount: slides.length,
          assetReferences,
        },
        null,
        2
      )
      return {
        ok: true,
        content,
        contentFormat: "manifest",
        mimeType: "application/json",
        metadata,
        summary: `Created ${input.artifactType} static artifact in ${input.renderMode} mode.`,
        assetWrites: generatedSlides.map((slide, index) => ({
          storageKey: assetReferences[index]!.storageKey,
          data: slide.data,
        })),
      }
    }

    let content: string
    let slideCount: number | undefined
    if (input.generatedHtml) {
      content = input.generatedHtml
      slideCount =
        input.artifactType === "slides"
          ? Math.max(1, Array.from(content.matchAll(/class=["'][^"']*slide/gi)).length)
          : undefined
    } else if (input.artifactType === "webpage") {
      content = buildWebpageHtml({
        title: input.title,
        contentBrief: input.contentBrief,
        audience: input.audience,
        purpose: input.purpose,
        sourceData: input.sourceData,
        theme: guidance.selectedTheme.id,
        guidance: guidance.formatGuidance,
      })
    } else {
      const slides = buildSlidesHtml({
        title: input.title,
        contentBrief: input.contentBrief,
        sourceData: input.sourceData,
        theme: guidance.selectedTheme.id,
      })
      content = slides.html
      slideCount = slides.slideCount
    }

    const validation = validateStaticHtml({
      artifactType: input.artifactType,
      renderMode: input.renderMode,
      html: content,
      maxBytes: this.config.documentMaxUploadBytes,
    })
    if (!validation.ok) return validation

    const metadata = staticArtifactMetadataSchema.parse({
      artifactType: input.artifactType,
      renderMode: input.renderMode,
      theme: guidance.selectedTheme.id,
      bespokeStyleBriefSummary: guidance.bespokeStyleBriefSummary,
      generationPath: generationPath(input),
      slideCount,
      assetReferences: [],
      safetyValidationResult: {
        status: "passed",
        checkedAt: nowIso(),
        warnings: validation.warnings,
        errors: [],
      },
      generationWarnings: [],
    })

    return {
      ok: true,
      content,
      contentFormat: "html",
      mimeType: "text/html",
      metadata,
      summary: `Created ${input.artifactType} static artifact in ${input.renderMode} mode.`,
      assetWrites: [],
    }
  }

  private createOutput(
    artifact: Artifact,
    metadata: StaticArtifactMetadata,
    summary: string
  ): StaticArtifactOutput {
    return {
      artifactId: artifact.id,
      title: artifact.title,
      artifactType: metadata.artifactType,
      renderMode: metadata.renderMode,
      version: artifact.currentVersion ?? 1,
      ...links(artifact.id),
      theme: metadata.theme,
      slideCount: metadata.slideCount,
      provider: metadata.provider,
      summary,
    }
  }

  private storageKey(
    artifactId: string,
    version: number,
    contentFormat: "html" | "manifest"
  ) {
    const extension = contentFormat === "html" ? "html" : "json"
    return `artifacts/${artifactId}/versions/${version}.${extension}`
  }
}
