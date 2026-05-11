# First Implementation Handoff

## Selected Template

The first Agentis implementation target is a knowledge support agent template.

This template lets a user configure an agent from project or product documentation, ask questions through the Agentis web interface, and receive cited answers from the attached knowledge source.

## Decision Inputs

- `docs/research/agent-stack-matrix.md`: Flue is the preferred runtime path for mounted knowledge, sessions, HTTP agents, and Cloudflare deployment.
- `docs/research/agent-stack-validation.md`: S002 validated the support-agent knowledge access pattern, web chat HTTP contract, Slack routing sketch, and hosted sandbox options.
- `T014`: S003 recommends Flue on Cloudflare, Vercel AI SDK for chat UX, and Agentis-owned routes for product identity, persistence, Slack, deployment state, and sandbox policy.

## Rationale

- The support-agent path exercises the chosen architecture with the smallest product surface.
- It validates user-facing agent configuration, knowledge attachment, web chat, runtime invocation, session identity, and answer provenance.
- It can start with web chat and leave Slack delivery as a follow-on integration once the product model is stable.
- It avoids making hosted coding-agent sandbox behavior the first delivery blocker.

## Next Milestone Candidate Scope

Goal: deliver a working support-agent template path in the Agentis web app.

User-facing outcome: a user can create a support agent, attach a small documentation source, ask a question in the Agentis web interface, and see an answer with source references.

### Included

- Support-agent template definition and seed configuration fields.
- A minimal web app flow for creating or previewing the template.
- Knowledge source attachment for local sample docs or a small uploaded markdown set.
- Agentis-owned chat route that maps an Agentis agent and conversation onto a Flue agent request.
- Vercel AI SDK chat UI integration for the first transcript view.
- Basic answer provenance display with cited file paths or source labels.
- Local development setup notes and one execution path that can run without Slack.

### Acceptance Criteria

- A maintainer can start the web app and reach the support-agent template flow.
- The template flow exposes the minimum fields needed to name the agent and attach sample knowledge.
- A chat request reaches the Agentis backend route and returns a support-agent answer shape.
- The response includes source metadata that the UI can render.
- The implementation keeps Flue-specific request mapping behind an Agentis-owned adapter.
- Tests or documented checks cover the template flow, chat route contract, and response rendering.

### Out Of Scope

- Slack OAuth installation and event delivery.
- Production billing, quotas, and tenant administration.
- Hosted Cloudflare deployment automation.
- Multi-agent orchestration.
- Hosted coding-agent sandbox sessions.
- Long-term knowledge ingestion pipelines.

## Technical Entry Points

### Web App

- `apps/web/src/App.tsx`: replace the starter screen with the first support-agent template flow.
- `apps/web/src/components`: add app-local components for template setup, knowledge source selection, chat transcript, message composer, and source references.
- `apps/web/e2e/app.spec.ts`: cover the primary support-agent template path once the flow exists.
- `apps/web/src/App.test.tsx`: cover rendering, form state, empty states, and response rendering.

### Shared UI

- `packages/ui/src/components/button.tsx`: keep using the shared button component.
- `packages/ui/src/components`: add shared shadcn/ui components from the repository root when the app needs common controls.
- `packages/ui/src/lib/utils.ts`: keep shared styling helpers here.

### Agentis Backend Boundary

- Add an Agentis-owned chat route before calling Flue. Browser code should call the Agentis route.
- Define a support-agent request shape with Agentis IDs for agent, conversation, message, and knowledge source.
- Define a support-agent response shape with assistant text, message ID, conversation ID, and source metadata.
- Keep Flue endpoint mapping in an adapter module so UI and product code depend on Agentis contracts.

### Runtime Path

- Start with a local development path that returns a deterministic support-agent response shape or calls a local Flue agent when configured.
- Add the Flue HTTP agent call behind the adapter once the backend route exists.
- Keep Cloudflare Workers, Durable Objects, R2, and Containers as the hosted direction for the next architecture-backed build stage.

### Persistence Assumptions

- The first build can use in-memory or fixture-backed data for the support-agent template flow.
- Product persistence design should still model users, organizations, agents, knowledge sources, conversations, messages, deployments, Slack installs, sandbox runs, audit records, and quotas.
- Durable storage selection and schema migration work belong in a planned implementation slice.

### Slack And Web Chat

- Web chat is the first delivery surface.
- Slack integration should reuse the same Agentis support-agent route once Slack OAuth, event verification, dedupe, token storage, and thread mapping are planned.

### Known Blockers

- Flue Cloudflare support-agent execution still needs a live request against a small R2-backed knowledge base.
- The repository has no backend app package yet.
- The product data model is not planned yet.
- Slack installation and hosted deployment flows are future scope.
- Cloudflare container sandbox cost and cold-start behavior still need validation before coding-agent templates start.

## Readiness Notes

The next milestone can start from this handoff and plan implementation slices around web UI, Agentis backend contract, Flue adapter, knowledge source fixture, and chat response rendering.

Recommended first implementation slices:

1. Product shell and support-agent template UI.
2. Support-agent contract types, fixtures, and adapter boundary.
3. Web chat transcript and source rendering.
4. Local Flue or deterministic support-agent response path.
5. Documentation and acceptance checks for the first template flow.

Readiness checklist:

- The first template candidate is selected.
- The first milestone candidate scope has acceptance criteria and exclusions.
- Initial repo entry points are mapped.
- Flue, Vercel AI SDK, and Agentis-owned boundary responsibilities are recorded.
- Slack and hosted deployment remain planned follow-up surfaces.

## Next Kata Handoff

Use this candidate for the next milestone:

- Title: `Support Agent Template MVP`
- Goal: `Deliver a working support-agent template path that lets a user configure a documentation-backed agent and ask it questions through the Agentis web interface.`
- Seed requirements:
  - User can create or preview a support-agent template in the web app.
  - User can attach sample documentation as the first knowledge source.
  - User can ask a question through web chat and receive a cited answer.
  - Maintainer can inspect the Agentis-owned chat route contract and Flue adapter boundary.
  - Maintainer can run local checks for the template flow and chat response rendering.
