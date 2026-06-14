---
type: Spec
title: "Document workspace: rich view, edit, and actions surface"
description: Implemented
tags: []
timestamp: "2026-06-14T00:00:00Z"
---
# Document workspace: rich view, edit, and actions surface

## Status

Implemented

## Goal

Create a rich Document workspace for viewing, editing, versioning, and acting on persistent Documents. The workspace must be reachable from the Library, from the source/provenance thread, and from project context when a document is project-scoped or otherwise associated with that project.

This is a follow-on to V4.2 persistent documents. V4.2 established the durable `Document` primitive, versioned markdown storage, document tools, filters, detail preview, and downloads. This spec defines the first dedicated surface for working with those documents after creation.

## Source of truth

- Persistent document spec: `docs/specs/_done/2026-06-01-agent-native-tooling-v4-2-persistent-documents-design.md`
- Document primitive ADR: `docs/adrs/0003-persistent-documents-library-primitive.md`
- Current route: `apps/web/src/routes/library.tsx`
- Current project documents panel: `apps/web/src/components/projects/project-documents-panel.tsx`
- Current runtime evidence/timeline surface: `apps/web/src/components/thread/run-timeline.tsx`
- Current API route: `apps/api/src/routes/documents.ts`
- Current document domain service: `apps/api/src/documents/document-service.ts`

## Pre-build state

Implemented before this workspace slice:

- Library cards with search, Type, Source, and Scope filters.
- Document upload and download.
- Compact Library detail preview via `?documentId=...`.
- API detail endpoint with current text content and version summaries.
- Versioned markdown storage for agent-created and uploaded markdown documents.
- Runtime document tools that create, find, read, update sections, append sections, and return `viewPath`/`downloadPath`.
- Project Documents panels that list project-related documents and support download.
- Run timeline evidence for document tool calls.

Gaps:

- No dedicated route for opening a document as a first-class workspace.
- No rendered markdown preview versus raw markdown/code view toggle.
- No user-facing full-document markdown editor.
- No user-facing way to inspect prior version content.
- No consistent entry point from Library, provenance thread, and project context into a shared document surface.
- No rich action rail for Source, Scope, Version History, and Download.

## Product direction

Use a dedicated document workspace as the primary surface, with links from Library, threads, and projects.

Preferred route:

```text
/documents/:documentId
```

The route may render as a full page or as a full-screen overlay/modal when opened from another surface. The implementation should keep the URL stable so users can open the document in a new tab and share the route within the local workspace.

Recommended presentation:

- Main document canvas for Preview, Markdown/code, and Edit states.
- Right rail for actions and metadata.
- Header with document title, type, scope, source/provenance, current version, and updated time.
- Close/back behavior when launched from Library, thread, or project context.

The user-provided visual direction shows a full-screen overlay on top of the Library, with the document content centered and an action rail on the right. Treat that as directional guidance, not a pixel-locked mock.

## Scope

### Included

- Dedicated document workspace route.
- Entry points from:
  - Library card/detail preview.
  - Thread provenance/timeline surfaces when a document was created, read, or updated in that thread.
  - Project Documents/context surfaces when a document is project-scoped or has project provenance.
- Preview and Markdown/code views for markdown documents.
- Full-document markdown editor for markdown documents.
- Save action that creates a new document version.
- Version history list.
- Ability to view prior version content without changing the current version.
- Source and Scope display.
- Visibility scope management for valid thread, project, and global assignments.
- Download action from the workspace.
- Non-markdown read-only handling.

### Out of scope

- Collaborative editing.
- Rich text/WYSIWYG editing.
- Section-specific editing UI.
- Commenting, review, or approvals on documents.
- Publish/share to public URLs.
- Per-agent visibility. Agent association remains provenance and filtering metadata.
- Binary preview beyond basic metadata and download.

## Acceptance criteria

