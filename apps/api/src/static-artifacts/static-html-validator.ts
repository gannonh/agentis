import type {
  StaticArtifactRenderMode,
  StaticArtifactType,
} from "@workspace/shared"
import { validateStaticArtifactMode } from "@workspace/shared"

export type StaticHtmlValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; code: string; message: string; status: number }

export const STATIC_ARTIFACT_DECK_NAVIGATION_SCRIPT =
  "const slides=[...document.querySelectorAll('.slide')];let current=0;const counter=document.querySelector('.counter');function show(index){current=Math.max(0,Math.min(index,slides.length-1));slides.forEach((slide,i)=>slide.classList.toggle('active',i===current));counter.textContent=(current+1)+' / '+slides.length;}document.addEventListener('keydown',(event)=>{if(event.key==='ArrowRight'||event.key===' '){show(current+1)}if(event.key==='ArrowLeft'){show(current-1)}});show(0);"

const EXTERNAL_RESOURCE_ATTRIBUTES: Record<string, readonly string[]> = {
  audio: ["src"],
  embed: ["src"],
  feimage: ["href", "xlink:href"],
  iframe: ["src"],
  image: ["href", "xlink:href"],
  img: ["src", "srcset"],
  input: ["src"],
  object: ["data"],
  source: ["src", "srcset"],
  track: ["src"],
  use: ["href", "xlink:href"],
  video: ["src", "poster"],
}

const URL_NAMED_CHARACTER_REFERENCES: Record<string, string> = {
  amp: "&",
  apos: "'",
  colon: ":",
  gt: ">",
  lt: "<",
  quot: '"',
  sol: "/",
}

function error(
  code: string,
  message: string,
  status = 400
): StaticHtmlValidationResult {
  return { ok: false, code, message, status }
}

function decodeHtmlCharacterReferences(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase()
    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16)
      if (Number.isNaN(codePoint)) return match
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return match
      }
    }
    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10)
      if (Number.isNaN(codePoint)) return match
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return match
      }
    }

    return URL_NAMED_CHARACTER_REFERENCES[normalized] ?? match
  })
}

function externalUrl(value: string): URL | null {
  const trimmed = decodeHtmlCharacterReferences(value).trim()
  try {
    const url = trimmed.startsWith("//")
      ? new URL(`https:${trimmed}`)
      : new URL(trimmed)
    if (url.protocol === "http:" || url.protocol === "https:") return url
    return null
  } catch {
    return null
  }
}

type HtmlTag = {
  name: string
  source: string
}

function scanHtmlTags(html: string): HtmlTag[] {
  const tags: HtmlTag[] = []
  let index = 0

  while (index < html.length) {
    const start = html.indexOf("<", index)
    if (start === -1) break

    const next = html[start + 1]
    if (!next || !/[a-z]/i.test(next)) {
      index = start + 1
      continue
    }

    let quote: '"' | "'" | null = null
    let end = start + 1
    while (end < html.length) {
      const char = html[end]
      if (quote) {
        if (char === quote) quote = null
      } else if (char === '"' || char === "'") {
        quote = char
      } else if (char === ">") {
        break
      }
      end += 1
    }

    const source = html.slice(start, end < html.length ? end + 1 : html.length)
    const name = /^<([a-z][^\s/>]*)/i.exec(source)?.[1]?.toLowerCase()
    if (name) tags.push({ name, source })
    index = end < html.length ? end + 1 : html.length
  }

  return tags
}

function attributePattern(attribute: string): RegExp {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(
    `(?:^|[\\s<])${escapedAttribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  )
}

function attributeValue(tag: string, attribute: string): string | undefined {
  const match = attributePattern(attribute).exec(tag)
  const value = match?.[1] ?? match?.[2] ?? match?.[3]
  return value ? decodeHtmlCharacterReferences(value) : undefined
}

function hasAttribute(tag: string, attribute: string): boolean {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|[\\s<])${escapedAttribute}(?=[\\s=>/]|$)`, "i").test(
    tag
  )
}

function hasInlineEventAttribute(tag: string): boolean {
  return /(?:^|[\s<])on[a-z]+\s*=/i.test(tag)
}

function isAgentisApiUrl(value: string): boolean {
  return /\/api\//i.test(decodeHtmlCharacterReferences(value))
}

function isForbiddenResourceUrl(value: string): boolean {
  return Boolean(externalUrl(value)) || isAgentisApiUrl(value)
}

function srcsetHasForbiddenUrl(value: string): boolean {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .some((candidate) => isForbiddenResourceUrl(candidate))
}

function tagHasForbiddenResourceAttribute(
  tag: string,
  attribute: string
): boolean {
  const value = attributeValue(tag, attribute)
  if (!value) return false
  if (attribute === "srcset") return srcsetHasForbiddenUrl(value)
  return isForbiddenResourceUrl(value)
}

function includesExternalResourceLoad(html: string): boolean {
  const tags = scanHtmlTags(html)
  for (const tag of tags) {
    const attributes = EXTERNAL_RESOURCE_ATTRIBUTES[tag.name]
    if (!attributes) continue
    if (
      attributes.some((attribute) =>
        tagHasForbiddenResourceAttribute(tag.source, attribute)
      )
    ) {
      return true
    }
  }
  return false
}

