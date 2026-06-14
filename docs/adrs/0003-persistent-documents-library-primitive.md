---
type: ADR
title: "ADR 0003: Use Document as the durable Library primitive"
description: "Superseded by [ADR 0005: Use Artifact as the durable Library primitive](0005-use-artifact-as-library-primitive.md)"
tags: []
timestamp: "2026-06-14T00:00:00Z"
---
# ADR 0003: Use Document as the durable Library primitive

## Status

Superseded by [ADR 0005: Use Artifact as the durable Library primitive](0005-use-artifact-as-library-primitive.md)

## Context

Agentis already had a Library surface for uploaded and generated durable content. V4.2 needed persistent markdown files that agents can create, search, read, update by section, version, and share across eligible threads. Keeping separate Library item and document concepts would split product language, API names, persistence, and runtime tools.

The scope model also needed a durable access boundary. Agent provenance is useful for filtering and audit, but an agent-only visibility scope would add a second access axis before project and thread behavior is mature.

## Decision

Use one durable Library primitive named Document.

Documents have `thread`, `project`, and `global` visibility scopes. Agent id, agent name, run id, thread id, and project snapshots are provenance metadata. They support filtering, display, and audit, but agent association is not a visibility scope.

Markdown documents are versioned. Agent runtime tools expose create, find, read, update-section, append-section, and visibility-update behavior. Library downloads use `/api/documents/:documentId/download`; Library detail uses `/api/documents/:documentId/detail`; the dedicated document workspace lives at `/documents/:documentId`.

Document visibility can change between `thread`, `project`, and `global` when the target assignment is valid. Scope transitions are handled by the document domain service so provenance snapshots remain separate from access scope and agents/users do not need to duplicate documents just to broaden or narrow access.

## Consequences

- Active product code, API routes, shared schemas, repositories, services, fixtures, tests, and docs use document terminology.
- Existing durable Library rows migrate into document rows and remain downloadable.
- The Library filters by Type, Source, and Scope. Source distinguishes user uploads from agent-generated documents and can filter by associated agent. Scope filters global, project, and thread visibility; thread selection appears only after choosing thread scope.
- The document workspace is the first-class surface for rendered preview, markdown/code view, full markdown replacement as a new version, version history, download, and scope management.
- Agents must use returned `viewPath` and `downloadPath` values rather than inventing hostnames or placeholder URLs. `viewPath` resolves to `/documents/:documentId`; download remains an API file response.
- A future agent-specific access model should use a new ADR because it would change the visibility contract.