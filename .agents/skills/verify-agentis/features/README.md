# Agentis verification map

This directory is the maintained source for verifying the user-facing Agentis 2.0 CLI and loopback daemon. Read the index before driving an instance, then use the feature recipe that matches the behavior under review.

## Baseline preconditions

- Run from the repository root with Node `24.20.0` and pnpm `9.15.9`.
- In a fresh checkout, run `pnpm install --frozen-lockfile`, then run `pnpm build`; use the resulting `packages/cli/dist/bin.js`.
- For a one-command run, use `node .agents/skills/verify-agentis/helpers/smoke.mjs EVIDENCE_DIR`. For a manual recipe, start `node packages/cli/dist/bin.js verify launch` and retain its exact `endpoint`, `pid`, `containerId`, `containerName`, `dataRoot`, `workspace`, and `log` values.
- Use provider `fake` and the `docker-fixture-container` boundary recorded in `profiles/verify.json`; this map does not use real credentials. The daemon runs in Docker with `--network none`, and the host loopback endpoint is provided by the launcher's `docker exec` TCP relay.
- Before a manual `doctor`, confirm `$DATA_ROOT/owner.token` exists, is mode `0600`, and is valid; the smoke helper performs this check itself.
- Never guess a port, select a default data root, or drive an instance that this run did not start.

## Driving conventions

- Use the public CLI or `GET /v1/health`, `GET /v1/status`, `GET /v1/events`, and `POST /v1/commands` only.
- Pass both `--endpoint "$ENDPOINT"` and `--data-root "$DATA_ROOT"` to every control command.
- Read IDs from public receipts and status rows. Do not inspect SQLite or call engine functions.
- Start each recipe with a clean launch. `stop-all` latches its data root, so its recipe always needs a fresh launch before another fixture.
- Validate side effects in the owned scratch workspace with the recorded `byteSize` and `sha256`.
- Retain proof under `docs/verification/verify-agentis/`; cleanup validates the exact Docker labels and identical writable data-root mount, removes only the owned container and host supervisor, then removes only the owned temp root.

## Proof and skip reporting

- Capture the action, command receipt, resulting public state, and side effect.
- Mark a recipe `UNVERIFIED` when it has not been driven through its public entry point. Source tests and a fake result do not prove live provider support. Keep fixture verdicts separate from live-provider verdicts: a fixture `PASS` leaves live-provider support `UNVERIFIED`.
- Every evidence case records `git rev-parse HEAD`, Node/pnpm/package/OS/provider/boundary versions, exact commands and payloads, expected and observed results, and a `PASS`/`FAIL`/`UNVERIFIED` verdict. Artifact evidence records path, media type, public `byteSize`, public `sha256`, bytes read, and the byte/hash comparison result.
- The smoke helper is at `../helpers/smoke.mjs`; invoke it as `node .agents/skills/verify-agentis/helpers/smoke.mjs EVIDENCE_DIR` with a fresh nonexistent evidence path. For manual recipes, set `EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"` and run `mkdir "$EVIDENCE_DIR"` before redirecting output.
- Keep owner tokens, provider credentials, and unrelated private data out of receipts and logs.

## Features

- [Task and artifact smoke](./task-artifact-smoke.md) covers public task submission, status metadata, and `hello.md` byte/hash verification.
- [Approval and input](./approval-input.md) covers allow, deny, waiting for input, and answering input.
- [Cancellation and stop-all](./cancellation-stop-all.md) covers per-run cancellation, global cancellation, and the stop-all latch.
- [Bounded handoff](./handoff.md) maps the owner-to-Ivo handoff entry point and records its fake-provider limitation as UNVERIFIED.

Maintain this map with `pstack:maintain-verification-skill` whenever the CLI commands, HTTP routes, schemas, fixtures, or observable side effects change.
