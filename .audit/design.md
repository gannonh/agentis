# KAT-3242 synthesized design

Configured `claude:fable@max` and `claude:opus@xhigh` dropped out: Claude CLI unauthenticated. `cursor:cursor-grok-4.6@xhigh` is a native Task lane with pinned-dispatch only. `codex:gpt-5.6-sol@max` is still running. Extra Cursor-native Fable/Opus lanes were started after those dropouts and are not substitutes for the receipts.

This is the parent synthesis. Grafts land if a later candidate beats a decision below.

## Problem

The rebuild has invariants and no code. The first frozen API has to carry KAT-3254 fields, one Effect Schema family, owner/bot split, Fake plus Codex, and restart-safe pending actions, without unused handoff or Cursor contracts.

## Usage

```sh
agentis serve --endpoint http://127.0.0.1:4378 --data-root "$ROOT" --profile local
agentis doctor --endpoint http://127.0.0.1:4378
agentis task submit --endpoint http://127.0.0.1:4378 --brief "Write scratch/hello.md"
agentis approval allow --endpoint http://127.0.0.1:4378 --approval "$ID"
agentis verify launch
```

HTTP, same schema family:

```http
POST /v1/commands
Authorization: Bearer <owner>
{"idempotencyKey":"…","command":{"kind":"submit_task","brief":"…"}}

GET /v1/events?cursor=0
Authorization: Bearer <owner>
```

A bot bearer on `POST /v1/commands` is 403.

## Shape

One package `@agentis-labs/cli`. One command kernel. SQLite current state is authoritative. `applyCommand` is the only writer. Provider I/O happens after commit. Fake and Codex implement `ProviderEngine`. Codex JSONL stays in `engine/codex.ts`. Production launch requires the Docker Desktop Run-container. `unverified-host-scratch` is an explicit non-default profile for this worker.

Public surface: CLI verbs and the v1 HttpApi. Callers never see sqlite, JSON-RPC ids, or child argv.

## Synthesis decision

Base: command kernel plus adapters. REST resource trees lost: they duplicate the state machine on the wire. Multi-package splits lost: this slice has one binary. Event sourcing lost: the ADR forbids it. `@effect/sql-sqlite-node` lost: 0.52.0 peers do not match the research sql 0.52.1 pin and it pulls better-sqlite3. Use `node:sqlite` (Node 24) behind one store service.

## Tradeoffs accepted

- We accept a scripted Fake fixture language in exchange for CI that does not need Codex.
- We accept an explicit unverified host profile in exchange for live Codex proof on a worker without Docker.
- We accept experimental Codex `requestUserInput` in exchange for the researched input path, and fail that capability on a missing field.

## Alternatives considered

- Resource REST for tasks/runs: larger surface, two lifecycle stories.
- In-process only, no HTTP: cannot authenticate owner vs bot or replay SSE.
- Host process as the default boundary: rejected by the ADR.

## Open questions

- Can this worker complete a real Codex turn with native ChatGPT login? Prove it; otherwise UNVERIFIED.
- macOS Docker Desktop isolation remains UNVERIFIED.

## Next implementation step

Pin the workspace and the domain schemas, then prove `applyCommand` restart behavior with Vitest.
