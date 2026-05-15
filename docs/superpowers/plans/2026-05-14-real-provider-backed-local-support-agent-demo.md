# Real Provider-Backed Local Support Agent Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the normal local web demo call a server-side OpenAI-backed support-agent runtime using `.env`, return a real LLM answer with selected-documentation provenance, and make deterministic demo mode impossible to mistake for the milestone demo.

**Architecture:** Keep the browser secret-free by replacing the default in-browser deterministic runtime with a `fetch` runtime that POSTs the existing `SupportAgentChatRequest` to a Vite dev-server API route. The Vite route loads `.env` from the workspace root, constructs the existing `mode: "model"` runtime server-side, calls OpenAI through the existing AI SDK gateway, and returns the existing chat response plus public runtime metadata. Deterministic `mode: "demo"` remains only for injected tests and explicit fixture use.

**Tech Stack:** Vite React, Vitest, Vite dev server middleware, Vercel AI SDK, `@ai-sdk/openai`, TypeScript, existing Agentis support-agent runtime contracts.

---

## Scope lock

This plan fixes the failed M003 acceptance gap only. It does not add production auth, hosted Cloudflare deployment, persistence, Slack, billing, streaming, RAG, or Flue Cloudflare execution.

## File structure

- Modify: `apps/web/src/lib/support-agent/chat-contracts.ts`
  - Add public runtime metadata to `SupportAgentChatResponse` so UAT can see whether an answer came from demo or model mode without exposing secrets.
- Modify: `apps/web/src/lib/support-agent/local-responder.ts`
  - Mark fixture answers as `runtime.mode: "demo"`.
- Modify: `apps/web/src/lib/support-agent/model-runtime.ts`
  - Mark real provider answers as `runtime.mode: "model"`, `provider`, and `model`.
- Create: `apps/web/src/lib/support-agent/http-runtime.ts`
  - Browser-side `SupportAgentRuntime` implementation that calls `/api/support-agent/respond`.
- Test: `apps/web/src/lib/support-agent/http-runtime.test.ts`
  - Prove the browser runtime posts the request, returns the response, and maps server failures to typed runtime errors.
- Create: `apps/web/src/lib/support-agent/api-handler.ts`
  - Request/Response handler that builds a provider-backed runtime from server-side env and returns sanitized JSON.
- Test: `apps/web/src/lib/support-agent/api-handler.test.ts`
  - Prove server-side env is used, the provider API key never appears in response/logs, real runtime metadata is returned, and missing config fails safely.
- Create: `apps/web/support-agent-dev-plugin.ts`
  - Vite dev middleware adapter for `api-handler.ts`; reads the raw Node request body and writes JSON responses.
- Modify: `apps/web/vite.config.ts`
  - Load `.env` from both repo root and `apps/web`, register the support-agent API plugin in dev.
- Modify: `apps/web/tsconfig.node.json`
  - Typecheck `support-agent-dev-plugin.ts` with the Vite config.
- Modify: `apps/web/src/App.tsx`
  - Default to the HTTP runtime, render runtime metadata, and keep test injection support.
- Modify: `apps/web/src/App.test.tsx`
  - Inject `createLocalSupportAgentResponder()` in deterministic UI tests and add a regression test proving default app submission uses the server endpoint.
- Modify: `docs/support-agent-mvp.md`
  - Replace deterministic-browser-demo language with real local-provider demo instructions.
- Modify: `docs/research/support-agent-mvp-acceptance.md`
  - Add hard UAT gate that rejects deterministic demo evidence for M003.

---

### Task 1: Add public runtime metadata to support-agent responses

**Files:**

- Modify: `apps/web/src/lib/support-agent/chat-contracts.ts`
- Modify: `apps/web/src/lib/support-agent/local-responder.ts`
- Modify: `apps/web/src/lib/support-agent/model-runtime.ts`
- Test: `apps/web/src/lib/support-agent/local-responder.test.ts`
- Test: `apps/web/src/lib/support-agent/model-runtime.test.ts`

