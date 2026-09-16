# Browser client state ownership

The operator client has one state authority per domain. `WorkspaceStore` in `packages/cli/web/src/workspace-store.ts` owns the owner session, the latest `WorkspaceSnapshot` from `GET /v1/status`, the high-water cursor, the artifact preview bytes, the pending command retry, and the connection phase. React components derive every view from that single store through `useSyncExternalStore`; no component keeps a second copy of tasks, runs, threads, messages, handoffs, or artifacts.

| Domain | Owner | Rule |
| --- | --- | --- |
| Owner session | `WorkspaceStore.#state.session` | Written only by the bootstrap exchange, session fetch, setup acknowledgement, or a signed-out transition. |
| Snapshot state (tasks, runs, threads, messages, handoffs, evidence, artifacts, bot config revisions) | `WorkspaceStore.#state.snapshot` | Replaced wholesale by a `GET /v1/status` response. Views filter and sort; they never mutate or cache rows. |
| Cursor and stream phase | `WorkspaceStore.#pendingCursor`, `#state.stream` | The cursor only moves forward (`Math.max`). A transition with a cursor at or below the high-water mark is ignored, so replay cannot duplicate work. |
| Live transitions | `/v1/events` subscription in `#connectEvents` | A transition above the cursor triggers a snapshot refresh. Stream errors and `resync_required`/`cursor_expired` responses route through `#scheduleResync`, which backs off, takes a fresh snapshot, and reconnects. |
| Artifact preview | `WorkspaceStore.#artifactBytes` and `#state.artifactPreview` | Populated on demand from the authenticated content URL, keyed by artifact id, and discarded on close. |
| Selected task | `?task=` query string plus store selection | The URL is the durable selection; refresh and new owner sessions restore the same task. |
| Form drafts | `RequestForm` local state | Input not yet submitted. Cleared or reset after an accepted command; never used as a source of truth for retained work. |

Consequences: refresh cannot lose or duplicate retained content because the server snapshot is authoritative and the cursor deduplicates replay. A reconnect after a daemon restart re-snapshots and re-subscribes instead of trusting a stale stream position. The transcript's bounded scroll container and collapsed routine progress are presentation concerns; they never change ownership of the underlying rows.
