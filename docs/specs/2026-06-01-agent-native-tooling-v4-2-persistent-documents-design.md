# Agent native tooling V4.2: persistent documents

## Status

Implemented.

## Goal

V4.2 establishes one durable Library primitive named Document. Documents are persistent markdown-backed Library items that agents can create, find, read, and update across eligible threads. The work also completes the domain rename so active product language, API names, shared schemas, backend services, runtime tools, UI copy, tests, and docs use document terminology consistently.

This is a Data-category V4 slice. It targets Hyperagent-style persistent documents: living markdown files that can be shared across threads, scoped by visibility, edited incrementally, versioned, and searched later.

## Source of truth

- Roadmap: `docs/specs/agent-native-tooling.md`, V4 Data category.
- Product reference: Hyperagent Documents described as persistent, section-based, versioned markdown files that can be thread, project, or global scoped.
- Existing Agentis Library and generated Library item implementation should be renamed and evolved into Documents rather than split into a second primitive.

## Non-negotiable domain decision

There is one primitive: Document.

V4.2 must not leave two concepts where one is product-facing and another is backend-facing. The final active codebase must use document naming throughout. The legacy document term must be removed from active source, tests, docs, schemas, routes, services, repositories, storage helpers, UI copy, fixtures, and runtime tool names.

Acceptance check after Build:

```bash
rg -i "<legacy document term>" apps packages docs
```

must return zero hits after replacing `<legacy document term>` with the current non-document term. Build may use that search during the migration, but the final committed active code/docs should not contain the legacy term.

## Current state

Agentis already has a Library surface and local file-backed durable content storage. The current implementation supports generated and uploaded durable items, provenance snapshots, project filtering, run timeline evidence, and Library download. V4.2 should preserve that functionality while renaming and extending it into the Document domain.

Relevant current areas to inspect during Build:

- Shared schemas for Library item types and DTOs.
- API routes serving Library list, upload, details, and download.
- Backend service, repository, local storage helper, and database table for durable Library content.
- Runtime tool that creates durable Library content.
- Library route, project document panels, agent knowledge surfaces, run timeline labels, fixtures, and tests.
- Database migrations and seed data.

## Product scope

### Included

- Complete domain rename to Document.
- Markdown as the canonical content format for agent-created persistent documents.
- Thread, project, and global visibility scopes.
- Version history for document content changes.
- Native runtime document tools.
- Section-aware markdown updates for targeted edits.
- Library UI copy and data loading updated to document language.
- Run timeline evidence for document tool calls.
- Preservation of existing durable Library rows through migration.

### Out of scope

- Collaborative real-time editing.
- Rich text editor authoring.
- Full document permissions beyond thread, project, and global visibility.
- Table-specific editing semantics.
- Media generation or media editing.
- Browser, slides, webpages, and other V4 categories.
- Per-agent-only document visibility. Agent association remains provenance and filtering metadata, not the first visibility boundary.

## Visibility scope model

Documents support the Hyperagent-style scope ladder:

- `thread`: visible only in the source thread.
- `project`: visible in every thread associated with the project.
- `global`: visible in every thread across the user's Agentis workspace, regardless of agent.

Agent id, agent name snapshot, run id, and thread id remain provenance. They can support filtering and audit, but they do not define access for V4.2.

Default scope rules:

- If a user explicitly asks for a global document, create global.
- If a thread is project-bound and the user asks for a shared project document, create project-scoped.
- If the user asks for notes or a document only for the current conversation, create thread-scoped.
- If scope is unclear, the agent should ask before creating a document whose visibility would be broader than the current thread.

## Data model

Rename the existing durable Library persistence model to Document.

Required document fields:

- `id`
- `title`
- `description`
- `documentType`
- `contentFormat`
- `mimeType`
- `sizeBytes`
- `storageKey`
- `previewText`
- `metadataJson`
- `visibilityScope`: `thread | project | global`
- `projectId`
- `projectNameSnapshot`
- `threadId`
- `threadTitleSnapshot`
- `runId`
- `agentId`
- `agentNameSnapshot`
- `currentVersionId`
- `createdAt`
- `updatedAt`

Recommended `documentType` values for V4.2:

- `markdown`
- `webpage`
- `image`
- `video`
- `table`
- `slides`
- `other`

V4.2 tools operate only on markdown documents. Other types can remain visible in Library after migration so current uploaded or generated content survives, but section edits should reject non-markdown documents with a clear error.

Add `document_versions`:

- `id`
- `documentId`
- `version`
- `contentHash`
- `contentStorageKey`
- `changeSummary`
- `createdByRunId`
- `createdByThreadId`
- `createdAt`

Versioning rules:

- Create version 1 when a markdown document is created.
- Create a new version for each content update.
- Keep the document row as the current summary and pointer to the latest version.
- Store every version content blob durably.
- Version creation and document row update must be atomic from the caller's perspective.

## Native document tools

