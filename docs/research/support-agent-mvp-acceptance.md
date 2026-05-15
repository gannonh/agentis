# Support-Agent MVP Acceptance Handoff

## What The MVP Proves

The support-agent template MVP proves the first Agentis product path for a documentation-backed agent:

- `S005`: the web app exposes a support-agent template entry flow, template naming preview, and sample documentation source selection.
- `S006`: Agentis owns the chat request and response contracts, deterministic fixtures, and the Flue adapter boundary.
- `S007`: the web chat flow accepts a support question, renders user and assistant transcript messages, and displays source metadata.
- `S008`: submitted questions route through the local support-agent response path while keeping runtime-facing logic behind the adapter boundary.
- `S015`: the same template flow can produce a hosted-deployment-ready configuration handoff for a later Cloudflare preview deployment slice.

The accepted path lets a maintainer start the app, configure the support-agent template with `Product documentation sample`, and prepare a hosted config handoff (S015), or alternatively ask a question and inspect the cited answer in the template preview (S007/S008).

## Acceptance Evidence

- `apps/web/src/App.test.tsx` covers the template entry, template preview updates, sample documentation selection, hosted config action enablement, hosted config payload display, question submission, transcript rendering, citation rendering, duplicate submit prevention, typed runtime failure display, and stale failure clearing after a later successful answer.
- `apps/web/src/lib/support-agent/*.test.ts` covers the Agentis-owned support-agent contracts, fixtures, local responder, hosted deployment config contract, Flue adapter mapping, runtime boundary, typed failure mapping, eval fixtures, eval runner, eval report scoring, and public module surface.
- `apps/web/e2e/app.spec.ts` covers the browser-level support-agent setup path.
- `docs/support-agent-mvp.md` records the local run commands, model comparison eval command, compared candidates, scoring dimensions, failure-state demo checkpoints, incomplete-live-run uncertainty, and manual acceptance path.

## S015 Hosted Configuration Acceptance Checks

Run these checks before accepting the hosted configuration path:

```bash
pnpm --filter web test -- App.test.tsx src/lib/support-agent
rg -n "Hosted Configuration Contract|Prepare hosted config|cloudflare-preview|credentials: server-side|flue-support-agent" docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md apps/web/src
```

Manual configure-only checklist:

1. Start the app with `pnpm dev -- -- --host 127.0.0.1`.
2. Open the printed local URL.
3. Set `Template name` to `Billing support`.
4. Select `Product documentation sample`.
5. Choose `Prepare hosted config`.
6. Confirm the `Hosted deployment config` panel shows `Billing support`, `knowledge_product_docs`, `flue-support-agent`, `cloudflare-preview`, and `Credentials: server-side`.
7. Confirm no provider API key, deployment secret, provider model setting, runtime path, or adapter internal field appears in browser-visible config.

This path prepares configuration only. Live Cloudflare Workers, Durable Objects, R2-backed knowledge, Containers, and Flue deployment execution remain future deployment-slice work.

## S014 Demo Hardening Acceptance Checks

Run these deterministic checks before accepting the local support-agent demo:

```bash
pnpm --filter web test -- App.test.tsx failure-state.test.ts flue-adapter.test.ts
pnpm --filter web test -- src/lib/support-agent
pnpm --filter web typecheck
```

For full repository confidence, run:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm ci
```

Capture acceptance evidence with these artifacts or command outputs:

- Terminal output from `pnpm --filter web test -- App.test.tsx failure-state.test.ts flue-adapter.test.ts` proving configure, context selection, ask, answer, cite, provider-config failure, context failure, model-generation failure, unavailable-provenance failure, and stale-failure clearing.
- Terminal output from `pnpm --filter web test -- src/lib/support-agent` proving the support-agent runtime boundary, Flue adapter, local responder, model runtime, provider config, eval fixtures, eval runner, and eval report checks.
- Terminal output from `pnpm --filter web typecheck` proving TypeScript coverage for the app, node scripts, and tests.
- Browser screenshots or video from `pnpm dev -- -- --host 127.0.0.1` showing `Configure a support agent`, selected `Product documentation sample`, an assistant answer with `Runtime: OpenAI / <model>`, and source metadata.
- Optional eval JSON from `SUPPORT_AGENT_EVAL_OUTPUT=./support-agent-eval-report.json OPENAI_API_KEY=sk-... pnpm --filter web support-agent:eval` when live provider credentials and model access are available.

What this slice verifies:

- Configure: template entry and template-name preview update are covered by `App.test.tsx` and the browser script in `docs/support-agent-mvp.md`.
- Context selection: selected sample documentation flows into the Agentis-owned chat request and Flue-ready input.
- Real answer contract: the runtime boundary rejects answers that do not match the submitted agent, conversation, or user message.
- Citation/provenance: successful local answers render selected-source metadata, and Flue-shaped selected-source answers without provenance raise `SUPPORT_AGENT_PROVENANCE_UNAVAILABLE`.
- Eval readiness: eval fixtures, runner, report scoring, and the `support-agent:eval` command path are documented for live model comparison.
- Failure states: provider configuration, context preparation, model generation, and unavailable provenance each map to sanitized UI-visible failure state.

Skipped live evidence:

- Live OpenAI gateway and eval runs are optional because they depend on external credential validity, provider availability, model access, latency, and billing. When skipped, record whether `OPENAI_API_KEY` was unset or whether the maintainer intentionally deferred external provider calls.
- Live Flue Cloudflare and R2-backed provenance evidence is skipped because hosted Flue deployment and R2-backed knowledge access remain outside this MVP acceptance boundary.

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

## Follow-Up Boundaries

- Slack: OAuth installation, event verification, event dedupe, bot token storage, Slack thread mapping, and message delivery remain future planned work.
- Hosted deployment: S015 prepares the browser-safe configuration handoff. Cloudflare Workers, Durable Objects, R2-backed knowledge, Containers, and live Flue deployment automation remain future planned work.
- Production persistence: organizations, users, agents, knowledge sources, conversations, messages, deployments, audit records, quotas, and schema migrations remain future planned work.

These follow-ups should enter future milestones as explicit requirements before implementation.