1. A user can open the same document workspace from Library, the provenance thread, and applicable project context.
2. The document workspace displays document title, type, source/provenance, scope, current version, updated time, and a download action.
3. Markdown documents support both rendered Preview and Markdown/code views.
4. A user can edit markdown content in a markdown editor and save it as a new version.
5. Saving an edit increments the document version, updates the preview/content shown in the workspace, and leaves prior versions available in version history.
6. Version history lists available versions and lets a user view prior version content without changing the current version.
7. Download works from the document workspace and returns the current document file.
8. Thread, project, and global scope are displayed clearly; source/provenance is displayed separately from scope.
9. Non-markdown or non-text documents show metadata, source/scope, version history when available, and download, with editing disabled and a clear read-only explanation.
10. A user can change a document between valid thread, project, and global scopes without duplicating the document.
11. Tests cover route loading, Library entry point, thread entry point, project entry point, markdown edit/save, prior version viewing, non-markdown read-only state, download link behavior, and scope changes.

## UX design

### Workspace shell

The document workspace should use the existing Agentis workbench style from `DESIGN.md`: restrained dark/light surfaces, IBM Plex Sans, functional blue only for active or selected states, and no decorative chrome.

Suggested layout:

```text
┌───────────────────────────────────────────────────────────────┬─────────────────────┐
│ Header: title, type, current version, updated time             │ Source & Scope       │
├───────────────────────────────────────────────────────────────┤ Actions             │
│ Tabs: Preview | Markdown                                      │ - Download           │
│                                                               │ - Open in new tab    │
│ Main document canvas                                          │ Version History     │
│ - Rendered markdown preview                                   │ - v3 current         │
│ - Raw markdown/code view                                      │ - v2                │
│ - Markdown editor when editing                                │ - v1                │
└───────────────────────────────────────────────────────────────┴─────────────────────┘
```

### Entry points

Library:

- Add `Open` or `View` action on each document card.
- Compact detail preview should link to `/documents/:documentId`.
- Keep existing Download action.

Thread provenance:

- Document-related run timeline entries should expose an `Open document` action when their payload includes a `documentId`.
- Do not parse generic timeline payloads ad hoc in the route. Add a typed document action projection for timeline entries and let the thread surface render that projection.
- Assistant-provided view links should use the new workspace route once the route exists.
- Existing download links should continue to use `/api/documents/:documentId/download`.

Project context:

- Project Documents panels should expose `Open document` next to Download.
- Project thread/context surfaces that summarize document counts should link to the relevant project Documents section or directly to the document when a single document is referenced.

### Preview and code views

Preview view:

- Render markdown content with existing UI typography and table support.
- Show a bounded empty state for empty markdown.
- If content is too large to load fully, show truncation state and disable editing unless the API can return full content safely.

Markdown/code view:

- Display raw markdown in a monospaced, copyable view.
- Preserve whitespace.
- Avoid executing HTML or script content embedded in markdown.

### Editing

First slice editing is raw markdown editing only.

- The edit action opens a markdown editor seeded with current version content.
- Save requires non-empty content and a change from the loaded content.
- Save sends a change summary. If the UI does not collect one, use a deterministic default such as `Updated in document workspace`.
- Successful save creates a new version and reloads current detail.
- Failed save leaves the editor content intact and shows the service error.

Conflict handling for first slice:

- Include the loaded version number in the save request.
- If the current version changed before save, reject with a conflict and ask the user to reload before saving.
- Do not silently overwrite a newer version.

### Version history

- Show version number, timestamp, and change summary.
- Mark the current version.
- Selecting a previous version changes the canvas into read-only historical viewing mode.
- Historical viewing mode clearly states that the user is viewing an older version.
- Editing starts from the current version only in the first slice.

### Source and Scope

Source/provenance display should include available values:

- User upload or agent generated.
- Agent name snapshot.
- Source thread title.
- Project name snapshot.
- Run id only if needed for troubleshooting or a developer detail section.

