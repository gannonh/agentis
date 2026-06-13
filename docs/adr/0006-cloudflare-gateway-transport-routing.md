# ADR 0006: Route Cloudflare AI Gateway models by native REST transport

## Status

Accepted

## Context

Agentis supports `AI_GATEWAY_PROVIDER=cloudflare` for self-hosted runs without a Vercel AI Gateway key. Cloudflare's [REST API](https://developers.cloudflare.com/ai-gateway/usage/rest-api/) exposes multiple LLM transports on one account base URL:

- `POST /ai/v1/messages` — Anthropic Messages API (Anthropic SDK compatible)
- `POST /ai/v1/chat/completions` — OpenAI chat completions schema (OpenAI, Google, xAI, Workers AI, …)

Routing every model through a single OpenAI-compatible client caused provider-specific failures as the catalog grew: Anthropic tool calling and system prompts, OpenAI reasoning-era `max_tokens` rejection, and Workers AI gateway header requirements. Fixing models one at a time does not scale.

## Decision

Route Cloudflare live models by **provider prefix**, not per-model catalog flags:

| Model id prefix | Transport | Client |
| --- | --- | --- |
| `anthropic/*` | `/ai/v1/messages` | `@ai-sdk/anthropic` |
| `@cf/*` | `/ai/v1/chat/completions` | `@ai-sdk/openai-compatible` |
| `openai/*`, `google/*`, `xai/*`, … | `/ai/v1/chat/completions` | `@ai-sdk/openai-compatible` |

Implementation lives in `apps/api/src/runtime/cloudflare-ai-gateway.ts`. `apps/api/src/runtime/gateway-model.ts` remains the provider-neutral entry point for Vercel and Cloudflare.

Additional rules:

- **Workers AI** (`@cf/*`) always sends `cf-aig-gateway-id`; default to `default` when `CLOUDFLARE_AI_GATEWAY_ID` is unset.
- **Anthropic on Cloudflare** inlines the system prompt into the first user message because Cloudflare's Messages API rejects array-shaped `system` payloads from the Anthropic SDK.
- **OpenAI-schema requests** pass through `transformCloudflareOpenAiChatRequestBody()`, which applies OpenAI-era capability rules from the bare model name (for example `max_tokens` → `max_completion_tokens` on reasoning-era OpenAI models). New `openai/*` catalog entries inherit this without code changes unless Cloudflare adds a new transport.

Provider errors are normalized in `apps/api/src/runtime/provider-error.ts` so run `errorSummary` surfaces gateway messages instead of a generic "Failed".

## Consequences

- Adding catalog models with an existing provider prefix should not require transport work.
- A genuinely new provider transport (not mappable to Messages or chat/completions) needs a new branch in `cloudflare-ai-gateway.ts`, not a one-off model patch.
- Vercel AI Gateway behavior is unchanged; ADR 0004 remains the rollback path.
- Self-host operators should prefer Cloudflare Unified Billing or BYOK per provider docs when models return empty content.

## Related

- ADR 0004: configurable AI Gateway providers as the live runtime boundary
- `docs/self-host/golden-path-research.md`
- `apps/api/src/runtime/cloudflare-ai-gateway.ts`
