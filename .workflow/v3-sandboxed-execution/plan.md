# V3 Sandboxed Execution

## Goal
Implement V3 sandboxed workspace execution from `.cursor/plans/V3 Sandboxed Execution-eda6664c.plan.md`.

Agents should be able to call one native tool, `runWorkspaceCommand`, to run bounded shell commands or short Python/Node scripts against a workspace `files/` tree. Plan-mode runs must create an approval record before execution; agent-mode runs execute immediately. Execution output, changed files, and approval status must be visible in persisted run steps and the web timeline.

## Success Criteria
- API exposes a typed sandbox abstraction with a local-process backend, optional local-container backend selection, timeout/output caps, deny patterns, and abort propagation.
- Workspace file snapshots detect created, modified, and deleted files under `files/` with configured limits.
- `workspace_executions` persistence records provenance, approval mode, sanitized input, result summary, changed files, status, and timestamps.
- `WorkspaceExecutionService` mirrors V2 workspace edit approval semantics for pending, approve, deny, applied, failed, and aborted states.
- Native runtime wiring includes `runWorkspaceCommand`, policy approval gating, payload summarization, run-executor merge, approval coordinator routing, and mock runtime coverage.
- Web timeline and approval card show execution evidence and generalized workspace action approval copy.
- `.env.example` and docs link the V3 plan; no separate spec file is added.
- Targeted tests plus repository checks pass or blockers are reported with evidence.
- Changes are committed atomically without staging unrelated user work.

## Current Context
- Repo root: `/Volumes/EVO/orca-workspaces/agentis/agent-tooling-v3-sandboxed-execution`.
- Only known dirty file before execution was the untracked V3 plan.
- V2 edit/read tooling already exists under `apps/api/src/native-tools`, `apps/api/src/workspaces`, and `apps/api/src/runtime`.
- User explicitly requires commits after coherent change sets.

## Constraints
- Follow `AGENTS.md`: use existing app patterns, no mock-backed UAT unless explicitly requested, real-service blockers must be reported.
- Preserve unrelated user changes.
- Use `apply_patch` for manual edits.
- Do not use destructive git operations.
- Do not add a separate spec file; the cursor plan remains authoritative.
- Subagent spawning requires explicit user authorization in this environment, so packets are simulated locally unless authorization is provided.

## Risks
- Execution is security-sensitive. Deny patterns, cwd jail, minimal environment, bounded output, and timeout behavior need focused tests.
- Approval and run-step lifecycle must remain compatible with V2 edit approvals.
- Container backend is optional but config selection must fail clearly when Docker/image is unavailable.
- UI payload changes must remain backward-compatible with existing run steps.

## Approval Required
No external, destructive, or production actions are planned. Local file edits, local tests, and local commits are approved by the repo instructions. Ask before force-push, broad codemods beyond this plan, deleting user data, running migrations against non-local data, or spawning delegated subagents.

## Work Packets
1. `discovery`: map existing V2 native tool, workspace edit, database, runtime, and UI patterns.
2. `sandbox-core`: implement sandbox interfaces, local-process backend, optional container backend, execution registry, config.
3. `snapshot`: implement workspace file snapshot/diff with tests.
4. `audit-service`: add migration/schema/repository and `WorkspaceExecutionService`.
5. `native-runtime`: add `runWorkspaceCommand`, policy, payload, run-executor, approval coordinator, mock runtime.
6. `web-ui`: update run timeline and thread approval card with tests.
7. `docs-env`: update `.env.example` and V3 docs link.
8. `verification`: run targeted tests, typecheck/build/lint as warranted, inspect git diff, commit coherent changes.

## Integration Policy
Keep backend slices aligned with V2 service/repository patterns. Prefer small local helpers over broad abstractions. Packet outputs are integrated only after inspecting authoritative files. If implementation tradeoffs conflict with the plan, document the decision in `final-report.md`.

## Verification
- Narrow checks for changed units first: sandbox tests, execution service tests, native payload/runtime tests, web component tests.
- Broader checks before completion: `pnpm typecheck && pnpm build && pnpm lint`; run additional package test commands if feasible.
- Manual UAT only with real runtime credentials; report credential blockers instead of silently falling back to mocks.

## Reusable Artifacts
This workflow directory documents the implementation run. No reusable recipe is planned unless the final execution reveals a repeatable pattern worth preserving.
