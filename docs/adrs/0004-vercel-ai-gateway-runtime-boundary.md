---
type: ADR
title: "ADR 0004: Use configurable AI Gateway providers as the live runtime boundary"
description: Accepted, amended 2026-06-04 and 2026-06-13
tags: []
timestamp: "2026-06-14T00:00:00Z"
---
# ADR 0004: Use configurable AI Gateway providers as the live runtime boundary

## Status

Accepted, amended 2026-06-04 and 2026-06-13

## Context

Agentis live chat/run execution and native web search need a clear provider boundary for runtime credentials, availability checks, model ids, and setup copy.

The runtime now supports the Vercel AI SDK with either Vercel AI Gateway or Cloudflare AI Gateway for live model execution. Development search can use Tavily keyless search through the existing `WebSearchProvider` boundary.

## Decision

Use configurable AI Gateway providers for live chat/run model execution:

- `AI_GATEWAY_PROVIDER=vercel` uses Vercel AI Gateway with `VERCEL_AI_GATEWAY_API_KEY`.
- `AI_GATEWAY_PROVIDER=cloudflare` uses Cloudflare AI Gateway with `CLOUDFLARE_API_KEY` and `CLOUDFLARE_ACCOUNT_ID`.
- `AI_GATEWAY_API_KEY` remains a deprecated alias for `VERCEL_AI_GATEWAY_API_KEY` during migration.
- `AGENTIS_MOCK_RUNTIME=1` remains the local and CI mock runtime path.

Run execution constructs live language models through `apps/api/src/runtime/gateway-model.ts`, uses Gateway-compatible model ids such as `openai/gpt-4o-mini`, and normalizes known legacy OpenAI ids for existing local records.

When `AI_GATEWAY_PROVIDER=cloudflare`, model transport routing and request normalization live in `apps/api/src/runtime/cloudflare-ai-gateway.ts` (see ADR 0006).

Native web search remains behind `WebSearchProvider`:

- `AGENTIS_WEB_SEARCH_PROVIDER=vercel-gateway` keeps Vercel Gateway search backends.
- `AGENTIS_WEB_SEARCH_PROVIDER=tavily` with `AGENTIS_WEB_SEARCH_BACKEND=keyless` uses Tavily keyless search for no-key development search.

## Consequences

- Runtime health and UI missing-credential copy identify the selected AI Gateway provider and required env vars.
- Vercel AI Gateway stays available as the default and rollback path.
- Cloudflare AI Gateway can run live chat/run execution without changing the Vercel AI SDK integration layer.
- Tavily keyless supports no-key development search. Production search provider selection remains a later decision.