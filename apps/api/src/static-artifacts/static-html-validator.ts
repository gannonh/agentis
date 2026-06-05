import type {
  StaticArtifactRenderMode,
  StaticArtifactType,
} from "@workspace/shared"
import { validateStaticArtifactMode } from "@workspace/shared"

export type StaticHtmlValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; code: string; message: string; status: number }

const APPROVED_EXTERNAL_STYLESHEET_ORIGINS = new Set<string>()

function error(
  code: string,
  message: string,
  status = 400
): StaticHtmlValidationResult {
  return { ok: false, code, message, status }
}

function externalUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol === "http:" || url.protocol === "https:") return url
    return null
  } catch {
    return null
  }
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

  if (includesForbiddenRuntimeAccess(input.html)) {
    return error(
      "static_artifact_invalid_html",
      "Static HTML must not call Agentis APIs, runtime bridges, network APIs, or browser storage."
    )
  }

  return { ok: true, warnings: [] }
}
