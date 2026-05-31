# Final Report: V3 Sandboxed Execution

## Outcome
Implemented V3 sandboxed execution for Agentis with local process execution, optional container backend, approval-gated `runWorkspaceCommand`, execution audit persistence, changed-file diffing, runtime/mock wiring, timeline/approval UI, tests, env docs, and the PRD plan link.

## Accepted Results
- Added `apps/api/src/sandbox/` with backend types, local-process backend, optional Docker backend, execution registry, and workspace snapshot diffing.
- Added `workspace_executions` schema/migration/repository and `WorkspaceExecutionService`.
- Wired `runWorkspaceCommand` into native tools, policy approval, native payload summaries, run executor, mock runtime, abort routing, and approval coordinator.
- Extended the web timeline with exit/duration, stdout/stderr previews, timeout/abort badges, and execution changed files.
- Generalized pending approval copy for workspace actions.
- Added config/env keys and `apps/api/sandbox/Dockerfile`.
- Linked the V3 plan from `docs/agent-native-tooling.md`.

## Rejected Results
None.

## Conflicts Resolved
No code conflicts. Subagent work was simulated locally because this environment requires explicit user authorization before spawning delegated agents.

## Verification Evidence
- Focused API tests passed: sandbox snapshot, local process backend, execution service, native payload, run executor.
- Focused web tests passed: run timeline and thread detail approval.
- Standard verification passed: `pnpm typecheck && pnpm build && pnpm lint`.
- Full API suite passed: 29 files, 181 tests.
- Full web suite had one unrelated timeout in `agent-detail.test.tsx`; rerunning that file passed 20/20.
- Manual real-service UAT was not run because it requires real runtime credentials and user-driven approval flows.

## Remaining Risks
- Local-process sandboxing is best-effort and intentionally not a production isolation boundary.
- Docker backend is implemented behind config but was not manually exercised with a built image.
- Full web suite showed a flaky timeout under full-suite load, not reproducible in the focused rerun.

## Reusable Follow-up
The workflow artifact can serve as the pattern for future native tool slices: add service/repository parity with V2, payload summaries, mock runtime coverage, and UI timeline evidence together.