Scope display should include exactly one visibility scope:

- Global.
- Project.
- Thread.

Do not label an agent as a scope.

The implemented workspace also lets users change that visibility scope. Scope
changes must go through the document domain service so thread/project validity,
project snapshots, thread snapshots, and provenance separation stay consistent.
Changing scope does not create a document version because it changes access
metadata, not markdown content.

## API design

Keep the existing `/api/documents/:documentId/download` route for downloads.

Extend detail/read behavior so the workspace can fetch current and historical content:

```text
GET /api/documents/:documentId/detail?version=<number>
```

Response should include:

- `document`
- `content`
- `selectedVersion`
- `currentVersion`
- `versions`
- `truncated` when applicable

Add a workspace edit endpoint for full markdown replacement:

```text
PATCH /api/documents/:documentId/content
```

Request:

- `content`: full markdown content.
- `baseVersion`: version the user edited from.
- `changeSummary`: optional string.

Behavior:

- Only markdown documents can be edited.
- `baseVersion` must match the current version.
- Size limits must reuse existing document upload/update limits.
- Save creates a new version through the document domain service.
- The response returns updated document metadata and the new version number.

Recommended service addition:

- Add `updateDocumentContent` to `DocumentService` rather than implementing version writes directly in the route.
- Reuse existing storage, hash, preview, and `updateWithVersion` behavior.

Add a workspace visibility endpoint for scope management:

```text
PATCH /api/documents/:documentId/visibility
```

Request:

- `visibilityScope`: `thread`, `project`, or `global`.
- `projectId`: required when assigning project scope if the document/run context cannot infer a valid project.

Behavior:

- Scope changes are metadata updates, not document versions.
- The document domain service validates target thread/project assignment and preserves provenance snapshots separately from visibility scope.
- The response returns updated document metadata and the previous visibility scope.

## Frontend architecture

Suggested components:

- `apps/web/src/routes/document-workspace.tsx`
  - Route loader/state owner.
  - Reads `documentId` from route params.
  - Handles version selection, mode selection, edit state, save, and download.
- `apps/web/src/components/documents/document-workspace-shell.tsx`
  - Layout and high-level composition.
- `apps/web/src/components/documents/document-viewer.tsx`
  - Preview and markdown/code display.
- `apps/web/src/components/documents/document-editor.tsx`
  - Markdown edit form.
- `apps/web/src/components/documents/document-side-panel.tsx`
  - Source, Scope, actions, and version history.
- `apps/web/src/lib/api/projects-client.ts`
  - Shared API client functions for detail by version, content update, workspace URL, and download.

Route wiring:

- Add `/documents/:documentId` to `apps/web/src/router.tsx`.
- Update existing document links to use a shared `documentWorkspacePath(documentId)` helper.

## Architecture deepening candidates

These candidates came from the Documents architecture review and should guide the Build phase for issue #399. They are not separate prerequisites for opening the current V4.2 PR. Apply them where they reduce implementation spread while building the workspace.

Treat the first two candidates as part of the workspace build, not follow-up cleanup. The content/version module belongs in Phase 1 before route work grows around it. The navigation/action module should be implemented alongside entry points so Library, provenance thread, project context, runtime tool output, and workspace links share one path policy.

### 1. Deepen the Document content/version module

Files:

- `packages/shared/src/schemas.ts`
- `apps/api/src/routes/documents.ts`
- `apps/api/src/documents/document-service.ts`
- `apps/api/src/repositories/document-repository.ts`
- `apps/web/src/lib/api/projects-client.ts`

Problem: current detail behavior uses download behavior, decodes text in the route, reads versions directly from the repository, and does not yet expose selected-version or truncation data for the workspace.

Solution: put current detail, historical detail, current download, and full markdown replacement behind the Document domain module. Keep storage, truncation, selected version, current version, text/binary handling, and stale edit checks behind that seam. This is a Phase 1 requirement because the workspace route should consume the deepened Document module rather than assembling version and truncation rules itself.

