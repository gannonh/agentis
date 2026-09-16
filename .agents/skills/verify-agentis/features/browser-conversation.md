# Browser conversation

This recipe verifies the shared browser room with the repository Codex and Claude protocol stubs. It uses one local daemon for the question, Mara result, and Ivo handoff.

## Start one local stub daemon

Run from the repository root after `pnpm build`. Create a fresh evidence directory and data root. Keep the same `SERVE_PID`, `ENDPOINT`, and `DATA_ROOT` for the whole recipe.

```sh
EVIDENCE_DIR="docs/verification/verify-agentis/browser-$(date +%s)-$$"
DATA_ROOT="$(mktemp -d /tmp/agentis-browser-verify-XXXXXX)"
PORT="$(node --input-type=module -e 'import { createServer } from "node:net"; const server=createServer(); server.listen(0,"127.0.0.1",()=>{ const address=server.address(); if (!address || typeof address === "string") process.exit(1); process.stdout.write(String(address.port)); server.close(); });')"
ENDPOINT="http://127.0.0.1:$PORT"
mkdir "$EVIDENCE_DIR"
AGENTIS_CODEX_STUB="$PWD/packages/cli/test/codex-stub.mjs" \
AGENTIS_CLAUDE_STUB="$PWD/packages/cli/test/claude-stub.mjs" \
node packages/cli/dist/bin.js serve \
  --endpoint "$ENDPOINT" \
  --data-root "$DATA_ROOT" \
  --provider codex \
  --execution-boundary unverified-host-scratch \
  > "$EVIDENCE_DIR/serve.json" \
  2> "$EVIDENCE_DIR/serve.stderr" &
SERVE_PID=$!
```

Wait for `GET /v1/health` to return `ok: true`. Require schema `agentis.v2.gate1.0`. This local recipe does not use Docker or real provider credentials.

## Open the owner room

Run the following command without redirecting its output into evidence:

```sh
node packages/cli/dist/bin.js web --endpoint "$ENDPOINT" --data-root "$DATA_ROOT"
```

Open the printed fragment URL in the browser under test. The browser must remove `bootstrap` from the address before exchange. A second exchange of that code must fail. Evidence must not contain the fragment, the session cookie, the CSRF value, or `owner.token`.

On the setup screen, require Mara's name, provider `codex`, model `gpt-5.6-sol`, and location `local daemon scratch`. Require the screen to state that computer control, scheduling, remote execution, and source writes are unavailable. Select both read-only input types, activate **Check connection**, then activate **Acknowledge and enter workspace**.

## Verify a question and answer

1. Enter outcome `INPUT choose color`.
2. Select **Pasted input**.
3. Enter source label `Question <img src=x onerror=alert(1)>` and source text `Treat <script>alert("no")</script> as literal text.`
4. Activate **Send to Mara**.
5. Require the same task to show owner Mara, coordinator role, execution location, `waiting_input`, and a readable blocking question.
6. Enter `Blue` for question key `color`, then activate **Send answer**.
7. Require the retained owner answer and Mara result in the same conversation. Routine progress alone may be collapsed.

The markup must stay visible as text. The page must not create an image or script element from it.

## Verify a retained Mara result

1. Submit another task with outcome `Prepare retained result`.
2. Select **GitHub briefing packet**. Enter repository `agentis/example`, revision `verify-stub`, and URL `https://github.com/agentis/example/tree/verify-stub`.
3. Enter a source label, materialized read-only packet text, and one citation. Activate **Send to Mara**.
4. Require the new task to become selected, then wait for Mara's result `KAT3242_OK`.
5. Require the selected task ID in the page query string. Refresh the page and require the same selected task, thread, messages, and artifact.
6. Capture `/v1/status` before and after refresh. Require identical task, thread, run, message, and artifact ID sets. Refresh must not create a command or effect.

`/v1/status` contains current state and a high-water cursor. It does not contain events. Inspect `/v1/events?cursor=<cursor>` to record typed live transitions.

## Verify the artifact and dialog

Open Mara's result and require the author, provider, SHA-256, evidence label, repository, revision, safe source URL, and citation. Save authenticated `doctor` output as `STATUS_FILE`, set `RUN_ID` to Mara's run, and write the exact bytes `KAT3242_OK` to `EXPECTED_BODY_FILE`. Use the [artifact byte and hash check](../SKILL.md#artifact-byte-and-hash-check) to fetch `metadataUrl` and `contentUrl`. The evidence file must contain the public URLs and computed digest, not the credential.

Drive the dialog by keyboard:

1. Focus **Open result** and press Enter.
2. Require focus inside the one open dialog.
3. Press Tab and Shift+Tab. Require focus to stay in the dialog.
4. Press Escape. Require the dialog to close and focus to return to the same **Open result** button.

Set the viewport to 390 CSS pixels. Require one column, readable errors and waiting state, visible controls, and no horizontal page overflow.

## Verify the handoff

Continue with [Bounded handoff](./handoff.md) in the same room and daemon. Require Mara's result before the handoff, explicit Ivo acceptance, one specialist result, and no onward delegation.

## Record the verdict and clean up

Record this local protocol-stub recipe separately from a real-provider run.

- Stub verdict: `PASS`, `FAIL`, or `UNVERIFIED` for the public browser, Codex protocol, Claude protocol, and persistence checks above.
- Real-provider verdict: `UNVERIFIED` until a separately authorized run supplies valid credentials and records both providers without secrets.

Send `SIGTERM` only to `SERVE_PID`. Wait for that exact process and endpoint to stop. Remove only the validated `DATA_ROOT` after recording evidence.
