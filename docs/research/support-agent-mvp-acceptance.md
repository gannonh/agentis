# Support-Agent MVP Acceptance Handoff

## What The MVP Proves

The support-agent template MVP proves the first Agentis product path for a documentation-backed agent:

- `S005`: the web app exposes a support-agent template entry flow, template naming preview, and sample documentation source selection.
- `S006`: Agentis owns the chat request and response contracts, deterministic fixtures, and the Flue adapter boundary.
- `S007`: the web chat flow accepts a support question, renders user and assistant transcript messages, and displays source metadata.
- `S008`: submitted questions route through the local support-agent response path while keeping runtime-facing logic behind the adapter boundary.
- `S015`: the same template flow can produce a hosted-deployment-ready configuration handoff for a later Cloudflare preview deployment slice.
- `S016`: the hosted configuration can be validated into a repeatable Cloudflare preview deployment command with server-side secret binding references.
- `S017`: the hosted preview exposes `/support-agent/chat` and routes hosted questions through the Agentis-owned `/api/support-agent/respond` runtime boundary.
- `S018`: hosted deployment status and actionable failures are visible through the app and `/support-agent/status`, and `support-agent:acceptance` gives maintainers a repeatable acceptance command covering configure, deploy, hosted chat, answer, citation, status, and failure handling.

The accepted path lets a maintainer start the app, configure the support-agent template with `Product documentation sample`, prepare a hosted config handoff (S015), validate the Cloudflare preview command (S016), open the hosted support-agent web chat URL to ask a cited question through the server runtime boundary (S017), inspect deployment status and actionable failures, then run the hosted acceptance script for repeatable evidence (S018).

## Acceptance Evidence

- `apps/web/src/App.test.tsx` covers the template entry, template preview updates, sample documentation selection, hosted config action enablement, hosted config payload display, question submission, transcript rendering, citation rendering, duplicate submit prevention, typed runtime failure display, and stale failure clearing after a later successful answer.
- `apps/web/src/lib/support-agent/*.test.ts` covers the Agentis-owned support-agent contracts, fixtures, local responder, hosted deployment config contract, hosted deployment status/failure contract, hosted acceptance runner, Flue adapter mapping, runtime boundary, typed failure mapping, eval fixtures, eval runner, eval report scoring, and public module surface.
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

This path prepares configuration only. S016 adds the repeatable Cloudflare preview deployment command validation path.

## S016 Cloudflare Preview Deployment Acceptance Checks

Run these checks before accepting the preview deployment command path:

```bash
pnpm --filter web test -- src/lib/support-agent/cloudflare-preview-deploy.test.ts src/lib/support-agent/hosted-deployment-config.test.ts src/lib/support-agent/runtime-boundary.test.ts
pnpm --filter web typecheck
rg -n "support-agent:deploy:preview|Cloudflare Preview Deployment Command|server-side secret boundary|wrangler deploy --env preview|SUPPORT_AGENT_PROVIDER_API_KEY_BINDING|SUPPORT_AGENT_DEPLOYMENT_SECRET_BINDING" docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md apps/web/package.json apps/web/scripts apps/web/src/lib/support-agent
```

Command validation checks:

```bash
pnpm --filter web support-agent:deploy:preview
pnpm --filter web support-agent:deploy:preview -- --config ./support-agent-hosted-config.json
SUPPORT_AGENT_PROVIDER_API_KEY_BINDING=SUPPORT_AGENT_OPENAI_API_KEY \
SUPPORT_AGENT_DEPLOYMENT_SECRET_BINDING=SUPPORT_AGENT_DEPLOYMENT_SECRET \
pnpm --filter web support-agent:deploy:preview -- --config ./support-agent-hosted-config.json
```

Expected results:

- Missing `--config` fails before deployment with `hosted deployment config is required`.
- Missing secret binding refs fail before deployment with `provider API key secret reference is required` or `deployment secret reference is required`.
- Valid config plus secret binding refs prints a JSON plan with `support-agent:deploy:preview`, `wrangler deploy --env preview`, `flue-support-agent`, `SupportAgentChatRequest`, selected knowledge references, and server-side binding names.
- The serialized browser config and command output contain no raw provider API key, raw deployment secret, runtime path, or adapter internals.

Manual secret-boundary checklist:

1. Produce hosted config from the UI with `Prepare hosted config`.
2. Save the public hosted config JSON outside browser state inspection artifacts.
3. Run the valid command with binding names only.
4. Confirm output names `SUPPORT_AGENT_OPENAI_API_KEY` and `SUPPORT_AGENT_DEPLOYMENT_SECRET` as bindings.
5. Confirm output does not include raw secret values or provider model configuration.

## S017 Hosted Chat Runtime Acceptance Checks

Run these checks before accepting the hosted support-agent web chat path:

```bash
pnpm --filter web test -- App.test.tsx src/lib/support-agent/api-handler.test.ts src/lib/support-agent/http-runtime.test.ts src/worker/support-agent-worker.test.ts src/lib/support-agent/runtime-boundary.test.ts
pnpm --filter web typecheck
rg -n "Hosted Chat Runtime Verification|hosted support-agent web chat|/support-agent/chat|/api/support-agent/respond|HSD-03|HSD-04|Runtime boundary: Agentis server endpoint" docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md apps/web/src
```

Manual hosted chat checklist:

