# Orchestration: V3 Sandboxed Execution

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules

- If existing V2 APIs already provide a reusable helper, use or extend it instead of adding a parallel implementation.
- If a test failure exposes an unrelated pre-existing issue, isolate and report it; do not broaden the change without need.
- If container backend support threatens completion of the core local-process flow, keep it behind config with clear unavailable errors and document remaining risk.
- If real-service UAT lacks credentials, stop at automated/local verification and report the blocker.

## Packet Prompts

### Packet `discovery`

Objective: Identify the existing code paths V3 must extend.
Expected output: notes in `results/discovery.md` with file paths and implementation decisions.

### Packet `sandbox-core`

Objective: Add sandbox interfaces, process/container backends, registry, and config wiring.
Ownership: `apps/api/src/sandbox/`, `apps/api/src/config.ts`, `.env.example`, tests.

### Packet `snapshot`

Objective: Add bounded file snapshot and diff utility.
Ownership: `apps/api/src/sandbox/workspace-file-snapshot.ts` and tests.

### Packet `audit-service`

Objective: Add execution persistence and orchestration service.
Ownership: DB schema/migration, workspace execution repository/service tests.

### Packet `native-runtime`

Objective: Wire `runWorkspaceCommand` into native tools, run executor, approvals, mock runtime, and payloads.
Ownership: `apps/api/src/native-tools/`, `apps/api/src/runtime/`, `apps/api/src/workspaces/workspace-tool-approval.ts`, tests.

### Packet `web-ui`

Objective: Render execution output and approval copy.
Ownership: thread timeline/detail files and tests.

### Packet `docs-env`

Objective: Add env documentation and link V3 plan from docs.
Ownership: `.env.example`, `docs/agent-native-tooling.md`.

## Completion Audit

- Accepted: all plan checklist items implemented.
- Rejected: none.
- Conflicts: none.
- Decisions: persisted full execution input for approval correctness; payload/run-step summaries remain bounded.
- Final changes: sandbox core, execution service/audit, native runtime wiring, UI, config/env/docs, tests.
- Remaining risks: process backend is best-effort isolation; container backend not manually run.
