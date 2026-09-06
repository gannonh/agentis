# How the first CLI/daemon slice must sit on the rebuild

origin/main at `422d8cb` is foundation documentation only. There is no application, package, or test command. KAT-3242 is the first Build slice. The surrounding system is the written contract, not code.

## Overview

Agentis 2.0 is a local owner daemon plus thin CLI. The owner asks a named bot to do one scratch task. The daemon authenticates the owner, starts one provider attempt, streams progress, keeps an inspectable artifact, and never silently repeats a pending action after restart. Gate 0 proves that path. Later slices add a browser room, a second provider, exact-action writes, and recovery on real resources.

## Key concepts

**Task.** Requested outcome, human owner, accountable bot, workspace, constraints, status, evidence.

**Run.** One attempt. Frozen provider, executable, model/effort, environment, deadline, limits, and provider session id. Later config edits do not mutate it.

**Thread / message.** Attributed conversation linked to the same task and run. Stable command and message ids. Refresh must not start work.

**Artifact.** Inspectable bytes plus task, run, author, and source provenance.

**Command.** Owner mutation with an idempotency key. Receipt, state transition, event, and pending-action intent commit in one SQLite transaction. Provider I/O happens after commit.

**Owner session vs bot grant.** Separate audiences. A bot credential cannot resolve approvals or mint owner grants.

**Provider engine.** One public contract. This slice implements Fake (verify launch / CI) and Codex app-server 0.153.4 over JSONL stdio. Cursor ACP waits for KAT-3243.

**Execution location.** Accepted candidate is one non-root Linux container per Run in Docker Desktop on macOS Apple silicon. Daemon, SQLite, and CLI stay on the host. Fail closed if the required boundary is unavailable. This Linux worker has Docker client 29.7.2 and a permission-denied daemon. macOS isolation is UNVERIFIED here.

## How it works

1. Operator starts `agentis serve` with an explicit endpoint or a saved profile that already stores that endpoint. The CLI does not guess a port.
2. Serve opens `~/.agentis/v2/` (or an override), checks a schema identifier, and refuses unsupported data without migrating or resetting it.
3. Owner commands authenticate. Bootstrap creates a CLI credential in the owner-only data directory. Localhost is not authority.
4. Submit creates a Task, a Thread, and a queued Run. Admission checks stop-all, concurrency (2 global, 1 per bot), deadline (15 minutes), and action budget (20 per Run).
5. After the launch-intent row commits, the daemon starts the provider. Fake stays in-process. Codex is a supervised stdio child with pinned executable identity, drained stdout/stderr, and distinct JSON-RPC / session / Agentis ids.
6. Progress becomes attributed messages and SSE events. Permission and user-input requests become waiting states with a durable reason. Owner allow/deny/input/cancel are commands. Bot routes cannot enter those commands.
7. Scratch output is imported through an authorized copy, hashed, and stored as an Artifact. Completion commits the artifact and a terminal Run state before the client is told.
8. Restart loads current state. Pending and allowed-but-unclaimed intents stay unexecuted. Claimed unknown outcomes stay unknown. No automatic retry of a non-idempotent effect.

## Where things live

- Product rationale: `docs/project-plan.md`
- Runtime invariants: `docs/adrs/0001-runtime-and-execution-foundations.md`
- Interaction fields for this slice: `docs/research/kat-3254/adoption.md`
- Provider pins: `docs/research/provider-contracts/README.md` and `runtime.md`
- Boundary contract: `docs/research/execution-boundaries/README.md`
- Evidence rules: `docs/verification/README.md`
- Application code does not exist yet. This slice creates `@agentis-labs/cli`.

## Gotchas

- Research Done is not a support claim. Fake success cannot stand in for live Codex.
- Do not prebuild specialist handoff, Cursor ACP, web UI, or a plugin framework.
- Do not copy OpenMausBot or CopilotKit.
- Effect 3.22.1 and `effect/Schema` only. Do not mix Effect 4 docs.
- Codex structured input needs `experimentalApi` on 0.153.4. Missing capability fails setup. Do not switch transport.
- Same-UID native tools inside a Run can read that provider's credentials. That limit is accepted. Owner credentials must never be mounted.
- This host cannot open the Docker socket. Container isolation cannot be marked PASS here.
