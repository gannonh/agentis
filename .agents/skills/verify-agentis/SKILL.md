---
name: verify-agentis
description: "Verify Agentis 2.0 through its public CLI and loopback HTTP daemon, especially fake-engine task fixtures and persisted scratch artifacts."
---

Use this skill when an agent needs evidence from the running Agentis CLI/daemon. Work from the repository root. The recipes use the public CLI and `/v1/*` API; they do not open `state.sqlite` or call engine internals. The source contracts are [cli.ts](../../../packages/cli/src/cli.ts), [verify.ts](../../../packages/cli/src/verify.ts), [fixture-runtime.ts](../../../packages/cli/src/fixture-runtime.ts), [fixture-daemon.ts](../../../packages/cli/src/fixture-daemon.ts), [http.ts](../../../packages/cli/src/http.ts), and [schema.ts](../../../packages/cli/src/schema.ts). Read the [feature map](./features/README.md) before selecting a recipe.

## Launch

Node `24.20.0` and pnpm `9.15.9` are required. In a fresh checkout, install dependencies before building the binary:

```sh
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/bin.js verify launch
```

`verify launch` stays in the foreground. It creates a fresh host data root named `agentis-verify-*`, starts the entire fake daemon in a Docker container with `--network none`, and exposes the existing host loopback API through a TCP relay whose connections use `docker exec`. The host root is bind-mounted at the identical absolute path inside the container. The launch writes `executionBoundary: "docker-fixture-container"` to `profiles/verify.json` and prints one JSON readiness object:

```json
{
  "endpoint": "http://127.0.0.1:<port>/",
  "pid": 12345,
  "containerId": "<full Docker container ID>",
  "containerName": "agentis-verify-<launch UUID>",
  "dataRoot": "/tmp/agentis-verify-<id>",
  "log": "/tmp/agentis-verify-<id>/daemon.log",
  "workspace": "/tmp/agentis-verify-<id>/scratch"
}
```

Keep the exact `endpoint`, `dataRoot`, `workspace`, `log`, `containerId`, `containerName`, and `pid` from that object. The port is never guessed. `pid` is the host `docker run` supervisor PID; it is not the daemon's PID inside Docker. `containerId` plus `containerName` identify the launch, while `docker inspect` labels `io.agentis.managed=verify-fixture` and `io.agentis.verify-launch=<launch UUID>` prove ownership. `workspace` is the daemon scratch root; each task artifact is below `workspace/runs/<runId>/`. The daemon is ready when the object has been emitted and `GET /v1/health` returns JSON with `ok: true` through the host relay. `verify launch` has no live provider support and does not establish a Gate 0 or provider eligibility claim.

For a manual run, follow the [manual session reference](./references/manual-session.md) to capture readiness, bind the shell variables, and inspect the exact container labels and identical data-root mount before control commands. Press `Ctrl-C` in the launcher terminal after the drive, or let the smoke helper own the launcher lifecycle. Do not start a second `serve` process against the same data root.

## Doctor

Check the owner credential before running `doctor`. `doctor` calls `loadOrCreateOwner`; without this precheck, a missing file is silently replaced with a new credential. With `DATA_ROOT` set to the exact launch value, run:

```sh
node --input-type=module -e '
import { readFileSync, statSync } from "node:fs";
const path = process.argv[1];
const mode = statSync(path).mode & 0o777;
const owner = JSON.parse(readFileSync(path, "utf8"));
if (mode !== 0o600 || typeof owner.sessionId !== "string" || typeof owner.token !== "string" || owner.token.length === 0) {
  throw new Error("owner.token is missing, not 0600, or malformed");
}
process.stdout.write("owner.token precheck ok\n");
' "$DATA_ROOT/owner.token"
```

Then run the read-only CLI check with the endpoint and data root from readiness:

```sh
node packages/cli/dist/bin.js doctor \
  --endpoint "$ENDPOINT" \
  --data-root "$DATA_ROOT"
```

`doctor` performs unauthenticated `GET /v1/health` and owner-authenticated `GET /v1/status`. Require exit code `0`, health `ok: true`, `schemaId: "agentis.v2.gate0.5"`, `apiFamily: "v1"`, `node: "v24.20.0"`, `packageVersion: "2.0.0"`, and status `schemaId: "agentis.v2.gate0.5"`. The status object contains `tasks`, `runs`, `pending`, `artifacts`, `messages`, `events`, `handoffs`, and `stopAll`.

If the precheck fails, stop and clean up that launch. Do not run `doctor` to repair the credential. The profile at `$DATA_ROOT/profiles/verify.json` records provider `fake` and boundary `docker-fixture-container`; explicit `--endpoint` and `--data-root` keep the instance under review visible and avoid selecting an unrelated default root.

## Drive

Use the readiness values for every command:

```sh
node packages/cli/dist/bin.js task submit \
  --endpoint "$ENDPOINT" \
  --data-root "$DATA_ROOT" \
  --brief "verification-smoke" \
  --fixture smoke
```

The smoke command submits the public `submit_task` command and prints a receipt. Require `accepted: true`, a `taskId`, a `runId`, a `threadId`, and `effects: ["launch"]`. The fake engine completes this fixture in the command request, so follow it with `doctor` and inspect the public status rather than assuming a receipt proves completion.

The public HTTP surface used by the CLI is:

| Route                     | Auth and result                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/health`          | No auth. Returns the health/schema/version object.                                                                                                                                                     |
| `GET /v1/status`          | `Authorization: Bearer <owner token>`. Returns the complete public snapshot.                                                                                                                           |
| `GET /v1/events?cursor=0` | Owner Bearer token. Returns an SSE stream of public event rows. Close the stream after collecting the needed events.                                                                                   |
| `POST /v1/commands`       | Owner Bearer token and `content-type: application/json`; body is `{ "idempotencyKey": "<unique key>", "command": <Command> }`. Returns a command receipt, `200` when accepted and `409` when rejected. |

`Command` is one of `submit_task`, `resolve_approval`, `answer_input`, `cancel_run`, `stop_all`, `load_session`, or `propose_handoff`. The CLI wrappers use these exact public commands:

```sh
node packages/cli/dist/bin.js approval allow --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --approval "$APPROVAL_ID"
node packages/cli/dist/bin.js approval deny --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --approval "$APPROVAL_ID"
node packages/cli/dist/bin.js input answer --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID" --answer color=Blue
node packages/cli/dist/bin.js run cancel --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID"
node packages/cli/dist/bin.js stop-all --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"
node packages/cli/dist/bin.js task handoff --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$MARA_RUN_ID" --brief "Return the bounded draft"
```

Use a new idempotency key for each distinct command. Read approval IDs from a `pending` status row with `state: "pending"` and a non-null `approvalId`; read run IDs from the submit receipt or status. `answer_input` requires a run whose status is `waiting_input`. `stop-all` is owner-only, cancels active runs, and latches the data root, so use a fresh launch for any later fixture that needs to submit work.

For artifacts, take the `path`, `byteSize`, and `sha256` from the public `artifacts` row. Resolve the path and require it to be a regular file below the launch `workspace`; read its bytes, compare the byte count with `byteSize`, and compare SHA-256 with `sha256`. The path is a side effect to verify, not a command to trust blindly.

## Evidence

Evidence must show the user action and resulting state together. Retain the readiness JSON, command receipt, doctor/status JSON, relevant event or message rows, and artifact byte count/hash under a fresh `EVIDENCE_DIR` below `docs/verification/verify-agentis/`. Never copy `owner.token` or any provider credential into evidence. A fixture result proves the fake local boundary only; live provider behavior, authentication, isolation, recovery, and Gate 0 remain UNVERIFIED unless separately exercised and recorded.

For each recorded case, include the exact source SHA (`git rev-parse HEAD`), runtime and environment versions (at least Node, pnpm, package version, OS, and provider/boundary), exact commands and payloads, expected result, observed result, and a verdict of `PASS`, `FAIL`, or `UNVERIFIED`. An artifact observation must include its public path, media type, `byteSize`, `sha256`, bytes actually read, and the comparison result. Keep fixture verdicts separate from live-provider verdicts: a fixture `PASS` leaves live-provider support `UNVERIFIED`.

For manual recipes, create a fresh evidence directory before redirecting command output:

```sh
EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"
mkdir "$EVIDENCE_DIR"
```

The one-command smoke proof is:

```sh
pnpm build
EVIDENCE_DIR="docs/verification/verify-agentis/acceptance/smoke-$(date +%s)-$$"
node .agents/skills/verify-agentis/helpers/smoke.mjs "$EVIDENCE_DIR"
```

For the helper, `EVIDENCE_DIR` must be a fresh nonexistent path; the helper creates it. It starts `verify launch`, prechecks the owner token before `doctor`, drives `task submit --fixture smoke` with brief `verification-smoke`, uses `/v1/status` for result and metadata, reads `hello.md` only inside the owned scratch root, compares bytes and SHA-256, writes redacted proof artifacts into the supplied evidence directory, and proves cleanup before returning success.

Do not turn unit tests, source inspection, a green build, or a fake fixture into a live-provider or Gate 0 claim. Record an unrun feature as `UNVERIFIED` with its unmet precondition and attempted entry point.

## Cleanup

Every verification launch owns its temporary data root and must be stopped in a `finally` path. The readiness `pid` is the host Docker supervisor PID; the foreground `verify launch` process has a separate `LAUNCHER_PID`, and the daemon PID is inside the container. Cleanup must inspect the exact `containerId`, require both ownership labels and the identical writable data-root mount, stop/remove only that container, then wait for the supervisor and relay endpoint to disappear. For exact manual launch, bounded wait, evidence persistence, and removal commands, use [the manual session reference](./references/manual-session.md). If a run is waiting, issue `run cancel` for that run first; use `stop-all` when the intended proof is global cancellation. The helper owns the same launcher/container/supervisor wait and removes the validated Docker data root plus its helper temp parent only after evidence is written.

## Helpers

The verification helper is at `.agents/skills/verify-agentis/helpers/smoke.mjs`. Its invocation from the repository root is:

```sh
node .agents/skills/verify-agentis/helpers/smoke.mjs EVIDENCE_DIR
```

The supplied `EVIDENCE_DIR` must not already exist. The helper contract is deliberately small: create and own the helper temp parent, spawn the foreground `verify launch`, parse the readiness object, validate the Docker fixture profile and exact container ID/name/labels/mount, pre-read and validate `owner.token` without printing it, run `doctor`, submit the smoke fixture with brief `verification-smoke`, fetch authenticated public status, validate the owned artifact bytes and hash against `# verification-smoke\n`, write redacted evidence, SIGTERM the launcher, stop/remove only the inspected fixture container, await the host supervisor and relay endpoint disappearance, and remove only the validated Docker data root and helper temp parent. It must return non-zero on any assertion or cleanup failure and retain evidence on failure.

When routes, commands, fixture states, or artifact fields change, update this skill and its feature map through `pstack:maintain-verification-skill`, then rerun the public recipes.
