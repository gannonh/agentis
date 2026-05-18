# Support-Agent Retrieval and Memory Research

## Scope

Milestone M005, slice S020. This artifact researches retrieval and memory choices for Agentis as a configurable agent platform, with the support agent as the lead validation case.

Requirements mapped here:

- KM-01: deployment-scoped knowledge retrieval with cited, source-backed answers.
- KM-05: memory boundaries across knowledge, conversation, user/session, retention, deletion, and tenant/deployment scope.

This document records recommendations for discussion. It does not lock the runtime architecture decision.

## T078 Recommendations For Discussion

### Recommended direction

Use an Agentis-owned retrieval and memory facade as the product contract, then validate one Cloudflare-first backend behind it before broadening backend support.

Recommended first validation stack:

1. Retrieval facade owned by Agentis.
2. Cloudflare AI Search as the first managed backend candidate.
3. Custom Cloudflare Vectorize RAG as the control-oriented fallback if AI Search cannot satisfy citation, lifecycle, or tenant-boundary requirements.
4. Provider-native file search as an optional adapter for provider-specific deployments and fast experiments.
5. Graph retrieval as a later advanced capability for entity-heavy or multi-hop workloads.

Memory recommendation:

1. Enable deployment-scoped knowledge memory from selected sources.
2. Enable short-term conversation memory for the current web chat or Slack thread.
3. Enable ephemeral request/session memory for retrieval chunks, tool outputs, and answer-generation state.
4. Keep user long-term memory, organization-learned memory, graph memory, and cross-agent shared memory out of the first support-agent runtime until product policy, consent, retention, deletion, and audit controls are planned.

### Confidence levels

| Recommendation | Confidence | Basis | Main uncertainty |
| --- | --- | --- | --- |
| Agentis-owned retrieval facade | High | Preserves product citation contract, tenant checks, source lifecycle, and backend portability across Cloudflare AI Search, Vectorize, provider-native search, and future graph retrieval. | Exact TypeScript contract and storage schema still need implementation planning. |
| Cloudflare AI Search first validation backend | Medium | Official docs align with documentation search, agent tool use, memory, per-tenant/per-agent file search, hybrid search, REST APIs, namespaces, and Workers integration. | Live response shape, source metadata completeness, deletion behavior, and operational maturity need proof. |
| Custom Vectorize RAG fallback | Medium-high | Cloudflare-native and gives Agentis source/chunk/citation control with metadata and namespace filters. | More build work: ingestion, chunking, reranking, evals, deletion, and observability. |
| Provider-native file search optional adapter | Medium | Fast source-backed validation with provider-managed retrieval and file citations. | Lock-in, data residency, deletion evidence, and provider-shaped citation IDs. |
| Defer GraphRAG for first support-agent path | High | Graph retrieval adds indexing, graph quality, update/delete, and provenance complexity before baseline cited retrieval is proven. | Some enterprise/internal use cases may need graph retrieval sooner. |
| Keep long-term user memory disabled in Phase 1 | High | Reduces consent, retention, deletion, and prompt-injection risk while KM-05 boundaries are still being defined. | Product requirements may later require personalized support memory. |

### Decision criteria before runtime implementation

- Can the backend return deployment-scoped chunks with stable Agentis source IDs and user-visible citation text?
- Can deleted or disabled sources be proven absent from future retrieval and answer generation?
- Can every retrieval request enforce tenant, deployment, agent, source, and source-version filters before any model call?
- Can the UI, Slack responses, logs, and future APIs render citations without exposing provider-internal IDs or secrets?
- Can retrieval run inside the Cloudflare-first hosted path with acceptable latency, cost, and operational observability?
- Can memory categories stay separated so durable knowledge, conversation context, ephemeral request state, and future user memory do not collapse into one ungoverned store?

## Source Inventory

Access date for all sources: 2026-05-18.

