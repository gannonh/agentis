# Agent native tooling V4.x: HyperApp artifact runtime

## Status

Approved.

## Goal

Add the first Interactive-category V4 slice by making HyperApps a first-class Agentis-native artifact runtime. Agents should be able to create, edit, persist, and return interactive mini-apps that render inside Agentis with stable links, version history, bounded timeline evidence, and explicit native tool permission gating.

This spec targets the HyperApp artifact runtime primitive. Product-specific app templates, broad runtime tool access, maps, agent invocation from inside apps, webpages, slides, media generation, public sharing, and production sandbox hardening are deferred.

## Source of truth

- Roadmap: `docs/specs/agent-native-tooling.md`, V4 Interactive category.
- Domain language: `CONTEXT.md`.
- Native tool permission decision: `docs/adr/0002-version-native-tool-permissions-with-agent-configuration.md`.
- Persistent document/versioning precedent: `docs/adr/0003-persistent-documents-library-primitive.md`.
- Existing native runtime plumbing:
  - `apps/api/src/runtime/run-executor.ts`
  - `apps/api/src/native-tools/native-tool-capability-catalog.ts`
  - `apps/api/src/native-tools/native-tool-payload.ts`
  - `apps/api/src/repositories/run-step-repository.ts`
  - `apps/web/src/components/thread/run-timeline.tsx`
- Existing document storage and versioning precedent:
  - `apps/api/src/documents/document-service.ts`
  - `apps/api/src/documents/local-document-storage.ts`
  - `apps/api/src/repositories/document-repository.ts`
  - `apps/api/src/routes/documents.ts`
  - `packages/shared/src/document-schemas.ts`

## Current state

Agentis already supports the core runtime path needed for this slice:

- Native tools are constructed during `RunExecutor` execution and merged into the AI SDK `streamText` tool map.
- Tool calls and results are persisted as assistant message parts and run steps.
- Native run-step payloads are normalized for timeline rendering.
- Agent-scoped native tool permissions are versioned with agent configuration.
- Web search and documents already use the native capability catalog.
- Documents provide a useful precedent for durable records, version history, local storage, relative `viewPath` and `downloadPath` values, Library routes, and timeline evidence.

Agentis does not yet have an interactive app artifact model, embedded app renderer, HyperApp-specific persistence, or runtime bridge exposed to app code.

## Product scope

### Included

- A native tool permission id for HyperApps, likely `hyperApps`.
- Runtime tools for creating, editing, and finding HyperApps.
- API persistence for HyperApp identity, versions, provenance, current version, and app state metadata.
- Local storage for app code bundles when the bundle size makes filesystem storage more appropriate than SQLite fields.
- Thread timeline rendering for HyperApp tool calls and results.
- A stable app detail route, likely `/hyper-apps/:hyperAppId`.
- A constrained embedded runtime for rendering the current app version.
- A minimal injected `HyperApp` bridge for the first slice.
- Permission denial, provider/runtime unavailability, invalid bundle, and storage failure handling.
- Unit, API, web, and manual UAT coverage.

### Out of scope

- Static webpages and slides.
- Public sharing or anonymous access.
- Arbitrary network access from app code.
- Maps, agents, table APIs, browser automation, media generation, or deep native tool access from inside HyperApps.
- Product-specific wizard templates.
- Production sandbox hardening beyond the embedded runtime constraints required for this slice.
- Collaborative editing.
- Rich visual builder UI.

## Acceptance criteria

1. Agents can create a HyperApp through a native runtime tool that stores the app definition, initial version, provenance, and ownership metadata.
2. Agents can edit an existing HyperApp through a native runtime tool that creates a new version while preserving prior versions.
3. HyperApps render in the thread timeline as interactive cards with bounded metadata and a stable app/detail link.
4. HyperApp runtime access is gated by an agent-scoped native tool permission and fails visibly when unavailable.
5. HyperApps can persist user or runtime state through an approved Agentis-owned persistence boundary, either a dedicated app state store or a table-backed store if table infrastructure exists by Build time.
6. The first runtime API surface is minimal: relative Agentis API calls plus a small injected `HyperApp` bridge. Maps, agent invocation, broad table APIs, browser automation, and deep tool calls remain deferred.
7. Build includes API, shared schema, persistence, web rendering, and tests for create, edit, render, permission denial, invalid bundle rejection, and version history.
8. Verify can demonstrate a thread-created HyperApp, open its rendered card or detail route, edit it into a new version, and inspect previous version metadata.
9. Verify can demonstrate permission denial by running without the HyperApp native tool permission and observing a visible failure path rather than silent omission.
10. Out-of-scope capabilities are not implemented in this slice unless the user explicitly expands the approved spec.

