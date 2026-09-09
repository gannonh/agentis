# Bounded handoff

Bounded handoff lets an owner propose a completed Mara/Codex task to Ivo for an explicit draft-only acceptance and artifact return. The fake verification launch cannot reach this path, so the feature is mapped as UNVERIFIED.

## Sub-features

- `handoff-propose` submits an owner-only handoff request for a completed Mara run.
- `handoff-accept` records Ivo's explicit acceptance before the recipient may produce a draft.
- `handoff-artifact` records the returned draft as an artifact with handoff events and messages.
- `session-load` exposes public session loading for a provider-backed interrupted run; the fake verification fixture rejects this path, so it is UNVERIFIED here.

## How to get to it (user POV)

- Complete a Mara task using the Codex provider and retain its successful `runId`.
- Run `node packages/cli/dist/bin.js task handoff --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$MARA_RUN_ID" --brief "Return the bounded draft"`.
- Read `handoffs`, recipient `runs`, `pending`, `messages`, and `artifacts` from authenticated `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"` or `GET /v1/status`.

## Driving it with the Agentis CLI and status API

Preconditions:

- This recipe requires a completed owner-owned Mara run frozen with provider `codex`, and a configured Claude recipient path. No real credentials or provider setup belong in this verification skill.
- The fake `verify launch` fixture rejects handoff because its frozen provider is `fake`; no handoff proof is available from the smoke helper.
- Set `EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"` and run `mkdir "$EVIDENCE_DIR"` before capturing output.
- This entire feature is `UNVERIFIED` until a separately authorized provider conformance run records it without exposing credentials.

- **Propose.** The CLI `task handoff` wrapper generates its idempotency key internally and does not print it. For evidence that includes the exact payload, choose a fresh operator-owned key and post the same public command directly. This Node block reads the already validated owner token without printing it, writes the redacted request, and records the response from `POST /v1/commands`:

  ```sh
  HANDOFF_IDEMPOTENCY_KEY="handoff-$(date +%s)-$$"
  ENDPOINT="$ENDPOINT" DATA_ROOT="$DATA_ROOT" MARA_RUN_ID="$MARA_RUN_ID" HANDOFF_IDEMPOTENCY_KEY="$HANDOFF_IDEMPOTENCY_KEY" EVIDENCE_DIR="$EVIDENCE_DIR" node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from "node:fs";

  const owner = JSON.parse(readFileSync(`${process.env.DATA_ROOT}/owner.token`, "utf8"));
  const request = {
    idempotencyKey: process.env.HANDOFF_IDEMPOTENCY_KEY,
    command: {
      kind: "propose_handoff",
      sourceRunId: process.env.MARA_RUN_ID,
      recipient: "ivo",
      context: "Return the bounded draft",
    },
  };
  const response = await fetch(new URL("/v1/commands", process.env.ENDPOINT), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${owner.token}`,
    },
    body: JSON.stringify(request),
  });
  const body = await response.json();
  writeFileSync(`${process.env.EVIDENCE_DIR}/handoff-request.json`, `${JSON.stringify(request, null, 2)}\n`);
  writeFileSync(`${process.env.EVIDENCE_DIR}/handoff-propose.json`, `${JSON.stringify({ status: response.status, body }, null, 2)}\n`);
  if (response.status !== 200) process.exitCode = 1;
  NODE
  unset HANDOFF_IDEMPOTENCY_KEY
  ```

  The request file contains the exact outer key and command without the owner token. The CLI wrapper remains a valid user entry point when the hidden generated key is not part of the evidence requirement.

- **Inspect acceptance.** Run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/handoff-status.json"`. Require the receipt and status to expose a handoff ID, a `handoffs` row in `proposed` state before Ivo's explicit response, then `accepted` only after that response. Check the accepted row and pending action for `grants: "draft_only"` and `onwardDelegation: false`, and record the recipient run from the same public snapshot.
- **Inspect the draft.** After explicit acceptance and draft completion, require a succeeded recipient run, an artifact no larger than `65536` bytes, and the corresponding handoff message/event. Require the artifact path below `WORKSPACE`, read the regular file, and compare bytes read and SHA-256 with its public `byteSize` and `sha256` fields. Retain the draft bytes and compare their content against the requested draft; the manual smoke check assumes fixture-specific bytes and does not apply to a provider draft.
- **Load a provider session.** For a provider-backed interrupted run, run `node packages/cli/dist/bin.js session load --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID" > "$EVIDENCE_DIR/session-load.json"`; require the public receipt and record the provider/session prerequisite. The fake `verify launch` uses provider `fake` and rejects this command, so its result is `UNVERIFIED` rather than a provider failure claim.
- **Record the limit.** Record source SHA, runtime/provider versions, exact commands and payloads, expected and observed state, artifact bytes/hash where present, and a `PASS`, `FAIL`, or `UNVERIFIED` verdict. Until the provider preconditions and receipts exist, report this feature as `UNVERIFIED`; do not report fake rejection as provider support or a Gate 0 result.

## Gotchas

- `propose_handoff` requires a succeeded Mara source run owned by the current owner session and frozen with provider `codex`; fake runs are rejected.
- Handoff acceptance expires after its `60000` ms timeout and grants `draft_only`; it provides no tools, onward delegation, owner actions, or credentials.
- There is no owner CLI command that impersonates Ivo's acceptance. Do not synthesize an acceptance response in a fake fixture.
- The source draft must be a regular, unchanged file no larger than `65536` bytes; verify its recorded size and hash.
- Live Codex/Claude authentication, provider support, recovery, and Gate 0 remain UNVERIFIED by this map. A fixture verdict remains separate from the live-provider verdict.
