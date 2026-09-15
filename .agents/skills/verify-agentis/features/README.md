# Agentis verification map

Use this map to select a public Agentis 2.0 verification recipe. Each recipe records the action, the public result, and cleanup evidence.

## Shared preconditions

- Run from the repository root with Node `24.20.0` and pnpm `9.15.9`.
- In a fresh checkout, run `pnpm install --frozen-lockfile`, then run `pnpm build`.
- Pass the exact endpoint and data root to every command. Never guess a port or use an unrelated default root.
- Read IDs from public receipts and `/v1/status`. Do not inspect SQLite or call engine functions.
- Keep owner tokens, provider credentials, and unrelated private data out of evidence.

## Pick the matching runtime

The task, approval, input, and cancellation recipes use `verify launch`. That command starts provider `fake` inside an owned Docker fixture with `--network none`. The launcher exposes a host loopback relay and records boundary `docker-fixture-container`. Use a fresh launch for each recipe that follows `stop-all`.

The browser conversation and handoff recipes use one local `serve` process with the repository Codex and Claude protocol stubs. They run provider `codex` with boundary `unverified-host-scratch`. A stub `PASS` proves the public browser and protocol contracts. It does not prove real credentials, a live provider, or Docker isolation.

## Driving conventions

- Use the public CLI, the browser room, or these HTTP routes: `GET /v1/health`, `GET /v1/status`, `GET /v1/events?cursor=...`, `POST /v1/commands`, `GET /v1/artifacts/:id`, and `GET /v1/artifacts/:id/content`.
- `/v1/status` returns current state at schema `agentis.v2.gate1.0`. It does not contain retained events. Read typed transition events only from the SSE route.
- Public artifact rows contain `metadataUrl` and `contentUrl`; they never contain a filesystem path. Authenticate both URLs, then compare the content byte count and SHA-256 with `byteSize` and `sha256`.
- For Docker recipes, retain the exact readiness values. Cleanup must validate the container labels and the identical writable data-root mount before removing the owned container, supervisor, endpoint, and temporary root.

## Record proof

Store proof under `docs/verification/verify-agentis/`. Record the source SHA, Node and pnpm versions, package version, operating system, provider, boundary, exact commands or browser actions, expected result, observed result, and a `PASS`, `FAIL`, or `UNVERIFIED` verdict.

For artifacts, record the public metadata URL, content URL, media type, `byteSize`, `sha256`, bytes read, computed SHA-256, and comparison result. Never write an authorization header, cookie, owner token, or provider credential to evidence.

Use `node .agents/skills/verify-agentis/helpers/smoke.mjs EVIDENCE_DIR` for the one-command Docker smoke proof. `EVIDENCE_DIR` must not exist. For manual work, create a fresh path such as `docs/verification/verify-agentis/manual-$(date +%s)-$$`.

## Features

- [Task and artifact smoke](./task-artifact-smoke.md) verifies fake task submission, retained status, and authenticated artifact bytes.
- [Approval and input](./approval-input.md) verifies fake allow, deny, question, and answer flows.
- [Cancellation and stop-all](./cancellation-stop-all.md) verifies CLI cancellation and the persistent stop-all latch.
- [Browser conversation](./browser-conversation.md) verifies the shared room with local Codex and Claude stubs.
- [Bounded handoff](./handoff.md) verifies the browser Mara-to-Ivo handoff with the same local stubs.

Run `pstack:maintain-verification-skill` when a public command, route, schema, fixture, or observable result changes.
