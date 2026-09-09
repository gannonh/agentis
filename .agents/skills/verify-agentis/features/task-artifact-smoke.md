# Task and artifact smoke

The smoke task lets an owner submit a bounded fake task and confirm its persisted Markdown artifact through the public status API and the owned scratch workspace.

## Sub-features

- `smoke-submit` accepts an owner brief with the `smoke` fixture and returns task, run, and thread IDs.
- `smoke-result` reports a succeeded run and completed task through `/v1/status`.
- `smoke-artifact` records `hello.md` with media type, byte size, and SHA-256, and the bytes match those fields.

## How to get to it (user POV)

- Start the local verification instance with `node packages/cli/dist/bin.js verify launch`.
- Submit `verification-smoke` with `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "verification-smoke" --fixture smoke`.
- Inspect the result with `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"`, which reads `/v1/health` and authenticated `/v1/status`.

## Driving it with the Agentis smoke helper

Preconditions:

- **Automated:** run from the repository root after the build. Set `EVIDENCE_DIR="docs/verification/verify-agentis/acceptance/smoke-$(date +%s)-$$"`; it must not exist yet. The helper creates the launch, owner token, endpoint, data root, doctor check, and cleanup itself.
- **Manual:** start `node packages/cli/dist/bin.js verify launch`, copy its exact `ENDPOINT`, `DATA_ROOT`, and `WORKSPACE`, and complete the owner token precheck before `doctor`.
- **Manual evidence:** set `EVIDENCE_DIR="docs/verification/verify-agentis/manual-$(date +%s)-$$"` and run `mkdir "$EVIDENCE_DIR"` before redirecting output.

- **Automated public proof.** Run `node .agents/skills/verify-agentis/helpers/smoke.mjs "$EVIDENCE_DIR"`. The helper must retain readiness, receipt, status, artifact size/hash, and cleanup evidence in that directory.
- **Submit manually.** Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "verification-smoke" --fixture smoke > "$EVIDENCE_DIR/submit.json"`. The JSON receipt has `accepted: true`, `taskId`, `runId`, `threadId`, and `effects: ["launch"]`.
- **Read result metadata.** Run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/doctor.json"`. In its `status`, find the run by the receipt's `runId`; require run `status: "succeeded"`, task `status: "completed"`, and an artifact whose `runId` and `taskId` match.
- **Verify bytes.** Resolve the artifact `path` below `"$WORKSPACE"`, require a regular file, read its bytes, compare its byte count to `byteSize`, and compare SHA-256 to `sha256`. For this exact brief, the expected bytes are `# verification-smoke\n`; the [manual byte/hash check](../references/manual-session.md#artifact-byte-and-hash-check) provides the executable comparison.
- **Retain proof.** Save the receipt, doctor/status output, and the computed artifact result below the fresh `EVIDENCE_DIR`; stop the launcher and remove its exact temporary root only after those files are written.

## Gotchas

- The readiness `pid` identifies the daemon; the foreground launcher has a different PID and receives `Ctrl-C`/`SIGTERM`.
- A successful submit receipt is an accepted command. The public status and artifact row prove completion and persistence.
- The artifact path is persisted as an absolute path. Check that it remains below this run's `workspace` before reading it.
- `doctor` can create `owner.token`; perform the mode and JSON precheck first.
- Fake smoke evidence covers local fixture behavior. A fixture `PASS` remains separate from live-provider support; live providers, provider authentication, and Gate 0 remain UNVERIFIED.
