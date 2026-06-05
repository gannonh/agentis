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

function attributeValue(tag: string, attribute: string): string | undefined {
  const pattern = new RegExp(
    `\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  )
  const match = pattern.exec(tag)
  const value = match?.[1] ?? match?.[2] ?? match?.[3]
  return value ? decodeHtmlCharacterReferences(value) : undefined
}

function srcsetHasExternalUrl(value: string): boolean {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .some((candidate) => Boolean(externalUrl(candidate)))
}

function tagHasExternalAttribute(tag: string, attribute: string): boolean {
  const value = attributeValue(tag, attribute)
  if (!value) return false
  if (attribute === "srcset") return srcsetHasExternalUrl(value)
  return Boolean(externalUrl(value))
}

function includesExternalResourceLoad(html: string): boolean {
  for (const [tagName, attributes] of Object.entries(EXTERNAL_RESOURCE_ATTRIBUTES)) {
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi")
    for (const match of html.matchAll(tagPattern)) {
      if (attributes.some((attribute) => tagHasExternalAttribute(match[0], attribute))) {
        return true
      }
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
  if (/@import[^;]*(?:https?:)?\/\//i.test(decodedCss)) return true
  for (const match of decodedCss.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
    if (externalUrl(match[2] ?? "")) return true
  }
  return false
}

function includesExternalCssLoad(html: string): boolean {
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (cssContainsExternalNetworkLoad(match[1] ?? "")) return true
  }
  for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
    const style = attributeValue(match[0], "style")
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

function includesForbiddenRuntimeAccess(html: string): boolean {
  return Array.from(html.matchAll(/<[a-z][^>]*>/gi)).some((match) =>
    ["href", "src", "action", "formaction"].some((attribute) =>
      /\/api\//i.test(attributeValue(match[0], attribute) ?? "")
    )
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

  if (/<script\b[^>]*\bsrc\s*=/i.test(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include external script tags."
    )
  }

  if (/<base\b[^>]*>/i.test(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include base tags."
    )
  }

  for (const match of input.html.matchAll(/<link\b[^>]*>/gi)) {
    const href = attributeValue(match[0], "href")
    if (href && externalUrl(href)) {
      return error(
        "static_artifact_invalid_html",
        "Static HTML must not include unapproved external network dependencies."
      )
    }
  }

  if (/\son[a-z]+\s*=/i.test(input.html)) {
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

  if (includesForbiddenRuntimeAccess(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not call Agentis APIs, runtime bridges, network APIs, or browser storage."
    )
  }

  return { ok: true, warnings: [] }
}
