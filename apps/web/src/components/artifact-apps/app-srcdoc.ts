const APP_BRIDGE_BOOTSTRAP = String.raw`(() => {
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

type AppBundle = {
  html: string
  css?: string
  js: string
}

function parseBundle(content: string | null): AppBundle | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content) as Partial<AppBundle>
    if (typeof parsed.html !== "string" || typeof parsed.js !== "string") {
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

export function assembleAppSrcDoc(input: {
  bundle: AppBundle
  artifactId: string
  version: number
}): string {
  const cssBlock = input.bundle.css ? `<style>${input.bundle.css}</style>` : ""
  const bootstrap = `<script>${APP_BRIDGE_BOOTSTRAP}</script>`
  const userScript = `<script>${input.bundle.js}</script>`

  if (/<html[\s>]/i.test(input.bundle.html)) {
    let html = input.bundle.html
    if (cssBlock && !/<style[\s>]/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (match) => `${match}${cssBlock}`)
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
<body data-agentis-app="${input.artifactId}" data-agentis-app-version="${input.version}">
${input.bundle.html}
${bootstrap}
${userScript}
</body>
</html>`
}

export type { AppBundle }
export { parseBundle }