| Source | URL | Version or date context captured | Relevant use |
| --- | --- | --- | --- |
| Cloudflare AI Search overview | https://developers.cloudflare.com/ai-search/ | Current docs page; states AI Search is available on all plans | Cloudflare-native managed retrieval option for documentation, agents, per-tenant or per-agent file search |
| Cloudflare AI Search REST API | https://developers.cloudflare.com/ai-search/usage/rest-api/ | Current docs page; API supports instance and namespace paths | Search/chat endpoint shape, streaming chunks, namespace-scoped retrieval |
| Cloudflare Vectorize metadata filtering | https://developers.cloudflare.com/vectorize/reference/metadata-filtering/ | Current docs page; notes metadata filtering limits and index creation constraints | Tenant, deployment, customer, product, and version filtering for vector retrieval |
| Cloudflare Vectorize with Workers AI | https://developers.cloudflare.com/vectorize/get-started/embeddings | Current docs page; Vectorize uses Workers AI embeddings from Workers | Cloudflare-first custom vector RAG path |
| OpenAI File Search | https://developers.openai.com/docs/guides/tools-file-search | Current docs page; examples use Responses API and models such as gpt-5.5 and gpt-4.1 | Provider-native hosted file search with file citations |
| OpenAI Retrieval API | https://platform.openai.com/docs/guides/retrieval | Current docs page; vector stores expose semantic search, attributes, chunking, expiration, and hybrid ranking options | Provider-native vector store search and lifecycle operations |
| Azure AI Search hybrid search | https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview | Current docs page; example uses API version 2026-04-01 | Mature managed hybrid retrieval reference architecture |
| Azure AI Search agentic retrieval | https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview | Current docs page; notes some features GA in 2026-04-01 REST API and portal preview coverage | Multi-query retrieval, source references, query plans, and downstream agent consumption |
| Microsoft GraphRAG docs | https://github.com/microsoft/graphrag/blob/main/docs/index.md | GitHub main docs fetched 2026-05-18 | Knowledge graph retrieval for multi-hop and corpus-level questions |
| Microsoft GraphRAG research project | https://www.microsoft.com/en-us/research/project/graphrag/ | Current Microsoft Research project page | Research context for LLM-derived knowledge graphs |
| Mem0 memory types | https://docs.mem0.ai/core-concepts/memory-types | Current docs page | Memory taxonomy: conversation, session, user, organizational |
| Zep memory docs | https://help.getzep.com/v2/memory | Current docs page | Session-specific memory ingestion and user graph retrieval model |
| LangChain Deep Agents memory | https://docs.langchain.com/oss/javascript/deepagents/memory | Current docs page | Agent-scoped, user-scoped, org-scoped, read-only, and writable memory patterns |

## T075 Findings: Current Retrieval Options

### Vector RAG

Vector RAG indexes content chunks as embeddings, searches by semantic similarity, and uses the retrieved chunks as grounding context for model answers. OpenAI describes vector stores as containers for searchable files and exposes search results with file IDs, filenames, scores, attributes, and chunk content. Cloudflare Vectorize provides a Cloudflare-first vector database that can be queried from Workers after embeddings are generated through Workers AI.

Agentis fit:

- Good first-principles fit when Agentis wants to own ingestion, chunking policy, citation shape, tenant filters, source lifecycle, and model provider choice.
- Cloudflare compatibility is strong with Workers, Workers AI, Vectorize, R2, D1, and Durable Objects already in the project direction.
- Tenant and deployment isolation can be implemented with metadata filters or namespaces. Cloudflare Vectorize explicitly documents filtering by customer IDs, tenant, product category, and similar metadata, with namespace filtering applied before metadata filters.
- Implementation burden sits with Agentis: ingestion, chunking, embedding model choice, reindexing, deletion, audit trail, ranking, and answer citation formatting.

Risks for KM-01:

- Pure vector search can miss exact product codes, names, dates, or error strings that keyword search handles well.
- Retrieval quality depends on chunking, metadata quality, embedding model, and reranking.
- Citation provenance must point back to Agentis-owned source records, not only vector IDs.

### Document index and search

Document index/search systems combine text indexes, filters, ranking, and often vector fields. Azure AI Search documents hybrid search as one query that runs full-text and vector search in parallel, then merges results with Reciprocal Rank Fusion. Cloudflare AI Search exposes a managed search primitive for applications and agents with automated indexing, metadata filtering, hybrid search, MCP access, REST APIs, and Workers bindings.

Agentis fit:

- Strong fit for support and internal knowledge agents because answers often need exact product terms and semantic recall.
- A managed search primitive reduces the amount of retrieval infrastructure Agentis has to build during early hosted validation.
- Cloudflare AI Search aligns with the Cloudflare-first hosted path and supports per-tenant or per-agent file search according to its overview page.
- Namespace-scoped Cloudflare AI Search APIs can support deployment-scoped or tenant-scoped instances, while instance IDs can identify indexed knowledge sets.

