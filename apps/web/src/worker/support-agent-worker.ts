import {
  createSupportAgentApiHandler,
  supportAgentApiPath,
} from "../lib/support-agent/api-handler"
import { createAiSdkOpenAiTextGenerator } from "../lib/support-agent/ai-sdk-model-gateway"
import {
  verifyHostedSupportAgentAccessToken,
  verifyHostedSupportAgentStaticAccessToken,
} from "../lib/support-agent/hosted-access-token"
import {
  resolveSupportAgentAiSearchConfigFromWorkerEnv,
  toPublicSupportAgentAiSearchStatus,
} from "../lib/support-agent/ai-search-config"
import { toBrowserSafeSupportAgentApiError } from "../lib/support-agent/browser-safe-error"
import {
  createHostedSupportAgentDeploymentFailure,
  createHostedSupportAgentDeploymentStatus,
} from "../lib/support-agent/hosted-deployment-status"
import type { SupportAgentTextGenerator } from "../lib/support-agent/model-runtime"
import {
  SupportAgentRuntimeError,
  toSupportAgentFailureState,
} from "../lib/support-agent/runtime-boundary"

export type SupportAgentWorkerEnv = {
  SUPPORT_AGENT_OPENAI_API_KEY?: string
  SUPPORT_AGENT_DEPLOYMENT_SECRET?: string
  SUPPORT_AGENT_ACCESS_TOKEN?: string
  SUPPORT_AGENT_MODEL?: string
  SUPPORT_AGENT_PROVIDER?: string
  SUPPORT_AGENT_AI_SEARCH?: unknown
  SUPPORT_AGENT_AI_SEARCH_INSTANCE?: unknown
  SUPPORT_AGENT_AI_SEARCH_NAMESPACE?: string
}

export type SupportAgentWorkerOptions = {
  generateText?: SupportAgentTextGenerator
}

export function createSupportAgentWorkerFetch({
  generateText = createAiSdkOpenAiTextGenerator(),
}: SupportAgentWorkerOptions = {}): (
  request: Request,
  env: SupportAgentWorkerEnv
) => Promise<Response> {
  return async (request, env) => {
    const url = new URL(request.url)

    if (url.pathname === "/") {
      return htmlResponse(createWorkerIndexPageHtml(url.origin), 200)
    }

    if (url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          service: "agentis-support-agent-preview",
        },
        200
      )
    }

    if (url.pathname === "/support-agent/status") {
      const aiSearch = toPublicSupportAgentAiSearchStatus(
        resolveSupportAgentAiSearchConfigFromWorkerEnv(env)
      )

      if (!hasRequiredServerBindings(env)) {
        return jsonResponse(
          {
            ...createMissingSecretStatus(),
            aiSearch,
          },
          503
        )
      }

      return jsonResponse(
        {
          ...createHostedSupportAgentDeploymentStatus({
            state: "deployed",
            deployment: {
              id: "agentis-support-agent-preview",
              publicName: "Agentis support-agent preview",
              chatUrl: new URL("/support-agent/chat", url.origin).toString(),
            },
          }),
          aiSearch,
        },
        200
      )
    }

    if (url.pathname === "/support-agent/chat") {
      return htmlResponse(createHostedChatPageHtml(supportAgentApiPath), 200)
    }

    if (url.pathname === supportAgentApiPath) {
      if (!hasRequiredServerBindings(env)) {
        return jsonResponse(createMissingSecretError(), 503)
      }

      if (!(await hasDeploymentAccess(request, env))) {
        return jsonResponse(
          {
            error: toBrowserSafeSupportAgentApiError(
              toSupportAgentFailureState(
                new SupportAgentRuntimeError({
                  code: "SUPPORT_AGENT_HOSTED_ACCESS_DENIED",
                  message: "Hosted support-agent access is required.",
                })
              )
            ),
          },
          401
        )
      }

      const handler = createSupportAgentApiHandler({
        env: {
          OPENAI_API_KEY: env.SUPPORT_AGENT_OPENAI_API_KEY,
          SUPPORT_AGENT_MODEL: env.SUPPORT_AGENT_MODEL,
          SUPPORT_AGENT_PROVIDER: env.SUPPORT_AGENT_PROVIDER,
        },
        generateText,
      })

      return handler(request)
    }

    return jsonResponse({ ok: false, error: "Not found" }, 404)
  }
}

function hasRequiredServerBindings(
  env: SupportAgentWorkerEnv
): env is SupportAgentWorkerEnv & {
  SUPPORT_AGENT_OPENAI_API_KEY: string
  SUPPORT_AGENT_DEPLOYMENT_SECRET: string
} {
  return Boolean(
    env.SUPPORT_AGENT_OPENAI_API_KEY?.trim() &&
    env.SUPPORT_AGENT_DEPLOYMENT_SECRET?.trim()
  )
}

