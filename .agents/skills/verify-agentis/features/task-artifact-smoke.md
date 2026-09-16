# Task and artifact smoke

This recipe submits one fake task and verifies its retained Markdown result through authenticated public routes.

## Public behavior

- `task submit --fixture smoke` returns accepted task, run, and thread IDs.
- `/v1/status` reports a succeeded run, a completed task, and one matching artifact.
- The artifact row contains `metadataUrl`, `contentUrl`, `byteSize`, and `sha256`. It contains no filesystem path.
- The authenticated content response has the expected bytes, byte count, and SHA-256.

## Run the helper

From the repository root after `pnpm build`, run:

```sh
EVIDENCE_DIR="docs/verification/verify-agentis/acceptance/smoke-$(date +%s)-$$"
node .agents/skills/verify-agentis/helpers/smoke.mjs "$EVIDENCE_DIR"
```

The path must not exist. The helper starts `verify launch`, validates the owned Docker container and mount, checks the owner credential without recording it, and submits brief `verification-smoke`. It then polls `/v1/status`, fetches both public artifact URLs with owner authentication, and compares the content with `# verification-smoke\n`.

The helper writes readiness, receipt, status, artifact, and cleanup evidence. It removes only the validated container, supervisor, endpoint, and data root.

## Drive it manually

1. Start `node packages/cli/dist/bin.js verify launch` and retain every readiness value.
2. Check `$DATA_ROOT/owner.token` before `doctor` as described in [the main verification recipe](../SKILL.md#doctor).
3. Run `node packages/cli/dist/bin.js task submit --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" --brief "verification-smoke" --fixture smoke > "$EVIDENCE_DIR/submit.json"`.
4. Run `node packages/cli/dist/bin.js doctor --endpoint "$ENDPOINT" --data-root "$DATA_ROOT" > "$EVIDENCE_DIR/doctor.json"`.
5. Require schema `agentis.v2.gate1.0`, the matching terminal task and run, and one public artifact row.
6. Set `SUBMIT_FILE`, `STATUS_FILE`, and `EXPECTED_BRIEF="verification-smoke"`, then run the [artifact byte and hash check](../SKILL.md#artifact-byte-and-hash-check).
7. Stop the launcher after the evidence files exist. Validate ownership before cleanup.

A submit receipt proves command acceptance. The status and authenticated artifact responses prove completion and retained content. A fake fixture `PASS` leaves real providers `UNVERIFIED`.
