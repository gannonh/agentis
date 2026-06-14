# Documentation log

Newest entries first.

## 2026-06-14

- Shipped HA-GAP-13 scheduled agent invocations: worker entrypoint, schedule CRUD, background run execution, and Agent Detail schedule UI. Added [guides/invocation-worker.md](guides/invocation-worker.md) and moved the spec to [specs/_done/2026-06-14-scheduled-agent-invocations-design.md](specs/_done/2026-06-14-scheduled-agent-invocations-design.md).
- Post-simplify OKF refresh for HA-GAP-11: documented `getPendingApprovalFromStep` reuse in thread detail and strict-quality-review follow-ups (`useThreadList`, home card extraction) in [2026-06-14-thread-metadata-design.md](specs/2026-06-14-thread-metadata-design.md).
- Finalized OKF docs for HA-GAP-11 after simplify and strict-quality-review: updated [2026-06-14-thread-metadata-design.md](specs/2026-06-14-thread-metadata-design.md) with delivered state, final module map, and test paths; refreshed [specs/index.md](specs/index.md) parity snapshot and completed-foundation list.
- Shipped HA-GAP-11: thread list metadata (`starred`, `hasPendingApproval`), sidebar Starred section, and new-thread home card stars, Waiting badges, and agent chips.
- Merged the HyperAgent gap roadmap into [specs/index.md](specs/index.md) and removed the separate roadmap section.
- Initialized OKF bundle: added `index.md` and `log.md` at bundle root and in major sections.
- Renamed `docs/adr/` → `docs/adrs/` for OKF conformance.
- Added YAML frontmatter with `type` to all concept documents under `./docs`.
- Created [specs/index.md](specs/index.md) as the implementation roadmap.
- Created [adrs/index.md](adrs/index.md) listing architecture decisions.
- Updated [AGENTS.md](../AGENTS.md) with OKF consumption and maintenance instructions.
