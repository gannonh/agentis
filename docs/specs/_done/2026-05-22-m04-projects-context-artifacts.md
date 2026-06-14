---
type: Spec
title: M04 Projects, Context, and Artifacts Spec
description: Implemented
tags: []
timestamp: "2026-06-14T00:00:00Z"
---
# M04 Projects, Context, and Artifacts Spec
## Status
Implemented
## Goal
Make Agentis work durable by adding API-backed projects, injecting project context into runs, and collecting uploaded or generated artifacts in a searchable Library with local self-hosted storage.
## Background
M01 shipped the shell and fixture-backed screens. M02 added API-backed threads, SQLite persistence, run streaming, abort handling, and runtime health. M03 added Composio integrations, thread tool grants, and Composio tool execution logging.

The M04 roadmap goal is to group threads into projects, inject project goals and selected project memories into run context, and collect durable artifacts. The current repo already has:

- `threads.project_id` in `apps/api/src/db/schema.ts`, `ThreadRepository`, and shared thread DTOs.
  
- A fixture-backed `/projects/new` form in `apps/web/src/routes/project-create.tsx` with disabled persistence.
  
- A fixture-backed `/library` page in `apps/web/src/routes/library.tsx` with disabled search and download.
  
- Thread creation DTO support for optional `projectId`, but no API-backed project selector in the composer.
  
- No `projects`, `project_memories`, `artifacts`, or file storage tables or repositories.
  
- Runtime system context in `apps/api/src/runtime/run-executor.ts` that does not yet include project goals or memories.
  
## Requirements
- Users can create and edit projects with name, description, and goals.
  
- Users can archive projects. Archived projects remain available for artifact provenance and existing threads, but they are hidden from the default new-thread project selector.
  
- Users can add, edit, delete, and enable or disable project-scoped memories used for context assembly.
  
- The new-thread composer includes an API-backed project selector.
  
- Created threads persist their selected `projectId` and display project metadata on the thread page.
  
- Thread follow-ups keep the thread's project context unless the thread has no project.
  
- Runtime context assembly injects the selected project's goals and enabled project memories into model runs.
  
- The injected project context is visible from the thread page so users can see what context affected a run.
  
- Users can upload an artifact from the Library with title, type, optional project/thread association, and a local file.
  
- The runtime can register at least one generated durable artifact during a run and link it to the run, thread, project, and Library.
  
- Artifacts store preview metadata, including artifact type, MIME type, file size, title, description, and text preview when safe.
  
- Users can browse, search, filter, and download artifacts from the Library.
  
- Artifact provenance remains clear if a project is archived, including project and thread snapshots on artifact cards and detail responses.
  
- Local self-hosted deployments use a file storage abstraction rooted under configurable local storage.
  
- Tests can run without external object storage or live model output through deterministic local storage and mock runtime behavior.
  
## Non-goals
- Full M08 learning suggestion pipelines for memory extraction, review, or global and agent memory scopes.
  
- Agent-scoped libraries and agent-generated artifacts beyond nullable future-ready `agentId` fields.
  
- Shareable public artifact URLs, publishing, signed links, or object-storage providers.
  
- Rich binary previews for images, video, slides, or spreadsheets beyond metadata and download.
  
- Folder hierarchies, artifact versioning, or collaborative comments.
  
- Production multi-workspace auth or RBAC.
  
- Hard-deleting projects. M04 implements archive semantics to preserve thread and artifact provenance.
  
## Proposed approach
Recommended: API-backed vertical slice with local file storage and a runtime artifact tool.

- Why: This matches the current API-backed M02/M03 architecture, makes M04 demoable end to end, and keeps self-hosted storage simple for MVP development.
  
- Trade-offs: Preview support is intentionally basic, and object-storage adapters wait until self-host hardening.
  

Alternative: UI-first fixture replacement for projects and Library.

- Why it might fit: It would polish the visible M04 screens quickly.
  
- Trade-offs: It would not satisfy durable artifact creation, download, or project context injection acceptance criteria.
  

Alternative: Storage-first artifact subsystem before project UX.

- Why it might fit: It could harden binary storage boundaries early.
  
- Trade-offs: It delays the user-visible project workflow and creates storage work before the MVP has enough artifact types to justify it.
  