Risks for KM-01:

- Managed search APIs shape the retrieval response and may limit low-level control versus custom Vectorize plus Agentis-owned ranking.
- Cloudflare AI Search is newer than established search platforms, so Agentis should validate response shape, citation metadata, namespace behavior, and lifecycle operations before relying on it.
- Cross-provider portability depends on whether Agentis abstracts search result records behind its own retrieval contract.

### Knowledge graph retrieval

Graph retrieval extracts entities, relationships, claims, and communities from a corpus, then retrieves by graph structure as well as text. Microsoft GraphRAG describes a structured, hierarchical RAG approach that extracts a knowledge graph, builds a community hierarchy, summarizes communities, and supports global, local, DRIFT, and basic search modes. Its docs call out baseline vector RAG weaknesses for connecting disparate information and holistic corpus understanding.

Agentis fit:

- Strong future fit for agents that reason across entities, policies, accounts, products, workflow state, or long-running customer history.
- Useful for multi-hop support questions such as policy interactions, dependency chains, organizational relationships, and historical incident patterns.
- Less suitable as the first support-agent retrieval path because indexing cost, graph extraction quality, prompt tuning, and update/delete workflows add operational complexity.

Risks for KM-01:

- Graph extraction can introduce model-generated entities or relationships that need provenance and correction workflows.
- Incremental updates, tenant isolation, deletion, and source citation paths need explicit design.
- GraphRAG should be treated as an advanced capability after a simpler cited retrieval path works.

### Provider-native file search and hosted retrieval

Provider-native retrieval tools let the model provider host files, vector stores, search execution, and often citation annotations. OpenAI File Search is a hosted Responses API tool that searches uploaded files through semantic and keyword search, returns a `file_search_call`, and includes file citations in assistant messages. The OpenAI Retrieval API exposes vector store search with file attributes, query rewriting, ranking options, hybrid search weights, expiration policies, chunking options, and file lifecycle operations.

Agentis fit:

- Fastest path to source-backed answers for one provider when Agentis can accept provider-managed storage and provider-shaped citations.
- Useful for early validation or customers who already want provider-hosted knowledge.
- Reduces ingestion and ranking implementation for the first prototype.

Risks for KM-01:

- Lock-in is high because source lifecycle, storage cost, deletion, retention, data residency, and citation shape depend on provider APIs.
- Tenant and deployment boundaries must map cleanly to provider vector stores, attributes, and credentials.
- Agentis still needs an Agentis-owned source registry and citation contract so the product can change providers without breaking UI or audit history.

### Hybrid and agentic retrieval

Hybrid retrieval combines keyword and semantic results, usually with reranking. Azure AI Search documents hybrid search as full-text plus vector queries merged by Reciprocal Rank Fusion, and explains that keyword search helps for exact terms while vector search helps for conceptual similarity. Azure agentic retrieval adds LLM query planning, parallel subqueries, semantic reranking, a unified response, query plan, and source documents for downstream agents.

Agentis fit:

- Strong target shape for production support agents because users ask both exact and conceptual questions.
- Good answer-provenance pattern: retrieve chunks and references first, then generate through an Agentis-owned answer step.
- Agentic retrieval patterns are relevant when questions span multiple docs, chat history, or implied context.

Risks for KM-01:

- LLM query planning adds latency and cost.
- More moving parts increase observability and debugging requirements.
- Agentis should start with a minimal hybrid retrieval contract, then add query planning once baseline retrieval has measurable gaps.

## T076 Agentis-Fit Retrieval Comparison

