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

## T081 Lifecycle State Model

### Source lifecycle states

| State | Meaning | Allowed next states | Browser-safe? | Owner |
| --- | --- | --- | --- | --- |
| `candidate` | A source exists in a connector, upload, repository, or fixture and can be selected for a deployment. | `selected`, `ignored` | Yes, when listed in source picker. | Agentis app and connector registry. |
| `selected` | An admin or setup flow selected the source for a support-agent deployment. | `refresh_queued`, `disabled`, `delete_requested` | Yes. | Agentis app. |
| `refresh_queued` | Agentis accepted a refresh or first-ingest request and has not started parsing/indexing. | `refreshing`, `disabled`, `delete_requested` | Yes, as status only. | Agentis app and ingestion queue. |
| `refreshing` | Agentis is fetching, parsing, chunking, and handing content to the retrieval backend. | `active`, `stale`, `refresh_failed`, `delete_requested` | Yes, as status only. | Agentis ingestion worker. |
| `active` | A source version is available for retrieval and citation in the deployment. | `refresh_queued`, `stale`, `disabled`, `delete_requested` | Yes. | Agentis source registry. |
| `stale` | The selected source version remains usable, but Agentis detected a newer upstream version or expired freshness window. | `refresh_queued`, `disabled`, `delete_requested` | Yes. | Agentis source registry. |
| `refresh_failed` | A refresh attempt failed and the previous active version remains the serving version when one exists. | `refresh_queued`, `disabled`, `delete_requested` | Yes, with sanitized message only. | Agentis ingestion worker. |
| `disabled` | The source is intentionally excluded from future retrieval but retained for audit and possible re-enable. | `refresh_queued`, `delete_requested` | Yes. | Agentis app. |
| `delete_requested` | An admin or retention policy requested deletion. Source must be excluded from new retrieval before backend purge starts. | `deleting` | Yes, as status only. | Agentis app. |
| `deleting` | Agentis is purging source content, parsed output, chunks, indexes, provider resources, and caches. | `deleted`, `delete_failed` | Yes, as status only. | Agentis ingestion worker and adapter. |
| `delete_failed` | One or more purge steps failed and the source stays excluded from retrieval. | `deleting`, `deleted` | Yes, with sanitized message only. | Agentis ingestion worker and adapter. |
| `deleted` | Raw content and retrievable artifacts are purged. Only a retention-bounded tombstone and deletion evidence remain. | None | Yes, as tombstone status only. | Agentis source registry. |

### Required source metadata

| Record | Required fields | Browser-safe fields | Server-only fields |
| --- | --- | --- | --- |
| Source registry record | `organizationId`, `deploymentId`, `agentId`, `knowledgeSourceId`, `sourceType`, `displayTitle`, `description`, `lifecycleState`, `activeVersionId`, `createdAt`, `updatedAt` | `knowledgeSourceId`, `displayTitle`, `description`, `sourceType`, `lifecycleState`, `activeVersionId`, freshness timestamps | Connector credentials, internal storage path, provider resource IDs, raw fetch errors, operational traces |
| Source version record | `sourceVersionId`, `knowledgeSourceId`, `versionLabel`, `contentHash`, `createdAt`, `selectedAt`, `freshnessStatus`, `parseStatus`, `indexStatus` | `sourceVersionId`, `versionLabel`, `freshnessStatus`, parse/index status labels, citation-ready title | Raw document bytes, parser diagnostics, provider file IDs, vector/index IDs, embedding model metadata |
| Lifecycle event | `eventId`, `knowledgeSourceId`, `sourceVersionId`, `eventType`, `actorType`, `actorId`, `occurredAt`, `previousState`, `nextState`, `reason` | Event type, timestamps, safe actor label, previous and next states | Actor internal IDs when sensitive, stack traces, provider request IDs, secret-bearing connector context |
| Deletion evidence | `deletionRequestId`, `knowledgeSourceId`, `sourceVersionIds`, `requestedAt`, `excludedFromRetrievalAt`, `objectStoragePurgedAt`, `indexPurgedAt`, `providerResourcesPurgedAt`, `cachePurgedAt`, `completedAt` | Deletion state, requested/completed timestamps, high-level evidence status | Provider deletion receipts, storage object keys, internal job IDs, raw adapter error payloads |