M04 should use the recommended approach.
## User experience / workflow
### Project creation and editing
1. User opens `/projects/new`.
  
2. User enters project name, optional description, and goals.
  
3. User submits the form.
  
4. The web app calls `POST /api/projects`.
  
5. The app redirects to `/threads/new?projectId=<id>` and shows the selected project in the composer.
  
6. User can open `/projects/:projectId` to edit name, description, goals, project memories, or archive the project.
  
7. Archived projects show an archived badge and cannot be selected for new threads by default.
  
### Starting a project thread
1. User opens `/threads/new`.
  
2. The composer loads active projects from `GET /api/projects`.
  
3. User selects a project or leaves the thread unscoped.
  
4. User submits a prompt.
  
5. The web app sends `projectId` in `POST /api/threads`.
  
6. Thread detail shows the selected project, goals summary, and enabled memories included in context.
  
### Project context in a run
1. Runtime loads the thread.
  
2. Runtime calls a context assembly service for the thread's `projectId`.
  
3. The service returns project goals and enabled project memories.
  
4. Runtime appends a bounded project context block to the model system prompt.
  
5. Runtime logs a `reasoning` run step titled `Project context loaded` with safe metadata: project id, project name, goal count or character count, and memory count.
  
6. The thread page exposes the same context summary near the transcript or run timeline.
  
### Artifact upload
1. User opens `/library`.
  
2. User clicks Upload artifact.
  
3. User chooses a file, title, type, and optional project/thread association.
  
4. The web app posts `multipart/form-data` to `POST /api/artifacts`.
  
5. The API stores the file through the local storage adapter and persists artifact metadata.
  
6. The Library updates with a card showing type, title, provenance, preview metadata, and a Download action.
  
### Generated artifact registration
1. User asks the agent to create a document, brief, or report in a project thread.
  
2. Runtime exposes a local `createArtifact` tool with title, type, description, filename, content, and optional preview text.
  
3. The model calls the tool, or mock runtime uses deterministic behavior when the prompt asks for an artifact.
  
4. The API writes the artifact body to local storage and creates an artifact row linked to the current run and thread.
  
5. The assistant response links to the artifact and the run timeline logs an artifact step.
  
6. The artifact appears in `/library` and can be searched and downloaded.
  
### Library browsing and download
1. User opens `/library`.
  
2. The page loads artifacts from `GET /api/artifacts`.
  
3. User searches by title, description, project name, thread title, or artifact type.
  
4. User filters by type and project.
  
5. User clicks Download on an artifact card.
  
6. Browser downloads from `GET /api/artifacts/:artifactId/download`.
  
## Technical design
### Shared schemas
Extend `packages/shared/src/schemas.ts` with:

- `projectStatusSchema`: `active`, `archived`.
  
- `projectSchema`: `id`, `name`, `description`, `goals`, `status`, `archivedAt`, `createdAt`, `updatedAt`.
  
- `projectMemorySchema`: `id`, `projectId`, `content`, `enabled`, `createdAt`, `updatedAt`.
  
- `projectContextSummarySchema`: `project`, `goals`, `memories`, and context metadata suitable for thread detail display.
  
- Project request and response DTOs for list, create, update, archive, and memory mutations.
  
- `artifactTypeSchema`: `document`, `webpage`, `image`, `video`, `table`, `slides`, `other`.
  
- `artifactSchema`: id, title, description, type, MIME type, size, storage key, preview text, metadata, project/thread/run/agent ids, provenance snapshots, created and updated timestamps.
  
- Artifact list, upload, generated registration, detail, and download metadata DTOs.
  
- Extend `threadDetailSchema` with optional `projectContext`.
  

Keep all web and API responses parsed through shared schemas.
### API persistence
Add Drizzle tables under `apps/api/src/db/schema.ts`:

```text
projects
- id text primary key
- name text not null
- description text nullable
- goals text nullable
- status text not null -- active | archived
- archived_at text nullable
- created_at text not null
- updated_at text not null

project_memories
- id text primary key
- project_id text not null references projects(id)
- content text not null
- enabled integer not null
- created_at text not null
- updated_at text not null

artifacts
- id text primary key
- title text not null
- description text nullable
- type text not null
- mime_type text not null
- size_bytes integer not null
- storage_key text not null
- preview_text text nullable
- metadata_json text nullable
- project_id text nullable references projects(id)
- project_name_snapshot text nullable
- thread_id text nullable references threads(id)
- thread_title_snapshot text nullable
- run_id text nullable references runs(id)
- agent_id text nullable
- agent_name_snapshot text nullable
- created_at text not null
- updated_at text not null
```

Add indexes on:

- `projects.status`, `projects.updated_at`
  
- `project_memories.project_id`
  
- `artifacts.type`, `artifacts.project_id`, `artifacts.thread_id`, `artifacts.run_id`, `artifacts.created_at`
  

Keep `threads.project_id` nullable. Repository and route validation should reject new threads for missing or archived projects. Existing threads tied to an archived project remain valid.
### Repositories and services
Add repositories under `apps/api/src/repositories/`:

- `project-repository.ts`: create, get, list active/all, update, archive.
  
- `project-memory-repository.ts`: list by project, create, update, delete, toggle enabled.
  
- `artifact-repository.ts`: create uploaded/generated artifact records, get, list with search/filter, and update metadata.
  

Add services under `apps/api/src/projects/` and `apps/api/src/artifacts/`:

- `project-context-service.ts`: validates project selection and assembles bounded context for a thread.
  
- `local-artifact-storage.ts`: writes, reads, and deletes files by storage key under `AGENTIS_STORAGE_ROOT`.
  
- `artifact-service.ts`: validates upload and generated artifact inputs, captures provenance snapshots, writes storage, persists metadata, and returns DTOs.
  
- `artifact-tool.ts`: exposes the runtime `createArtifact` AI SDK tool for generated text artifacts.
  
### Configuration
Add API config values:

- `AGENTIS_STORAGE_ROOT`: defaults to `./data/storage`.
  
- `AGENTIS_ARTIFACT_MAX_UPLOAD_BYTES`: defaults to `10485760` bytes, or 10 MiB.
  
- `AGENTIS_ARTIFACT_PREVIEW_MAX_CHARS`: defaults to 2,000 characters.
  

Add these to `.env.example` with server-only notes.
### API routes
Add `apps/api/src/routes/projects.ts`:

- `GET /api/projects?includeArchived=false`
  
- `POST /api/projects`
  
- `GET /api/projects/:projectId`
  
- `PATCH /api/projects/:projectId`
  
- `POST /api/projects/:projectId/archive`
  
- `GET /api/projects/:projectId/memories`
  
- `POST /api/projects/:projectId/memories`
  
- `PATCH /api/projects/:projectId/memories/:memoryId`
  
- `DELETE /api/projects/:projectId/memories/:memoryId`
  

Add `apps/api/src/routes/artifacts.ts`:

- `GET /api/artifacts?query=&type=&projectId=&threadId=`
  
- `POST /api/artifacts` for multipart upload
  
- `GET /api/artifacts/:artifactId`
  
- `GET /api/artifacts/:artifactId/download`
  

Update `apps/api/src/app.ts` to mount project and artifact routes. CORS must allow methods used by these routes, including `PATCH` and `DELETE` if browser routes call them.
### Runtime integration
Update `apps/api/src/runtime/run-executor.ts`:

- Load project context after loading the thread and before building model messages.
  
- Build the system prompt from a small helper that includes base instructions plus project goals and enabled memories.
  
- Include the `createArtifact` runtime tool in the local tool registry.
  
- Ensure generated artifacts are linked to `runId`, `threadId`, and `thread.projectId`.
  
- Persist an artifact-related run step when the tool creates an artifact.
  
- In mock runtime mode, create a deterministic text artifact when the latest prompt includes `artifact`, `brief`, `document`, or `report`; keep existing mock responses for unrelated prompts.
  

Do not inject archived project context into new threads because archived projects cannot be selected. Existing archived-project threads should continue to receive a context block with an archived marker so follow-ups remain understandable.
### Frontend
Update `apps/web`:

- Add project API client methods in `apps/web/src/lib/api/client.ts` or a split `projects-client.ts` if the client grows.
  
- Add artifact API client methods, including multipart upload and download URL helpers.
  
