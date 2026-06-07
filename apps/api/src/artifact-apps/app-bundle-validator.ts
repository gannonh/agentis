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
    pattern: /\bon[a-z]+\s*=/i,
    message: "Inline event handler attributes are not allowed in App bundles.",
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
    pattern: /\bXMLHttpRequest\b/i,
    message: "External network access is not allowed in App bundles.",
  },
]

function error(
  code: string,
  message: string,
  status = 400
): AppBundleValidationResult {
  return { ok: false, code, message, status }
}

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
  const byteLength = Buffer.byteLength(source, "utf8")
  if (byteLength > input.maxBytes) {
    return error(
      "app_bundle_too_large",
      "App bundle exceeds the configured size limit.",
      413
    )
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

export const APP_BRIDGE_BOOTSTRAP = String.raw`(() => {
  const pending = new Map();
  let requestCounter = 0;
  function request(method, payload) {
    const requestId = "app-" + (++requestCounter);
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      parent.postMessage({ channel: "agentis-app-bridge", requestId, method, payload }, "*");
      setTimeout(() => {
        if (!pending.has(requestId)) return;
        pending.delete(requestId);
        reject(new Error("App bridge request timed out"));
      }, 10000);
    });
  }
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.channel !== "agentis-app-bridge-response") return;
    const entry = pending.get(data.requestId);
    if (!entry) return;
    pending.delete(data.requestId);
    if (data.error) entry.reject(new Error(String(data.error)));
    else entry.resolve(data.result);
  });
  window.App = {
    state: {
      get: () => request("state.get"),
      set: (value) => request("state.set", { value }),
    },
    runtime: {
      info: () => request("runtime.info"),
    },
  };
})();`

export function assembleAppSrcDoc(input: {
  bundle: AppBundleInput
  runtimeInfo: { artifactId: string; version: number }
}): string {
  const cssBlock = input.bundle.css
    ? `<style>${input.bundle.css}</style>`
    : ""
  const bootstrap = `<script>${APP_BRIDGE_BOOTSTRAP}</script>`
  const userScript = `<script>${input.bundle.js}</script>`

  if (/<html[\s>]/i.test(input.bundle.html)) {
    let html = input.bundle.html
    if (cssBlock && !/<style[\s>]/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match: string) => `${match}${cssBlock}`)
    }
    if (/<\/body>/i.test(html)) {
      return html.replace(/<\/body>/i, `${bootstrap}${userScript}</body>`)
    }
    return `${html}${bootstrap}${userScript}`
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${cssBlock}
</head>
<body data-agentis-app="${input.runtimeInfo.artifactId}" data-agentis-app-version="${input.runtimeInfo.version}">
${input.bundle.html}
${bootstrap}
${userScript}
</body>
</html>`
}
