# Support-Agent MVP Acceptance Handoff

## What The MVP Proves

The support-agent template MVP proves the first Agentis product path for a documentation-backed agent:

- `S005`: the web app exposes a support-agent template entry flow, template naming preview, and sample documentation source selection.
- `S006`: Agentis owns the chat request and response contracts, deterministic fixtures, and the Flue adapter boundary.
- `S007`: the web chat flow accepts a support question, renders user and assistant transcript messages, and displays source metadata.
- `S008`: submitted questions route through the local support-agent response path while keeping runtime-facing logic behind the adapter boundary.

The accepted path lets a maintainer start the app, configure the support-agent template with `Product documentation sample`, ask a question, and inspect the cited answer in the template preview.

## Acceptance Evidence

- `apps/web/src/App.test.tsx` covers the template entry, template preview updates, sample documentation selection, question submission, transcript rendering, citation rendering, duplicate submit prevention, and runtime error display.
- `apps/web/src/lib/support-agent/*.test.ts` covers the Agentis-owned support-agent contracts, fixtures, local responder, Flue adapter mapping, runtime boundary, and public module surface.
- `apps/web/e2e/app.spec.ts` covers the browser-level support-agent setup path.
- `docs/support-agent-mvp.md` records the local run commands and manual acceptance path.

## Follow-Up Boundaries

- Slack: OAuth installation, event verification, event dedupe, bot token storage, Slack thread mapping, and message delivery remain future planned work.
- Hosted deployment: Cloudflare Workers, Durable Objects, R2-backed knowledge, Containers, and live Flue deployment automation remain future planned work.
- Production persistence: organizations, users, agents, knowledge sources, conversations, messages, deployments, audit records, quotas, and schema migrations remain future planned work.

These follow-ups should enter future milestones as explicit requirements before implementation.
