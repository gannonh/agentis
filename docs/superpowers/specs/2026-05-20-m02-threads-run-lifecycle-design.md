# M02 Threads and Run Lifecycle Design

## Summary

M02 turns the new-thread shell into a functional thread session backed by a local API runtime. Users can create a thread, stream an OpenAI response, observe run lifecycle state, abort a running response, and reload the thread later from local persistence.

## Goals

- Add a real `apps/api` service for thread and run operations.
- Use OpenAI as the proof-of-concept model provider through the Vercel AI SDK.
- Use AI Elements for the primary chat surface in the existing Agentis shell.
- Persist threads, messages, runs, and run steps in SQLite through Drizzle ORM.
- Preserve the M01 demo fixtures for non-thread product surfaces.
- Keep the implementation narrow enough to prove the M02 acceptance criteria.

## Non-goals

- Composio integration execution.
- Slack, webhook, scheduled, or external Chat SDK invocation paths.
- User-entered API key management in the app.
- Full worker, queue, object storage, or Docker Compose setup.
- Replacing Command Center, Agents, Integrations, Learning, or Library data with API-backed records.

## Architecture

M02 adds `apps/api` as a Hono TypeScript service and keeps `apps/web` as the Vite React client. The API owns thread persistence, run execution, model access, abort state, and streaming responses. The web app renders the thread experience with AI Elements components inside the existing Agentis shell.

Backend units:

- Hono routes for threads, messages, runs, runtime health, streaming, and abort actions.
- Drizzle schema and repositories over SQLite for durable local thread data.
- AI SDK execution layer using OpenAI from server `.env`.
- One local demo tool, `getWorkspaceSummary`, to prove tool-call lifecycle and timeline persistence without external credentials.
- Direct API run execution for M02.

Frontend units:

- `/threads/new` remains the empty composer entry point.
- `/threads/:threadId` becomes the durable thread detail route.
- AI Elements provides the main conversation, message, prompt input, tool, and reasoning surfaces.
- Existing M01 demo fixtures stay separate for non-thread screens.

Boundary rule: AI SDK streams model and tool events. Agentis persists product state and converts stream events into transcript messages and timeline steps.

## Data model

Core records:

- `Thread`: id, title, status, selected model, selected mode, project id when available, created timestamp, updated timestamp.
- `Message`: id, thread id, role, ordered parts/content, status, created timestamp.
- `Run`: id, thread id, status, model, started timestamp, finished timestamp, error summary, usage/cost fields when available.
- `RunStep`: id, run id, type, status, title, ordered payload, created timestamp, updated timestamp.

SQLite is the M02 database. Drizzle owns schema definition and migrations. Schema choices should stay compatible with a future Postgres driver where practical: stable ids, explicit timestamps, JSON payload columns only for structured event data, and repository boundaries that keep SQL details out of route handlers.

## Run lifecycle

1. User submits from `/threads/new` or `/threads/:threadId`.
2. API creates or reuses a thread, stores the user message, and creates a queued run.
3. API starts OpenAI streaming through AI SDK and updates the run to `running`.
4. Text deltas append to the assistant message.
5. Tool-call events create `tool-calling` run state and timeline steps.
6. Tool results update steps and the run returns to `running`.
7. Completion marks the assistant message and run `completed`.
8. Failure stores an error step and marks the run `failed`.
9. Abort cancels the stream, preserves partial assistant text, adds an aborted step, and marks the run `aborted`.

Run statuses remain aligned with the roadmap: `queued`, `running`, `tool-calling`, `completed`, `failed`, and `aborted`.

## UI behavior

`/threads/new` becomes the launch surface:

- Full AI Elements prompt input.
- Model selector with the OpenAI POC model.
- Mode selector with the existing Plan-style affordance.
- Attachment entry point visible but unavailable for M02.
- Runtime health messaging when `OPENAI_API_KEY` is missing or the API is unavailable.
- On submit, create a thread and navigate to `/threads/:threadId`.

`/threads/:threadId` becomes the session surface:

- Transcript rendered with AI Elements conversation and message components.
- Streaming assistant response updates inline.
- Run timeline shows queued, running, tool-calling, completed, failed, and aborted states.
- Abort button appears during active runs.
- Follow-up composer appends to the existing thread.
- Partial aborted response remains visible with an aborted state marker.
- Reload/resume reads persisted thread state from SQLite.

AI Elements should be adopted fully for the chat surface, then reviewed after install for alias correctness, token usage, accessibility, and fit with the Agentis design system.

## Configuration

- `OPENAI_API_KEY` lives only in `apps/api/.env` for M02.
- The API exposes a runtime health/config endpoint that reports whether execution is available.
- The web app uses the health endpoint to disable send and explain missing configuration.
- Current AI SDK APIs and OpenAI model ids must be verified from installed docs/source during implementation before code is written.

## Error handling

- Missing API server: composer shows runtime unavailable.
- Missing OpenAI key: composer shows model credentials missing.
- Provider error: run becomes `failed`, transcript preserves the user prompt, and timeline shows a clear error step.
- Tool error: timeline step becomes failed and the run becomes `failed` for M02.
- Abort: stream is cancelled, partial assistant text remains visible, and run is marked `aborted`.

Errors should fail loud. The UI should show a remediation path when the runtime cannot execute.

## Testing

API tests should cover:

- Drizzle repositories for threads, messages, runs, and steps.
- Route validation for create, fetch, stream, and abort operations.
- Run status transitions.
- Abort persistence with partial assistant text.
- `getWorkspaceSummary` step creation and failure behavior.

Web tests should cover:

- Runtime-disabled states.
- Submit navigation from `/threads/new` to `/threads/:threadId`.
- Streaming transcript updates.
- Abort behavior and partial response display.
- Reload/resume rendering from persisted API data.

E2E coverage should include:

- Create thread, stream response, abort, reload, and confirm aborted state persists.
- Create thread, complete response, reload, and confirm completed transcript persists.

## Implementation notes

- Use AI SDK and AI Elements skills during implementation.
- Keep Chat SDK out of M02; revisit it for Slack and external chat invocation milestones.
- Install AI Elements through the project package runner and review generated source files before use.
- Keep non-thread M01 fixture screens intact unless they need navigation changes for the new thread routes.