- Replace `/projects/new` local state-only submit with API-backed create.
  
- Add `/projects/:projectId` route for edit, memories, and archive.
  
- Add a project selector to `ThreadComposer` and pass `projectId` into `createThread`.
  
- Show selected project metadata and context summary in `ThreadDetailPage`.
  
- Replace fixture-backed `/library` with API-backed list, search, filters, upload dialog, artifact cards, provenance, empty states, loading/error states, and enabled Download actions.
  
- Update MSW handlers if route tests need non-thread API mocks.
  
- Preserve existing shell styling and use shared shadcn/ui primitives from `packages/ui`.
  
### Data and API changes
- Add shared DTOs for projects, project memories, project context summaries, and artifacts.
  
- Add project and artifact migrations under `apps/api/drizzle/`.
  
- Add local storage root configuration and ensure the API creates the storage directory at startup or first write.
  
- Add project validation to `POST /api/threads` so missing or archived `projectId` returns a typed 400 error.
  
- Extend `GET /api/threads/:id` response with `projectContext` for UI display.
  
- Add artifact download responses with safe `Content-Type`, `Content-Length`, and `Content-Disposition` headers.
  
## Error handling and edge cases
- Missing project on thread creation: reject with `project_not_found` and do not create the thread.
  
- Archived project on new thread creation: reject with `project_archived` and tell the user to select an active project.
  
- Project archived after thread creation: existing thread follow-ups still run with archived project context and visible archived status.
  
- Empty project goals and no enabled memories: omit the project context block and show `No project context enabled` in the thread context summary.
  
- Very large goals or memories: context service truncates each section to configured limits and logs truncation in the context summary.
  
- Artifact upload exceeds max size: reject with `artifact_too_large`; do not persist partial metadata.
  
- Unsupported or missing file type: store as `application/octet-stream` and require an explicit artifact type.
  
- Storage write fails: return `artifact_storage_failed`; do not create the artifact row.
  
- Artifact row exists but file is missing: Library shows a download error state and the API returns 404 with `artifact_blob_missing`.
  
- Artifact linked to archived project: keep the artifact visible and show archived project provenance.
  
- Project archive request with existing artifacts: archive succeeds; artifacts retain `projectId` and project snapshot fields.
  
- Search with no results: show a clear empty state with reset filters action.
  
- Generated artifact tool called with unsafe filename: ignore path components and generate a safe storage key server-side.
  
## Test strategy
### Shared package tests
- Project, project memory, context summary, artifact, and API DTO schemas parse valid payloads and reject invalid statuses or artifact types.
  
- Thread detail schema accepts optional `projectContext`.
  
### API repository and route tests
- Project repository creates, updates, lists active projects, and archives projects.
  
- Project memory repository toggles enabled memories and returns only project-owned memories.
  
- Thread creation accepts active project ids and rejects missing or archived projects.
  
- Thread detail includes project context for project-scoped threads.
  
- Context service includes goals and enabled memories, excludes disabled memories, and records truncation metadata.
  
- Artifact service writes uploaded content to local storage, persists metadata, and captures project/thread snapshots.
  
- Artifact list supports query, type, project, and thread filters.
  
- Artifact download streams the stored file with safe headers.
  
- Generated artifact registration links artifact to run, thread, and project.
  
- Storage failure does not leave orphan artifact rows.
  
### Runtime tests
- Runs in a project include project goals and enabled memories in the system prompt passed to the model.
  
- Runtime creates a deterministic generated artifact in mock mode when prompted for a document-like artifact.
  
- Runtime logs an artifact run step with safe metadata.
  
- Runs without a project preserve existing behavior.
  
- Archived project follow-ups include archived context metadata and do not fail solely because the project is archived.
  
### Web tests
- Project create submits to the API, redirects with selected project, and surfaces API errors.
  
- Project edit updates name, description, goals, and memories.
  
- Project archive hides the project from the default new-thread selector.
  
- New-thread composer lists active projects and sends selected `projectId`.
  
- Thread detail shows project metadata and context summary.
  
- Library loads API artifacts, searches, filters by type/project, uploads a file, and enables download.
  
- Library shows empty, loading, error, and missing-file states.
  