- [ ] **Step 1: Write failing tests for runtime metadata**

In `apps/web/src/lib/support-agent/local-responder.test.ts`, add this assertion to the existing successful response test:

```ts
expect(response.runtime).toEqual({ mode: "demo" })
```

In `apps/web/src/lib/support-agent/model-runtime.test.ts`, add this assertion to the existing successful model-runtime response test:

```ts
expect(response.runtime).toEqual({
  mode: "model",
  provider: "openai",
  model: "test-model",
})
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run:

```bash
pnpm --filter web test -- src/lib/support-agent/local-responder.test.ts src/lib/support-agent/model-runtime.test.ts
```

Expected: FAIL because `response.runtime` is currently undefined.

- [ ] **Step 3: Add the response metadata type**

In `apps/web/src/lib/support-agent/chat-contracts.ts`, add this type before `SupportAgentChatResponse`:

```ts
export type SupportAgentRuntimeMetadata =
  | {
      mode: "demo"
    }
  | {
      mode: "model"
      provider: "openai"
      model: string
    }
```

Then change `SupportAgentChatResponse` to include the optional metadata:

```ts
export type SupportAgentChatResponse = {
  agentId: string
  conversationId: string
  messageId: string
  inReplyToMessageId: string
  answer: string
  sources: SupportAgentSource[]
  runtime?: SupportAgentRuntimeMetadata
  error?: string
}
```

- [ ] **Step 4: Mark deterministic fixture responses**

In `apps/web/src/lib/support-agent/local-responder.ts`, add `runtime: { mode: "demo" },` to the returned response:

```ts
return {
  agentId: request.agentId,
  conversationId: request.conversationId,
  messageId: `message_assistant_${request.messageId}`,
  inReplyToMessageId: request.messageId,
  answer: `${answerPrefix} ${request.question}`,
  sources: toSupportAgentSources(documentationContext),
  runtime: { mode: "demo" },
}
```

- [ ] **Step 5: Mark real provider responses**

In `apps/web/src/lib/support-agent/model-runtime.ts`, add `runtime` to the returned response:

```ts
return {
  agentId: request.agentId,
  conversationId: request.conversationId,
  messageId: `message_assistant_${request.messageId}`,
  inReplyToMessageId: request.messageId,
  answer: result.text,
  sources: toSupportAgentSources(documentationContext),
  runtime: {
    mode: "model",
    provider: config.provider,
    model: config.model,
  },
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
pnpm --filter web test -- src/lib/support-agent/local-responder.test.ts src/lib/support-agent/model-runtime.test.ts
pnpm --filter web typecheck
```

Expected: PASS.

Commit:

```bash
git add apps/web/src/lib/support-agent/chat-contracts.ts apps/web/src/lib/support-agent/local-responder.ts apps/web/src/lib/support-agent/model-runtime.ts apps/web/src/lib/support-agent/local-responder.test.ts apps/web/src/lib/support-agent/model-runtime.test.ts
git commit -m "feat: expose support agent runtime metadata"
```

---

### Task 2: Add the browser HTTP runtime

**Files:**

- Create: `apps/web/src/lib/support-agent/http-runtime.ts`
- Create: `apps/web/src/lib/support-agent/http-runtime.test.ts`

- [ ] **Step 1: Write failing HTTP runtime tests**

Create `apps/web/src/lib/support-agent/http-runtime.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import { createSupportAgentHttpRuntime } from "./http-runtime"
import { SupportAgentRuntimeError } from "./runtime-boundary"

describe("support-agent HTTP runtime", () => {
  test("posts chat requests to the support-agent API endpoint", async () => {
    const fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          agentId: supportAgentChatRequestFixture.agentId,
          conversationId: supportAgentChatRequestFixture.conversationId,
          messageId: `message_assistant_${supportAgentChatRequestFixture.messageId}`,
          inReplyToMessageId: supportAgentChatRequestFixture.messageId,
          answer: "Provider-backed answer from the server.",
          sources: [],
          runtime: {
            mode: "model",
            provider: "openai",
            model: "test-model",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    const response = await runtime.respond(supportAgentChatRequestFixture)

    expect(fetch).toHaveBeenCalledWith("/api/support-agent/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supportAgentChatRequestFixture),
    })
    expect(response.answer).toBe("Provider-backed answer from the server.")
    expect(response.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "test-model",
    })
  })

  test("maps typed server failures to support-agent runtime errors", async () => {
    const fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            runtimeCode: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
            message: "Provider configuration missing.",
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    )
    const runtime = createSupportAgentHttpRuntime({ fetch })

    await expect(runtime.respond(supportAgentChatRequestFixture)).rejects.toEqual(
      new SupportAgentRuntimeError({
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Provider configuration missing.",
      })
    )
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter web test -- src/lib/support-agent/http-runtime.test.ts
```

Expected: FAIL because `http-runtime.ts` does not exist.

- [ ] **Step 3: Implement the HTTP runtime**

Create `apps/web/src/lib/support-agent/http-runtime.ts`:

```ts
import type { SupportAgentChatRequest } from "./chat-contracts"
import {
  SupportAgentRuntimeError,
  type SupportAgentRuntime,
  type SupportAgentRuntimeErrorCode,
} from "./runtime-boundary"

const defaultSupportAgentEndpoint = "/api/support-agent/respond"

type SupportAgentHttpRuntimeOptions = {
  endpoint?: string
  fetch?: typeof globalThis.fetch
}

type SupportAgentErrorPayload = {
  error?: {
    runtimeCode?: SupportAgentRuntimeErrorCode
    message?: string
  }
}

export function createSupportAgentHttpRuntime({
  endpoint = defaultSupportAgentEndpoint,
  fetch = globalThis.fetch,
}: SupportAgentHttpRuntimeOptions = {}): SupportAgentRuntime {
  return {
    async respond(request: SupportAgentChatRequest) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })

      const payload = await response.json()

      if (!response.ok) {
        const errorPayload = payload as SupportAgentErrorPayload
        const runtimeCode = errorPayload.error?.runtimeCode
        const message =
          errorPayload.error?.message ?? "Support agent request failed."

        if (runtimeCode) {
          throw new SupportAgentRuntimeError({
            code: runtimeCode,
            message,
          })
        }

        throw new Error(message)
      }

      return payload
    },
  }
}
```

- [ ] **Step 4: Export the runtime**

Add this line to `apps/web/src/lib/support-agent/index.ts`:

```ts
export * from "./http-runtime"
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm --filter web test -- src/lib/support-agent/http-runtime.test.ts
pnpm --filter web typecheck
```

Expected: PASS.

Commit:

```bash
git add apps/web/src/lib/support-agent/http-runtime.ts apps/web/src/lib/support-agent/http-runtime.test.ts apps/web/src/lib/support-agent/index.ts
git commit -m "feat: add browser support agent HTTP runtime"
```

---

### Task 3: Add the server-side provider-backed API handler

**Files:**

- Create: `apps/web/src/lib/support-agent/api-handler.ts`
- Create: `apps/web/src/lib/support-agent/api-handler.test.ts`

- [ ] **Step 1: Write failing API handler tests**

Create `apps/web/src/lib/support-agent/api-handler.test.ts`:

```ts
import { describe, expect, test, vi } from "vitest"