| Path | Reliability | Implementation effort | Source citation support | Deployment-scoped content | Cloudflare compatibility | Tenant boundary implications | Operational lifecycle | Cost / lock-in | Future production hardening | KM-01 trade-off |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cloudflare AI Search managed document index/search | Medium until live validation; official docs position it for documentation, knowledge base search, AI agent tool use, memory, and per-tenant or per-agent file search. | Low to medium. Agentis creates instances/namespaces, syncs sources, and calls REST or Workers bindings. | Medium. Search returns chunks, chat streaming emits a `chunks` event first, and namespace responses include `instance_id`; Agentis still needs a stable UI citation contract. | Strong. Instance IDs, namespace paths, and cross-instance search can map to deployments or tenants. | Strong. It is Cloudflare-native and aligns with Workers, R2, AI Gateway, and Workers AI. | Strong if Agentis uses namespace or instance isolation plus source registry checks before every query. | Managed indexing reduces ingestion work, but Agentis must validate source sync, deletion, status, audit, and export workflows. | Moderate Cloudflare lock-in; lower infrastructure cost than building all retrieval plumbing. | Need acceptance evidence for query quality, namespace isolation, lifecycle events, and citation metadata. | Strong first hosted candidate if live validation proves citations and lifecycle controls are sufficient. |
| Custom Cloudflare Vectorize RAG | Medium to high after Agentis builds tests around chunking, filters, reranking, and answer grounding. | Medium to high. Agentis owns ingestion, chunking, embeddings, filters, reranking, and answer synthesis. | High potential because Agentis owns source IDs, chunk IDs, excerpts, and answer formatting. | Strong. Vectorize namespaces and metadata filters can scope by tenant, deployment, source, version, or product area. | Strong. Runs inside Workers with Workers AI embeddings, Vectorize, R2, D1, and Durable Objects. | Strong when metadata indexes are created before ingestion and source registry checks gate every query. | Agentis owns all lifecycle operations: upload, reindex, stale content, deletion, retention, backfills, and observability. | Lower provider lock-in than model-provider file search, but higher build/ops cost. | Needs retrieval evals, relevance tuning, ingestion queues, background reindexing, deletion proofs, and cost monitoring. | Best control path for KM-01 when Agentis needs portable citations and strict lifecycle ownership. |
| Knowledge graph retrieval / GraphRAG | Medium for targeted multi-hop use cases; lower for first support-agent path because graph extraction quality and update semantics need validation. | High. Requires entity/relationship extraction, graph storage, community summaries, query modes, and correction workflows. | Medium to high if graph nodes retain source spans; weak if graph summaries lose source-level provenance. | Medium. Tenant/deployment graph partitioning and deletion must be designed explicitly. | Medium. Could run as Agentis-owned services on Cloudflare Containers or external infrastructure, but it is not the simplest Workers-native path. | Higher risk because graph edges can cross boundaries if ingestion or namespace rules fail. | Complex lifecycle: incremental updates, graph rebuilds, entity merges, stale summaries, deletion, and audit trails. | Higher compute and storage cost; lower provider lock-in if self-hosted; higher operational lock-in to graph pipeline choices. | Needs provenance-preserving graph schema, human correction path, privacy review, and multi-hop evals. | Defer for KM-01 baseline. Revisit for enterprise/internal agents that need entity reasoning across large corpora. |
| Provider-native file search / hosted retrieval | High for provider-supported file types and provider-managed retrieval; dependent on provider availability and API behavior. | Low for initial prototype. Agentis uploads files/vector stores and invokes hosted tools. | High inside provider responses when annotations include file citations; Agentis must map file IDs back to product sources. | Medium. Vector stores, attributes, and credentials can scope deployments, but boundaries live in provider resources. | Medium. Works from Cloudflare Workers via HTTPS, but storage/search execution is provider-hosted. | Requires strict per-tenant vector stores or attributes, source registry checks, credential boundaries, and deletion confirmation. | Provider handles indexing/search mechanics; Agentis still owns upload status, expiration, retention, deletion requests, and audit trail. | Highest model-provider lock-in; storage and tool costs depend on provider pricing and data policy. | Needs portability adapter, data residency review, deletion evidence, provider outage behavior, and citation contract tests. | Fast validation path, but not the best default if Agentis wants Cloudflare-first lifecycle control. |
| Hybrid Agentis-owned retrieval facade | High target reliability because Agentis can combine managed search, vector search, keyword search, reranking, and provider-native tools behind one contract. | Medium if started as an interface over one backend; high if multiple backends ship immediately. | High. The facade can require every result to carry source ID, source title, excerpt, byte/chunk location when available, and retrieval backend metadata. | Strong. The facade can enforce deployment, tenant, agent, source, and version filters before backend calls. | Strong if the first backend is Cloudflare AI Search or Vectorize; portable if backend adapters are explicit. | Strong because tenant checks live in Agentis before retrieval and answer generation. | Agentis owns source registry, lifecycle state, and audit trail while delegating backend-specific indexing and search. | Lower long-term lock-in; moderate up-front design cost. | Needs a narrow contract, conformance tests per backend, source deletion proofs, and retrieval/answer eval harnesses. | Best architectural shape. Start with one backend to avoid overbuilding, but keep UI and runtime coupled only to the facade. |