function createMissingSecretStatus() {
  return createHostedSupportAgentDeploymentStatus({
    state: "failed",
    deployment: {
      id: "agentis-support-agent-preview",
      publicName: "Agentis support-agent preview",
    },
    failure: createHostedSupportAgentDeploymentFailure({
      code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
    }),
  })
}

function createMissingSecretError() {
  const status = createMissingSecretStatus()

  return {
    error: toBrowserSafeSupportAgentApiError(
      toSupportAgentFailureState(
        new SupportAgentRuntimeError({
          code: "SUPPORT_AGENT_HOSTED_BINDING_MISSING",
          message: status.failure!.title,
        })
      )
    ),
  }
}

async function hasDeploymentAccess(
  request: Request,
  env: SupportAgentWorkerEnv & { SUPPORT_AGENT_DEPLOYMENT_SECRET: string }
): Promise<boolean> {
  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined
  const candidateTokens = [
    request.headers.get("x-agentis-access-token") ?? undefined,
    bearerToken,
  ].filter((token): token is string => Boolean(token?.trim()))

  for (const candidateToken of candidateTokens) {
    const configuredAccessToken = env.SUPPORT_AGENT_ACCESS_TOKEN?.trim()

    if (configuredAccessToken) {
      if (
        await verifyHostedSupportAgentStaticAccessToken({
          expectedAccessToken: configuredAccessToken,
          accessToken: candidateToken,
        })
      ) {
        return true
      }
      continue
    }

    if (
      await verifyHostedSupportAgentAccessToken({
        deploymentSecret: env.SUPPORT_AGENT_DEPLOYMENT_SECRET,
        accessToken: candidateToken,
      })
    ) {
      return true
    }
  }

  return false
}