Benefits:

- Locality: version and truncation rules live in one module.
- Leverage: Library, runtime, and workspace share content behavior.
- Tests: current, historical, and stale-edit paths can be verified through one interface.

Recommendation strength: Strong.

### 2. Deepen the Document navigation/action module

Files:

- `apps/api/src/documents/document-tool.ts`
- `apps/web/src/lib/api/projects-client.ts`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/components/projects/project-documents-panel.tsx`
- `apps/web/src/components/thread/run-timeline.tsx`

Problem: real `viewPath` and `downloadPath` knowledge spans runtime tool output, web download helpers, Library cards, project panels, and planned thread timeline links.

Solution: keep one Document path/action policy per environment so Library, project context, thread provenance, runtime tool outputs, and the workspace use the same open/download behavior. Connect this to the shared `documentWorkspacePath(documentId)` helper and keep `downloadPath` generation with the same policy.

Benefits:

- Locality: real paths change once.
- Leverage: Library, project context, thread provenance, and workspace share action behavior.
- Tests: path policy and open/download actions can be verified directly.

Recommendation strength: Strong.

### 3. Deepen the Document filter/query module

Files:

- `packages/shared/src/schemas.ts`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/lib/api/projects-client.ts`
- `apps/api/src/routes/documents.ts`
- `apps/api/src/repositories/document-repository.ts`

Problem: Source and Scope semantics sit across UI tokens, labels, query conversion, HTTP query parsing, and repository conditions.

Solution: centralize filter meaning from UI choice through route query through repository selection. Encode Source as provenance and visibility scope as thread/project/global while hiding UI token strings and persistence predicates from callers.

Benefits:

- Locality: Source/Scope invariants live once.
- Leverage: Library and future workspace discovery use one filter model.
- Tests: filter behavior can be verified without rendering the whole Library route.

Recommendation strength: Strong.

### 4. Split Document contracts and the Document web adapter out of broad modules

Files:

- `packages/shared/src/schemas.ts`
- `apps/web/src/lib/api/projects-client.ts`
- `apps/web/src/routes/library.tsx`
- `apps/web/src/components/projects/project-documents-panel.tsx`

Problem: Document contracts sit inside a broad shared schemas module, and Document transport currently lives behind a Project-named web client seam.

Solution: create Document-named modules for Document contracts and Document web transport while preserving existing exports as needed for compatibility.

Benefits:

- Locality: Document contracts and transport behavior sit together.
- Leverage: workspace route adds fewer imports and less route code.
- Tests: Document client and contract behavior get focused test seams.

Recommendation strength: Worth exploring.

## Testing and verification

Unit and component tests:

- Shared schemas for updated detail response and edit request/response.
- API route tests for:
  - detail current version.
  - detail prior version.
  - markdown edit success.
  - conflict on stale `baseVersion`.
  - non-markdown edit rejection.
  - download unchanged.
- Web route tests for:
  - rendering metadata and source/scope.
  - preview and markdown/code tabs.
  - edit/save flow.
  - version selection.
  - non-markdown read-only state.
  - Library, thread timeline, and project panel links.

Command-level verification:

```bash
pnpm --filter @workspace/shared test
pnpm --filter api test -- documents
pnpm --filter web test -- library document project-detail
pnpm typecheck
pnpm lint
pnpm build
```

Manual UAT:

1. Create a global markdown document from a thread.
2. Open it from the thread timeline or assistant view link.
3. Confirm Preview and Markdown views render the same content appropriately.
4. Edit markdown and save.
5. Confirm version increments.
6. Select the previous version and confirm it is read-only.
7. Open the same document from Library.
8. If project-associated, open it from the project Documents panel.
9. Download from the workspace and confirm the file contains current content.

## Implementation phases

Status: complete for the first document workspace slice.