import { createSupportAgentApiHandler } from "./api-handler"
import { supportAgentChatRequestFixture } from "./chat-fixtures"
import type { SupportAgentTextGenerator } from "./model-runtime"

describe("support-agent API handler", () => {
  test("calls the model runtime with server-side provider config", async () => {
    const generateText = vi.fn<SupportAgentTextGenerator>(async ({ config, prompt }) => ({
      text: `Live model saw ${config.provider}:${config.model} and ${prompt.includes("Product documentation sample") ? "selected docs" : "missing docs"}.`,
    }))
    const handler = createSupportAgentApiHandler({
      env: {
        OPENAI_API_KEY: "sk-test-secret",
        SUPPORT_AGENT_MODEL: "test-model",
      },
      generateText,
    })

    const response = await handler(
      new Request("http://localhost/api/support-agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportAgentChatRequestFixture),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          provider: "openai",
          model: "test-model",
          apiKey: "sk-test-secret",
        },
      })
    )
    expect(payload.answer).toContain("Live model saw openai:test-model")
    expect(payload.runtime).toEqual({
      mode: "model",
      provider: "openai",
      model: "test-model",
    })
    expect(JSON.stringify(payload)).not.toContain("sk-test-secret")
  })

  test("returns a sanitized provider-config failure when the API key is missing", async () => {
    const handler = createSupportAgentApiHandler({
      env: { SUPPORT_AGENT_MODEL: "test-model" },
      generateText: vi.fn<SupportAgentTextGenerator>(),
    })

    const response = await handler(
      new Request("http://localhost/api/support-agent/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportAgentChatRequestFixture),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload).toEqual({
      error: {
        runtimeCode: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        title: "Provider configuration missing",
        userMessage:
          "The support agent needs provider credentials before it can answer.",
        maintainerMessage:
          "Set the support-agent provider environment variables, then retry the local demo.",
        message: "Support agent provider config requires provider, model, and API key.",
      },
    })
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm --filter web test -- src/lib/support-agent/api-handler.test.ts
```

Expected: FAIL because `api-handler.ts` does not exist.

- [ ] **Step 3: Implement the API handler**

Create `apps/web/src/lib/support-agent/api-handler.ts`:

```ts
import { createAiSdkOpenAiTextGenerator } from "./ai-sdk-model-gateway"
import type { SupportAgentChatRequest } from "./chat-contracts"
import {
  createConfiguredSupportAgentRuntime,
  respondWithSupportAgentRuntime,
  toSupportAgentFailureState,
  type SupportAgentRuntimeError,
} from "./index"
import type { SupportAgentTextGenerator } from "./model-runtime"

export const supportAgentApiPath = "/api/support-agent/respond"

export type SupportAgentServerEnv = Record<string, string | undefined>

export type SupportAgentApiHandlerOptions = {
  env: SupportAgentServerEnv
  generateText?: SupportAgentTextGenerator
}

export function createSupportAgentApiHandler({
  env,
  generateText = createAiSdkOpenAiTextGenerator(),
}: SupportAgentApiHandlerOptions): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method !== "POST") {
      return jsonResponse(
        {
          error: {
            message: "Support agent endpoint requires POST.",
          },
        },
        405
      )
    }

    try {
      const chatRequest = (await request.json()) as SupportAgentChatRequest
      const runtime = createConfiguredSupportAgentRuntime({
        mode: "model",
        provider: {
          provider: env.SUPPORT_AGENT_PROVIDER ?? "openai",
          model: env.SUPPORT_AGENT_MODEL ?? "gpt-4o-mini",
          apiKey: env.OPENAI_API_KEY,
        },
        generateText,
      })
      const response = await respondWithSupportAgentRuntime(runtime, chatRequest)

      return jsonResponse(response, 200)
    } catch (error) {
      const failure = toSupportAgentFailureState(error)
      const message = error instanceof Error ? error.message : "Support agent request failed."

      return jsonResponse(
        {
          error: {
            runtimeCode: failure.runtimeCode,
            title: failure.title,
            userMessage: failure.userMessage,
            maintainerMessage: failure.maintainerMessage,
            message,
          },
        },
        500
      )
    }
  }
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
```

- [ ] **Step 4: Remove the unused type if TypeScript flags it**

If `SupportAgentRuntimeError` is unused in `api-handler.ts`, do not import it. The import list should be:

```ts
import {
  createConfiguredSupportAgentRuntime,
  respondWithSupportAgentRuntime,
  toSupportAgentFailureState,
} from "./index"
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm --filter web test -- src/lib/support-agent/api-handler.test.ts
pnpm --filter web typecheck
```

Expected: PASS.

Commit:

```bash
git add apps/web/src/lib/support-agent/api-handler.ts apps/web/src/lib/support-agent/api-handler.test.ts
git commit -m "feat: add provider backed support agent API handler"
```

---

### Task 4: Register the real support-agent endpoint in local dev

**Files:**

- Create: `apps/web/support-agent-dev-plugin.ts`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/tsconfig.node.json`