### Ownership boundaries

| Boundary | Owns | Must not own |
| --- | --- | --- |
| Browser UI | Source selection intent, display title, user-facing status, citation rendering, safe freshness/deletion labels. | Provider IDs, storage paths, raw content for private sources, connector credentials, adapter traces. |
| Agentis app/API | Source registry, deployment/source assignment, state transitions, access checks, audit event creation. | Backend-specific index internals beyond adapter metadata. |
| Ingestion worker | Fetching, parsing, chunking, version creation, refresh jobs, deletion jobs, lifecycle event emission. | Browser presentation or tenant authorization policy decisions. |
| Retrieval facade | Query-time scope enforcement, normalized retrieval status, citation-ready chunks, adapter conformance. | Direct UI state mutation or provider-specific leaks. |
| Backend adapter | Cloudflare AI Search, Vectorize, or provider-native resource calls and backend-specific failure mapping. | Product source identity, browser citation contract, retention policy decisions. |

### Transition rules

- A source cannot enter `active` without a source version, successful parse, successful index or accepted no-index state, and at least one browser-safe citation label.
- A source in `disabled`, `delete_requested`, `deleting`, `delete_failed`, or `deleted` must be excluded from new retrieval before any answer generation call.
- Refresh creates a new source version. The active version changes only after parsing and indexing checks pass.
- Refresh failure keeps the previous active version available only when its lifecycle state is still `active` or `stale` and policy allows stale serving.
- Deletion records `excludedFromRetrievalAt` before any backend purge. This prevents serving deleted content while provider or index deletion is still pending.
- `deleted` retains only tombstone and deletion evidence under the configured audit retention window.

### Retention and audit defaults

- Raw source content is retained only for active or refreshable versions.
- Parsed documents and chunks mirror their source version retention.
- Disabled source records may remain for audit, but disabled content must be excluded from retrieval.
- Deletion evidence should outlive raw content so maintainers can prove purge completion without retaining retrievable content.
- Every state transition emits a lifecycle event with actor, reason, timestamps, and previous/next state.

## T082 Parsing, Chunking, and Metadata Contracts

### Contract layers

| Layer | Purpose | Required identifiers | Browser-safe output |
| --- | --- | --- | --- |
| Source selection | Records which deployment can use a source. | `organizationId`, `deploymentId`, `agentId`, `knowledgeSourceId` | Source title, description, source type, lifecycle state. |
| Source version | Freezes a specific fetched or uploaded content version. | `knowledgeSourceId`, `sourceVersionId`, `versionLabel` | Version label, freshness status, last refreshed timestamp. |
| Parsed document | Normalizes raw source content into text blocks with source structure. | `parsedDocumentId`, `knowledgeSourceId`, `sourceVersionId` | Public document title and optional public location label. |
| Chunk | Splits parsed documents into retrievable units. | `chunkId`, `parsedDocumentId`, `sourceVersionId`, `knowledgeSourceId` | Citation title, excerpt, public section label, source version ID. |
| Citation | Converts retrieved chunks into UI, Slack, API, and audit-safe provenance. | `citationId`, `chunkId`, `knowledgeSourceId`, `sourceVersionId` | Citation ID, source title, excerpt, source version ID, optional public URL/section. |

### Parsed document contract