### Phase 1: API and shared contracts

- Extend shared schemas for detail-by-version and edit request/response.
- Deepen the Document content/version module before adding workspace route callers.
- Add service method for full markdown content replacement with `baseVersion` conflict protection.
- Extend document detail route to accept `version`.
- Add content update route.
- Cover API and shared schemas with tests.

### Phase 2: Document workspace route

- Add `/documents/:documentId` route.
- Build workspace shell, viewer, side panel, and download action.
- Support current and historical version reads.
- Add preview and markdown/code tabs.
- Add non-markdown read-only state.

### Phase 3: Markdown editing

- Add markdown editor state and save flow.
- Enforce changed content and current-version editing.
- Handle stale version conflicts and service errors.
- Refresh detail after save.

### Phase 4: Entry points and scope management

- Link Library cards and detail preview to the workspace.
- Link project Documents panel entries to the workspace.
- Link document-related run timeline entries to the workspace when `documentId` exists through a typed document action projection.
- Update document tool `viewPath` to `/documents/:documentId` after the route ships.
- Preserve download paths through the shared Document path/action policy.
- Add workspace/API/tool support for changing visibility scope through the document service.

### Phase 5: Verification and UAT

- Run targeted tests and full typecheck/lint/build.
- Add or update E2E coverage if the route becomes part of M04/V4 acceptance.
- Capture manual UAT evidence for Library, thread, project, edit, version history, and download.

## Risks and mitigations

- Large markdown documents can create slow render/edit loops. Mitigate with existing max content limits, truncation metadata, and edit disabled for truncated content.
- Stale edits can overwrite newer agent updates. Mitigate with `baseVersion` conflict checks.
- Thread and project entry points can drift if each builds custom links. Mitigate with one shared path helper.
- Markdown rendering can introduce unsafe HTML. Mitigate by using a safe renderer configuration or plain text fallback until a renderer is verified.
- The current Library route is already doing list, filters, upload, detail, and download. Keep the new workspace components separate and reduce Library to browse/open responsibilities where possible.

## Build handoff

Build the dedicated document workspace as a follow-on to V4.2. The implemented scope covers raw markdown editing, version viewing, Source/Scope metadata, Download, visibility scope management, and entry points from Library, provenance thread, and project context. Do not add rich text editing, publishing, collaboration, commenting, review workflows, or per-agent visibility in this slice.

Use the architecture deepening candidates to keep the Build phase from spreading document content/version, navigation/action, and filter/query rules across Library, thread provenance, project context, and workspace callers. Acceptance is gated by the criteria above and the verification commands in this spec.

## Build completion report

- **Spec:** `docs/specs/_done/2026-06-01-document-workspace-design.md`
- **Base SHA:** `f29b47cfb5d6cb994ee5dbfd18b256794099e01e`
- **Implementation completion SHA:** `387195b6` before docs closeout
- **Tasks completed:** Phase 1–5 (API/contracts, workspace route, markdown editing, entry points, visibility scope management, verification)
- **Key files:** `document-service.ts`, `document-scope-policy.ts`, `documents.ts`, shared schemas, `document-workspace.tsx`, `components/documents/*`, `document-timeline.ts`, Library/project/timeline entry points, `document-tool.ts` view paths/scope tool
- **Tests run:** `@workspace/shared` (14), `api` documents (29), `web` library/document/project-detail/run-timeline/document-timeline (17) — all passed
- **Commands:** `pnpm typecheck`, `pnpm lint`, `pnpm build` — passed
- **Review:** Single-agent path (no subagent reviewers); TDD used for API and web tests
- **Deviations:** Canvas tabs use button toggles instead of base-ui `Tabs` for reliable tab switching in tests and UI; visibility scope management shipped in this branch and is now documented as in-scope implemented behavior
- **Follow-up:** Manual UAT per spec; optional E2E extension for `/documents/:documentId`