1. Run the S016 plan validation command with a valid hosted config and server-side binding references.
2. Deploy the hosted Worker preview with `pnpm --filter web support-agent:deploy:worker:preview`.
3. Open the deployed hosted chat URL: `https://<cloudflare-preview-host>/support-agent/chat`.
4. Confirm the page identifies the deployment as `Agentis hosted support-agent web chat`, shows `Runtime boundary: Agentis-owned /api/support-agent/respond`, and provides a support-question form.
5. Ask `Can the hosted support agent answer?`.
6. Confirm the browser request goes to `https://<cloudflare-preview-host>/api/support-agent/respond`.
7. Confirm the assistant answer renders on the hosted page with citation-capable source metadata for the selected documentation source.
8. Confirm browser-visible state, HTML, network payloads, and command output do not contain raw provider API keys, deployment secret values, runtime paths, or adapter implementation details.

Expected hosted response shape:

- `agentId`: `agent_support_template`.
- `conversationId`: the submitted conversation ID.
- `inReplyToMessageId`: the submitted user message ID.
- `answer`: assistant text from the hosted runtime.
- `sources`: selected-source citation metadata with source ID, knowledge source ID, title, and excerpt.
- `runtime`: public runtime metadata only, such as provider and model name. No secret values.

HSD-03 is accepted when the hosted chat URL opens and a user can submit a support question after deployment. HSD-04 is accepted when the answer route uses the Agentis-owned runtime/API boundary and browser-visible output excludes provider credentials, deployment secrets, runtime internals, and adapter implementation details.

## S018 Deployment Status, Failures, And Acceptance Evidence Checks

Run these checks before accepting the hosted status and acceptance evidence path:

```bash
pnpm --filter web test -- App.test.tsx src/lib/support-agent src/worker/support-agent-worker.test.ts
pnpm --filter web support-agent:acceptance -- --dry-run
pnpm --filter web typecheck
rg -n "HSD-06|HSD-07|Hosted Deployment Status And Acceptance Evidence|support-agent:acceptance|HOSTED_DEPLOYMENT_SECRET_MISSING|evidence capture checklist" docs/support-agent-mvp.md docs/research/support-agent-mvp-acceptance.md apps/web/src apps/web/scripts apps/web/package.json
```

Hosted mode command:

```bash
SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL=https://<cloudflare-preview-host> pnpm --filter web support-agent:acceptance
```

Optional hosted mode inputs:

- `--deployment-url` or `SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL`: deployed Worker origin. Required for hosted mode.
- `--question` or `SUPPORT_AGENT_ACCEPTANCE_QUESTION`: acceptance question. Default: `How do I connect a knowledge source?`.

Expected acceptance script output:

- `completed: true` for a successful run.
- `mode: "dry-run"` with `evidenceKind: "deterministic-dry-run"` for command-logic checks.
- `mode: "hosted"` with `evidenceKind: "hosted"` for deployed endpoint evidence.
- Step IDs: `configure`, `deploy-plan`, `open-hosted-chat`, `ask`, `answer`, `cite`, `inspect-status`, and `failure-handling`.

Status state expectations for HSD-06:

- `configured`: app has browser-safe hosted config ready for preview deployment.
- `deploying`: preview deploy is underway and should be inspected again after completion.
- `deployed`: hosted chat is ready at `/support-agent/chat`.
- `failed`: actionable failure guidance is visible, such as `HOSTED_DEPLOYMENT_SECRET_MISSING`.
- `unavailable`: status inspection failed and should be retried after endpoint/deployment checks.

Manual evidence checklist:

1. Configure: capture the template name, selected source, `Hosted deployment config`, and `Hosted deployment status` panels.
2. Deploy: capture valid `support-agent:deploy:preview` output and Worker preview deploy output.
3. Open hosted chat: capture `/support-agent/chat` rendering `Agentis hosted support-agent web chat` and `Deployment status` guidance.
4. Ask: submit `Can the hosted support agent answer?` or the configured acceptance question.
5. Answer: capture the assistant answer returned through `/api/support-agent/respond`.
6. Cite: capture at least one source title and source ID in the hosted answer.
7. Inspect status: save `/support-agent/status` JSON with `state: "deployed"` for the healthy path.
8. Failure handling: capture HTTP 503 status output or focused test evidence for `HOSTED_DEPLOYMENT_SECRET_MISSING`, plus sanitized UI-visible failure text.

The acceptance command must fail loudly when `SUPPORT_AGENT_HOSTED_DEPLOYMENT_URL`, `/support-agent/chat`, `/api/support-agent/respond`, `/support-agent/status`, the hosted answer, or citation sources are missing. Dry-run output is not hosted evidence; use it to verify command logic before live hosted acceptance.

HSD-06 is accepted when status and failure states are visible, actionable, and browser-safe. HSD-07 is accepted when the maintainer can repeat the acceptance command and capture the full configure, deploy, open hosted chat, ask, answer, cite, inspect status, and failure handling evidence set.

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
- Hosted deployment: S015 prepares the browser-safe configuration handoff. S016 validates the repeatable Cloudflare preview command and server-side secret binding boundary. S017 exposes the hosted support-agent web chat URL and server runtime API boundary. S018 adds browser-safe deployment status, actionable failure states, and repeatable acceptance evidence. Durable Objects, R2-backed knowledge, Containers, and full Flue runtime execution remain future planned work.
- Production persistence: organizations, users, agents, knowledge sources, conversations, messages, deployments, audit records, quotas, and schema migrations remain future planned work.

These follow-ups should enter future milestones as explicit requirements before implementation.
