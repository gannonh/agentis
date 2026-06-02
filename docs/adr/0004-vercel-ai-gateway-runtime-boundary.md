# ADR 0004: Use Vercel AI Gateway as the live runtime boundary

## Status

Accepted

## Context

Agentis live chat/run execution and native web search need one provider boundary for normal runtime credentials and availability checks. Native web search already uses Vercel AI Gateway, while chat/run execution used direct OpenAI provider construction. That split made setup docs, runtime health, model ids, and missing-credential copy point at different credentials for related live runtime behavior.

## Decision

Use Vercel AI Gateway as the live provider boundary for normal chat/run model execution and native web search. Configure live availability with `AI_GATEWAY_API_KEY`; keep `AGENTIS_MOCK_RUNTIME=1` for local and CI mock runtime flows.

Run execution constructs live language models through `apps/api/src/runtime/gateway-model.ts`, uses Gateway-compatible model ids such as `openai/gpt-4o-mini`, and normalizes known legacy OpenAI ids for existing local records. Agentis does not add a direct OpenAI runtime fallback.

## Consequences

- `AI_GATEWAY_API_KEY` is the primary live credential in runtime health, environment samples, setup docs, and UI missing-credential copy.
- New default, seeded, agent, thread, and run model ids use Gateway-compatible provider-prefixed ids.
- Existing local records with known legacy ids continue through runtime normalization.
- Provider BYOK and provider routing stay in Vercel AI Gateway configuration unless a future ADR changes the runtime boundary.
