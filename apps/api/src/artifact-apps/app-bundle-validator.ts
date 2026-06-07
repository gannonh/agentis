import type { AppBundleInput } from "@workspace/shared"

export type AppBundleValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; code: string; message: string; status: number }

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /<script\b[^>]*\bsrc\s*=/i,
    message: "External script tags are not allowed in App bundles.",
  },
  {
    pattern: /<link\b[^>]*\brel\s*=\s*["']?stylesheet/i,
    message: "External stylesheets are not allowed in App bundles.",
  },
  {
    pattern: /<iframe\b/i,
    message: "Iframe creation is not allowed in App bundles.",
  },
  {
    pattern: /\bwindow\.parent\b|\bwindow\.top\b|\bparent\./i,
    message: "Direct parent page access is not allowed in App bundles.",
  },
  {
    pattern: /\bfetch\s*\(\s*["'`]https?:/i,
    message: "External network access is not allowed in App bundles.",
  },
  {
    pattern: /\bfetch\s*\(\s*["'`]\/\//i,
    message: "External network access is not allowed in App bundles.",
  },
  {
    pattern: /\bnavigator\.sendBeacon\b/i,
    message: "External network access is not allowed in App bundles.",
  },
  {
    pattern: /\bXMLHttpRequest\b/i,
    message: "External network access is not allowed in App bundles.",
  },
  {
    pattern: /<\/script\b/i,
    message: "Script tag terminators are not allowed in App bundles.",
  },
  {
    pattern: /<\/style\b/i,
    message: "Style tag terminators are not allowed in App bundles.",
  },
]

function error(
  code: string,
  message: string,
  status = 400
): AppBundleValidationResult {
  return { ok: false, code, message, status }
}

const HTML_FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /\bon[a-z]+\s*=/i,
    message: "Inline event handler attributes are not allowed in App bundles.",
  },
  {
    pattern: /<meta\b(?=[^>]*http-equiv\s*=\s*["']?content-security-policy)[^>]*>/i,
    message: "Custom Content-Security-Policy meta tags are not allowed in App bundles.",
  },
]

function combinedSource(bundle: AppBundleInput): string {
  return [bundle.html, bundle.css ?? "", bundle.js].join("\n")
}

export function validateAppBundle(input: {
  html: string
  css?: string
  js: string
  maxBytes: number
}): AppBundleValidationResult {
  const bundle: AppBundleInput = {
    html: input.html,
    css: input.css,
    js: input.js,
  }
  const source = combinedSource(bundle)
  const serializedByteLength = Buffer.byteLength(JSON.stringify(bundle), "utf8")
  if (serializedByteLength > input.maxBytes) {
    return error(
      "app_bundle_too_large",
      "App bundle exceeds the configured size limit.",
      413
    )
  }

  for (const rule of HTML_FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(bundle.html)) {
      return error("app_invalid_bundle", rule.message)
    }
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(source)) {
      return error("app_invalid_bundle", rule.message)
    }
  }

  return { ok: true, warnings: [] }
}

export function serializeAppBundle(bundle: AppBundleInput): string {
  return JSON.stringify(bundle)
}

export function parseStoredAppBundle(content: string): AppBundleInput | null {
  try {
    const parsed = JSON.parse(content) as Partial<AppBundleInput>
    if (
      typeof parsed.html !== "string" ||
      typeof parsed.js !== "string" ||
      !parsed.html.trim() ||
      !parsed.js.trim()
    ) {
      return null
    }
    return {
      html: parsed.html,
      css: typeof parsed.css === "string" ? parsed.css : undefined,
      js: parsed.js,
    }
  } catch {
    return null
  }
}
