# Approval and input

The owner can resolve a fake tool approval or answer a fake input prompt through public commands. The resulting run state, message, and artifact are visible through `/v1/status`.

## Sub-features

- `approval-allow` moves an `allow` fixture from `waiting_approval` to `succeeded` and writes an artifact.
- `approval-deny` moves a `deny` fixture to `failed` without an artifact.
- `input-wait` exposes an `input` fixture with `waitingReason: "input"` and a `choose color` prompt.
- `input-answer` resumes that run after `color=Blue` and records the owner answer in `messages`.

## How to get to it (user POV)

- Submit `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 allow" --fixture allow` or the same command with `--fixture deny`.
- Read the pending approval ID from the owner status response and run `node packages/cli/dist/bin.js approval allow` or `node packages/cli/dist/bin.js approval deny`, passing the exact endpoint, data root, and `--approval` value.
- Submit `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 input" --fixture input`, read its run ID, and run `node packages/cli/dist/bin.js input answer --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID" --answer color=Blue`.
- Use `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"` after each action to observe the public result.

## Driving it with the Agentis CLI and status API

Preconditions:

- A fresh fake `verify launch` is ready and the owner token precheck passed.
- `ENDPOINT` and `DATA_ROOT` contain the exact readiness values.
- Set `EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"` and run `mkdir "$EVIDENCE_DIR"` before capturing output.
- Each submit receipt is saved before extracting its IDs. The recipes below use fresh brief names so their rows are easy to identify.
- Evidence for these recipes is currently `UNVERIFIED` until an agent drives each public entry point and retains the receipt and status output.

- **Create an approval.** Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 allow" --fixture allow > "$EVIDENCE_DIR/allow-submit.json"`. Run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/allow-pending.json"`. Find a `status.pending` row with `state: "pending"` and a non-null `approvalId`; call that value `APPROVAL_ID`.
- **Allow the action.** Run `node packages/cli/dist/bin.js approval allow --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --approval "$APPROVAL_ID" > "$EVIDENCE_DIR/allow-resolution.json"`. Require an accepted receipt, then run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/allow-after.json"` and require the matching run to be `succeeded` with an artifact.
- **Deny the action.** Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 deny" --fixture deny > "$EVIDENCE_DIR/deny-submit.json"`, read the new pending `APPROVAL_ID` from `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/deny-pending.json"`, and run `node packages/cli/dist/bin.js approval deny --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --approval "$APPROVAL_ID" > "$EVIDENCE_DIR/deny-resolution.json"`. Require an accepted receipt, matching run `status: "failed"`, and no artifact for that run.
- **Wait for input.** Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 input" --fixture input > "$EVIDENCE_DIR/input-submit.json"`. Read `RUN_ID` from that receipt and run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/input-wait.json"`; require matching run `status: "waiting_input"`, `waitingReason: "input"`, and a `waiting_input` event whose body contains `choose color`.
- **Answer input.** Run `node packages/cli/dist/bin.js input answer --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID" --answer color=Blue > "$EVIDENCE_DIR/input-answer.json"`. Require an accepted receipt, then run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/input-after.json"` to require matching run `status: "succeeded"` and a human owner message with body `{"color":"Blue"}`. Find that run's artifact, require its path below `WORKSPACE` and a regular file, read its bytes, and compare the bytes read and SHA-256 with the public `byteSize` and `sha256` fields; for this brief the expected bytes are `# KAT-3315 input\n`. Set `SUBMIT_FILE="$EVIDENCE_DIR/input-submit.json"`, `STATUS_FILE="$EVIDENCE_DIR/input-after.json"`, and `EXPECTED_BRIEF="KAT-3315 input"`, then use the [artifact byte and hash check](../SKILL.md#artifact-byte-and-hash-check).
- **Record evidence.** Retain each submit/action receipt and the status before and after the action. Record the source SHA, runtime/provider versions, exact command and payload, expected and observed state, artifact bytes/hash where present, and a `PASS`, `FAIL`, or `UNVERIFIED` verdict. Mark any unrun case `UNVERIFIED`; the fake fixture does not prove a live Codex or Claude provider path.

For the input artifact check, set `STATUS_FILE="$EVIDENCE_DIR/input-after.json"` and `EXPECTED_BRIEF="KAT-3315 input"` before using the [artifact byte and hash check](../SKILL.md#artifact-byte-and-hash-check).

## Gotchas

- Approval IDs are only actionable while the matching run is `waiting_approval` and the approval row is `pending`.
- Allow and deny are separate fixtures. Allow writes `hello.md`; deny fails the run and leaves no artifact.
- Input answering requires the run's current status to be `waiting_input`; answering a terminal or running run is rejected.
- The CLI parses `--answer` as the first `=` pair. Keep this recipe's `color=Blue` form when testing the public wrapper.
- Approval and input rows in unit tests are supporting evidence only. Public fixture verdicts remain separate from live-provider verdicts: a fixture `PASS` leaves live-provider support `UNVERIFIED` until the provider path is exercised.
