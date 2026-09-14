---
name: verify-agentis
description: "Verify Agentis 2.0 through its public CLI, browser room, and loopback HTTP daemon."
---

Use this skill when an agent needs evidence from the running Agentis CLI, browser room, or daemon. Work from the repository root. The recipes use only public browser, CLI, and `/v1/*` surfaces; they do not open `state.sqlite` or call engine internals. The source contracts are [cli.ts](../../../packages/cli/src/cli.ts), [verify.ts](../../../packages/cli/src/verify.ts), [fixture-runtime.ts](../../../packages/cli/src/fixture-runtime.ts), [fixture-daemon.ts](../../../packages/cli/src/fixture-daemon.ts), [http.ts](../../../packages/cli/src/http.ts), and [schema.ts](../../../packages/cli/src/schema.ts). Read the [feature map](./features/README.md) before selecting a recipe.

## Launch

Node `24.20.0` and pnpm `9.15.9` are required. In a fresh checkout, install dependencies before building the binary:

```sh
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/bin.js verify launch
```

`verify launch` stays in the foreground. It creates a fresh host data root named `agentis-verify-*`, starts the fake daemon in a Docker container with `--network none`, and exposes the host loopback API through a TCP relay that uses `docker exec`. The host root is bind-mounted at the identical absolute path inside the container. The launch writes `executionBoundary: "docker-fixture-container"` to `profiles/verify.json` and prints one JSON readiness object:

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

Keep the exact `endpoint`, `dataRoot`, `workspace`, `log`, `containerId`, `containerName`, and `pid` from that object. Never guess the port. `pid` is the host `docker run` supervisor PID, not the daemon PID inside Docker. `docker inspect` labels `io.agentis.managed=verify-fixture` and `io.agentis.verify-launch=<launch UUID>` prove container ownership. The identical writable data-root mount proves fixture containment. The daemon is ready after the object appears and `GET /v1/health` returns `ok: true` through the host relay. `verify launch` does not prove a live provider or provider eligibility.

For a one-command run, use [the smoke helper](./helpers/smoke.mjs). It captures readiness, inspects the exact container labels and identical data-root mount, then drives and cleans up. Press `Ctrl-C` in a launcher terminal after a manual drive. Do not start a second `serve` process against the same data root.

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

`doctor` performs unauthenticated `GET /v1/health` and owner-authenticated `GET /v1/status`. Require exit code `0`, health `ok: true`, `schemaId: "agentis.v2.gate1.0"`, `apiFamily: "v1"`, `node: "v24.20.0"`, `packageVersion: "2.0.0"`, and status `schemaId: "agentis.v2.gate1.0"`. The status object contains the current session, cursor, tasks, threads, handoffs, runs, bot configuration revisions, evidence, pending actions, artifacts, messages, and `stopAll`. It does not contain events. Read transitions from the SSE route.

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

| Route                            | Auth and result                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/health`                 | No auth. Returns the health, schema, and version object.                                                                                    |
| `GET /v1/status`                 | Owner Bearer token or owner browser session. Returns the public current-state snapshot and cursor.                                          |
| `GET /v1/events?cursor=<cursor>` | Owner Bearer token or owner browser session. Returns typed SSE transitions after the required cursor.                                       |
| `POST /v1/commands`              | Owner Bearer token or browser session with CSRF and exact Origin. The body is `{ "idempotencyKey": "<unique key>", "command": <Command> }`. |
| `GET /v1/artifacts/:id`          | Owner authentication. Returns the public artifact metadata row.                                                                             |
| `GET /v1/artifacts/:id/content`  | Owner authentication. Streams integrity-checked artifact bytes.                                                                             |

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

For artifacts, take `metadataUrl`, `contentUrl`, `byteSize`, and `sha256` from the public row. The row never exposes a filesystem path. Authenticate both URLs. Require the metadata response to match the row, then compare the streamed content byte count and SHA-256 with the public fields.

## Artifact byte and hash check

Set `RUN_ID` directly or let the snippet read it from an accepted submit receipt. For fake artifacts, set `EXPECTED_BRIEF` to the brief. For provider results, write the exact expected bytes to `EXPECTED_BODY_FILE`. The check selects the matching public artifact row from captured status, authenticates its metadata and content URLs, and writes the byte count, hashes, expected result, and verdict without recording the owner token.

```sh
if [ -z "${RUN_ID:-}" ]; then
  SUBMIT_FILE="${SUBMIT_FILE:-$EVIDENCE_DIR/submit.json}"
  RUN_ID="$(SUBMIT_FILE="$SUBMIT_FILE" node --input-type=module -e 'import { readFileSync } from "node:fs"; process.stdout.write(JSON.parse(readFileSync(process.env.SUBMIT_FILE, "utf8")).runId)')"