## Architecture

HyperApps should be an Agentis-owned native artifact runtime with clear server, shared schema, and web boundaries.

```mermaid
flowchart TD
  AgentRun[Workspace-scoped run] --> Catalog[Native capability catalog]
  Catalog --> Tools[HyperApp runtime tools]
  Tools --> Service[HyperApp service]
  Service --> Repo[HyperApp repository]
  Service --> Storage[Local app bundle storage]
  Repo --> DB[(SQLite)]
  Storage --> Files[(AGENTIS_STORAGE_ROOT)]
  Tools --> Timeline[Run step payload]
  Timeline --> Card[Thread timeline HyperApp card]
  Card --> Detail[/hyper-apps/:hyperAppId]
  Detail --> Runtime[Embedded constrained runtime]
  Runtime --> Bridge[Injected HyperApp bridge]
  Bridge --> Api[Relative Agentis APIs]
```

Server responsibilities:

- Resolve whether the current agent configuration permits HyperApp tools.
- Build `createHyperApp`, `editHyperApp`, and `findHyperApps` only when permitted.
- Validate bundle shape and size before persistence.
- Persist app identity, versions, provenance, current version, and state metadata.
- Normalize tool outputs into bounded native timeline payloads.
- Serve detail and version API responses through relative routes.

Shared schema responsibilities:

- Define HyperApp records, public DTOs, version summaries, tool inputs, tool outputs, and timeline payloads.
- Export the native tool permission id from the shared native tool schema area.
- Keep the model-visible tool output stable and provider-independent.

Web responsibilities:

- Render HyperApp creation and edit results as thread timeline cards.
- Link cards to the stable detail route.
- Render the current app version in a constrained embedded runtime.
- Show version metadata and basic app provenance.
- Show actionable error states for unavailable runtime, permission denial, invalid bundle, and missing app.

## Runtime tools

### `createHyperApp`

Expected input shape:

```ts
type CreateHyperAppInput = {
  title: string
  description?: string
  bundle: HyperAppBundleInput
  initialState?: Record<string, unknown>
  stateSchema?: Record<string, unknown>
  visibilityScope?: "thread" | "project" | "global"
}
```

Expected output shape:

```ts
type CreateHyperAppOutput = {
  hyperAppId: string
  title: string
  version: number
  viewPath: string
  visibilityScope: "thread" | "project" | "global"
  summary: string
}
```

The model should use `createHyperApp` when the user asks for an interactive mini-app, form, wizard, calculator, tracker, or visual tool that should run inside Agentis.

### `editHyperApp`

Expected input shape:

```ts
type EditHyperAppInput = {
  hyperAppId: string
  bundle: HyperAppBundleInput
  changeSummary: string
}
```

Expected output shape:

```ts
type EditHyperAppOutput = {
  hyperAppId: string
  title: string
  version: number
  previousVersion: number
  viewPath: string
  summary: string
}
```

`editHyperApp` creates a new immutable version and updates the app's current version pointer. Prior versions remain available for metadata display and future rollback planning.

### `findHyperApps`

Expected input shape:

```ts
type FindHyperAppsInput = {
  query?: string
  visibilityScope?: "thread" | "project" | "global"
  limit?: number
}
```

Expected output shape:

```ts
type FindHyperAppsOutput = {
  items: Array<{
    hyperAppId: string
    title: string
    description?: string
    version: number
    viewPath: string
    updatedAt: string
  }>
  resultCount: number
  truncated: boolean
}
```

This tool supports follow-up edit requests and prevents agents from guessing app ids.

## Bundle model

A HyperApp bundle should use a constrained schema that is easy to validate and render:

```ts
type HyperAppBundleInput = {
  html: string
  css?: string
  js: string
}
```

Validation rules:

- `html` and `js` are required and bounded by configured byte limits.
- `css` is optional and bounded.
- Bundle code cannot include external script tags, external stylesheets, inline event handler attributes, iframe creation, or direct references to parent page globals.
- Bundle metadata records validation results and rejected reasons.
- Invalid bundles fail before persistence and produce a visible timeline error.

Build may refine this shape if an embedded runtime library requires a different internal representation. The public Agentis tool contract should stay compact.

## Data model

Add `hyper_apps`:

- `id`
- `title`
- `description`
- `visibilityScope`: `thread | project | global`
- `projectId`
- `projectNameSnapshot`
- `threadId`
- `threadTitleSnapshot`
- `runId`
- `agentId`
- `agentNameSnapshot`
- `currentVersionId`
- `stateStorageKey` or equivalent state reference
- `createdAt`
- `updatedAt`

Add `hyper_app_versions`:

- `id`
- `hyperAppId`
- `version`
- `bundleStorageKey` or bounded bundle columns
- `bundleHash`
- `changeSummary`
- `createdByRunId`
- `createdByThreadId`
- `createdAt`

State persistence:

- App state is separate from app versions.
- State updates do not create app code versions.
- State reads and writes flow through relative Agentis APIs or an injected bridge backed by API routes.
- If the tables primitive exists during Build, it can back app state. If not, use a dedicated HyperApp state store owned by the HyperApp service.

Visibility:

- Prefer `thread`, `project`, and `global` scope to match Document behavior when the same policy checks apply cleanly.
- If Build finds scope policy gaps, start with thread scope and explicitly defer broader sharing.
- Provenance remains separate from visibility.

## Runtime and safety

HyperApp code should render inside a constrained embedded runtime, such as an iframe with explicit `sandbox` attributes and a restrictive CSP. The Build phase must verify the selected embedding strategy in the codebase before implementation.

Required constraints:

- No ambient access to host page internals.
- No arbitrary external network access.
- No privileged browser APIs.
- No direct access to auth tokens or storage outside the approved bridge.
- No unbounded tool calls.
- No parent page mutation except through an approved message/bridge channel.
- Bounded app state payloads.
- Visible errors for failed bridge calls.

Runtime API:

- App code may use relative Agentis API endpoints exposed for HyperApp detail and state operations.
- App code may use a small injected `HyperApp` bridge for supported operations.
- The first bridge should be limited to lifecycle/state helpers needed to prove the runtime:
  - `HyperApp.state.get()`
  - `HyperApp.state.set(value)`
  - `HyperApp.runtime.info()`
- Maps, agents, table operations, browser control, and broad tool access are deferred.

## Error handling

The service and UI should fail loudly with specific codes:

- `hyper_app_permission_denied`
- `hyper_app_not_found`
- `hyper_app_invalid_bundle`
- `hyper_app_bundle_too_large`
- `hyper_app_storage_failed`
- `hyper_app_runtime_unavailable`
- `hyper_app_state_too_large`

Timeline rendering should show the attempted action, app title or id when safe, error code, and actionable copy. Full code bundles should not appear in timeline payloads.

## UI behavior

Thread timeline cards should show:

- App title.
- Action: created, edited, found, or failed.
- Current version.
- Visibility scope.
- Stable `viewPath` link.
- Change summary for edits.
- Error code and short remediation when failed.

The detail route should show:

- Current app title and description.
- Embedded app runtime.
- Version metadata list.
- Provenance summary.
- Runtime unavailable or invalid bundle state.

The first slice does not require a full visual editor. Agents create and edit apps through runtime tools.

## Implementation phases

### Phase 1: Schemas, permission, and persistence

Likely files:

- `packages/shared/src/native-tools.ts`
- `packages/shared/src/schemas.ts`
- New `packages/shared/src/hyper-app-schemas.ts`
- `apps/api/src/db/schema.ts`
- New `apps/api/src/repositories/hyper-app-repository.ts`
- New `apps/api/src/hyper-apps/hyper-app-service.ts`
- New `apps/api/src/hyper-apps/local-hyper-app-storage.ts`

Build tasks:

- Add shared HyperApp schemas and native permission id.
- Add database tables and repository methods for create, version append, lookup, list, and current version resolution.
- Add local bundle storage if code bundles exceed bounded SQLite suitability.
- Add service validation for bundle size, ownership, versioning, visibility, and state reference.

Acceptance tie-ins: 1, 2, 4, 5, 7.

### Phase 2: Runtime tools and timeline payloads

Likely files:

- `apps/api/src/native-tools/native-tool-capability-catalog.ts`
- New `apps/api/src/hyper-apps/hyper-app-tool.ts`
- `apps/api/src/native-tools/native-tool-payload.ts`
- `apps/api/src/runtime/run-executor.ts`
- `apps/web/src/components/thread/run-timeline.tsx`

Build tasks:

- Add `hyperApps` capability resolution and system prompt guidance.
- Build `createHyperApp`, `editHyperApp`, and `findHyperApps` tool set.
- Normalize HyperApp tool results and errors into bounded native payloads.
- Render timeline cards with stable relative links.