### T076 Comparison Notes

- The strongest Cloudflare-first paths are Cloudflare AI Search for managed speed and custom Vectorize RAG for control.
- The safest product boundary is an Agentis-owned retrieval facade that returns normalized source-backed chunks before answer generation.
- Provider-native file search is useful for quick validation and optional customer/provider-specific deployments, but Agentis should not expose provider file IDs directly as product citations.
- Graph retrieval should remain an advanced capability until baseline cited retrieval, lifecycle controls, and tenant isolation are proven.
- KM-01 should be validated with retrieval conformance tests: query returns only deployment-scoped chunks, each answer cites Agentis source IDs, deleted sources disappear from results, and empty retrieval produces a safe no-answer state.

## T077 Support-Agent Memory Scope

Memory sources reviewed for this section use a consistent taxonomy: Mem0 separates conversation, session, user, and organizational memory; Zep stores session chat history and builds a user-level knowledge graph; LangChain Deep Agents documents agent-scoped, user-scoped, and organization-scoped memory, including read-only shared memory for policies and security-sensitive content.

### Memory Boundary Matrix

| Memory category | First support-agent boundary | Scope key | Retention | Deletion | Tenant/deployment boundary | Write policy | KM-05 conclusion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Knowledge memory | Product docs, release notes, FAQs, policy files, and source metadata selected for a deployed support agent. This is retrieval content, not learned conversation memory. | `organizationId`, `deploymentId`, `agentId`, `knowledgeSourceId`, `sourceVersionId` | Retain while the deployment or source version is active. Keep disabled source records for audit until product policy says they can be purged. | Deleting a source must remove object storage content, search/vector index entries, provider-hosted files if used, and cached retrieval excerpts. | Hard boundary: a support-agent query can only retrieve sources assigned to that deployment and tenant. | Application writes only. The agent must not modify shared knowledge sources during chat. | In scope for the first knowledge path. This is the primary memory type needed for KM-01 and KM-05. |
| Conversation memory | Recent web chat or Slack thread turns used to answer the current support question and preserve short-term context. | `organizationId`, `deploymentId`, `conversationId`, optional Slack `teamId/channelId/threadTs` | Short retention by default for the first hosted path; exact duration remains a product decision. Summaries can be added later after consent and policy review. | User/admin deletion must remove stored messages and detach them from answer-generation context. | Conversation context cannot cross conversations unless an approved summary or explicit retrieval rule exists. | Runtime may append conversation turns; it must not promote facts into long-term memory automatically in Phase 1. | In scope as short-term context. Long-term conversation-derived memory remains future hardening. |
| Session / task memory | Temporary tool results, retrieval chunks, generated answer drafts, status codes, and execution metadata for one support-agent request or one active conversation session. | `requestId`, `conversationId`, `deploymentId` | Ephemeral; keep only logs/metadata required for debugging and audit under configured retention. | Clear on request completion except allowed observability records. | Must inherit the conversation and deployment boundary. | Runtime writes allowed for transient state only. | In scope as ephemeral runtime state, not user-facing durable memory. |
| User memory | User preferences, account details, prior issue facts, or personalized support context. | `organizationId`, `userId`, optional `deploymentId` | Out of scope for the first support-agent knowledge path until consent, admin policy, and deletion semantics are defined. | Must support user-level deletion and export before activation. | User memory must never leak across organizations and should be deployment-limited unless explicitly shared. | Disabled in Phase 1. Future writes require explicit product policy and user/admin controls. | Future hardening. Do not store personal long-term memory in S020 recommendations. |
| Organizational / agent memory | Shared tenant policies, support escalation rules, style guidance, and agent operating instructions. | `organizationId`, `agentId`, optional `policyVersionId` | Retain while configured by admins. Version changes should be auditable. | Admin deletion or version retirement should remove it from future prompts/retrieval. | Tenant-wide only inside one organization; never global across customers. | Read-only to the agent. Application/admin writes only. | Future product scope except for checked-in system instructions and selected knowledge sources. |
| Provider-hosted memory | Vector stores, files, search indexes, and annotations held by OpenAI or another provider-native retrieval service. | Provider resource IDs mapped to Agentis source, deployment, and tenant records | Mirror Agentis source retention. Provider expiration policies may reduce storage cost but cannot replace Agentis lifecycle state. | Agentis must call provider deletion APIs and record deletion evidence. | One tenant/deployment per provider resource set unless provider filters are proven by tests. | Application writes through controlled ingestion jobs only. | Allowed only behind an Agentis registry and deletion/audit contract. |

