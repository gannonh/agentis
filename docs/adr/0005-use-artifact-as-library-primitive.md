# ADR 0005: Use Artifact as the durable Library primitive

## Status

Accepted

## Context

ADR 0003 made Document the durable Library primitive while V4.2 focused on persistent markdown documents. That decision kept the first document slice simple, but it made future Library outputs such as webpages and slides appear as document types.

The intended product model is broader:

- The Library stores durable artifacts.
- A markdown Document is one artifact type.
- Webpages and slides are sibling artifact types.
- Future outputs such as HyperApps, tables, images, videos, and other generated assets can share Library management without becoming document types.

The shared management model remains correct: thread, project, and global visibility scopes; provenance; versioning; detail/preview/download; and Library filtering.

## Decision

Use **Artifact** as the durable Library primitive.

`Artifact.type` identifies the subtype. Initial and planned values include:

- `document`: markdown document.
- `webpage`: static webpage.
- `slides`: slide deck.
- `hyperapp`: interactive HyperApp, pending runtime implementation validation.
- `table`, `image`, `video`, `other`: future or existing generated/uploaded output categories.

Document-specific tools and UI remain, but they operate on artifacts with `type = "document"` and markdown content. Webpages and slides must be modeled as artifact sibling types, not document types.

Artifact owns shared Library concerns:

- visibility scope: `thread | project | global`
- provenance snapshots for agent, run, thread, and project
- version history
- storage references
- metadata
- Library list/filter/detail/download behavior

Subtype services own subtype-specific behavior:

- Document service: markdown reads, section updates, appends, and markdown workspace behavior.
- Static artifact service: webpage/slides generation, render modes, HTML validation, slide assets, and preview metadata.
- HyperApp service: interactive runtime bundle validation, app state references, bridge constraints, and embedded runtime rendering.

## Consequences

- ADR 0003 is superseded for the durable Library primitive decision.
- Existing markdown document behavior should be preserved as Artifact type `document`.
- Active schemas, services, routes, UI copy, fixtures, and specs should move toward Artifact terminology for Library-wide behavior.
- Compatibility document routes may remain for markdown document workflows and existing links.
- Library Type filters should treat document, webpage, slides, and future outputs as sibling artifact types.
- New V4 Interactive specs must depend on the Artifact refactor before implementation.