fi
test -n "$RUN_ID"
EXPECTED_BRIEF="${EXPECTED_BRIEF:-verification-smoke}"
STATUS_FILE="${STATUS_FILE:-$EVIDENCE_DIR/status.json}"
RUN_ID="$RUN_ID" STATUS_FILE="$STATUS_FILE" ARTIFACT_ROW="$EVIDENCE_DIR/artifact-row.json" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const document = JSON.parse(readFileSync(process.env.STATUS_FILE, "utf8"));
const snapshot = document.status ?? document;
const row = snapshot.artifacts?.find((item) => item.runId === process.env.RUN_ID);
if (!row) throw new Error("no artifact row for RUN_ID");
writeFileSync(process.env.ARTIFACT_ROW, `${JSON.stringify(row, null, 2)}\n`);
NODE

ENDPOINT="$ENDPOINT" DATA_ROOT="$DATA_ROOT" EXPECTED_BRIEF="$EXPECTED_BRIEF" EXPECTED_BODY_FILE="${EXPECTED_BODY_FILE:-}" ARTIFACT_ROW="$EVIDENCE_DIR/artifact-row.json" node --input-type=module <<'NODE' > "$EVIDENCE_DIR/artifact-check.json"
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

const row = JSON.parse(readFileSync(process.env.ARTIFACT_ROW, "utf8"));
if (Object.hasOwn(row, "path")) throw new Error("public artifact exposed a filesystem path");
if (typeof row.metadataUrl !== "string" || typeof row.contentUrl !== "string") {
  throw new Error("public artifact URLs are missing");
}
const endpoint = new URL(process.env.ENDPOINT);
const metadataUrl = new URL(row.metadataUrl, endpoint);
const contentUrl = new URL(row.contentUrl, endpoint);
if (metadataUrl.origin !== endpoint.origin || contentUrl.origin !== endpoint.origin) {
  throw new Error("artifact URL is outside the selected endpoint");
}
const ownerPath = `${process.env.DATA_ROOT}/owner.token`;
if ((statSync(ownerPath).mode & 0o777) !== 0o600) throw new Error("owner.token is not 0600");
const owner = JSON.parse(readFileSync(ownerPath, "utf8"));
if (typeof owner.token !== "string" || owner.token.length === 0) throw new Error("owner token is missing");
const authorization = { authorization: `Bearer ${owner.token}` };
const metadataResponse = await fetch(metadataUrl, { headers: authorization });
const metadata = await metadataResponse.json();
const contentResponse = await fetch(contentUrl, { headers: authorization });
const bytes = Buffer.from(await contentResponse.arrayBuffer());
const sha256 = createHash("sha256").update(bytes).digest("hex");
const expected = process.env.EXPECTED_BODY_FILE
  ? readFileSync(process.env.EXPECTED_BODY_FILE)
  : Buffer.from(`# ${process.env.EXPECTED_BRIEF ?? ""}\n`);
const metadataMatches = metadataResponse.status === 200 && isDeepStrictEqual(metadata, row);
const contentMatches =
  contentResponse.status === 200 &&
  bytes.byteLength === row.byteSize &&
  sha256 === row.sha256 &&
  bytes.equals(expected);