| Field | Required | Browser-safe? | Notes |
| --- | --- | --- | --- |
| `parsedDocumentId` | Yes | No | Internal stable ID for parser output. |
| `knowledgeSourceId` | Yes | Yes | Product-level source identity. |
| `sourceVersionId` | Yes | Yes | Lets browser citations show which version grounded an answer. |
| `sourceType` | Yes | Yes | Examples: `markdown`, `uploaded_file`, `url`. |
| `title` | Yes | Yes | User-facing source title after sanitization. |
| `publicLocationLabel` | Optional | Yes | Human label such as `Setup guide`, `FAQ`, or `Release notes`. |
| `canonicalUrl` | Optional | Yes only when public or tenant-authorized | Never expose signed URLs or private storage URLs. |
| `contentText` | Yes | No | Normalized text used for chunking and indexing. |
| `contentHash` | Yes | No | Used for freshness and dedupe. Do not expose hashes for private content. |
| `parserVersion` | Yes | No | Parser implementation/version used to create this record. |
| `parseStatus` | Yes | Yes, sanitized | `parsed`, `parse_failed`, or `unsupported_format`. |
| `parseDiagnostics` | Optional | No | Stack traces, unsupported nodes, byte offsets, or raw failure details. |

### Chunk contract

| Field | Required | Browser-safe? | Notes |
| --- | --- | --- | --- |
| `chunkId` | Yes | Yes | Stable product citation identifier, not the provider vector ID. |
| `parsedDocumentId` | Yes | No | Internal join to parser output. |
| `knowledgeSourceId` | Yes | Yes | Required for deployment and tenant scope checks. |
| `sourceVersionId` | Yes | Yes | Required for freshness and deletion checks. |
| `chunkOrdinal` | Yes | No | Deterministic order within the parsed document. |
| `headingPath` | Optional | Yes | Sanitized public section hierarchy. |
| `excerpt` | Yes | Yes | Short citation excerpt with secrets and private internals removed. |
| `contentText` | Yes | No | Full retrievable chunk text. |
| `tokenCount` | Yes | No | Helps tune chunking and cost. |
| `location` | Optional | Yes only when safe | Public URL, section anchor, page label, or line range when allowed. |
| `chunkHash` | Yes | No | Used to compare refreshes and purge stale index entries. |
| `embeddingMetadata` | Optional | No | Embedding model, vector namespace, vector ID, dimensions, and provider IDs. |

### Browser-safe citation contract

The future `SupportAgentSource` shape should grow from the current `id`, `knowledgeSourceId`, `title`, and `excerpt` fields into a normalized citation record:

```ts
type SupportAgentCitation = {
  id: string
  knowledgeSourceId: string
  sourceVersionId: string
  chunkId: string
  title: string
  excerpt: string
  freshnessStatus: "fresh" | "stale" | "unknown"
  locationLabel?: string
  publicUrl?: string
  retrievedAt: string
}
```

Server-only adapter metadata must stay out of browser payloads:

```ts
type SupportAgentRetrievalServerMetadata = {
  backend: "cloudflare-ai-search" | "cloudflare-vectorize" | "provider-native"
  providerResourceId?: string
  providerFileId?: string
  providerVectorId?: string
  namespace?: string
  storageUri?: string
  score?: number
  queryTraceId?: string
  rawDiagnostics?: unknown
}
```

### Chunking rules

- Chunking must be deterministic for a `(sourceVersionId, parserVersion, chunkingStrategyVersion)` tuple.
- A chunk must never mix content from different tenants, deployments, knowledge sources, or source versions.
- Markdown heading paths should become public section labels when the source itself is visible to the deployment.
- Chunk text can include private content, but citation excerpts must pass a browser-safe sanitizer before response rendering.
- The initial chunking strategy can tune size and overlap during retrieval evals, but each generated chunk needs stable IDs and strategy metadata.

### Source examples

| Source type | Browser-safe example | Server-only example |
| --- | --- | --- |
| Markdown/docs fixture | `knowledgeSourceId: knowledge_product_docs`, title `Product documentation sample`, `sourceVersionId: ksrcv_product_docs_2026_05_19`, location label `Setup` | Local fixture registry entry, normalized `contentText`, parser diagnostics. |
| Uploaded file | Display title `Support FAQ.pdf`, version label `Uploaded May 19`, citation page label `p. 3` | R2 object key, file checksum, parser trace, extracted text, provider file/vector IDs. |
| URL-like support source | Public URL `https://docs.example.com/setup`, title `Setup guide`, section `Connect a source` | Crawl job ID, fetched bytes, redirect history, private auth headers, raw fetch errors. |

### Freshness and version fields