### Risks And Open Questions

- Retention duration is a product and compliance decision. Until that decision exists, keep long-term user memory disabled and keep conversation retention minimal.
- Conversation-derived memory can improve support quality, but it creates consent, correction, deletion, and prompt-injection risks.
- Shared organization memory should be read-only to agents because user-writeable shared memory can inject instructions into later conversations.
- Provider-hosted file/search memory needs deletion evidence and data residency review before production use.
- Retrieval caches and answer logs can become shadow memory. They need the same tenant, retention, and deletion policies as the source data they contain.
- If Slack is added, thread identity and user identity must map into Agentis-owned conversation records before any memory is persisted.

### T077 Decision Boundary

For the first support-agent knowledge path, Agentis should treat memory as:

1. Deployment-scoped knowledge memory from selected sources.
2. Short-term conversation memory for the current conversation or Slack thread.
3. Ephemeral request/session memory for retrieval and answer-generation internals.

User-level long-term memory, organization-wide learned memory, cross-conversation summaries, and graph-based customer history should stay out of the Phase 1 runtime until product policy, consent, deletion, and audit requirements are planned.

## T079 Horizontal Agent-Platform Implications

Agentis should model retrieval and memory as platform capabilities that each configured agent type can enable with explicit policies. The support-agent path should validate the narrowest useful version of those capabilities without hard-coding the product around support-only assumptions.

### Future Agent Use-Case Matrix

| Agent type | Retrieval needs | Memory needs | Reusable platform capabilities | Support-agent-specific assumptions to avoid baking in | Over-specialization risk | Decision criteria mapped to KM-01/KM-05 |
| --- | --- | --- | --- | --- | --- | --- |
| Onboarding agent | Product docs, setup guides, account-specific checklist templates, billing/plan docs, and contextual help articles. | Short-term onboarding session state, completed steps, user preferences, and optional account setup facts. | Source registry, deployment-scoped retrieval, cited answers, per-user progress memory, retention/deletion controls. | Assuming all sources are static docs or all conversations are one-off support questions. | A support-only schema may miss task progress, user-specific milestones, and resumable onboarding workflows. | KM-01 requires source citations for docs and templates. KM-05 requires explicit user/session memory consent and deletion. |
| Sales / support agent | Public docs, pricing/package rules, CRM excerpts, support macros, policy docs, and prior ticket summaries. | Conversation/thread memory, customer/account context, escalation notes, and CRM-linked facts. | Tenant-scoped retrieval, source ACL checks, citations, conversation summaries, integration source metadata, audit trail. | Assuming support knowledge is public or deployment-wide. | CRM and ticket data may need row-level permissions and stricter retention than product docs. | KM-01 requires permissioned source retrieval and citations. KM-05 requires account/customer memory boundaries and deletion/export policy. |
| Internal knowledge agent | Wikis, SOPs, engineering docs, decision records, incident notes, and policy docs. | User preferences, team context, recent projects, and organization-level read-only policies. | Hybrid retrieval, exact keyword matching, source freshness, org/team ACL filters, read-only org memory. | Assuming customer-facing answer style and citations are enough. | Internal agents often need freshness, team permissions, and exact incident or code names. | KM-01 requires source version/freshness metadata. KM-05 requires organization memory to be read-only unless admins approve writes. |
| Workflow agent | Process docs, runbooks, tool schemas, workflow state, forms, and task records. | Durable task/session state, approvals, tool outputs, and resumable checkpoints. | Retrieval facade, workflow state store, short-term session memory, audit logs, deletion rules for tool outputs. | Treating every memory as natural-language chat history. | Workflow state can be corrupted if stored only as conversational memory. | KM-01 requires cited procedural sources for generated steps. KM-05 requires durable state boundaries separate from chat memory. |
| Coding / sandbox agent | Repository files, docs, dependency docs, issues, logs, traces, and sandbox filesystem search. | Session checkpoints, task plans, tool outputs, branch/worktree state, and optional project memory. | Scoped file retrieval, sandbox artifact registry, source citation to files/lines, ephemeral task memory, retention of logs/artifacts. | Assuming all retrieval content is uploaded markdown. | Coding agents need filesystem and execution provenance, not only document chunks. | KM-01 requires file/line or artifact citations. KM-05 requires sandbox retention, cleanup, and secrets boundaries. |
| Multi-agent flow | Shared docs, role-specific context packs, handoff artifacts, and task outputs from other agents. | Per-agent scratch memory, shared read-only artifacts, supervisor decisions, and workflow-level state. | Artifact registry, role-scoped retrieval, shared memory permissions, provenance across agent handoffs, audit trail. | Assuming one agent, one conversation, and one knowledge source set. | Cross-agent memory can leak tenant data or unapproved instructions if not permissioned. | KM-01 requires provenance through handoffs. KM-05 requires read/write permissions for shared memory and supervisor-owned decisions. |

