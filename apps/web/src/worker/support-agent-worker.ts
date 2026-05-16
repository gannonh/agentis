import {
  createSupportAgentApiHandler,
  supportAgentApiPath,
} from "../lib/support-agent/api-handler"
import { createAiSdkOpenAiTextGenerator } from "../lib/support-agent/ai-sdk-model-gateway"
import type { SupportAgentTextGenerator } from "../lib/support-agent/model-runtime"

export type SupportAgentWorkerEnv = {
  SUPPORT_AGENT_OPENAI_API_KEY?: string
  SUPPORT_AGENT_DEPLOYMENT_SECRET?: string
  SUPPORT_AGENT_MODEL?: string
  SUPPORT_AGENT_PROVIDER?: string
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

    if (url.pathname === "/health") {
      return jsonResponse(
        {
          ok: true,
          service: "agentis-support-agent-preview",
        },
        200
      )
    }

    if (url.pathname === "/support-agent/chat") {
      return htmlResponse(createHostedChatPageHtml(supportAgentApiPath), 200)
    }

    if (url.pathname === supportAgentApiPath) {
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
    textarea { box-sizing: border-box; font: inherit; min-height: 120px; padding: 12px; resize: vertical; width: 100%; }
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
    <section class="panel" aria-label="Knowledge source">
      <p><strong>Selected source:</strong> Product documentation sample</p>
      <p class="muted">Product setup, billing, and troubleshooting articles.</p>
    </section>
    <section class="panel" aria-label="Hosted support-agent chat">
      <form id="support-agent-form">
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

      if (!question) {
        status.textContent = "Enter a support question first.";
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
          headers: { "Content-Type": "application/json" },
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