function createWorkerIndexPageHtml(origin: string): string {
  const endpoints = [
    {
      path: "/support-agent/chat",
      label: "Hosted support-agent chat",
      description: "Open the browser chat surface for the preview deployment.",
    },
    {
      path: "/support-agent/status",
      label: "Deployment status",
      description:
        "Inspect browser-safe deployment state and actionable failures.",
    },
    {
      path: "/health",
      label: "Health check",
      description: "Verify the Worker is reachable.",
    },
  ]

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agentis support-agent preview Worker</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    main { box-sizing: border-box; margin: 0 auto; max-width: 760px; min-height: 100vh; padding: 48px 24px; }
    h1 { font-size: 32px; letter-spacing: -0.03em; margin: 0 0 12px; }
    p { line-height: 1.6; }
    .muted { color: #475569; }
    .endpoint { background: white; border: 1px solid #cbd5e1; display: block; margin-top: 16px; padding: 16px; text-decoration: none; }
    .endpoint strong { color: #0f172a; display: block; }
    .endpoint code { color: #334155; }
  </style>
</head>
<body>
  <main>
    <p class="muted">Hosted support</p>
    <h1>Agentis support-agent preview Worker</h1>
    <p class="muted">Use these endpoints to verify the hosted support-agent preview.</p>
    ${endpoints
      .map(
        (endpoint) => `<a class="endpoint" href="${endpoint.path}">
      <strong>${endpoint.label}</strong>
      <code>${origin}${endpoint.path}</code>
      <p class="muted">${endpoint.description}</p>
    </a>`
      )
      .join("\n    ")}
  </main>
</body>
</html>`
}

function createHostedChatPageHtml(apiPath: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agentis hosted support-agent web chat</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f8fafc; color: #0f172a; }
    main { box-sizing: border-box; margin: 0 auto; max-width: 760px; min-height: 100vh; padding: 48px 24px; }
    h1 { font-size: 32px; letter-spacing: -0.03em; margin: 0 0 12px; }
    p { line-height: 1.6; }
    .panel { background: white; border: 1px solid #cbd5e1; margin-top: 24px; padding: 20px; }
    label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    input, textarea { box-sizing: border-box; font: inherit; padding: 12px; width: 100%; }
    textarea { min-height: 120px; resize: vertical; }
    button { background: #0f172a; border: 0; color: white; cursor: pointer; font: inherit; font-weight: 600; margin-top: 12px; padding: 10px 14px; }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    .muted { color: #475569; font-size: 14px; }
    .turn { border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 16px; }
    .source { background: #f8fafc; border: 1px solid #e2e8f0; margin-top: 12px; padding: 12px; }
    .error { color: #b91c1c; }
  </style>
</head>
<body>
  <main>
    <p class="muted">Hosted support</p>
    <h1>Agentis hosted support-agent web chat</h1>
    <p class="muted" data-api-path="${apiPath}">Runtime boundary: Agentis-owned ${apiPath}</p>
    <section class="panel" aria-label="Deployment status">
      <p><strong>Deployment status:</strong> inspect <code>/support-agent/status</code></p>
      <p class="muted">Status responses expose browser-safe deployment state and actionable failure messages.</p>
    </section>
    <section class="panel" aria-label="Knowledge source">
      <p><strong>Selected source:</strong> Product documentation sample</p>
      <p class="muted">Product setup, billing, and troubleshooting articles.</p>
    </section>
    <section class="panel" aria-label="Hosted support-agent chat">
      <form id="support-agent-form">
        <label for="access-token">Deployment access token</label>
        <input id="access-token" name="accessToken" type="password" autocomplete="off" placeholder="Required for hosted preview access">
        <p class="muted">Use the derived preview access token (64-character hex), not the deployment secret. From the repo root, run <code>pnpm support-agent:access-token</code> after loading <code>.env</code>.</p>
        <label for="support-question">Support question</label>
        <textarea id="support-question" name="question" placeholder="Ask about setup, billing, or troubleshooting">How do I connect a knowledge source?</textarea>
        <button id="submit-question" type="submit">Ask support agent</button>
      </form>
      <div id="chat-status" class="muted" role="status" aria-live="polite"></div>
      <div id="chat-result"></div>
    </section>
  </main>
  <script>
    const apiPath = ${JSON.stringify(apiPath)};
    const form = document.getElementById("support-agent-form");
    const questionInput = document.getElementById("support-question");
    const accessTokenInput = document.getElementById("access-token");
    const submitButton = document.getElementById("submit-question");
    const status = document.getElementById("chat-status");
    const result = document.getElementById("chat-result");
    const source = {
      id: "knowledge_product_docs",
      title: "Product documentation sample",
      description: "Product setup, billing, and troubleshooting articles.",
      contextReference: {
        type: "local-documentation",
        path: "docs/knowledge/product-documentation-sample.md"
      }
    };

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => {
        if (character === "&") return "&amp;";
        if (character === "<") return "&lt;";
        if (character === ">") return "&gt;";
        if (character === '"') return "&quot;";
        return "&#39;";
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const question = questionInput.value.trim();
      const accessToken = accessTokenInput.value.trim();

      if (!question) {
        status.textContent = "Enter a support question first.";
        return;
      }

      if (!accessToken) {
        status.textContent = "Enter the deployment access token first.";
        return;
      }

      const messageId = "message_user_" + Date.now();
      const request = {
        agentId: "agent_support_template",
        conversationId: "conversation_support_hosted",
        messageId,
        question,
        knowledgeSourceIds: [source.id],
        knowledgeSources: [source]
      };

      submitButton.disabled = true;
      status.textContent = "Asking hosted support agent...";
      result.innerHTML = "";

      try {
        const response = await fetch(apiPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-agentis-access-token": accessToken
          },
          body: JSON.stringify(request)
        });
        const payload = await response.json();

        if (!response.ok) {
          const error = payload.error || {};
          throw new Error(error.userMessage || error.message || "Hosted support-agent request failed.");
        }

        const sources = Array.isArray(payload.sources) ? payload.sources : [];
        const renderedSources = sources.map((item) =>
          '<div class="source">' +
            '<p><strong>Source:</strong> ' + escapeHtml(item.title) + '</p>' +
            '<p class="muted">Source ID: ' + escapeHtml(item.id) + '</p>' +
            '<p class="muted">' + escapeHtml(item.excerpt) + '</p>' +
          '</div>'
        ).join("");
        result.innerHTML =
          '<article class="turn">' +
            '<p class="muted">User</p>' +
            '<p>' + escapeHtml(question) + '</p>' +
            '<p class="muted">Assistant</p>' +
            '<p>' + escapeHtml(payload.answer || "") + '</p>' +
            '<p class="muted">Runtime: ' + escapeHtml(payload.runtime?.provider || payload.runtime?.mode || "unavailable") + ' / ' + escapeHtml(payload.runtime?.model || "unknown") + '</p>' +
            renderedSources +
          '</article>';
        status.textContent = "Hosted answer received.";
      } catch (error) {
        status.textContent = "Hosted answer failed.";
        result.innerHTML = '<p class="error" role="alert">' + escapeHtml(error.message) + '</p>';
      } finally {
        submitButton.disabled = false;
      }
    });
  </script>
</body>
</html>`
}

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export default {
  fetch: createSupportAgentWorkerFetch(),
}
