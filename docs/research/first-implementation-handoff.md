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
