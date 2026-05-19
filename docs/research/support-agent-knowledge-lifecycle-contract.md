# Support-Agent Knowledge Lifecycle Contract

## Scope

Milestone M005, slice S021. This artifact defines the support content lifecycle and browser-safe contracts for source selection, parsing, chunking, metadata, indexing, refresh, and deletion.

Requirement mapped here:

- KM-02: support content lifecycle and browser-safe contracts for knowledge ingestion, refresh, deletion, and cited grounding.

S020 carry-forward:

- Agentis should own the retrieval facade and product citation contract.
- Cloudflare AI Search is the first validation backend.
- Cloudflare Vectorize and provider-native file search stay behind adapter boundaries as fallback paths.
- Knowledge memory is deployment-scoped. Long-term user memory stays out of Phase 1.

## T080 Audit: Current Knowledge Source Surfaces

### Source IDs and context references

| Source | Current ID | Response source ID | Context reference | Browser-visible fields today | Runtime-only fields today |
| --- | --- | --- | --- | --- | --- |
| Product documentation sample | `knowledge_product_docs` | `source_product_docs_setup` | `docs/knowledge/product-documentation-sample.md` | Source ID, title, description, local path, excerpt, transcript citation source ID | In-memory checked-in content resolved by `documentation-context.ts` |
| Release notes sample | `knowledge_release_notes` | `source_release_notes_may` | `docs/knowledge/release-notes-sample.md` | Source ID, title, description, local path, excerpt, transcript citation source ID | In-memory checked-in content resolved by `documentation-context.ts` |

### Surface inventory

| Surface | Current role | Browser-safe output | Runtime-only or server-owned data | KM-02 lifecycle gap |
| --- | --- | --- | --- | --- |
| `apps/web/src/App.tsx` | Lets a user select one sample source, prepares hosted config, posts a support-agent question, and renders citations. | Template name, selected source name, source ID, excerpt, hosted deployment status, chat URL, runtime label. | Deployment access token is entered in the browser but used only as an access credential. Provider keys and deployment secrets are not rendered. | No source version, enabled/disabled/deleted state, freshness label, deletion state, or refresh status. |
| `apps/web/src/lib/support-agent/chat-contracts.ts` | Defines `SupportAgentKnowledgeSourceSelection`, `SupportAgentChatRequest`, `SupportAgentSource`, and hosted handoff shapes. | Source ID, title, description, local context reference path, answer source ID, excerpt. | No explicit server-only metadata shape. Runtime metadata exposes provider and model only after response. | No lifecycle state contract, source version ID, chunk ID, content hash, index status, refresh status, deletion evidence, or browser-safe/server-only split. |
| `apps/web/src/lib/support-agent/documentation-context.ts` | Resolves selected source IDs to local demo content and maps context into response sources. | Source ID, knowledge source ID, title, excerpt. | Full source content, local source registry, path validation, and runtime preparation errors. | Registry is hard-coded. There is no source registry record with owner, retention, freshness, content hash, parse status, or deletion status. |
| `apps/web/src/lib/support-agent/flue-adapter.ts` | Converts Agentis chat requests into Flue-ready runtime input and maps Flue provenance back to Agentis response sources. | Normalized citations with source ID, knowledge source ID, title, and excerpt. | Documentation content and runtime provenance may include adapter fields, but those fields are dropped from `SupportAgentChatResponse`. | No adapter lifecycle contract for missing content, stale source, unavailable index, deletion pending, deleted source, or backend adapter failure. |
| `apps/web/src/worker/support-agent-worker.ts` | Serves hosted chat/status endpoints, checks access tokens, and routes hosted chat to the Agentis-owned API path. | Hosted chat page, selected source display, deployment status, source citations, public runtime metadata. | OpenAI key, deployment secret, provider settings, and access verification run server-side. | Hosted page has a fixed sample source and no source registry lookup, lifecycle status, refresh status, or deletion status. |
| `docs/support-agent-mvp.md` | Records local demo, hosted config, hosted chat, status, eval, and current documentation context paths. | Maintainer instructions and browser-safe contract notes. | Server-side secret handling and runtime setup guidance. | Documents current limits but does not define the durable lifecycle state model or ingestion/indexing contract. |
| `docs/research/support-agent-retrieval-memory-recommendation.md` | Records S020 retrieval and memory recommendation. | Research artifact only. | Backend comparison criteria and memory boundaries. | Requires this S021 contract before runtime implementation can safely ground deployment-scoped answers. |

### Current lifecycle gaps

- Source selection has IDs and local paths, but no `sourceVersionId`, `deploymentId`, `organizationId`, `agentId`, owner, or policy metadata.
- Parsing and chunking are implicit. The runtime passes full demo content instead of normalized parsed documents and chunks.
- Browser citations use source ID, title, and excerpt only. They do not include chunk ID, source version, location, freshness, or content hash.
- Indexing has no typed states for missing content, queued, indexing, indexed, stale, unavailable, deleting, deleted, or backend error.
- Refresh has no requested-at, completed-at, source hash, prior version, or failure evidence fields.
- Deletion has no tombstone, deletion request, provider deletion evidence, index purge evidence, or retention boundary.
- Adapter boundaries drop runtime-only fields from browser responses, but no contract lists which fields must stay server-only.

### KM-02 conclusion

The current implementation has a browser-safe citation shape and server-side secret boundary for the demo path. KM-02 now needs a durable source registry, source version lifecycle, normalized parsed document/chunk metadata, adapter status contract, and deletion evidence model before deployment-scoped grounding moves from fixture-backed demo content to indexed support content.