### E2E tests
- User creates a project, starts a thread inside it, prompts for a report artifact in mock runtime, sees project context on the thread, sees the generated artifact in Library, downloads it, reloads, and sees the artifact persist.
  
- User archives a project and confirms it no longer appears in the new-thread selector while existing artifacts still show project provenance.
  
### Verification commands
```bash
pnpm --filter @workspace/shared test
pnpm --filter api test
pnpm --filter web test
pnpm typecheck
pnpm build
pnpm lint
pnpm test:coverage
pnpm test:e2e
```
## Implementation plan
### Phase 1: Shared contracts and persistence
- [ ] 
  
  Extend `packages/shared/src/schemas.ts` with project, project memory, project context, artifact, and API DTO schemas.
  
- [ ] 
  
  Add `projects`, `project_memories`, and `artifacts` tables to `apps/api/src/db/schema.ts`.
  
- [ ] 
  
  Generate Drizzle migrations under `apps/api/drizzle/`.
  
- [ ] 
  
  Add mappers for project, project memory, and artifact rows in `apps/api/src/lib/mappers.ts`.
  
- [ ] 
  
  Add project, project memory, and artifact repositories with tests.
  
- [ ] 
  
  Add storage root and artifact size/preview config parsing in `apps/api/src/config.ts`.
  
- [ ] 
  
  Verification: `pnpm --filter @workspace/shared test && pnpm --filter api test`.
  
### Phase 2: Project APIs and context assembly
- [ ] 
  
  Add project routes for list, create, get, update, archive, and memory CRUD.
  
- [ ] 
  
  Add project context service that assembles bounded goals and enabled memories for a thread.
  
- [ ] 
  
  Validate `projectId` in `POST /api/threads` and reject missing or archived projects.
  
- [ ] 
  
  Extend `GET /api/threads/:id` to include `projectContext`.
  
- [ ] 
  
  Add API route tests for project flows, thread project validation, and context summaries.
  
- [ ] 
  
  Verification: `pnpm --filter api test && pnpm --filter api typecheck`.
  
### Phase 3: Project frontend flow
- [ ] 
  
  Add project client methods and hooks in `apps/web/src/lib/api/`.
  
- [ ] 
  
  Replace `/projects/new` form submission with API-backed create and redirect to `/threads/new?projectId=<id>`.
  
- [ ] 
  
  Add `/projects/:projectId` edit route for project fields, memories, and archive.
  
- [ ] 
  
  Add project selector to the new-thread composer and send selected `projectId` to `createThread`.
  
- [ ] 
  
  Show thread project metadata and context summary on `ThreadDetailPage`.
  
- [ ] 
  
  Add or update web tests for project create, edit, selector, and thread metadata.
  
- [ ] 
  
  Verification: `pnpm --filter web test -- project new-thread thread && pnpm --filter web typecheck`.
  
### Phase 4: Artifact storage and APIs
- [ ] 
  
  Add local artifact storage adapter rooted at `AGENTIS_STORAGE_ROOT`.
  
- [ ] 
  
  Add artifact service for upload, generated registration, provenance snapshots, preview text, and downloads.
  
- [ ] 
  
  Add artifact routes for list, upload, detail, and download.
  
- [ ] 
  
  Add tests for successful uploads, filtering, downloads, storage failures, missing blobs, and archived project provenance.
  
- [ ] 
  
  Verification: `pnpm --filter api test && pnpm --filter api typecheck`.
  
### Phase 5: Runtime-generated artifacts
- [ ] 
  
  Add a local `createArtifact` AI SDK tool wired to artifact service.
  
- [ ] 
  
  Include `createArtifact` in the runtime tool registry and link outputs to current run/thread/project.
  
- [ ] 
  
  Log artifact creation as a run step and include a user-visible artifact link or title in the assistant response.
  
- [ ] 
  
  Add deterministic mock runtime artifact creation for document-like prompts.
  
- [ ] 
  
  Add runtime tests for context injection and generated artifact persistence.
  
- [ ] 
  
  Verification: `pnpm --filter api test -- run-executor && pnpm --filter api typecheck`.
  
### Phase 6: Library frontend
- [ ] 
  
  Replace fixture-backed Library data with API-backed artifact listing.
  