- [ ] **Step 1: Create the Vite dev middleware plugin**

Create `apps/web/support-agent-dev-plugin.ts`:

```ts
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"

import {
  createSupportAgentApiHandler,
  supportAgentApiPath,
  type SupportAgentServerEnv,
} from "./src/lib/support-agent/api-handler"

export function supportAgentDevPlugin(env: SupportAgentServerEnv): Plugin {
  return {
    name: "agentis-support-agent-dev-api",
    configureServer(server) {
      const handler = createSupportAgentApiHandler({ env })

      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith(supportAgentApiPath)) {
          next()
          return
        }

        try {
          const body = await readRequestBody(request)
          const apiResponse = await handler(
            new Request(`http://localhost${supportAgentApiPath}`, {
              method: request.method,
              headers: toHeaders(request),
              body: body.length > 0 ? body : undefined,
            })
          )

          response.statusCode = apiResponse.status
          apiResponse.headers.forEach((value, key) => {
            response.setHeader(key, value)
          })
          response.end(await apiResponse.text())
        } catch (error) {
          server.config.logger.error(
            error instanceof Error ? error.message : String(error)
          )
          response.statusCode = 500
          response.setHeader("Content-Type", "application/json")
          response.end(
            JSON.stringify({
              error: {
                message: "Support agent dev endpoint failed.",
              },
            })
          )
        }
      })
    },
  }
}