Acceptance tie-ins: 1, 2, 3, 4, 6, 7, 9.

### Phase 3: Routes, detail page, and runtime bridge

Likely files:

- New `apps/api/src/routes/hyper-apps.ts`
- API route registration file in `apps/api/src/`
- New `apps/web/src/routes/hyper-app-detail.tsx`
- Web router configuration.
- New web components under `apps/web/src/components/hyper-apps/`

Build tasks:

- Add public detail and version metadata API responses scoped by visibility policy.
- Add app state load/save endpoints or bridge-backed handlers.
- Add the detail route and embedded runtime renderer.
- Enforce CSP/sandbox constraints and bridge message validation.
- Add runtime unavailable and invalid bundle states.

Acceptance tie-ins: 3, 5, 6, 7, 8.

### Phase 4: Verification coverage and UAT fixture

Likely files:

- Repository and service tests beside implementation files.
- Route tests under `apps/api/src/routes/`.
- Web tests beside HyperApp route/components.
- E2E or manual UAT notes if Playwright coverage is too expensive for the first Build.

Build tasks:

- Add targeted unit tests.
- Add API route/tool tests.
- Add web rendering tests.
- Run quality commands and record any skipped checks with reasons.

Acceptance tie-ins: 7, 8, 9, 10.

## Testing and verification

Required automated checks:

- Shared schema tests for HyperApp DTOs, permission ids, tool input, and tool output.
- Repository tests for create, append version, preserve previous versions, list, and current version lookup.
- Service tests for validation, invalid bundle rejection, state bounds, visibility policy, and storage failure handling.
- Native capability catalog tests for permission-enabled and permission-denied behavior.
- Runtime tool tests for create, edit, find, and error payloads.
- Timeline/component tests for card rendering, links, version metadata, and failure states.
- Detail route tests for loading, embedded runtime unavailable state, version metadata, and state save/load if included.

Required commands:

```bash
pnpm typecheck
pnpm build
pnpm lint
```

Recommended targeted tests during Build:

```bash
pnpm --filter @workspace/api test -- hyper-app
pnpm --filter @workspace/web test -- hyper-app
```

Manual UAT:

1. Start the app with mock runtime enabled when live credentials are unavailable.
2. Create or seed an agent with the HyperApp native tool permission.
3. Ask the agent in a thread to create a small interactive HyperApp, such as a two-field calculator with saved state.
4. Confirm the run timeline shows a HyperApp card with a stable detail link.
5. Open `/hyper-apps/:hyperAppId` and confirm the app renders in the embedded runtime.
6. Save state through the app, reload, and confirm state persists if state persistence is included in the Build.
7. Ask the agent to edit the HyperApp.
8. Confirm the detail route shows the new current version and previous version metadata.
9. Run the same request with an agent lacking `hyperApps` permission and confirm the unavailable or denied path is visible.

## Risks and mitigations

- Embedded app security can become the largest risk. Mitigate by requiring iframe sandboxing, CSP, strict bridge message validation, and no arbitrary external network access in the first slice.
- Runtime API scope can expand quickly. Mitigate by limiting the first bridge to state and runtime metadata.
- Versioned app code and mutable app state can blur. Mitigate with separate version and state stores.
- Visibility policy may conflict with Document scope assumptions. Mitigate by reusing Document policy only if Build verifies it fits, otherwise ship thread scope first.
- Timeline payloads may accidentally persist large code bundles. Mitigate by normalizing bounded metadata only.

## Explicitly deferred work

- Static webpages and slides.
- Tables as a full V4 Data primitive unless needed as an already-available state backend.
- Maps and geo tools.
- Agent invocation from inside HyperApps.
- Browser automation from inside HyperApps.
- Public sharing.
- Visual app builder UI.
- Collaborative editing.
- Rollback to prior HyperApp versions.
- Marketplace or gallery surfaces.

## Build handoff

Approved direction: Core runtime first.

Build should implement the smallest end-to-end HyperApp artifact runtime that satisfies the acceptance criteria:

1. Add shared schemas and the `hyperApps` native permission id.
2. Add persistence for HyperApps, immutable versions, and separate state metadata.
3. Add API/service/repository/storage boundaries with validation and loud failures.
4. Add runtime tools for create, edit, and find.
5. Add bounded timeline rendering with stable links.
6. Add detail route rendering inside a constrained embedded runtime.
7. Add minimal bridge/state support only as needed for the first slice.
8. Add automated tests and run required quality commands.

Do not implement deferred Hyperagent parity capabilities during this Build unless the user explicitly changes the approved scope.
