# Code Context

## Files Retrieved
1. `README.md` (lines 7-16) - Cloudflare-first runtime direction and ownership boundaries.
2. `docs/research/agent-stack-validation.md` (lines 177-186, 288-295, 320-334, 344-386) - validated Flue, R2, Durable Object, session, sandbox, and carry-forward checks.
3. `apps/web/src/worker/support-agent-worker.ts` (lines 8-64) - Cloudflare Worker entry point and env mapping.
4. `apps/web/support-agent-dev-plugin.ts` (lines 35-91, 127-164) - Vite dev and preview endpoint bridge.
5. `apps/web/src/lib/support-agent/api-handler.ts` (lines 11-87, 89-114) - HTTP handler, validation, runtime construction, error normalization.
6. `apps/web/src/lib/support-agent/flue-adapter.ts` (lines 8-47, 49-85, 87-131) - Agentis-to-Flue mapping and response provenance checks.
7. `apps/web/src/lib/support-agent/hosted-deployment-config.ts` (lines 3-31, 44-64, 66-128) - browser-safe hosted config and Cloudflare preview request shape.
8. `apps/web/src/lib/support-agent/cloudflare-preview-deploy.ts` (lines 18-25, 27-64) - preview deploy plan and wrangler command metadata.
9. `apps/web/scripts/support-agent-preview-deploy.mjs` (lines 19-45) - CLI wrapper that validates config and prints a plan.
10. `apps/web/src/lib/support-agent/eval-runner.ts` (lines 41-110) - model-candidate eval execution through the runtime boundary.
11. `apps/web/src/lib/support-agent/eval-report.ts` (lines 54-95, 97-180) - eval report scoring and candidate summary.
12. `apps/web/scripts/support-agent-eval.mjs` (lines 12-18, 20-39, 41-78) - live eval script wiring model candidates and output.
13. `apps/web/src/lib/support-agent/chat-contracts.ts` (lines 1-46) - public support-agent request and response contract.
14. `apps/web/src/lib/support-agent/documentation-context.ts` (lines 24-55, 57-106) - hard-coded local knowledge source resolver.
15. `apps/web/src/lib/support-agent/model-runtime.ts` (lines 34-63, 65-103, 113-142) - model runtime prompt path and local-source provenance.
16. `apps/web/src/lib/support-agent/runtime-boundary.ts` (lines 6-18, 51-149) - runtime Interface, failure mapping, and response linkage guard.
17. `apps/web/package.json` (lines 6-16) - eval and preview deployment scripts.

## Key Code

- Cloudflare-first direction is explicit in `README.md` lines 9-16: Flue, Workers, Durable Objects, R2, Containers, Agentis-owned routing, persistence, tenancy, secrets, quotas, knowledge lifecycle, deployment state, and sandbox policy.
- The validation doc says the next proof should run a live Cloudflare Worker support-agent request against R2-backed knowledge (`docs/research/agent-stack-validation.md` lines 184-186, 380-386).
- The current Worker Module only routes `/health` and `supportAgentApiPath`, maps Worker secret names into API handler env, and does not use `SUPPORT_AGENT_DEPLOYMENT_SECRET` (`apps/web/src/worker/support-agent-worker.ts` lines 8-12, 38-49).
- The dev plugin is a Node-to-Web-Request Adapter around the same handler with a local body limit and local error logging (`apps/web/support-agent-dev-plugin.ts` lines 47-91, 127-164).
- The API handler constructs the model Implementation directly on every request (`apps/web/src/lib/support-agent/api-handler.ts` lines 50-63). This is the main runtime Seam today.
- `flue-adapter.ts` maps Agentis chat requests into a Flue-ready shape and strips runtime fields on the way back (`apps/web/src/lib/support-agent/flue-adapter.ts` lines 49-85, 87-131), but no serving path calls it.
- Hosted deployment config emits JSON for `flue-support-agent`, `cloudflare-preview`, and server-side secret references (`apps/web/src/lib/support-agent/hosted-deployment-config.ts` lines 66-128). The deploy plan prints a wrangler command string (`apps/web/src/lib/support-agent/cloudflare-preview-deploy.ts` lines 53-63).
- Evals run local model candidates through `createConfiguredSupportAgentRuntime` and `respondWithSupportAgentRuntime` (`apps/web/src/lib/support-agent/eval-runner.ts` lines 79-105). Scoring uses answer substring terms and returned source IDs (`apps/web/src/lib/support-agent/eval-report.ts` lines 97-137).

## Architecture

The support-agent path has a clear public Interface in `SupportAgentChatRequest` and `SupportAgentChatResponse` (`chat-contracts.ts` lines 11-46). Local dev, preview, and Worker entry points converge on `createSupportAgentApiHandler`. That handler builds a configured model runtime and returns normalized failure states. The Flue Adapter exists as a conversion Module, but it sits beside the serving path. Hosted deployment config and preview deploy plan form a planning Module that serializes intent and secret binding names. Evals execute the local model runtime and report deterministic scoring.

Current Depth is strongest in local runtime behavior and failure handling. Depth is thinner at deployment and hosted runtime seams: the Cloudflare Worker serves the local model path, the deploy script emits a plan, and no checked-in `wrangler` config, R2 binding, Durable Object binding, or Flue route connects the plan to the Worker runtime.

## Candidates

1. Hosted deployment plan Module needs more executable Depth

