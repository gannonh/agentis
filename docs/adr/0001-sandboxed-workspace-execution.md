# ADR 0001: Sandboxed Workspace Execution

## Status

Accepted

## Context

Agentis-native tooling needed a way for agents to run bounded commands and short
scripts against durable workspace files after V1 read-only tools and V2 safe file
edits established workspace ownership, path jails, approval flow, and changed-file
metadata.

The implementation had to fit the existing AI SDK tool loop, preserve visible run
timeline evidence, support local demos without extra infrastructure, and leave a
clear path toward stronger production sandboxing.

Alternatives considered:

- Only support direct host-process execution. This is simple and fast for local
  development, but it is not an adequate isolation boundary.
- Require containers for all execution. This improves local isolation but makes
  first-run development and CI harder because Docker-compatible runtimes are not
  guaranteed.
- Split command and script execution into separate tools. This makes tool
  descriptions narrower but duplicates approval, audit, changed-file, and UI
  handling.

## Decision

Implement one native tool, `runWorkspaceCommand`, with a discriminated input for
shell commands or Python/Node scripts. Use `local-process` as the default local
developer backend and provide an opt-in `local-container` backend through the
standard `docker` CLI/socket.

Execution is approval-gated in `plan` mode and immediate in `agent` mode, subject
to policy. Every execution records sanitized input, bounded stdout/stderr,
duration, exit status, timeout/abort flags, and changed-file summaries in
`workspace_executions`.

## Consequences

- Local development works without requiring Docker, while Docker Desktop and
  OrbStack users can smoke-test the stronger local container path.
- The V3 runtime shares the same approval and timeline model as V2 edits, keeping
  user review of workspace mutations consistent.
- `local-process` must be treated as best-effort developer execution, not a
  production sandbox.
- Production-grade isolation remains future work and should replace or harden
  the local backends rather than expanding host-process execution.