function decodeCssEscapes(value: string): string {
  return value.replace(/\\([0-9a-f]{1,6}\s?|.)/gis, (match, escape) => {
    const normalized = String(escape)
    const hex = normalized.match(/^([0-9a-f]{1,6})(?:\s)?$/i)
    if (!hex) return normalized

    const codePoint = Number.parseInt(hex[1] ?? "", 16)
    if (Number.isNaN(codePoint)) return match
    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return match
    }
  })
}

function cssContainsExternalNetworkLoad(css: string): boolean {
  const decodedCss = decodeCssEscapes(decodeHtmlCharacterReferences(css))
  if (/@import[^;]*(?:(?:https?:)?\/\/|\/api\/)/i.test(decodedCss)) return true
  for (const match of decodedCss.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
    if (isForbiddenResourceUrl(match[2] ?? "")) return true
  }
  return false
}

function includesExternalCssLoad(html: string): boolean {
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (cssContainsExternalNetworkLoad(match[1] ?? "")) return true
  }
  for (const tag of scanHtmlTags(html)) {
    const style = attributeValue(tag.source, "style")
    if (style && cssContainsExternalNetworkLoad(style)) return true
  }
  return false
}

function scriptBodies(html: string): string[] {
  return Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)).map(
    (match) => match[1] ?? ""
  )
}

function normalizeOwnedScript(script: string): string {
  return decodeHtmlCharacterReferences(script).replace(/\r\n?/g, "\n").trim()
}

function hasOnlyOwnedDeckNavigationScript(input: {
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
  html: string
}): boolean {
  const scripts = scriptBodies(input.html)
  if (scripts.length === 0) return true
  if (input.artifactType !== "slides" || input.renderMode !== "html") return false

  return scripts.every(
    (script) =>
      normalizeOwnedScript(script) === STATIC_ARTIFACT_DECK_NAVIGATION_SCRIPT
  )
}

function includesActiveNavigationBypass(html: string): boolean {
  return scanHtmlTags(html).some((tag) => {
    if (hasAttribute(tag.source, "srcdoc") || hasAttribute(tag.source, "ping")) {
      return true
    }

    if (tag.name === "meta") {
      const httpEquiv = attributeValue(tag.source, "http-equiv")
        ?.trim()
        .toLowerCase()
      if (httpEquiv === "refresh") return true
    }

    return ["action", "formaction"].some((attribute) => {
      const value = attributeValue(tag.source, attribute)
      return Boolean(value && isForbiddenResourceUrl(value))
    })
  })
}

function includesForbiddenRuntimeAccess(html: string): boolean {
  return scanHtmlTags(html).some((tag) =>
    [
      "href",
      "src",
      "srcset",
      "action",
      "formaction",
      "data",
      "poster",
      "xlink:href",
    ].some((attribute) => {
      const value = attributeValue(tag.source, attribute)
      if (!value) return false
      return attribute === "srcset"
        ? srcsetHasForbiddenUrl(value)
        : isAgentisApiUrl(value)
    })
  )
}

export function validateStaticHtml(input: {
  artifactType: StaticArtifactType
  renderMode: StaticArtifactRenderMode
  html: string
  maxBytes: number
}): StaticHtmlValidationResult {
  const mode = validateStaticArtifactMode(input.artifactType, input.renderMode)
  if (!mode.ok) {
    return error(mode.code, mode.message)
  }
  if (input.renderMode !== "html") {
    return error(
      "static_artifact_invalid_render_mode",
      "HTML validation only supports html render mode."
    )
  }

  const sizeBytes = Buffer.byteLength(input.html, "utf8")
  if (sizeBytes > input.maxBytes) {
    return error(
      "static_artifact_bundle_too_large",
      "Static artifact bundle exceeds the maximum allowed size.",
      413
    )
  }

  const tags = scanHtmlTags(input.html)

  if (tags.some((tag) => tag.name === "script" && hasAttribute(tag.source, "src"))) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include external script tags."
    )
  }

  if (tags.some((tag) => tag.name === "base")) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include base tags."
    )
  }

  for (const tag of tags.filter((candidate) => candidate.name === "link")) {
    const href = attributeValue(tag.source, "href")
    if (href && externalUrl(href)) {
      return error(
        "static_artifact_invalid_html",
        "Static HTML must not include unapproved external network dependencies."
      )
    }
  }

  if (tags.some((tag) => hasInlineEventAttribute(tag.source))) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include inline event handler attributes."
    )
  }

  if (!hasOnlyOwnedDeckNavigationScript(input)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include arbitrary inline scripts."
    )
  }

  if (includesExternalCssLoad(input.html) || includesExternalResourceLoad(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include unapproved external network dependencies."
    )
  }

  if (includesActiveNavigationBypass(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include srcdoc, meta refresh, ping, or external/API form actions."
    )
  }

  if (includesForbiddenRuntimeAccess(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not call Agentis APIs, runtime bridges, network APIs, or browser storage."
    )
  }

  return { ok: true, warnings: [] }
}
