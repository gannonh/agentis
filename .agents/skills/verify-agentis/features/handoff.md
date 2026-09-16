# Bounded handoff

This recipe verifies one Mara-to-Ivo handoff in the browser room with the repository Codex and Claude stubs. Both runs stay in one task and thread.

## Expected behavior

- A completed Mara run can propose one handoff to Ivo.
- Ivo explicitly accepts before the specialist run starts.
- The handoff grants `draft_only` and sets `onwardDelegation: false`.
- Ivo returns one retained artifact and message in the original thread.
- A repeated proposal cannot create another recipient run or artifact.

## Run the stub recipe

Use the setup in [Browser conversation](./browser-conversation.md). Keep the same local `serve` process and owner browser session.

1. Submit a task whose outcome does not contain `INPUT`, `ALLOW`, `DENY`, or `CANCEL`. Wait for Mara's result.
2. Open **Ask Ivo for one specialist draft**.
3. Enter `Write a concise specialist draft`, then activate **Offer bounded handoff**.
4. Wait for the handoff to show `accepted` and for Ivo's run to show `succeeded`.
5. Require one Mara run and one Ivo run in the same task and thread. Require one accepted handoff with `draft_only` and `onwardDelegation: false`.
6. Require Ivo's retained result body to equal `SPECIALIST_DRAFT`.
7. Open Ivo's result. Record its author, provider, digest, evidence, citations, `metadataUrl`, and `contentUrl`.
8. Set `RUN_ID` to Ivo's run and write the exact bytes `SPECIALIST_DRAFT` to `EXPECTED_BODY_FILE`. Run the [artifact byte and hash check](../SKILL.md#artifact-byte-and-hash-check) against authenticated `doctor` output.
9. Refresh the page. Require the same selected task, task ID, thread ID, two run IDs, handoff ID, messages, and two artifact IDs. Require no duplicate command effect.

The Claude stub performs the explicit acceptance protocol. The browser does not impersonate Ivo. Typed `handoff_proposed`, `handoff_accepted`, and `handoff_artifact` transitions are available only through `/v1/events?cursor=...`.

## Verdict limits

Record the local stub result as `PASS`, `FAIL`, or `UNVERIFIED`. Keep a separate real-provider verdict.

- A stub `PASS` proves the bounded handoff contract, shared task and thread, retained result, and browser presentation.
- Real Codex and Claude authentication, provider availability, container execution, and recovery remain `UNVERIFIED` until a separately authorized live run records them.
- `session load` also remains `UNVERIFIED` unless a provider-backed interrupted run exercises that public command.
