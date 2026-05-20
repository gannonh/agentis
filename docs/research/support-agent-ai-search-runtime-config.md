# Support-Agent Cloudflare AI Search Runtime Configuration (AIS-01)

This document defines the maintainer-facing contract for Cloudflare AI Search bindings used by the support-agent Worker runtime. Browser-visible status and chat responses must use the typed public messages in `ai-search-config.ts`; they must never expose credentials, raw binding objects, provider account identifiers, or server-only diagnostics.

## Required Maintainer Inputs

| Input | Where it lives | Purpose |
| --- | --- | --- |
| AI Search namespace binding | `apps/web/wrangler.toml` → `[[ai_search_namespaces]]` | Grants the Worker access to AI Search instances in a namespace through `env.SUPPORT_AGENT_AI_SEARCH`. |
| Namespace label (optional) | `SUPPORT_AGENT_AI_SEARCH_NAMESPACE` in `[env.preview.vars]` or `.dev.vars` | Supplies the browser-safe namespace label shown in status when the binding is enabled. |
| AI Search instance binding (alternative) | `[[ai_search]]` with `binding = "SUPPORT_AGENT_AI_SEARCH_INSTANCE"` | Binds directly to one instance in the default namespace when namespace management is not needed. |
| Instance name (instance mode) | `instance_name` in `[[ai_search]]` | Names the AI Search instance bound at deploy time. |

Do not commit API tokens, account IDs, instance IDs, or binding JSON into the repository. Store Cloudflare credentials only in root `.env`, `apps/web/.dev.vars`, or Cloudflare secrets.

## Wrangler Binding Examples

Namespace binding (recommended for deployment-scoped knowledge):

```toml
[[ai_search_namespaces]]
binding = "SUPPORT_AGENT_AI_SEARCH"
namespace = "agentis-support-agent"
# remote = true  # optional for wrangler dev against remote AI Search
```

Instance binding (single known instance):

```toml
[[ai_search]]
binding = "SUPPORT_AGENT_AI_SEARCH_INSTANCE"
instance_name = "support-agent-knowledge"
```

The preview Worker also documents these bindings in `apps/web/wrangler.toml` as commented placeholders.

## Local And Preview Setup

1. Create or select a Cloudflare AI Search namespace and instance in the Cloudflare dashboard.
2. Uncomment the matching binding block in `apps/web/wrangler.toml` and set the namespace or instance name.
3. Optionally set `SUPPORT_AGENT_AI_SEARCH_NAMESPACE` for browser-safe status labeling.
4. Start local Worker dev:

```bash
pnpm support-agent:worker:dev
```

5. Run configuration checks:

```bash
pnpm support-agent:worker:check
pnpm support-agent:worker:ai-search-check
```

6. For hosted preview proof after bindings and secrets exist:

```bash
pnpm support-agent:worker:deploy
pnpm support-agent:worker:acceptance
```

## Configuration States

| State | Meaning | Browser-safe signal |
| --- | --- | --- |
| `missing` | No AI Search binding is available to the Worker. Expected in local development until bindings are enabled. | `runtimeCode: SUPPORT_AGENT_AI_SEARCH_CONFIG_MISSING` on `/support-agent/status`. |
| `invalid` | Binding mode, namespace, or instance settings disagree (for example env vars without bindings, or both binding types enabled). | `runtimeCode: SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID`. |
| `configured` | Namespace or instance binding resolves with required identifiers. | `state: "configured"` on `/support-agent/status`. |

Server-side diagnostics may include `invalidFields` for maintainers. That field is not included in browser-safe status payloads.

## Validation Commands

| Command | What it proves |
| --- | --- |
| `pnpm --filter web test -- src/lib/support-agent/ai-search-config.test.ts src/lib/support-agent/browser-safe-error.test.ts` | Typed missing, invalid, and configured resolution; browser-safe error redaction. |
| `pnpm support-agent:worker:ai-search-check` | `/support-agent/status` includes `aiSearch` with a typed state and no credential substrings in JSON output. |
| `pnpm support-agent:worker:check` | Worker health and status endpoints remain reachable while AI Search may still be `missing` locally. |

Configured-path acceptance against live Cloudflare AI Search requires maintainer credentials and enabled bindings. Missing-config behavior is the expected local default and must remain typed and browser-safe.

## References

- Cloudflare AI Search Workers binding: <https://developers.cloudflare.com/ai-search/usage/workers-binding/>
- Support-agent Worker entrypoint: `apps/web/src/worker/support-agent-worker.ts`
- Runtime detection: `apps/web/src/lib/support-agent/ai-search-config.ts`
