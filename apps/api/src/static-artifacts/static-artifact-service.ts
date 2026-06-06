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
  previewText?: string
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

type ReadStaticArtifactOutput = {
  artifactId: string
  title: string
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
  version: number
  viewPath: string
  downloadPath: string
  theme?: string
  slideCount?: number
  contentText: string
  contentTextTruncated: boolean
  summary: string
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

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
}

function decodeHtmlEntity(match: string, entity: string): string {
  const named = NAMED_HTML_ENTITIES[entity]
  if (named) return named

  const codePoint = entity.startsWith("#x") || entity.startsWith("#X")
    ? Number.parseInt(entity.slice(2), 16)
    : entity.startsWith("#")
      ? Number.parseInt(entity.slice(1), 10)
      : Number.NaN
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return match
  }

  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return match
  }
}

function staticArtifactText(content: string): string {
  const withoutRawText = content.replace(
    /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  )
  return withoutRawText
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(h1|h2|h3|h4|h5|h6|p|li|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#(?:x[0-9a-fA-F]+|\d+)|amp|apos|gt|lt|nbsp|quot);/g, decodeHtmlEntity)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function previewText(content: string, maxChars: number): string | undefined {
  const stripped = staticArtifactText(content)
  if (!stripped) return undefined
  return stripped.length > maxChars ? `${stripped.slice(0, maxChars)}…` : stripped
}

function boundedStaticArtifactText(content: string, maxChars: number) {
  const text = staticArtifactText(content)
  return {
    contentText: text.length > maxChars ? text.slice(0, maxChars) : text,
    contentTextTruncated: text.length > maxChars,
  }
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
    .map(cleanSlideLine)
    .filter((topic) => topic.length > 0)

  return parsed.length > 1 ? parsed : []
}

function slideLines(contentBrief: string): string[] {
  const lines = contentBrief
    .split(/\r?\n+/)
    .map(cleanSlideLine)
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

function cleanSlideLine(value: string): string {
  return sentenceCase(
    value
      .trim()
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim()
  )
}

function stripSlideMarker(value: string): string {
  return value.replace(/^slide\s+\d+\s*:\s*/i, "").trim()
}

function splitInlineSlideSection(value: string): SlideSection {
  const stripped = stripSlideMarker(value)
  const [titlePart = "", ...bodyParts] = stripped.split(/\s+[-–—]\s+/)
  const title = cleanSlideLine(titlePart)
  const body = bodyParts.join(" - ").trim()

  return normalizeTitleSlideSection({
    title,
    body: body ? [cleanSlideLine(body)] : [],
  })
}

function normalizeTitleSlideSection(section: SlideSection): SlideSection {
  if (/^title(?: slide)?$/i.test(section.title) && section.body[0]) {
    return { title: section.body[0], body: section.body.slice(1) }
  }
  return section
}

function bodyLinesFromHtml(fragment: string): string[] {
  return staticArtifactText(fragment)
    .split("\n")
    .map((line) => cleanSlideLine(line))
    .filter((line) => line.length > 0)
    .filter((line) => !/\s+·\s+\d+\s*\/\s*\d+$/.test(line))
}

function isDuplicateSlideLine(line: string, title: string): boolean {
  const section = splitInlineSlideSection(line)
  return section.title === title && section.body.length === 0
}

function slideSectionFromHtml(fragment: string, fallbackTitle: string): SlideSection {
  const heading = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(fragment)
  const titleSource = heading ? staticArtifactText(heading[1] ?? "") : fallbackTitle
  const section = splitInlineSlideSection(titleSource || fallbackTitle)
  const bodyFragment = heading ? fragment.replace(heading[0], "") : fragment
  const body = bodyLinesFromHtml(bodyFragment).filter(
    (line) => !isDuplicateSlideLine(line, section.title)
  )

  return normalizeTitleSlideSection({
    title: section.title,
    body: [...section.body, ...body],
  })
}

function slideSectionsFromHtml(content: string): SlideSection[] {
  const slideMatches = Array.from(
    content.matchAll(
      /<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi
    )
  )
  if (slideMatches.length > 0) {
    return slideMatches
      .map((match, index) =>
        slideSectionFromHtml(match[1] ?? "", `Slide ${index + 1}`)
      )
      .filter((section) => section.title.length > 0)
  }

  return [slideSectionFromHtml(content, "Additional content")].filter(
    (section) => section.title.length > 0 || section.body.length > 0
  )
}

function isCompleteSlideDeckHtml(content: string): boolean {
  return (
    /data-static-artifact=["']slides["']/i.test(content) &&
    /<section\b[^>]*class=["'][^"']*\bslide\b/i.test(content)
  )
}

function shouldAppendSlideEdit(input: {
  changeSummary?: string
  contentBrief: string
}): boolean {
  const intent = `${input.changeSummary ?? ""}\n${input.contentBrief}`
  if (/\b(replace|rewrite|recreate|regenerate|start over)\b/i.test(intent)) {
    return false
  }
  return /\b(add|append|include|insert|additional|new slide|at the end)\b/i.test(intent)
}

function outlineParagraphs(contentBrief: string): string[][] {
  return contentBrief
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n+/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map(cleanSlideLine)
        .filter(Boolean)
    )
    .filter((paragraph) => paragraph.length > 0)
}

function slideMarkerSections(contentBrief: string): SlideSection[] {
  const sections: SlideSection[] = []
  let current: SlideSection | null = null

  for (const rawLine of contentBrief.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim()
    if (!line) continue

    const marker = /^slide\s+\d+\s*:\s*(?<title>.+)$/i.exec(line)
    if (marker?.groups?.title) {
      if (current) sections.push(normalizeTitleSlideSection(current))
      current = splitInlineSlideSection(marker.groups.title)
      continue
    }

    const normalized = cleanSlideLine(line)
    if (current) current.body.push(normalized)
  }

  if (current) sections.push(normalizeTitleSlideSection(current))
  return sections.length > 1 && sections.some((section) => section.body.length > 0)
    ? sections.slice(0, 12)
    : []
}

function outlineSlideSections(contentBrief: string): SlideSection[] {
  const markedSections = slideMarkerSections(contentBrief)
  if (markedSections.length > 0) return markedSections

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

function renderSlidesHtml(input: {
  title: string
  sourceData?: string
  theme: string
  sections: SlideSection[]
}): { html: string; slideCount: number } {
  const slides = input.sections
    .map((section, index) => {
      const body =
        section.body.length > 1
          ? `<ul>${section.body.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
          : section.body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")
      const slideClass = section.body.length > 0 ? "content-slide" : "title-slide"

      return `<section class="slide ${slideClass}" data-slide="${index + 1}">
<p class="eyebrow">${escapeHtml(input.theme)} · ${index + 1}/${input.sections.length}</p>
<h1>${escapeHtml(section.title)}</h1>
${body}
</section>`
    })
    .join("\n")
  const sourceSlide = input.sourceData
    ? `<section class="slide content-slide" data-slide="${input.sections.length + 1}"><p class="eyebrow">Source</p><pre>${escapeHtml(input.sourceData)}</pre></section>`
    : ""
  const slideCount = input.sections.length + (input.sourceData ? 1 : 0)

  return {
    slideCount,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>
:root{font-family:Inter,IBM Plex Sans,system-ui,sans-serif;background:#101827;color:#f8fafc;}body{margin:0;overflow:hidden}.deck{height:100vh;display:grid}.slide{display:none;min-height:100vh;box-sizing:border-box;padding:clamp(48px,8vw,96px);gap:clamp(16px,2vw,28px)}.slide.active{display:grid}.title-slide{align-content:center;justify-items:start}.content-slide{align-content:center;justify-items:start}.eyebrow{color:#93a3b8;text-transform:uppercase;letter-spacing:.12em;font-size:.95rem;margin:0}.title-slide h1{font-size:clamp(2.5rem,6vw,5.5rem)}.content-slide h1{font-size:clamp(1.85rem,4vw,3.6rem);max-width:1040px}h1{line-height:1;margin:0}p,pre,li{font-size:clamp(1rem,1.8vw,1.35rem);line-height:1.5;max-width:980px}p{margin:0}ul{margin:0;padding-left:1.4em;max-width:980px;display:grid;gap:.65rem}.counter{position:fixed;right:24px;bottom:20px;color:#93a3b8}
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
      : slideLines(input.contentBrief).map((line, index) => {
          const section = splitInlineSlideSection(line)
          return index === 0 && section.title === line
            ? { title: input.title, body: [cleanSlideLine(line)] }
            : section
        })

  return renderSlidesHtml({
    title: input.title,
    sections,
    sourceData: input.sourceData,
    theme: input.theme,
  })
}

function buildGeneratedSlidesHtml(input: {
  title: string
  contentBrief: string
  changeSummary?: string
  generatedHtml: string
  existingContent?: string
  sourceData?: string
  theme: string
}): { html: string; slideCount: number } {
  if (isCompleteSlideDeckHtml(input.generatedHtml)) {
    return {
      html: input.generatedHtml,
      slideCount: Math.max(
        1,
        Array.from(
          input.generatedHtml.matchAll(/class=["'][^"']*\bslide\b/gi)
        ).length
      ),
    }
  }

  const generatedSections = slideSectionsFromHtml(input.generatedHtml)
  const existingSections =
    input.existingContent && shouldAppendSlideEdit(input)
      ? slideSectionsFromHtml(input.existingContent)
      : []
  const sections = [...existingSections, ...generatedSections]
  const fallbackSections = sections.length > 0
    ? sections
    : outlineSlideSections(input.contentBrief)

  return renderSlidesHtml({
    title: input.title,
    sections: fallbackSections.length > 0
      ? fallbackSections
      : [{ title: input.title, body: [cleanSlideLine(input.contentBrief)] }],
    sourceData: input.sourceData,
    theme: input.theme,
  })
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
    let existingContent: string | undefined
    if (
      input.generatedHtml &&
      existingMetadata.artifactType === "slides" &&
      existingMetadata.renderMode === "html"
    ) {
      try {
        existingContent = this.storage.read(artifact.storageKey).toString("utf8")
      } catch (cause) {
        console.error("Failed to read existing static artifact for edit", {
          cause,
          artifactId: artifact.id,
        })
        return staticArtifactError(
          "static_artifact_storage_failed",
          "Failed to read existing static artifact content.",
          500
        )
      }
    }
    const prepared = this.prepareGeneratedContent({
      title: artifact.title,
      artifactType: existingMetadata.artifactType,
      renderMode: existingMetadata.renderMode,
      contentBrief: input.contentBrief,
      changeSummary: input.changeSummary,
      theme: input.theme ?? existingMetadata.theme,
      bespokeStyleBrief: input.bespokeStyleBrief,
      generatedHtml: input.generatedHtml,
      existingContent,
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
          previewText: updated.previewText ?? undefined,
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
        resultCount: matches.length,
        truncated: matches.length > limit,
      },
    }
  }

  readStaticArtifact(input: {
    artifactId: string
    maxChars?: number
    runContext: StaticArtifactRunContext
  }): StaticArtifactResult<ReadStaticArtifactOutput> {
    const artifact = this.repos.artifacts.getById(input.artifactId)
    if (!artifact || !this.artifactService.canAccess(artifact, input.runContext)) {
      return staticArtifactError(
        "static_artifact_not_found",
        "Static artifact not found.",
        404
      )
    }
    const metadata = parseStaticMetadata(artifact)
    if (!metadata) {
      return staticArtifactError(
        "static_artifact_invalid_type",
        "Artifact is missing static artifact metadata."
      )
    }

    try {
      const content = this.storage.read(artifact.storageKey).toString("utf8")
      const maxChars = Math.min(input.maxChars ?? 4_000, 10_000)
      return {
        ok: true,
        output: {
          artifactId: artifact.id,
          title: artifact.title,
          artifactType: metadata.artifactType,
          renderMode: metadata.renderMode,
          version: artifact.currentVersion ?? 1,
          ...links(artifact.id),
          theme: metadata.theme,
          slideCount: metadata.slideCount,
          ...boundedStaticArtifactText(content, maxChars),
          summary: `Read ${metadata.artifactType} static artifact content.`,
        },
      }
    } catch (cause) {
      console.error("Failed to read static artifact", { cause, artifactId: artifact.id })
      return staticArtifactError(
        "static_artifact_storage_failed",
        "Failed to read static artifact content.",
        500
      )
    }
  }

  private prepareGeneratedContent(input: {
    title: string
    artifactType: StaticArtifactType
    renderMode: StaticArtifactRenderMode
    contentBrief: string
    changeSummary?: string
    audience?: string
    purpose?: string
    theme?: StaticArtifactTheme
    bespokeStyleBrief?: string
    sourceData?: string
    generatedHtml?: string
    existingContent?: string
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
      const expectedIndexes = new Set(slides.map((slide) => slide.slideIndex))
      const seenIndexes = new Set<number>()
      for (const slide of generatedSlides) {
        if (!expectedIndexes.has(slide.slideIndex) || seenIndexes.has(slide.slideIndex)) {
          return staticArtifactError(
            "static_artifact_image_generation_failed",
            "Polished image slide generation returned invalid slide ordering.",
            502,
            "Try again or use html renderMode for this deck."
          )
        }
        seenIndexes.add(slide.slideIndex)
      }

      const assetReferences = generatedSlides.map((slide) => ({
        assetId: createId("static_asset"),
        slideIndex: slide.slideIndex,
        storageKey: `artifacts/${input.artifactId}/assets/v${input.version}/slide-${slide.slideIndex}.${assetExtension(slide.mimeType)}`,
        mimeType: slide.mimeType,
        sizeBytes: slide.data.byteLength,
        altText: slide.altText,
      }))
      const metadataResult = staticArtifactMetadataSchema.safeParse({
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
      if (!metadataResult.success) {
        return staticArtifactError(
          "static_artifact_image_generation_failed",
          "Polished image slide generation returned invalid metadata.",
          502,
          "Try again or use html renderMode for this deck."
        )
      }
      const metadata = metadataResult.data
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
      if (input.artifactType === "slides") {
        const slides = buildGeneratedSlidesHtml({
          title: input.title,
          contentBrief: input.contentBrief,
          changeSummary: input.changeSummary,
          generatedHtml: input.generatedHtml,
          existingContent: input.existingContent,
          sourceData: input.sourceData,
          theme: guidance.selectedTheme.id,
        })
        content = slides.html
        slideCount = slides.slideCount
      } else {
        content = input.generatedHtml
      }
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

    const metadataResult = staticArtifactMetadataSchema.safeParse({
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
    if (!metadataResult.success) {
      return staticArtifactError(
        "static_artifact_storage_failed",
        "Failed to build static artifact metadata.",
        500
      )
    }
    const metadata = metadataResult.data

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
      previewText: artifact.previewText ?? undefined,
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
