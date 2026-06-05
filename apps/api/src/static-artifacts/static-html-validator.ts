import type {
  StaticArtifactRenderMode,
  StaticArtifactType,
} from "@workspace/shared"
import { validateStaticArtifactMode } from "@workspace/shared"

export type StaticHtmlValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; code: string; message: string; status: number }

const APPROVED_EXTERNAL_STYLESHEET_ORIGINS = new Set<string>()

const EXTERNAL_RESOURCE_ATTRIBUTES: Record<string, readonly string[]> = {
  audio: ["src"],
  embed: ["src"],
  iframe: ["src"],
  img: ["src", "srcset"],
  object: ["data"],
  source: ["src", "srcset"],
  video: ["src", "poster"],
}

function error(
  code: string,
  message: string,
  status = 400
): StaticHtmlValidationResult {
  return { ok: false, code, message, status }
}

function externalUrl(value: string): URL | null {
  const trimmed = value.trim()
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
  return match?.[1] ?? match?.[2] ?? match?.[3]
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

function cssContainsExternalNetworkLoad(css: string): boolean {
  if (/@import[^;]*(?:https?:)?\/\//i.test(css)) return true
  for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)) {
    if (externalUrl(match[2] ?? "")) return true
  }
  return false
}

function includesExternalCssLoad(html: string): boolean {
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (cssContainsExternalNetworkLoad(match[1] ?? "")) return true
  }
  for (const match of html.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    if (cssContainsExternalNetworkLoad(match[1] ?? match[2] ?? "")) return true
  }
  return false
}

function scriptBodies(html: string): string[] {
  return Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)).map(
    (match) => match[1] ?? ""
  )
}

function includesForbiddenRuntimeAccess(html: string): boolean {
  const scripts = scriptBodies(html).join("\n")
  if (
    [
      /\bfetch\s*\(/i,
      /\bXMLHttpRequest\b/i,
      /\bWebSocket\b/i,
      /\bEventSource\b/i,
      /\blocalStorage\b/i,
      /\bsessionStorage\b/i,
      /\bindexedDB\b/i,
      /\/api\//i,
      /\bagentis\b/i,
    ].some((pattern) => pattern.test(scripts))
  ) {
    return true
  }

  return Array.from(
    html.matchAll(/\b(?:href|src|action)\s*=\s*["']([^"']+)["']/gi)
  ).some((match) => /\/api\//i.test(match[1] ?? ""))
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

  const stylesheetLinks = input.html.matchAll(
    /<link\b[^>]*rel\s*=\s*["']?stylesheet["']?[^>]*>/gi
  )
  for (const match of stylesheetLinks) {
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(match[0])?.[1]
    const url = href ? externalUrl(href) : null
    if (url && !APPROVED_EXTERNAL_STYLESHEET_ORIGINS.has(url.origin)) {
      return error(
        "static_artifact_invalid_html",
        "Static HTML must not include unapproved external stylesheets."
      )
    }
  }

  if (/\son[a-z]+\s*=/i.test(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not include inline event handler attributes."
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