- `sourceVersionId` identifies the version that produced parsed documents, chunks, index entries, citations, and deletion evidence.
- `versionLabel` is browser-safe, human-readable, and can be a date, semantic version, or upload label.
- `freshnessStatus` is browser-safe and uses `fresh`, `stale`, or `unknown` until product policy defines stricter freshness windows.
- `lastRefreshedAt`, `nextRefreshAfter`, and `staleDetectedAt` are browser-safe only when they do not reveal private connector timing.
- `contentHash`, fetch ETags, object keys, vector IDs, provider IDs, and raw diagnostics remain server-only.

## T083 Indexing and Adapter Lifecycle Expectations

### Retrieval facade responsibilities

The Agentis-owned retrieval facade owns product identity, scope enforcement, lifecycle checks, and browser-safe result normalization before any backend adapter is called.

Required query preconditions:

1. Resolve `organizationId`, `deploymentId`, `agentId`, and allowed `knowledgeSourceId` values from Agentis state.
2. Exclude sources whose lifecycle state is `disabled`, `delete_requested`, `deleting`, `delete_failed`, or `deleted`.
3. Require an active or policy-allowed stale `sourceVersionId` for every retrievable source.
4. Pass only scope filters and backend-safe metadata to the adapter.
5. Normalize every adapter result into a browser-safe citation contract before answer generation.

### Index status model

| Status | Meaning | Query behavior | Browser-safe? |
| --- | --- | --- | --- |
| `not_indexed` | Source exists, but no index job has been requested. | Do not retrieve. Return `SUPPORT_KNOWLEDGE_MISSING_CONTENT`. | Yes. |
| `index_queued` | Index job is accepted but not started. | Do not retrieve unless a previous active version is still allowed. | Yes. |
| `indexing` | Adapter is creating or updating backend index entries. | Do not serve the in-progress version. Prior active version may serve if allowed. | Yes. |
| `indexed` | Backend confirms retrievable entries for the source version. | Retrieval allowed. | Yes. |
| `index_stale` | Backend index exists but source freshness is expired or a newer version is available. | Retrieval allowed only when stale serving policy permits it and citations mark `stale`. | Yes. |
| `index_unavailable` | Backend index cannot be reached or inspected. | Do not retrieve. Return `SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE`. | Yes, with sanitized message. |
| `delete_pending` | Source is excluded from retrieval and waiting for purge work. | Do not retrieve. Return `SUPPORT_KNOWLEDGE_DELETION_PENDING` if directly requested. | Yes. |
| `deleting` | Adapter is purging index entries and provider resources. | Do not retrieve. | Yes. |
| `deleted` | Adapter purge completed. | Do not retrieve. | Yes. |
| `index_failed` | Index job failed. | Do not retrieve the failed version. Prior active version may serve if allowed. | Yes, with sanitized message. |

### Typed failure states

| Code | Trigger | Browser-safe response | Server-only evidence |
| --- | --- | --- | --- |
| `SUPPORT_KNOWLEDGE_MISSING_CONTENT` | Selected source has no active version, parse output, chunks, or index entries. | `The selected knowledge source is not ready yet.` | Missing record IDs, parser job IDs, storage keys. |
| `SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE` | Adapter cannot reach Cloudflare AI Search, Vectorize, or provider-native retrieval backend. | `Knowledge search is unavailable right now.` | Backend request IDs, status codes, stack traces, retry metadata. |
| `SUPPORT_KNOWLEDGE_STALE_SOURCE` | Source is stale and policy disallows stale serving. | `The selected knowledge source needs a refresh before it can be used.` | Freshness policy, source hashes, upstream ETags, refresh job IDs. |
| `SUPPORT_KNOWLEDGE_DELETION_PENDING` | Source is disabled for retrieval because deletion was requested or is running. | `The selected knowledge source is being removed.` | Deletion request IDs, purge job details, provider deletion receipts. |
| `SUPPORT_KNOWLEDGE_SOURCE_DELETED` | Request references a deleted source or source version. | `The selected knowledge source is no longer available.` | Tombstone IDs and retention policy metadata. |
| `SUPPORT_KNOWLEDGE_SCOPE_MISMATCH` | Source, version, chunk, namespace, or provider resource does not belong to the request deployment. | `The selected knowledge source is unavailable for this deployment.` | Tenant/deployment mismatch details and adapter resource IDs. |
| `SUPPORT_KNOWLEDGE_ADAPTER_ERROR` | Adapter returns malformed data, missing citations, backend error, timeout, or unsupported capability. | `Knowledge search failed before an answer could be grounded.` | Raw adapter payload, provider request IDs, trace IDs, retry classification. |