### Reusable Retrieval Capabilities

- Agentis source registry with tenant, deployment, agent, source, source-version, permission, freshness, and deletion state.
- Retrieval facade that returns normalized chunks with source ID, title, excerpt, location when available, backend metadata, retrieval score, and access policy evidence.
- Backend adapters for Cloudflare AI Search, custom Vectorize RAG, provider-native file search, and later graph retrieval.
- Hybrid keyword/vector support for exact product terms, error codes, policy names, and semantic questions.
- Citation contract that UI, Slack, API responses, and audit logs can all render without exposing provider-internal IDs.
- Retrieval conformance tests for tenant isolation, source deletion, empty/no-answer behavior, and citation completeness.

### Reusable Memory Capabilities

- Memory category model: knowledge, conversation, session/task, user, organization/agent, provider-hosted, and sandbox/artifact memory.
- Scope keys for organization, deployment, agent, conversation, user, source, request, and sandbox.
- Retention and deletion policy hooks before any memory category becomes durable.
- Read-only shared memory for organization policies and selected knowledge sources.
- Explicit write permissions for user memory, shared memory, and agent-learned memory.
- Audit events for memory reads, writes, promotions, deletions, and provider-hosted lifecycle actions.

### T079 Decision Criteria

- Prefer platform primitives that work for multiple agent types even when S020 validates them through the support-agent use case.
- Keep support-agent defaults narrow: deployment-scoped knowledge, current conversation context, and ephemeral request state.
- Do not encode support-specific assumptions in source IDs, memory tables, citations, retrieval backend contracts, or answer schemas.
- Treat long-term user memory, organization-learned memory, graph memory, and multi-agent shared memory as opt-in future capabilities with separate product controls.

## Open Questions For User Decision Review

1. Should Cloudflare AI Search be the first live retrieval backend to validate, with Vectorize RAG as the fallback if lifecycle or citation controls fall short?
2. What retention default should Agentis use for support-agent conversation memory before production privacy and compliance policy exists?
3. Should provider-native file search be offered as a customer-selectable backend later, or kept as an internal experiment path until Agentis proves Cloudflare-native retrieval?
4. What citation granularity is required for the first hosted support agent: source title only, source title plus excerpt, or file/chunk/line-level references when available?
5. Which memory categories require admin-visible audit events in the next implementation milestone?
6. Should future user memory be scoped by user, account/customer, deployment, or a combination?

## Requirement Traceability

| Requirement | Coverage |
| --- | --- |
| KM-01 | T075 source-backed findings identify viable retrieval paths. T076 compares those paths across reliability, implementation effort, source citation support, deployment scope, Cloudflare compatibility, tenant boundaries, lifecycle, cost/lock-in, and production hardening. T078 recommends an Agentis-owned retrieval facade with Cloudflare-first validation and backend decision criteria. T079 maps reusable retrieval capabilities across onboarding, sales/support, internal knowledge, workflow, coding/sandbox, and multi-agent flows. |
| KM-05 | T077 defines the first support-agent memory boundary across knowledge memory, conversation memory, session/task memory, user memory, organizational memory, provider-hosted memory, retention, deletion, tenant/deployment scope, and future hardening. T078 recommends Phase 1 memory categories and defers long-term user/shared memory. T079 maps reusable memory capabilities and future agent-type boundaries. |

## Execution Notes

- Recommendations are discussion-ready and do not lock the final architecture decision.
- Current comparison favors an Agentis-owned retrieval facade with a Cloudflare-first backend for validation.
- Current memory boundary keeps long-term personal and cross-user memory out of the first support-agent runtime.
- Horizontal platform criteria favor reusable retrieval and memory contracts over support-only schemas.
