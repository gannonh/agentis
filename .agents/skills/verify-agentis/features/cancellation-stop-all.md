# Cancellation and stop-all

The owner can cancel one active run or latch the whole local instance with `stop-all`; public status exposes canceled runs, canceled pending actions, and the latch state.

## Sub-features

- `cancel-run` cancels an individual waiting run and interrupts its provider effect.
- `stop-all` cancels every active run, cancels pending actions and approvals, and sets `stopAll: true`.
- `stop-all-latch` rejects later task submission in the same data root.

## How to get to it (user POV)

- Submit `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 cancel" --fixture cancel` and run `node packages/cli/dist/bin.js run cancel --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID"`.
- In a separate fresh launch, submit `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 stop all" --fixture input` and run `node packages/cli/dist/bin.js stop-all --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"`.
- Inspect `/v1/status` through `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"` after every action.

## Driving it with the Agentis CLI and status API

Preconditions:

- A fresh fake `verify launch` is ready, with the owner token precheck complete.
- `ENDPOINT` and `DATA_ROOT` contain values from that launch.
- Set `EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"` and run `mkdir "$EVIDENCE_DIR"` before capturing output.
- The stop-all case uses a separate fresh data root because the latch is persistent.
- Evidence for this recipe is currently `UNVERIFIED` until the public cancellation commands are driven and retained.

- **Cancel one run.** Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 cancel" --fixture cancel > "$EVIDENCE_DIR/cancel-submit.json"`; require the submit receipt to have `accepted: true`, then read `RUN_ID`. Capture the before snapshot with `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/cancel-before.json"` before canceling. Run `node packages/cli/dist/bin.js run cancel --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --run "$RUN_ID" > "$EVIDENCE_DIR/cancel-resolution.json"`, then capture `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/cancel-after.json"`. Require accepted cancellation, run `status: "canceled"`, task `status: "canceled"`, and no still-pending or allowed action for that run. The launch action may remain `claimed` after the provider starts.
- **Latch all work.** On a new launch, submit `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "KAT-3315 stop all" --fixture input > "$EVIDENCE_DIR/stop-submit.json"`; require the submit receipt to have `accepted: true`, then capture `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/stop-before.json"`. Run `node packages/cli/dist/bin.js stop-all --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/stop-all.json"`. Require an accepted receipt and `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/stop-after.json"` status `stopAll: true`, with the active run canceled.
- **Prove the latch.** The rejected submission intentionally exits `1`, so temporarily disable `errexit` while capturing it. Restore `set -e` after the check below.

  ```sh
  set +e
  node packages/cli/dist/bin.js task submit \
    --endpoint "$ENDPOINT" \
    --data-root "$DATA_ROOT" \
    --brief "KAT-3315 after stop all" \
    --fixture smoke \
    > "$EVIDENCE_DIR/after-stop-submit.json" \
    2> "$EVIDENCE_DIR/after-stop-submit.stderr"
  AFTER_STOP_EXIT=$?
  set -e
  test "$AFTER_STOP_EXIT" -eq 1
  AFTER_STOP_FILE="$EVIDENCE_DIR/after-stop-submit.json" node --input-type=module <<'NODE'
  import { readFileSync } from "node:fs";

  const receipt = JSON.parse(readFileSync(process.env.AFTER_STOP_FILE, "utf8"));
  if (receipt.accepted !== false || !receipt.error?.includes("stop-all is latched")) process.exit(1);
  NODE
  ```

- **Retain evidence.** Keep the accepted submit receipts, action receipts, and before/after status output in the fresh `EVIDENCE_DIR`. Record source SHA, runtime/provider versions, exact commands and payloads, expected and observed snapshots, and a `PASS`, `FAIL`, or `UNVERIFIED` verdict. Stop the launcher and remove only the exact temporary root after the status proof is complete.

## Gotchas

- `stop-all` is a persistent latch in the data root; there is no public unlatch command. Use a fresh launch for later work.
- `run cancel` rejects a run already `succeeded`, `failed`, or `canceled`; record the original terminal result.
- The command receipt's `interrupt_provider` effect records the requested provider interruption. Verify the public run state and Docker fixture container/supervisor cleanup separately.
- Do not use a stale `RUN_ID` from another launch or infer ownership from a guessed port.
- A fixture cancellation `PASS` remains separate from live-provider support. This feature has no live-provider evidence in the current map and remains UNVERIFIED until a public fixture run is retained.