### Backend adapter expectations

| Adapter path | First role | Must provide | Must not expose to browser |
| --- | --- | --- | --- |
| Cloudflare AI Search | First validation backend for managed document index/search. | Instance/namespace mapping, source version status, chunk/result normalization, deletion and refresh evidence, unavailable-index failure mapping. | Instance secrets, internal namespace strategy when sensitive, raw search traces, provider diagnostics. |
| Cloudflare Vectorize | Fallback when Agentis needs stronger chunk, metadata, ranking, or lifecycle control. | Namespace/filter enforcement, vector ID to `chunkId` mapping, embedding model metadata server-side, index purge confirmation. | Vector IDs, embedding vectors, object keys, internal scores unless product chooses to expose confidence later. |
| Provider-native file search | Optional adapter for provider-specific deployments and fast experiments. | Provider file/vector-store mapping to Agentis source/version/chunk IDs, citation normalization, deletion receipts, expiration status. | Provider file IDs, vector store IDs, raw annotations when they reveal provider internals or private paths. |

### Refresh expectations

- Refresh always creates a new source version before parsing or indexing starts.
- The previous active version remains the serving version until the new version reaches `indexed` and passes citation normalization checks.
- If refresh fails, the source moves to `refresh_failed` or keeps `index_stale` with an explicit policy decision about stale serving.
- Refresh writes lifecycle events for request, fetch, parse, chunk, index, activation, failure, and stale detection.
- A refresh cannot overwrite deletion state. `delete_requested` and later states take precedence over queued refresh work.

### Deletion expectations

- Deletion first records `excludedFromRetrievalAt` in Agentis state and removes the source from query eligibility.
- The adapter must purge backend index entries for every active and historical source version covered by the deletion request.
- Provider-native adapters must record provider deletion or expiration evidence, not only the API request attempt.
- Caches, eval fixtures, and generated answer drafts that include deleted content need purge or retention-policy handling.
- Query-time checks must fail closed when a requested source is `delete_pending`, `deleting`, `delete_failed`, or `deleted`.

### Conformance checks before Planned Slice 3

- Query with no active source returns `SUPPORT_KNOWLEDGE_MISSING_CONTENT` and does not call the model.
- Query while the index is unavailable returns `SUPPORT_KNOWLEDGE_INDEX_UNAVAILABLE` and does not leak backend diagnostics.
- Query against a stale source either marks citations `stale` or fails with `SUPPORT_KNOWLEDGE_STALE_SOURCE`, based on policy.
- Query after deletion request returns `SUPPORT_KNOWLEDGE_DELETION_PENDING` or `SUPPORT_KNOWLEDGE_SOURCE_DELETED` and never returns deleted chunks.
- Adapter results that miss `knowledgeSourceId`, `sourceVersionId`, `chunkId`, title, or excerpt fail with `SUPPORT_KNOWLEDGE_ADAPTER_ERROR` before answer generation.

## T084 Handoff for Deployment-Scoped Grounding

### Final artifact location

This file is the S021 lifecycle contract artifact in the agreed research documentation area:

- `docs/research/support-agent-knowledge-lifecycle-contract.md`

Planned Slice 3 can use this artifact as the implementation precondition for deployment-scoped grounding. The slice should convert the contract into code and tests without widening the milestone scope beyond KM-02 and the first grounding path.

### Grounding path preconditions