- [ ] 
  
  Add search, type filter, project filter, upload dialog, provenance labels, preview metadata, and download action.
  
- [ ] 
  
  Add Library loading, empty, error, no-results, and missing-file states.
  
- [ ] 
  
  Add web tests for list, filter, upload, and download states.
  
- [ ] 
  
  Verification: `pnpm --filter web test -- library && pnpm --filter web typecheck`.
  
### Phase 7: End-to-end acceptance and docs touchpoints
- [ ] 
  
  Add Playwright coverage for create project → create project thread → generated artifact → Library download → reload persistence.
  
- [ ] 
  
  Add Playwright coverage for project archive preserving artifact provenance.
  
- [ ] 
  
  Update `.env.example` with storage config.
  
- [ ] 
  
  Update README or relevant docs only for new setup commands or storage env values.
  
- [ ] 
  
  Run full verification commands.
  
- [ ] 
  
  Commit the implementation with a conventional commit after the coherent change set.
  
## Acceptance criteria
- [ ] 
  
  User can create a project and start a thread inside it.
  
- [ ] 
  
  User can edit project details and manage enabled project memories.
  
- [ ] 
  
  Project goals and enabled memories are included in run context and visible from the thread page.
  
- [ ] 
  
  A run can create at least one durable artifact linked to the run, thread, project, and Library.
  
- [ ] 
  
  User can upload an artifact to the Library.
  
- [ ] 
  
  User can browse, search, filter, and download artifacts from the Library.
  
- [ ] 
  
  Archiving a project hides it from new-thread selection while preserving artifact ownership and provenance.
  
- [ ] 
  
  Thread, project, artifact, and storage state survive app restart.
  
- [ ] 
  
  Lint, typecheck, unit tests, coverage, build, and e2e verification pass.
  
## Build handoff
- Spec path: `docs/specs/_done/2026-05-22-m04-projects-context-artifacts.md`
  
- Approved scope: API-backed projects, project memories, project context injection, local artifact storage, uploaded/generated artifacts, Library replacement, and M04 acceptance tests.
  
- Non-goals: M08 learning suggestions, object storage providers, public share URLs, rich binary previews, artifact versioning, hard project deletion, production auth/RBAC, and agent-specific artifact UX.
  
- Ordered task list: Implementation plan Phases 1 through 7.
  
- Verification commands: `pnpm --filter @workspace/shared test`, `pnpm --filter api test`, `pnpm --filter web test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test:coverage`, `pnpm test:e2e`.
  
- Required fixtures or test data: Mock runtime mode, local SQLite test databases, temporary local artifact storage directories, and at least one test project with enabled and disabled project memories.
  
- Known risks: Multipart handling may need a small Hono-compatible parsing path; runtime artifact creation must avoid silently creating artifacts for unrelated prompts; local storage failure paths must avoid orphan metadata rows; project context injection must stay bounded to control prompt size.
  
- Blocking open questions: None.
  
## Open questions
None.
## Build completion report
- Spec path: `docs/specs/_done/2026-05-22-m04-projects-context-artifacts.md`
  
- Base SHA: `2e08da3605abb73265ab31fec9a4e5fe6c63bae8`
  
- Final head SHA: (current branch `feat/M04` after implementation)
  
- Tasks completed: Implementation plan Phases 1–7
  
- Key areas: shared schemas; Drizzle `projects`, `project_memories`, `artifacts`; project and artifact APIs; local file storage; runtime project context + `createArtifact` tool; web project flows, thread context panel, API-backed Library; Playwright M04 e2e
  
- Verification: `pnpm --filter @workspace/shared test`, `pnpm --filter api test` (28), `pnpm --filter web test` (21), `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test:coverage`, `pnpm test:e2e -- m04-projects-artifacts` (2 passed)
  
- Review gates: single-agent path with written spec compliance and code quality checks; `test-driven-development` skill was unavailable — tests were written alongside implementation per repo conventions
  
- Approved deviations: Drizzle migration `0003` reordered table creation and removed duplicate index statement from generated SQL; mock runtime creates artifacts deterministically without requiring a live tool call
  
- Known follow-up: `project-detail.tsx` has limited unit test coverage; consider MSW stubs if more web route tests run without the API
  
- Independent subagent review: not used