process.stdout.write(`${JSON.stringify({
  metadataUrl: metadataUrl.toString(),
  contentUrl: contentUrl.toString(),
  mediaType: row.mediaType,
  metadataStatus: metadataResponse.status,
  contentStatus: contentResponse.status,
  publicByteSize: row.byteSize,
  bytesRead: bytes.byteLength,
  publicSha256: row.sha256,
  sha256,
  metadataMatches,
  expectedBytes: expected.toString(),
  observedBytes: bytes.toString(),
  expected: expected.toString(),
  observed: metadataMatches && contentMatches ? "matching metadata, byte count, SHA-256, and body" : "artifact comparison failed",
  verdict: metadataMatches && contentMatches ? "PASS" : "FAIL",
}, null, 2)}\n`);
if (!metadataMatches || !contentMatches) process.exitCode = 1;
NODE
```

## Evidence

Evidence must show the user action and resulting state together. Retain the readiness JSON, command receipt, doctor/status JSON, relevant SSE transition or message rows, and artifact byte count/hash under a fresh `EVIDENCE_DIR` below `docs/verification/verify-agentis/`. Never copy `owner.token` or any provider credential into evidence. A fixture result proves only its recorded local boundary. Record live provider behavior, authentication, isolation, and recovery separately.

For each recorded case, include the exact source SHA (`git rev-parse HEAD`), runtime and environment versions, exact commands and payloads, expected result, observed result, and a verdict of `PASS`, `FAIL`, or `UNVERIFIED`. Include Node, pnpm, package, operating system, provider, and boundary versions. An artifact observation includes its public metadata and content URLs, media type, `byteSize`, `sha256`, bytes read, computed SHA-256, and comparison result. Keep fixture verdicts separate from live-provider verdicts. A fixture `PASS` leaves live-provider support `UNVERIFIED`.

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

For the helper, `EVIDENCE_DIR` must be a fresh nonexistent path. The helper starts `verify launch`, prechecks the owner token before `doctor`, and submits `verification-smoke`. It uses `/v1/status` for current state, then fetches the artifact metadata and content URLs with owner authentication. It records no credential. The helper compares the bytes and SHA-256, writes redacted proof into the supplied evidence directory, and proves cleanup before returning success.

Do not turn unit tests, source inspection, a green build, or a fake fixture into a live-provider or project-gate claim. Record an unrun feature as `UNVERIFIED` with its unmet precondition and attempted entry point.

## Cleanup

Every verification launch owns its temporary data root and must be stopped in a `finally` path. The readiness `pid` is the host Docker supervisor PID; the foreground `verify launch` process has a separate launcher PID, and the daemon PID is inside the container. Cleanup must inspect the exact `containerId`, require both ownership labels and the identical writable data-root mount, stop and remove only that container, then wait for the supervisor and relay endpoint to disappear. If a run is waiting, issue `run cancel` for that run first; use `stop-all` when the intended proof is global cancellation. The helper owns the same launcher, container, and supervisor wait and removes the validated Docker data root only after evidence is written.

## Helpers

The verification helper is at `.agents/skills/verify-agentis/helpers/smoke.mjs`. Run it from the repository root:

```sh
node .agents/skills/verify-agentis/helpers/smoke.mjs EVIDENCE_DIR
```

The supplied `EVIDENCE_DIR` must not exist. The helper starts the foreground `verify launch` and validates the Docker fixture profile, container identity, labels, and mount. It checks `owner.token` without printing or recording it, runs `doctor`, and submits brief `verification-smoke`. It fetches authenticated public status, metadata, and content. It compares the content with `# verification-smoke\n`, records redacted evidence, and proves cleanup. Before validated readiness, cleanup terminates only the launcher it spawned. The helper never adopts a container or data root discovered elsewhere.

When routes, commands, fixture states, or artifact fields change, update this skill and its feature map through `pstack:maintain-verification-skill`, then rerun the public recipes.

The helper ownership regression uses a separate live fixture and a failing launcher, then confirms the separate fixture and its data survive:

```sh
node --test .agents/skills/verify-agentis/helpers/smoke-ownership.test.mjs
```