| Area | Required before implementation | Source section |
| --- | --- | --- |
| Source selection | Source registry records include `organizationId`, `deploymentId`, `agentId`, `knowledgeSourceId`, lifecycle state, active version, and browser-safe display metadata. | T081 |
| Source versions | Refresh creates immutable source versions and only activates a version after parse, chunk, and index checks pass. | T081, T082, T083 |
| Parsing | Raw content normalizes into parsed documents with parser version, source type, title, content text, parse status, and server-only diagnostics. | T082 |
| Chunking | Chunks carry stable `chunkId`, `knowledgeSourceId`, `sourceVersionId`, heading/location metadata, browser-safe excerpt, server-only full text, and chunking strategy metadata. | T082 |
| Metadata boundaries | Browser payloads expose only product source IDs, version IDs, citation IDs, safe titles, excerpts, freshness labels, safe locations, and sanitized status messages. | T080, T082 |
| Indexing | Retrieval is allowed only for eligible source lifecycle states and `indexed` or policy-allowed `index_stale` versions. | T083 |
| Refresh | New source versions do not become active until backend indexing and citation normalization pass. Prior active versions serve only when policy allows it. | T081, T083 |
| Deletion | `excludedFromRetrievalAt` is recorded before purge work. Deleting or deleted sources must fail closed and never reach answer generation. | T081, T083 |
| Adapter failures | Missing content, unavailable index, stale source, deletion pending, deleted source, scope mismatch, and adapter errors map to typed browser-safe failure states. | T083 |
| Browser-safe contracts | UI, hosted chat, Slack, APIs, and audit logs render normalized citations without provider IDs, storage paths, secrets, raw diagnostics, or runtime traces. | T080, T082, T083 |

### Planned Slice 3 implementation requirements

- Add Agentis-owned support knowledge contract types for source registry records, source versions, parsed documents, chunks, citations, index statuses, lifecycle states, and typed failure states.
- Extend or replace the current fixture-backed documentation context so retrieval uses source/version/chunk records instead of passing full demo content directly to the model prompt.
- Add a retrieval facade that enforces deployment/source/version eligibility before calling a backend adapter.
- Implement the first Cloudflare AI Search validation adapter behind the facade, or a local contract stub if live Cloudflare binding validation is split into a later task.
- Keep Vectorize and provider-native retrieval behind adapter interfaces with the same lifecycle and citation contract.
- Update `SupportAgentSource` or add a new citation type so browser responses can include `sourceVersionId`, `chunkId`, freshness, and safe location fields.
- Add failure-state tests proving that missing content, unavailable index, stale source policy failure, deletion pending, deleted source, scope mismatch, and adapter malformed results fail before model calls.
- Add browser-safety tests proving provider IDs, storage URIs, object keys, vector IDs, raw adapter diagnostics, stack traces, and credentials do not appear in browser-visible responses.
- Add deletion and refresh tests that prove disabled/deleting/deleted sources cannot ground answers and active versions do not switch until indexing succeeds.

### KM-02 traceability

| Task | KM-02 coverage |
| --- | --- |
| T080 | Audited current source IDs, context references, browser-visible fields, runtime-only fields, and lifecycle gaps. |
| T081 | Defined lifecycle states, source/version/event/deletion metadata, ownership boundaries, transitions, retention, and audit defaults. |
| T082 | Specified parsing, chunking, source/chunk identifiers, freshness/version fields, browser-safe citation fields, and server-only metadata boundaries. |
| T083 | Defined retrieval facade lifecycle checks, index statuses, refresh/deletion expectations, typed failure states, and adapter expectations for Cloudflare AI Search, Vectorize, and provider-native paths. |
| T084 | Consolidated implementation preconditions and handoff requirements for the deployment-scoped grounding path in Planned Slice 3. |

### Open decisions before production hardening

- Freshness policy: exact windows for stale serving and user-visible stale labels.
- Retention policy: audit tombstone duration and raw-content purge timelines.
- Citation granularity: whether first production citations require file/chunk/line-level references or source title plus excerpt.
- Live backend choice: whether Cloudflare AI Search satisfies lifecycle, citation, and deletion evidence once validated with real content.
- Admin UX: how much lifecycle and deletion evidence should be visible to maintainers in the product UI.
