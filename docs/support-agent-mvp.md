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

Recommended next step for Flue knowledge access: run a live Flue Cloudflare support-agent request with the same context contract backed by an R2 virtual sandbox. Keep provider-native file/search APIs, RAG, and hybrid retrieval as comparison paths after the R2-backed Flue route has a working request/response proof.

## Acceptance Handoff

See `docs/research/support-agent-mvp-acceptance.md` for MVP acceptance evidence and follow-up boundaries.