function toHeaders(request: IncomingMessage): Headers {
  const headers = new Headers()

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers.set(key, value)
    }
  }

  return headers
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    request.on("data", (chunk: Buffer) => chunks.push(chunk))
    request.on("error", reject)
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
  })
}
```

- [ ] **Step 2: Wire the plugin into Vite and load repo-root `.env`**

Replace `apps/web/vite.config.ts` with:

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vitest/config"

import { supportAgentDevPlugin } from "./support-agent-dev-plugin"

const workspaceRoot = path.resolve(__dirname, "../..")

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const workspaceEnv = loadEnv(mode, workspaceRoot, "")
  const appEnv = loadEnv(mode, __dirname, "")
  const serverEnv = {
    ...workspaceEnv,
    ...appEnv,
    ...process.env,
  }

  return {
    plugins: [react(), tailwindcss(), supportAgentDevPlugin(serverEnv)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**", "src/main.tsx"],
        thresholds: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  }
})
```

- [ ] **Step 3: Typecheck the plugin**

Change `apps/web/tsconfig.node.json` include to:

```json
"include": ["vite.config.ts", "support-agent-dev-plugin.ts"]
```

- [ ] **Step 4: Run typecheck and commit**

Run:

```bash
pnpm --filter web typecheck
```

Expected: PASS.

Commit:

```bash
git add apps/web/support-agent-dev-plugin.ts apps/web/vite.config.ts apps/web/tsconfig.node.json
git commit -m "feat: expose support agent provider endpoint in local dev"
```

---

### Task 5: Make the app use the real server endpoint by default

**Files:**

- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: Write the regression test that prevents default demo mode**

In `apps/web/src/App.test.tsx`, update the support-agent imports to include:

```ts
createLocalSupportAgentResponder,
```

Add this test near `delegates support chat through the configured runtime`:

```ts
test("uses the server-backed support-agent runtime by default", async () => {
  const user = userEvent.setup()
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        agentId: "agent_support_template",
        conversationId: "conversation_support_demo",
        messageId: "message_assistant_message_user_setup_question",
        inReplyToMessageId: "message_user_setup_question",
        answer: "Real provider-backed answer from local dev endpoint.",
        sources: [
          {
            id: "source_product_docs_setup",
            knowledgeSourceId: "knowledge_product_docs",
            title: "Product documentation sample",
            excerpt: "Select Product documentation sample during setup.",
          },
        ],
        runtime: {
          mode: "model",
          provider: "openai",
          model: "test-model",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  )

  render(<App />)

  await submitSupportQuestion(user)

  expect(fetch).toHaveBeenCalledWith("/api/support-agent/respond", expect.any(Object))
  expect(
    await screen.findByText("Real provider-backed answer from local dev endpoint.")
  ).toBeInTheDocument()
  expect(screen.getByText("Runtime: OpenAI / test-model")).toBeInTheDocument()
  fetch.mockRestore()
})
```

- [ ] **Step 2: Convert deterministic UI tests to explicit fixture mode**

In `apps/web/src/App.test.tsx`, add this helper after `submitSupportQuestion`:

```ts
function renderAppWithDemoRuntime() {
  return render(<App supportAgentResponder={createLocalSupportAgentResponder()} />)
}
```

Replace `render(<App />)` with `renderAppWithDemoRuntime()` in these existing tests only:

- `submits a support question through the Agentis chat path`
- `renders submitted user and assistant transcript messages`
- `renders cited source metadata for assistant answers`
- `renders provenance for the source selected when the question is submitted`
- `keeps earlier support questions in the transcript`

Do not replace `render(<App />)` in the new default-runtime regression test.

- [ ] **Step 3: Run the App test and verify it fails**

Run:

```bash
pnpm --filter web test -- App.test.tsx
```

Expected: FAIL because `App` still defaults to `demoSupportAgentResponder` and does not render runtime metadata.

- [ ] **Step 4: Change the App default runtime**

In `apps/web/src/App.tsx`, replace the support-agent import `createConfiguredSupportAgentRuntime` with `createSupportAgentHttpRuntime`:

```ts
import {
  createSupportAgentHttpRuntime,
  respondWithSupportAgentRuntime,
  supportAgentChatRequestFixture,
  toSupportAgentFailureState,
  type SupportAgentChatRequest,
  type SupportAgentChatResponse,
  type SupportAgentFailureState,
  type SupportAgentRuntime,
} from "./lib/support-agent"
```

Replace the demo default runtime block:

```ts
const demoSupportAgentResponder = createConfiguredSupportAgentRuntime({
  mode: "demo",
})
```

with:

```ts
const serverSupportAgentResponder = createSupportAgentHttpRuntime()
```

Change the component default prop:

```ts
export function App({
  supportAgentResponder = serverSupportAgentResponder,
}: AppProps = {}) {
```

- [ ] **Step 5: Render public runtime metadata in the transcript**

In `apps/web/src/App.tsx`, add this helper near `getSubmittedContext`:

```ts
function getRuntimeLabel(response: SupportAgentChatResponse) {
  if (response.runtime?.mode === "model") {
    return `Runtime: ${response.runtime.provider === "openai" ? "OpenAI" : response.runtime.provider} / ${response.runtime.model}`
  }

  if (response.runtime?.mode === "demo") {
    return "Runtime: deterministic demo fixture"
  }

  return "Runtime: unavailable"
}
```

Inside the assistant transcript block, directly after `<p>{response.answer}</p>`, add:

```tsx
<p className="text-muted-foreground mt-2 text-xs">
  {getRuntimeLabel(response)}
</p>
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
pnpm --filter web test -- App.test.tsx
pnpm --filter web typecheck
```

Expected: PASS.

Commit:

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat: use provider backed support agent endpoint by default"
```

---

### Task 6: Update documentation and acceptance gates

**Files:**

- Modify: `docs/support-agent-mvp.md`
- Modify: `docs/research/support-agent-mvp-acceptance.md`

- [ ] **Step 1: Replace deterministic demo wording in support-agent docs**

In `docs/support-agent-mvp.md`, replace the `## Current Runtime Boundary` section opening with:

```md
## Current Runtime Boundary

The local MVP browser flow uses a server-backed `SupportAgentRuntime` by default. The browser submits `SupportAgentChatRequest` to `/api/support-agent/respond`; the Vite dev server reads provider configuration from `.env` server-side, calls the OpenAI-backed model runtime, and returns a `SupportAgentChatResponse` with public runtime metadata.

The deterministic responder remains available only for injected tests and explicit fixture usage. It is not acceptable evidence for M003 real-demo acceptance.

Required environment:

- `.env` at the repository root or `apps/web/.env`
- `OPENAI_API_KEY`: required for the real local browser demo
- `SUPPORT_AGENT_MODEL`: optional model override. Default: `gpt-4o-mini`
- Provider: `openai`
```

- [ ] **Step 2: Add a hard UAT gate**

In `docs/research/support-agent-mvp-acceptance.md`, add this section before `## Follow-Up Boundaries`:

```md
## M003 Real-Demo Acceptance Gate

M003 is not accepted unless the normal browser demo proves real model engagement.

Required evidence:

- Start the app with `pnpm dev -- -- --host 127.0.0.1`.
- Load `OPENAI_API_KEY` from `.env` server-side.
- Ask a question through the browser UI.
- The assistant answer must render `Runtime: OpenAI / <model>`.
- The answer must not match the deterministic fixture shape `Use <source> to answer: <question>`.
- The transcript must render selected-source provenance.
- UAT evidence must include a browser video or screenshots plus sanitized dev-server logs.

Rejected evidence:

- Deterministic `mode: "demo"` browser walkthroughs.
- Gateway-only tests that do not exercise the browser app path.
- Eval-only runs that do not show the local app receiving a real answer.
```

- [ ] **Step 3: Run documentation grep checks**

Run:

```bash
rg -n "deterministic browser demo|mode: \"demo\"|not acceptable evidence|Runtime: OpenAI|M003 Real-Demo Acceptance Gate" docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md
```

Expected: Output includes the new rejection language and no sentence claiming the browser demo uses deterministic mode as the accepted path.

- [ ] **Step 4: Commit**

```bash
git add docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md
git commit -m "docs: require real provider evidence for support agent acceptance"
```

---

### Task 7: Run full verification and capture real-demo UAT

**Files:**

- No source changes expected.
- Create evidence under `uat-evidence/mixed-<timestamp>/`.

- [ ] **Step 1: Run automated verification**

Run:

```bash
pnpm --filter web test -- App.test.tsx src/lib/support-agent
pnpm typecheck
```

Expected:

```text
Test Files ... passed
Tests ... passed
Tasks: 2 successful, 2 total
```

- [ ] **Step 2: Run the live OpenAI gateway check from `.env`**

Run:

```bash
set -a
source .env
set +a
pnpm --filter web test -- src/lib/support-agent/ai-sdk-model-gateway.live.test.ts
```

Expected:

```text
Test Files  1 passed
Tests       1 passed
```

- [ ] **Step 3: Start the real local demo**

Run:

```bash
pnpm dev -- -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 4: Manually verify the real app path**

In the browser:

1. Open the printed local URL.
2. Set `Template name` to `Billing support`.
3. Select `Product documentation sample`.
4. Ask: `Answer in one short sentence: how do I connect a knowledge source?`
5. Confirm the assistant answer appears.
6. Confirm the answer shows `Runtime: OpenAI / <model>`.
7. Confirm the answer does not exactly equal `Use Product documentation sample to answer: Answer in one short sentence: how do I connect a knowledge source?`.
8. Confirm provenance shows `Source: Product documentation sample` and `Source ID: source_product_docs_setup`.
9. Select `Release notes sample`.
10. Ask: `Answer in one short sentence: what changed in the May release notes?`
11. Confirm the answer shows `Runtime: OpenAI / <model>` and `Source ID: source_release_notes_may`.

- [ ] **Step 5: Capture UAT evidence**

Use `user-acceptance` and `agent-browser` to capture:

```text
uat-evidence/mixed-<timestamp>/recordings/real-provider-support-agent-demo.webm
uat-evidence/mixed-<timestamp>/screenshots/01-start.png
uat-evidence/mixed-<timestamp>/screenshots/02-product-docs-real-answer.png
uat-evidence/mixed-<timestamp>/screenshots/03-release-notes-real-answer.png
uat-evidence/mixed-<timestamp>/logs/dev-server.log
uat-evidence/mixed-<timestamp>/logs/live-gateway-test.log
uat-evidence/mixed-<timestamp>/evidence.md
uat-evidence/mixed-<timestamp>/evidence.json
```

The final UAT report must mark M003 failed if the browser transcript does not show `Runtime: OpenAI / <model>`.

- [ ] **Step 6: Commit only source/docs, not UAT artifacts**

Run:

```bash
git status --short
```

Expected: source and docs changes are committed. `uat-evidence/` remains untracked or ignored.

---

## Self-review

### Spec coverage

- Real local support-agent demo: Task 4 and Task 5 make the normal browser app call a server-side model runtime.
- API key from `.env`: Task 4 loads repo-root and app `.env` server-side.
- No browser-visible secret: Task 3 tests response/log payloads do not contain the API key.
- Selected documentation context: existing context resolver is preserved; Task 3 proves selected docs reach the prompt; Task 7 verifies provenance in browser.
- Real LLM answer in app: Task 7 requires visible `Runtime: OpenAI / <model>` and rejects deterministic fixture answer shape.
- Failure states: Task 2 and existing App tests preserve typed runtime failure handling.
- Eval/model readiness: existing eval path remains; Task 7 runs gateway check and leaves eval as optional follow-up unless credentials/model access permit completion.
- Documentation: Task 6 updates acceptance gates and rejects deterministic evidence.

### Placeholder scan

No `TBD`, `TODO`, `implement later`, or unspecified test steps remain in this plan.

### Type consistency

- Runtime metadata type is `SupportAgentRuntimeMetadata` and lives in `chat-contracts.ts`.
- Browser runtime factory is `createSupportAgentHttpRuntime` and returns `SupportAgentRuntime`.
- API route constant is `supportAgentApiPath` and equals `/api/support-agent/respond`.
- API handler factory is `createSupportAgentApiHandler` and accepts `{ env, generateText }`.
- Vite plugin factory is `supportAgentDevPlugin` and accepts server env.

## Demo instructions

1. Set env:

   ```bash
   cp .env.example .env # if needed
   # Ensure .env contains:
   OPENAI_API_KEY=...
   # Optional:
   SUPPORT_AGENT_MODEL=gpt-5.4-mini
   ```

2. Start the app:

   ```bash
   pnpm dev -- -- --host 127.0.0.1
   ```

3. Open the printed local URL, usually `http://localhost:5173/`.

4. Demo the product docs path:
   - Set `Template name` to `Billing support`.
   - Select `Product documentation sample`.
   - Ask `Answer in one short sentence: how do I connect a knowledge source?`.
   - Confirm the answer appears, runtime shows `Runtime: OpenAI / <model>`, source shows `Source ID: source_product_docs_setup`, and the answer does not match deterministic fixture wording.

5. Demo the release notes path:
   - Select `Release notes sample`.
   - Ask `Answer in one short sentence: what changed in the May release notes?`.
   - Confirm the answer appears, runtime shows `Runtime: OpenAI / <model>`, and source shows `Source ID: source_release_notes_may`.

6. Optional proof commands:

   ```bash
   pnpm --filter web test -- App.test.tsx src/lib/support-agent
   pnpm typecheck
   set -a && source .env && set +a
   pnpm --filter web test -- src/lib/support-agent/ai-sdk-model-gateway.live.test.ts
   ```

Existing UAT evidence:

```text
uat-evidence/mixed-20260514-174252/evidence.md
uat-evidence/mixed-20260514-174252/recordings/real-provider-support-agent-demo.webm
```