V4.2 should expose document tools as Agentis-native tools.

### `createDocument`

Creates a persistent markdown document.

Inputs:

- `title`
- `content`
- `description?`
- `visibilityScope`
- `projectId?`
- `threadId?`
- `tags?`
- `changeSummary?`

Output:

- `documentId`
- `title`
- `visibilityScope`
- `currentVersion`
- `viewPath`
- `previewText`

Behavior:

- Validates markdown content is non-empty.
- Binds project/thread scope to the current run context unless a narrower valid explicit scope is supplied.
- Creates version 1.
- Emits run timeline evidence.

### `findDocuments`

Searches accessible documents.

Inputs:

- `query?`
- `visibilityScope?`
- `documentType?`
- `projectId?`
- `limit?`

Output:

- bounded result list with id, title, description, scope, project/thread provenance, updated time, preview, and current version.

Behavior:

- Applies visibility rules before search results are returned.
- Searches title, description, metadata, provenance snapshots, preview, and bounded content excerpts where practical.
- Returns enough metadata for the model to choose a document before reading full content.

### `readDocument`

Reads an accessible document.

Inputs:

- `documentId`
- `version?`

Output:

- metadata
- markdown content, bounded by configured max chars
- truncation metadata
- section outline
- current version

Behavior:

- Fails if the document is not accessible to the current run.
- Fails if the requested version is missing.
- Keeps large content bounded and reports truncation.

### `updateDocumentSection`

Updates one existing markdown section.

Inputs:

- `documentId`
- `sectionPath` or stable section identifier derived from the heading outline
- `content`
- `changeSummary?`

Output:

- `documentId`
- `previousVersion`
- `currentVersion`
- updated section metadata
- preview text

Behavior:

- Requires markdown document type.
- Parses the current markdown heading outline.
- Fails if the target section is missing.
- Fails if the section match is ambiguous.
- Creates a new version.
- Emits run timeline evidence.

### `appendDocumentSection`

Adds or appends markdown content.

Inputs:

- `documentId`
- `heading?`
- `parentSectionPath?`
- `content`
- `changeSummary?`

Output:

- `documentId`
- `previousVersion`
- `currentVersion`
- appended section metadata
- preview text

Behavior:

- Requires markdown document type.
- Adds a new section or appends to an existing section according to input.
- Creates a new version.
- Emits run timeline evidence.

## Runtime prompt guidance

The runtime should tell agents to use document tools when the user asks for persistent knowledge, evolving plans, playbooks, research notes, durable references, or reusable markdown files.

Guidance should include:

- Search accessible documents before recreating durable knowledge.
- Read a relevant document before updating it.
- Update existing documents when the user's intent is refinement or continuity.
- Create a new document only when no suitable accessible document exists or the user asks for a new one.
- Ask for scope when the requested visibility is unclear and broader than the current thread.
- Do not guess during section updates. If a section target is ambiguous, ask or return an error.

## UI requirements

### Library

- Rename active Library copy to documents.
- List documents with title, scope, source/provenance, type/format, and updated time.
- Search and filter documents.
- Show global, project, and thread scope clearly.
- Keep upload support if still needed, but upload copy should use document terminology.

### Document detail

Add a document detail view or route that shows:

- Markdown content.
- Title, description, scope, type, provenance, created time, updated time.
- Version history.
- Download/export action.
- Current version metadata.

### Project detail

- Project Documents tab shows project-scoped documents.
- Empty state and counts use document language.

### Thread timeline

Render bounded evidence for document tools:

- Created document.
- Searched documents.
- Read document.
- Updated section.
- Appended section.
- Version created.

Timeline payloads should include ids, title, scope, version numbers, action status, and bounded previews. They should not persist unbounded markdown content in timeline payloads.

## Error handling

- `document_not_accessible`: current run cannot access the requested document under scope rules.
- `document_not_found`: document id does not exist.
- `document_version_not_found`: requested version is missing.
- `document_blob_missing`: stored content is missing.
- `document_not_markdown`: section update requested for a non-markdown document.
- `document_section_not_found`: requested heading or section id does not exist.
- `document_section_ambiguous`: requested section matches multiple headings.
- `document_too_large`: create or update exceeds configured size caps.
- `document_storage_failed`: content could not be stored durably.

Failures should surface in run steps and API responses with clear messages. Storage and metadata writes should not silently diverge.

## Migration and rename strategy

Build should treat this as a deep atomic domain rename plus document capability extension.

Recommended order:

1. Add database migration that renames durable Library content tables and columns to document language, preserving existing rows.
2. Rename shared schemas, public DTOs, API clients, repository, service, storage helper, route files, and tests.
3. Rename runtime tool and run timeline payload labels to document language.
4. Add document version persistence.
5. Add scope filtering.
6. Add markdown section parser and section edit service.
7. Add native document tools.
8. Update Library, project, agent knowledge, timeline, fixtures, and E2E tests.
9. Run the legacy-term search and remove all remaining active hits.

