# Support-Agent Retrieval and Memory Research

## Scope

Milestone M005, slice S020. This artifact researches retrieval and memory choices for Agentis as a configurable agent platform, with the support agent as the lead validation case.

Requirements mapped here:

- KM-01: deployment-scoped knowledge retrieval with cited, source-backed answers.
- KM-05: memory boundaries across knowledge, conversation, user/session, retention, deletion, and tenant/deployment scope.

This document records recommendations for discussion. It does not lock the runtime architecture decision.

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

## Requirement Traceability

| Requirement | Coverage |
| --- | --- |
| KM-01 | T075 source-backed findings identify viable retrieval paths. T076 compares those paths across reliability, implementation effort, source citation support, deployment scope, Cloudflare compatibility, tenant boundaries, lifecycle, cost/lock-in, and production hardening. |

## Execution Notes

- Final architecture recommendation is intentionally deferred to T078.
- Current comparison favors an Agentis-owned retrieval facade with a Cloudflare-first backend for discussion.