- Files: `hosted-deployment-config.ts` lines 66-128, `cloudflare-preview-deploy.ts` lines 27-64, `scripts/support-agent-preview-deploy.mjs` lines 19-45, `package.json` lines 14-15.
- Friction: the Implementation creates browser-safe config and a repeatable plan, but the plan ends at JSON plus `wrangler deploy --env preview`. Repository search found no `wrangler` config. The deployment target, knowledge paths, secret references, and Worker source do not converge into an executable hosted preview artifact.
- Seam: config to deploy plan to Worker is a named Seam with low runtime Leverage today.
- Locality: deployment intent lives in typed config, command generation lives in another Module, and the actual Worker env mapping lives elsewhere.
- Deletion test: deleting `cloudflare-preview-deploy.ts` and the preview script would remove deployment-plan tests and the CLI, but local API handling, Worker tests, and evals would still work. That shows the deployment Module is not yet load-bearing for runtime behavior.
- Testability impact: current tests verify shape and secret omission. Deeper architecture could shift tests toward deploy dry-run evidence, binding presence, and config-to-Worker consistency.

2. Flue Adapter is isolated from runtime execution

- Files: `flue-adapter.ts` lines 49-131, `api-handler.ts` lines 50-63, `model-runtime.ts` lines 34-63, `runtime-boundary.ts` lines 131-149.
- Friction: the Adapter maps to a Flue-ready payload and validates provenance, while the API handler always constructs the model Implementation. No current entry point calls the Flue Adapter or a Flue HTTP route, despite the validation doc calling for live Flue Cloudflare and web-chat proxy checks (`agent-stack-validation.md` lines 382-383).
- Seam: `SupportAgentRuntime` is the central Interface, but the Flue Adapter currently sits outside that Seam.
- Locality: Flue mapping, local prompt generation, and provenance shaping each resolve or reshape similar knowledge/source data in separate files.
- Deletion test: deleting `flue-adapter.ts` would break only adapter-specific tests and exports. The API handler, Worker, dev plugin, model eval runner, and local runtime would continue to serve answers.
- Testability impact: adapter tests are deterministic and useful, but they do not prove hosted behavior. More connected Depth would let the same response-linkage and provenance tests exercise local and hosted runtime paths.

3. Secret and deployment-auth boundaries have weak runtime Locality

- Files: `support-agent-worker.ts` lines 8-12, 38-49; `api-handler.ts` lines 53-57; `hosted-deployment-config.ts` lines 34-64, 99-128; `cloudflare-preview-deploy.ts` lines 38-44.
- Friction: hosted deployment requires a provider key binding and deployment secret binding, and the Worker env includes `SUPPORT_AGENT_DEPLOYMENT_SECRET`, but the Worker and API handler do not enforce a deployment secret. Provider key names also differ between Worker env (`SUPPORT_AGENT_OPENAI_API_KEY`) and handler env (`OPENAI_API_KEY`).
- Seam: secret references cross config, plan, Worker env, and handler env without a single behavioral check.
- Adapter: the Worker acts as an env Adapter, but only adapts model provider fields.
- Deletion test: deleting `SUPPORT_AGENT_DEPLOYMENT_SECRET` from `SupportAgentWorkerEnv` would likely leave Worker behavior unchanged. Deleting deployment secret references from the plan would break plan tests, not request handling.
- Testability impact: current tests confirm secret values are not serialized. They cannot verify tenant/deployment access control or that a preview endpoint rejects unauthenticated calls.

4. Eval Module measures local model candidates, not hosted runtime candidates

- Files: `eval-runner.ts` lines 41-110, `eval-report.ts` lines 54-180, `scripts/support-agent-eval.mjs` lines 12-78, `eval-fixtures.ts` lines 55-179.
- Friction: evals compare two configured OpenAI model candidates through the local configured runtime. They do not capture which runtime Adapter answered, whether the request crossed the Worker, whether R2-backed knowledge was used, or whether Durable Object session behavior worked. One runtime failure aborts the run rather than preserving per-question failure evidence.
- Depth: scoring has useful correctness, grounding, latency, and cost dimensions, but execution depth stops at the local runtime boundary.
- Leverage: fixtures and scoring can become high-leverage regression assets once they can run against hosted deployment paths.
- Deletion test: deleting eval runner, report, fixtures, and script would not affect serving behavior. It would remove model-comparison evidence only.
- Testability impact: unit tests are stable because generation and clocks are injectable. Hosted-runtime testability would improve if eval results recorded runtime/deployment metadata and partial failures as data.

5. Knowledge source Locality is still local-demo specific

- Files: `chat-contracts.ts` lines 1-18, `documentation-context.ts` lines 24-55 and 57-106, `model-runtime.ts` lines 113-142, `flue-adapter.ts` lines 25-30 and 52-84, `hosted-deployment-config.ts` lines 19-25 and 83-90.
- Friction: `contextReference.type` is only `local-documentation`, and the resolver uses a hard-coded map of sample docs. Hosted config preserves local paths as deployment knowledge references while the architecture direction points to R2-backed knowledge and lifecycle ownership.
- Module: documentation context is a local demo Module that several runtime and eval paths depend on.
- Seam: selected source IDs are a useful Seam; storage location and retrieval Implementation remain local.
- Deletion test: deleting the hard-coded local map would break model runtime prompts, Flue-ready input, and eval provenance. That shows the local demo resolver is currently load-bearing for knowledge behavior.
- Testability impact: deterministic local tests are easy to maintain. They do not test R2 object existence, per-agent source boundaries, retention, or audit-related behavior from the architecture notes.

## Start Here

Open `apps/web/src/lib/support-agent/api-handler.ts` first. It is the highest-leverage runtime Seam because local dev, preview, and Worker paths converge there, and it currently chooses the model Implementation directly.
