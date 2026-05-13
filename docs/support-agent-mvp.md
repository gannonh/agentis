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

## Current Runtime Boundary

The local MVP uses the Agentis-owned support-agent contract in `apps/web/src/lib/support-agent`. The browser demo selects deterministic `demo` mode through `createConfiguredSupportAgentRuntime({ mode: "demo" })`.

The first real-call local path uses the AI SDK OpenAI gateway behind `SupportAgentRuntime`:

- Required environment variable: `OPENAI_API_KEY`
- Optional environment variable: `SUPPORT_AGENT_MODEL`
- Default model: `gpt-5.4-mini`
- Provider: `openai`

The Vercel AI SDK gives Agentis a common call surface for model generation, streaming, tool calls, and provider adapters. Agentis still has to install each provider package, collect that provider's credentials, choose the provider factory, and map Agentis config into the provider call. This slice only wires `@ai-sdk/openai` through `createAiSdkOpenAiTextGenerator`, so `openai` is the only supported real provider in this demo. Additional providers need explicit Agentis gateway modules and tests before they are selectable.

The live gateway check is skipped when `OPENAI_API_KEY` is not set. The current browser UI does not send provider secrets to client state and does not include a server route for live model calls. Context strategy remains minimal; Planned Slice 2 owns documentation context selection and retrieval behavior.

The Flue adapter boundary remains available for the configured runtime path.

## Acceptance Handoff

See `docs/research/support-agent-mvp-acceptance.md` for MVP acceptance evidence and follow-up boundaries.