The change set should stay atomic because mixed terminology would preserve the modeling problem V4.2 is meant to solve.

## Acceptance criteria

V4.2 is accepted when all of the following are true:

1. The active codebase has one durable Library primitive named Document.
   - Product copy, route names, API clients, shared schemas, backend services, repositories, storage helpers, runtime tools, fixtures, tests, and active docs use document terminology.
   - The final terminology search over active `apps`, `packages`, and `docs` paths returns zero hits for the previous primitive name.
2. Existing durable Library data survives the migration.
   - Existing rows are available as documents after migration.
   - Existing stored content remains downloadable or readable through document APIs.
   - Migration tests cover existing generated and uploaded content.
3. Agents can create markdown documents.
   - `createDocument` creates a document with title, markdown content, visibility scope, provenance, current version, preview text, and Library visibility.
   - Version 1 is created atomically with the document.
   - Document creation appears in the run timeline with bounded evidence.
4. Agents can find and read accessible documents.
   - `findDocuments` returns only documents accessible to the current run under thread, project, and global scope rules.
   - `readDocument` returns bounded markdown content, metadata, current version, and a section outline.
   - Oversized reads report truncation metadata.
5. Agents can update living markdown documents.
   - `updateDocumentSection` changes exactly one existing section and creates a new version.
   - `appendDocumentSection` appends or adds section content and creates a new version.
   - Missing, ambiguous, inaccessible, or non-markdown targets fail with explicit errors.
6. Scope behavior matches the agreed model.
   - Thread documents are visible only in their source thread.
   - Project documents are visible across threads in the same project.
   - Global documents are visible across agents and threads in the user's Agentis workspace.
   - Agent association is stored as provenance, not as an access boundary.
7. Library and project UI support documents.
   - Library lists documents with title, scope, source/provenance, type or format, and updated time.
   - Document detail shows markdown content, metadata, version history, and download/export.
   - Project Documents tab shows project-scoped documents and document-language empty states.
8. Run timeline evidence is useful and bounded.
   - Document search, read, create, section update, append, and version creation actions render with ids, title, scope, versions, status, and previews.
   - Timeline payloads do not store unbounded markdown content.
9. End-to-end behavior is demonstrated.
   - A user can create a global markdown document in one thread, start a different agent/thread, find and read the document, update a section, and see the updated version in Library.

## Verification

Required command checks:

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test:coverage
```

Required targeted tests:

- Repository migration preserves existing durable Library rows as documents.
- Document scope filtering returns only accessible documents.
- Document version creation works for create, update section, and append section.
- Section parser rejects missing or ambiguous section targets.
- Runtime tools validate inputs and emit bounded payloads.
- Library UI shows document language, scope, and updated time.
- Project Documents tab lists project-scoped documents.
- Run timeline renders document tool evidence.

Required E2E flow:

1. Create a global markdown document in one thread.
2. Start a different agent/thread.
3. Find and read the global document.
4. Update one section.
5. Confirm the Library shows the updated document and current version.

Final terminology check:

```bash
rg -i "<legacy document term>" apps packages docs
```

must return zero hits after replacing `<legacy document term>` with the current non-document term.

## Risks and mitigations

### Rename blast radius

Risk: the domain rename touches many files and may break API clients, tests, mocks, and route assumptions.

Mitigation: perform the rename in an atomic Build phase with broad test coverage and a final terminology search.

### Existing data preservation

Risk: existing Library rows or stored blobs may be lost during table and route rename.

Mitigation: add migration tests and preserve storage keys while renaming metadata tables and DTOs.

### Scope leakage

Risk: global, project, and thread filtering could expose documents too broadly.

Mitigation: centralize visibility checks in the document service and test each scope from matching and non-matching thread contexts.

### Section edit ambiguity

Risk: markdown documents often repeat headings.

Mitigation: return explicit ambiguity errors and expose section outlines through `readDocument` so the model can target a stable heading path.

### Timeline payload bloat

Risk: document content could be persisted in timeline evidence.

Mitigation: summarize document payloads and store full content only in document storage/version blobs.

## Build handoff

Approved scope:

- One primitive named Document.
- Complete active-code/docs rename to document terminology.
- Persistent markdown documents with thread, project, and global scope.
- Versioned create, read, find, update section, and append section tools.
- Library and timeline UI updates.
- Migration preserving existing durable Library content.

Non-goals:

- Per-agent-only scope.
- Rich text editor.
- Realtime collaboration.
- Media/table-specific authoring.
- Other V4 tools.

Required proof before completion:

- Full command checks pass.
- Targeted tests cover scope, versions, section parsing, runtime tools, UI evidence, and migration.
- E2E proves a global markdown document can be created, found in a different agent/thread, read, updated, and shown in Library.
- Final terminology search returns zero hits in active `apps`, `packages`, and `docs` paths.
