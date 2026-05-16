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
pnpm --filter web test -- App.test.tsx src/lib/support-agent
pnpm --filter web typecheck
```

Run the optional live OpenAI gateway check:

```bash
OPENAI_API_KEY=sk-... SUPPORT_AGENT_MODEL=gpt-5.4-mini pnpm --filter web test -- src/lib/support-agent/ai-sdk-model-gateway.live.test.ts
```

Run the local support-agent model comparison eval:

```bash
OPENAI_API_KEY=sk-... pnpm --filter web support-agent:eval
```

Default compared model candidates:

- `openai:gpt-5-mini`, override with `SUPPORT_AGENT_EVAL_MODEL_A`
- `openai:gpt-5.1-mini`, override with `SUPPORT_AGENT_EVAL_MODEL_B`

Optional output path:

```bash
SUPPORT_AGENT_EVAL_OUTPUT=./support-agent-eval-report.json OPENAI_API_KEY=sk-... pnpm --filter web support-agent:eval
```

Run the repository checks:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm test:e2e
pnpm ci
```

## Local Demo Script

Use this script for a repeatable local support-agent demo.

### 1. Configure and start

Required local tools and environment:

- Node and pnpm for the Vite workspace.
- `.env` at the repository root or `apps/web/.env`.
- `OPENAI_API_KEY`: required for the real local browser demo.
- `SUPPORT_AGENT_MODEL`: optional model override. Default: `gpt-5.4-mini`.
- Provider: `openai`.

Optional eval environment:

- `SUPPORT_AGENT_EVAL_MODEL_A`: optional eval baseline override. Default: `gpt-5-mini`.
- `SUPPORT_AGENT_EVAL_MODEL_B`: optional eval comparison override. Default: `gpt-5.1-mini`.
- `SUPPORT_AGENT_EVAL_OUTPUT`: optional eval report output path.

Run:

```bash
pnpm install
pnpm dev -- -- --host 127.0.0.1
```

Open the exact Vite `Local:` URL printed by the command.

### 2. Configure the template

1. Confirm the page heading is `Configure a support agent`.
2. Edit `Template name` to `Billing support`.
3. Confirm the `Template preview` heading changes to `Billing support`.
4. Select `Product documentation sample`.
5. Confirm the preview shows `Selected source: Product documentation sample`.
6. Choose `Prepare hosted config`.
7. Confirm `Hosted deployment config` shows `Billing support`, `knowledge_product_docs`, `flue-support-agent`, `cloudflare-preview`, and `Credentials: server-side`.
8. Confirm the hosted config panel does not show provider API key, deployment secret, provider model setting, runtime path, or adapter internal field.

### 3. Ask and verify a cited answer

1. Enter `How do I connect a knowledge source?` in `Support question`.
2. Choose `Ask support agent`.
3. Confirm the transcript shows:
   - `User`
   - `How do I connect a knowledge source?`
   - `Assistant`
   - `Runtime: OpenAI / <model>`
4. Confirm the answer does not match the fixture shape `Use <source> to answer: <question>`.
5. Confirm provenance appears in the assistant turn:
   - `Source: Product documentation sample`
   - `Source ID: source_product_docs_setup`
   - `Select Product documentation sample during setup.`
6. Select `Release notes sample`, ask `What changed?`, and confirm the next answer renders `Runtime: OpenAI / <model>` and cites:
   - `Source: Release notes sample`
   - `Source ID: source_release_notes_may`
   - `May release notes summarize the newest support-agent changes.`

### 4. Prove failure states

The browser demo uses the server-backed provider runtime by default. Provider and runtime failures are also proven through focused app/runtime tests with injected failure states. Run:

```bash
pnpm --filter web test -- App.test.tsx failure-state.test.ts flue-adapter.test.ts
```

Expected failure-state checkpoints:

- Missing provider configuration:
  - Title: `Provider configuration missing`
  - User copy: `The support agent needs provider credentials before it can answer.`
  - Runtime code: `SUPPORT_AGENT_PROVIDER_CONFIG_MISSING`
- Context preparation failure:
  - Title: `Documentation context unavailable`
  - User copy: `The selected documentation could not be prepared for this question.`
  - Runtime code: `SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN`
- Model generation failure:
  - Title: `Answer generation failed`
  - User copy: `The support agent could not generate an answer right now.`
  - Runtime code: `SUPPORT_AGENT_PROVIDER_CALL_FAILED`
