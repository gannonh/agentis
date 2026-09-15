# Approval and input

This Docker fixture recipe verifies owner approval and input commands through the public CLI and status API.

## Expected behavior

- The `allow` fixture waits with a pending approval. `approval allow` resumes the run and produces an artifact.
- The `deny` fixture waits with a pending approval. `approval deny` fails the run without an artifact.
- The `input` fixture reports `waiting_input` and `waitingReason: "input"`. Its retained question message says `choose color`.
- `input answer --answer color=Blue` records the owner answer and resumes the run.

## Drive the cases

Start a fresh fake `verify launch`, complete the owner credential precheck, and create a fresh `EVIDENCE_DIR`. Use the exact `ENDPOINT` and `DATA_ROOT` for every command.

1. Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "verification-approval-allow" --fixture allow > "$EVIDENCE_DIR/allow-submit.json"`.
2. Save `doctor` output as `allow-pending.json`. Read `APPROVAL_ID` from the matching pending row.
3. Run `node packages/cli/dist/bin.js approval allow --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --approval "$APPROVAL_ID" > "$EVIDENCE_DIR/allow-resolution.json"`. Capture `allow-after.json`; require the run to be `succeeded` with one artifact.
4. Submit brief `verification-approval-deny` with `--fixture deny`. Save the receipt and read its pending `APPROVAL_ID`.
5. Run `node packages/cli/dist/bin.js approval deny --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --approval "$APPROVAL_ID" > "$EVIDENCE_DIR/deny-resolution.json"`. Require the matching run to be `failed` with no artifact.
6. Submit brief `verification-input` with `--fixture input`. Save the receipt as `input-submit.json` and read its `RUN_ID`.
7. Capture `input-wait.json`. Require `waiting_input`, `waitingReason: "input"`, and a blocking question message whose body is `choose color`.
8. Run `node packages/cli/dist/bin.js input answer --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID" --answer color=Blue > "$EVIDENCE_DIR/input-answer.json"`.
9. Capture `input-after.json`. Require an accepted answer receipt, a succeeded run, and the owner answer message `{"color":"Blue"}`.
10. Set `SUBMIT_FILE="$EVIDENCE_DIR/input-submit.json"`, `STATUS_FILE="$EVIDENCE_DIR/input-after.json"`, and `EXPECTED_BRIEF="verification-input"`. Run the [artifact byte and hash check](../SKILL.md#artifact-byte-and-hash-check).

To prove typed transitions, open `/v1/events?cursor=<snapshot cursor>` before an action and retain the relevant SSE record. `/v1/status` does not contain events.

Approval IDs work only while the approval row is pending. The CLI splits `--answer` at the first `=`. A fake fixture `PASS` leaves live Codex and Claude behavior `UNVERIFIED`.
