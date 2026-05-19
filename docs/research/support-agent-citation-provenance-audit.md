# Support-agent citation and provenance audit (KM-04)

Audit date: 2026-05-19. Scope: slice S023 / task T091.

## Flow summary

```text
local-knowledge-retrieval-adapter
  → SupportKnowledgeRetrievedChunk (+ citationId)
  → knowledge-retrieval-facade (toBrowserSafeCitation)
  → knowledge-grounding (toSupportAgentSourcesFromRetrieval)
  → SupportAgentSource[] on SupportAgentChatResponse
  → App transcript (SupportAgentProvenanceList)
```

Hosted path: same grounding via `resolveSupportAgentGroundingContext`, then `model-runtime` or `flue-adapter` (`toSupportAgentChatResponse` maps Flue `provenance` → `sources`).

## SupportAgentSource contract (browser-safe)

| Field | Purpose | Shown in UI (pre-S023) | Shown after S023 |
| --- | --- | --- | --- |
| `id` | Citation ID (`citation_<chunkId>`) | Yes, mislabeled "Source ID" | Yes, "Citation ID" |
| `knowledgeSourceId` | Deployment registry source | No | Yes |
| `sourceVersionId` | Active version for grounding | No | Yes |
| `chunkId` | Retrieved chunk | No | Yes |
| `title` | Display title | Yes | Yes |
| `excerpt` | Browser-safe excerpt | Yes | Yes |
| `freshnessStatus` | fresh / stale / unknown | No | Yes |
| `locationLabel` | Section or public location | No | Yes (when present) |

## Server-only (must never appear in browser JSON)

From `SupportKnowledgeChunk` / `SupportKnowledgeRetrievalServerMetadata`:

- `contentText`, `tokenCount`, `chunkHash`, `embeddingMetadata`
- `providerResourceId`, `providerFileId`, `providerVectorId`, `namespace`, `storageUri`, `score`, `queryTraceId`, `rawDiagnostics`
- Registry org/deployment internals beyond scoped IDs already on citations
- Provider API keys, deployment secrets, stack traces

`toBrowserSafeCitation` and adapter validation enforce omission of `contentText` and embedding metadata from citations.

## Gaps found (KM-04)

1. Chat UI showed only title, `id` (as "Source ID"), and excerpt — not version, chunk, knowledge source, location, or freshness.
2. Legacy transcript/docs referenced pre-retrieval IDs (`source_product_docs_setup`) while runtime returns `citation_chunk_*` from retrieved chunks.
3. Provenance block rendered even when `sources` was empty (misleading empty section).
4. Flue adapter did not map `freshnessStatus` or `locationLabel` from provenance when present.

## Browser-visible render paths

| Surface | Renders sources |
| --- | --- |
| `App.tsx` transcript | `SupportAgentProvenanceList` |
| Worker-hosted chat HTML | Inline HTML (Worker test coverage separate) |
| Failure alert | No sources; userMessage only |

## Failure states (no misleading citations)

Knowledge and provenance failures map to `toSupportAgentFailureState` before a cited answer is shown. Empty `sources` on assistant turns should not render a provenance section.