- Unavailable provenance:
  - Title: `Citation data unavailable`
  - User copy: `The support agent answered without citation data, so the answer was not shown.`
  - Runtime code: `SUPPORT_AGENT_PROVENANCE_UNAVAILABLE`

The same test run verifies that raw provider messages, secrets, stack traces, runtime paths, and provider internals stay out of UI-visible failure state.

### 5. Run optional live checks

Only run these when valid provider credentials and model access are available.

```bash
OPENAI_API_KEY=sk-... SUPPORT_AGENT_MODEL=gpt-5.4-mini pnpm --filter web test -- src/lib/support-agent/ai-sdk-model-gateway.live.test.ts
# Choose one:
OPENAI_API_KEY=sk-... pnpm --filter web support-agent:eval
# or (if you want an artifact file)
SUPPORT_AGENT_EVAL_OUTPUT=./support-agent-eval-report.json OPENAI_API_KEY=sk-... pnpm --filter web support-agent:eval
```

If credentials are missing, skip the gateway and eval commands and record `OPENAI_API_KEY not set` in acceptance notes. Gateway-only and eval-only runs are not a substitute for M003 real-demo browser evidence.

## Template Flow

1. Open the Vite local URL printed by `pnpm dev`.
2. Confirm the page heading is `Configure a support agent`.
3. Edit `Template name` and confirm the `Template preview` heading updates.
4. Select `Product documentation sample`.
5. Confirm the preview shows `Selected source: Product documentation sample`.
6. Choose `Prepare hosted config`.
7. Confirm the `Hosted deployment config` panel shows:
   - `Billing support` or the current template name.
   - `knowledge_product_docs`.
   - `flue-support-agent`.
   - `cloudflare-preview`.
   - `Credentials: server-side`.
8. Confirm the hosted config panel does not show provider API key, deployment secret, provider model setting, runtime path, or adapter internal field.

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

## Hosted Configuration Contract

The browser-facing hosted deployment handoff is produced from the current UI by opening the Vite app, naming the template, selecting sample documentation, and choosing `Prepare hosted config`. The focused automated proof is:

```bash
pnpm --filter web test -- App.test.tsx src/lib/support-agent
```

The contract builder is `createHostedSupportAgentDeploymentConfig`. It includes:

- Template identity: `agent_support_template` and the current template name.
- Knowledge selection: selected knowledge source IDs and local documentation context references.
- Runtime boundary: `flue-support-agent` with the `SupportAgentChatRequest` contract.
- Deployment intent: `cloudflare-preview`, `prepare-hosted-preview`, and `credentials: server-side`.

The contract omits provider API key, deployment secret, provider model setting, runtime path, or adapter internal field. The UI only shows a public handoff summary. Later Cloudflare deployment work should consume this public handoff and resolve provider/deployment credentials server-side.

Configure-only acceptance checklist:

- `Prepare hosted config` stays disabled until a knowledge source is selected.
- The generated handoff reflects the current template name and selected documentation source.
- The generated handoff declares the `flue-support-agent` runtime adapter and `SupportAgentChatRequest` contract.
- The generated handoff declares `cloudflare-preview` and `prepare-hosted-preview` as deployment intent, not a live deployment.
- Browser-visible text and state contain no provider API key, deployment secret, provider model setting, runtime path, or adapter internal field.

## Cloudflare Preview Deployment Command

The repeatable maintainer command consumes the hosted config JSON produced by the configure flow and validates the Cloudflare preview deployment request before deployment proceeds:

```bash
SUPPORT_AGENT_PROVIDER_API_KEY_BINDING=SUPPORT_AGENT_OPENAI_API_KEY \
SUPPORT_AGENT_DEPLOYMENT_SECRET_BINDING=SUPPORT_AGENT_DEPLOYMENT_SECRET \
pnpm --filter web support-agent:deploy:preview -- --config ./support-agent-hosted-config.json
```

Required inputs:

- `--config`: path to the hosted config JSON.
- `SUPPORT_AGENT_PROVIDER_API_KEY_BINDING`: server-side provider API key binding name.
- `SUPPORT_AGENT_DEPLOYMENT_SECRET_BINDING`: server-side deployment secret binding name.

Optional inputs:

- `SUPPORT_AGENT_DEPLOYMENT_ID`: deployment identifier. Default: `support-agent-preview`.
- `SUPPORT_AGENT_PUBLIC_NAME`: public deployment name. Default: `<template name> preview`.

Expected output is a JSON preview deployment plan containing:

- `command`: the repeatable package command.
- `request`: public template metadata, selected knowledge references, `flue-support-agent`, `SupportAgentChatRequest`, and server-side secret binding references.
- `wrangler.command`: `wrangler deploy --env preview`.
- `wrangler.requiredSecretBindings`: the provider and deployment secret binding names.

Failure notes:

- Missing hosted config fails before deployment with `hosted deployment config is required`.
- Missing provider API key binding fails before deployment with `provider API key secret reference is required`.
- Missing deployment secret binding fails before deployment with `deployment secret reference is required`.

Server-side secret boundary checks (`server-side secret boundary`):

- Browser-visible hosted config contains no provider API key, deployment secret, provider model setting, runtime path, or adapter internal field.
- Command output includes secret binding names only.
- Command output must not include raw provider API keys, deployment secret values, runtime paths, or adapter internals.

## Hosted Chat Runtime Verification

The Cloudflare preview deployment result maps to a hosted support-agent chat handoff with this public URL shape:

```text
https://<cloudflare-preview-host>/support-agent/chat
```

The hosted chat handoff also derives the server runtime endpoint:

```text
https://<cloudflare-preview-host>/api/support-agent/respond
```

Open the deployed chat after the Cloudflare preview command by visiting the `/support-agent/chat` URL returned by the deployment handoff. The hosted page renders `Hosted support-agent web chat`, the deployment public name, and `Runtime boundary: Agentis server endpoint / flue-support-agent`.

Hosted ask/check flow:

1. Open `https://<cloudflare-preview-host>/support-agent/chat`.
2. Confirm `Product documentation sample` is selected from the deployment handoff metadata.
3. Enter `Can the hosted support agent answer?` in `Support question`.
4. Choose `Ask support agent`.
5. Confirm the browser posts to `/api/support-agent/respond` on the deployed host, not to a provider API endpoint.
6. Confirm the assistant response renders an answer plus citation-capable source metadata:
   - `Source: Product documentation sample`
   - `Source ID: source_product_docs_setup`
   - A selected-source excerpt.
7. Confirm browser-visible state and the hosted chat shell contain no provider API key, deployment secret, raw provider model config, runtime path, or adapter implementation detail.

Focused proof commands:

```bash
pnpm --filter web test -- App.test.tsx src/lib/support-agent/http-runtime.test.ts src/worker/support-agent-worker.test.ts src/lib/support-agent/runtime-boundary.test.ts
pnpm --filter web typecheck
rg -n "Hosted Chat Runtime Verification|hosted support-agent web chat|/support-agent/chat|/api/support-agent/respond|HSD-03|HSD-04|Runtime boundary: Agentis server endpoint" docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md apps/web/src
```

HSD-03 acceptance is satisfied when the deployed `/support-agent/chat` URL opens the hosted chat path and the app can submit a question through the hosted runtime handoff. HSD-04 acceptance is satisfied when the hosted answer path routes through the Agentis-owned `/api/support-agent/respond` boundary and browser-visible output contains no provider credentials, deployment secrets, runtime internals, or adapter implementation details.

## Current Runtime Boundary

The local MVP browser flow uses a server-backed `SupportAgentRuntime` by default. The browser submits `SupportAgentChatRequest` to `/api/support-agent/respond`; the Vite dev server reads provider configuration from `.env` server-side, calls the OpenAI-backed model runtime, and returns a `SupportAgentChatResponse` with public runtime metadata.

The deterministic responder remains available only for injected tests and explicit fixture usage. It is not acceptable evidence for M003 real-demo acceptance.

Required environment:

- `.env` at the repository root or `apps/web/.env`
- `OPENAI_API_KEY`: required for the real local browser demo
- `SUPPORT_AGENT_MODEL`: optional model override. Default: `gpt-5.4-mini`
- Provider: `openai`

The Vercel AI SDK gives Agentis a common call surface for model generation, streaming, tool calls, and provider adapters. Agentis still has to install each provider package, collect that provider's credentials, choose the provider factory, and map Agentis config into the provider call. This slice only wires `@ai-sdk/openai` through `createAiSdkOpenAiTextGenerator`, so `openai` is the only supported real provider in this demo. Additional providers need explicit Agentis gateway modules and tests before they are selectable.

