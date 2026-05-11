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
