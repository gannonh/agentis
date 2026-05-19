# KM-04 acceptance: citation and provenance (local validation path)

Evidence date: 2026-05-19. Retrieval backend: **local validation adapter** (`local-demo`), not live Cloudflare AI Search.

## Automated checks

```bash
pnpm --filter web test -- \
  src/lib/support-agent/support-agent-provenance.test.tsx \
  src/lib/support-agent/provenance-browser-safety.test.ts \
  src/lib/support-agent/knowledge-conformance.test.ts \
  src/App.test.tsx
```

Expected:

- Grounded demo answers render `Sources cited` with citation ID, knowledge source, source version, chunk, location (when present), freshness, and excerpt.
- Responses with `sources: []` do not render an provenance section.
- Serialized failure and citation payloads exclude secrets, storage URIs, vector IDs, `contentText`, and stack traces.

## Human UAT (browser)

1. From repo root: `pnpm dev -- -- --host 127.0.0.1`
2. Open the printed Vite `Local:` URL.
3. Select **Product documentation sample**.
4. Ask: `How do I connect a knowledge source?`
5. Confirm assistant turn shows:
   - `Sources cited`
   - `Citation ID: citation_chunk_product_docs_setup` (or top-ranked chunk for the question)
   - `Knowledge source: knowledge_product_docs`
   - `Source version: ksrcv_product_docs_2026_05_19`
   - `Chunk: chunk_product_docs_setup`
   - Excerpt text from retrieved content
6. Select **Release notes sample**, ask `What changed?`, confirm provenance cites release-notes chunk IDs (not product-docs chunks).
7. Confirm failure states (optional, via tests) show user-safe copy only — no API keys or deployment secrets in the page.

## Audit reference

See [support-agent-citation-provenance-audit.md](research/support-agent-citation-provenance-audit.md) for field inventory and server-only boundaries.
