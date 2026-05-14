# Support-Agent MVP Run Notes

## Local Commands

Install dependencies:

```bash
pnpm install
```

Start the web app:

```bash
pnpm dev
```

Start the web app for the Codex in-app browser:

```bash
pnpm dev -- -- --host 127.0.0.1
```

Run focused support-agent UI and contract checks:

```bash
pnpm --filter web test -- App.test.tsx
pnpm --filter web test -- src/lib/support-agent
pnpm --filter web typecheck
```

Run the optional live OpenAI gateway check:

```bash
OPENAI_API_KEY=sk-... SUPPORT_AGENT_MODEL=gpt-5.4-mini pnpm --filter web test -- src/lib/support-agent/ai-sdk-model-gateway.live.test.ts
```

Run the repository checks:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm test:e2e
pnpm ci
```

## Template Flow

1. Open the Vite local URL printed by `pnpm dev`.
2. Confirm the page heading is `Configure a support agent`.
3. Edit `Template name` and confirm the `Template preview` heading updates.
4. Select `Product documentation sample`.
5. Confirm the preview shows `Selected source: Product documentation sample`.

## Chat Path

1. Select `Product documentation sample`.
2. Enter a question in `Support question`, such as `How do I connect a knowledge source?`.
3. Choose `Ask support agent`.
4. Confirm the transcript shows the submitted `User` message.
5. Confirm the `Assistant` answer appears with source metadata:
   - `Source: Product documentation sample`
   - `Source ID: source_product_docs_setup`
   - `Select Product documentation sample during setup.`
6. Switch the selected source to `Release notes sample`, ask another question, and confirm the new assistant turn cites:
   - `Source: Release notes sample`
   - `Source ID: source_release_notes_may`
   - `May release notes summarize the newest support-agent changes.`

## Current Runtime Boundary

The local MVP uses the Agentis-owned support-agent contract in `apps/web/src/lib/support-agent`. The browser demo selects deterministic `demo` mode through `createConfiguredSupportAgentRuntime({ mode: "demo" })`. App submissions call the configured `SupportAgentRuntime` through `respondWithSupportAgentRuntime`, which requires the assistant answer to match the submitted agent ID, conversation ID, and in-reply-to user message ID before the transcript appends it.

The first real-call local path uses the AI SDK OpenAI gateway behind `SupportAgentRuntime`:

- Required environment variable: `OPENAI_API_KEY`
- Optional environment variable: `SUPPORT_AGENT_MODEL`
- Default model: `gpt-5.4-mini`
- Provider: `openai`

The Vercel AI SDK gives Agentis a common call surface for model generation, streaming, tool calls, and provider adapters. Agentis still has to install each provider package, collect that provider's credentials, choose the provider factory, and map Agentis config into the provider call. This slice only wires `@ai-sdk/openai` through `createAiSdkOpenAiTextGenerator`, so `openai` is the only supported real provider in this demo. Additional providers need explicit Agentis gateway modules and tests before they are selectable.

The live gateway check is skipped when `OPENAI_API_KEY` is not set. In this run, `OPENAI_API_KEY` was present and the optional live local model call ran through `pnpm --filter web test -- App.test.tsx src/lib/support-agent`. The current browser UI does not send provider secrets to client state and does not include a server route for live model calls.

## Documentation Context Path

The GUI sends selected documentation as `knowledgeSourceIds` plus display metadata and a local documentation context reference. `resolveSupportAgentDocumentationContext` turns those selected sources into typed local context for the demo runtime, and unknown selected source IDs raise `SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN`.

The Flue adapter boundary remains the primary runtime path. `toFlueSupportAgentRuntimeInput` maps the Agentis-owned chat request into a Flue-ready input with selected source IDs, source metadata, and resolved documentation context. `toSupportAgentChatResponse` maps a Flue-shaped assistant answer back into the browser-safe Agentis chat response with answer text, assistant message ID, in-reply-to linkage, and provenance source metadata.

Current Flue-backed provenance limits:

- Browser-visible source metadata is limited to source ID, knowledge source ID, title, and excerpt.
- Flue run IDs, trace metadata, provider config, provider secrets, runtime storage paths, and other runtime-only fields stay outside `SupportAgentChatResponse`.
- Local demo provenance comes from checked-in sample documentation context. A live Flue Cloudflare request still needs the same response contract backed by deployed context storage before it can replace the deterministic browser demo.

The smallest local proof path uses checked-in sample documentation content so focused tests can prove that changing the selected documentation changes the model prompt, Flue-ready input, and rendered transcript provenance.

Recommended next step for Flue knowledge access: run a live Flue Cloudflare support-agent request with the same context contract backed by an R2 virtual sandbox. Keep provider-native file/search APIs, RAG, and hybrid retrieval as comparison paths after the R2-backed Flue route has a working request/response proof.

## Acceptance Handoff

See `docs/research/support-agent-mvp-acceptance.md` for MVP acceptance evidence and follow-up boundaries.
