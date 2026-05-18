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

## Requirement Traceability

| Requirement | T075 coverage |
| --- | --- |
| KM-01 | Source-backed findings identify retrieval paths capable of deployment-scoped knowledge retrieval, citation/provenance, and Cloudflare-first hosted execution. |

## T075 Execution Notes

- Final architecture recommendation is intentionally deferred to later S020 tasks.
- The first concrete comparison should evaluate Cloudflare AI Search, custom Cloudflare Vectorize RAG, provider-native file search, graph retrieval, and a hybrid Agentis-owned retrieval facade.