The live gateway check is skipped when `OPENAI_API_KEY` is not set. In this run, `OPENAI_API_KEY` was present and the optional live local model call ran through `pnpm --filter web test -- src/lib/support-agent/ai-sdk-model-gateway.live.test.ts`. The browser UI does not send provider secrets to client state; the Vite dev server reads provider configuration server-side for local real-model calls.

## Eval Workflow And Model Comparison

The local eval harness lives in `apps/web/src/lib/support-agent`:

- `eval-fixtures.ts` defines 10 support-agent questions with selected documentation context, expected answer terms, and required provenance source IDs.
- `eval-runner.ts` executes each question for each configured model candidate through `respondWithSupportAgentRuntime`.
- `eval-report.ts` records per-question and per-model results.
- `scripts/support-agent-eval.mjs` is the local command entry point.

The report scores four dimensions:

- Correctness: required answer terms from each eval question.
- Grounding: expected source IDs returned in provenance metadata.
- Latency: milliseconds measured around the support-agent runtime boundary.
- Cost: candidate-level cost notes, with provider billing usage recorded manually after live runs.

Current local run evidence:

- `OPENAI_API_KEY= SUPPORT_AGENT_EVAL_OPENAI_API_KEY= pnpm --filter web support-agent:eval` failed loudly before provider calls with `completed=false`, command `pnpm --filter web support-agent:eval`, candidates `openai:gpt-5-mini` and `openai:gpt-5.1-mini`, `credentialState=missing`, and missing `apiKey` in the note.
- `pnpm --filter web support-agent:eval` reached the provider-call path in this workspace and failed with `Support agent provider call failed.` I am not certain whether the configured credential, model availability, or provider connectivity caused that failure because the normalized runtime boundary intentionally hides provider error details.

Practical comparison finding: the harness can compare the two configured OpenAI candidates locally once credentials and model access are valid. No completed live answer-quality comparison is recorded in this slice. Keep `gpt-5-mini` as the lower-cost baseline candidate and `gpt-5.1-mini` as the quality comparison candidate until a completed eval report provides latency, grounding, correctness, and billing evidence.

Recommended next model/context strategy: run the eval command with valid OpenAI access and save the JSON report. Use the first completed report to decide whether the higher-quality comparison model improves grounded answers enough to justify its cost. Keep the selected documentation-context contract stable before adding R2-backed Flue knowledge retrieval.

## Documentation Context Path

The GUI sends selected documentation as `knowledgeSourceIds` plus display metadata and a local documentation context reference. `resolveSupportAgentDocumentationContext` turns those selected sources into typed local context for the demo runtime, and unknown selected source IDs raise `SUPPORT_AGENT_CONTEXT_SOURCE_UNKNOWN`.

The Flue adapter boundary remains the primary runtime path. `toFlueSupportAgentRuntimeInput` maps the Agentis-owned chat request into a Flue-ready input with selected source IDs, source metadata, and resolved documentation context. `toSupportAgentChatResponse` maps a Flue-shaped assistant answer back into the browser-safe Agentis chat response with answer text, assistant message ID, in-reply-to linkage, and provenance source metadata.

Current Flue-backed provenance limits:

- Browser-visible source metadata is limited to source ID, knowledge source ID, title, and excerpt.
- Flue run IDs, trace metadata, provider config, provider secrets, runtime storage paths, and other runtime-only fields stay outside `SupportAgentChatResponse`.
- Local demo provenance comes from checked-in sample documentation context. A live Flue Cloudflare request still needs the same response contract backed by deployed context storage before it can replace the local browser flow.

The smallest local proof path uses checked-in sample documentation content so focused tests can prove that changing the selected documentation changes the model prompt, Flue-ready input, and rendered transcript provenance.

Recommended next step for Flue knowledge access: run a live Flue Cloudflare support-agent request with the same context contract backed by an R2 virtual sandbox. The preview deployment command now validates the request shape and server-side binding references before that live runtime proof. Keep provider-native file/search APIs, RAG, and hybrid retrieval as comparison paths after the R2-backed Flue route has a working request/response proof.

## Acceptance Handoff

See `docs/research/support-agent-mvp-acceptance.md` for MVP acceptance evidence and follow-up boundaries.
