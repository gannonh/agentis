---
type: Guide
title: Invocation worker
description: Run the Agentis invocation worker for scheduled agent runs in local and self-host deployments.
tags: [invocations, worker, schedules, self-host]
timestamp: "2026-06-14T23:10:00Z"
---
# Invocation worker

The invocation worker is a separate API process that claims due agent schedules, creates threads/runs, and executes them in the background without a browser streaming call.

## Local development

Run the API, web app, and worker as three processes:

```bash
pnpm dev
pnpm --filter api dev:worker
```

For mock-runtime verification without live AI Gateway credentials, ensure repo `.env` includes:

```bash
AGENTIS_MOCK_RUNTIME=1
AGENTIS_MOCK_COMPOSIO=1
```

Create a schedule from an API-backed agent's **Invocations** tab, then wait for the worker poll interval. The worker creates a thread/run and completes it via `RunExecutor.executeToCompletion`.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `AGENTIS_WORKER_POLL_MS` | `30000` | Poll interval for due schedules and stale-claim recovery |
| `AGENTIS_WORKER_STALE_CLAIM_MS` | `900000` (15m) | Mark `claimed`/`running` invocation rows failed when older than this threshold |

The worker uses the same SQLite database and `.env` loading path as the API (`apps/api/src/worker.ts`).

## Single-node limits

This slice is intentionally self-host friendly but not distributed:

- SQLite is the persistence and claim store.
- One worker process is sufficient for local and single-node deployments.
- Duplicate due-slot execution is prevented by a unique `(source_type, source_id, due_at)` constraint on `agent_invocation_runs`.
- Overlapping workers on the same database should be avoided unless you accept contention; only one claim succeeds per due slot.

## Production entrypoint

```bash
pnpm --filter api build
pnpm --filter api start:worker
```

Run the worker alongside the API server. It does not expose HTTP routes.

## Related

- Spec: [2026-06-14-scheduled-agent-invocations-design.md](../specs/_done/2026-06-14-scheduled-agent-invocations-design.md)
- Code: `apps/api/src/invocations/`, `apps/api/src/worker.ts`
