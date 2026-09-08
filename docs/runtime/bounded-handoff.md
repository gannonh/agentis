# Bounded Mara to Ivo handoff

After a Mara task succeeds, the owner can request one specialist draft on that task:

```sh
agentis task handoff --endpoint http://127.0.0.1:PORT --data-root DIR \
  --run MARA_RUN_ID --brief 'Review the source draft and return a revised draft'
```

The HTTP equivalent is `propose_handoff` with `sourceRunId`, `recipient: "ivo"`, and `context`. Use the normal owner Bearer credential and a unique idempotency key. The receipt identifies the handoff and recipient run. The task and conversation IDs remain the original IDs. Each task permits one proposal, including rejected or expired proposals. Replaying its command key returns the original receipt without another launch; a new key does not create another proposal.

Mara remains the task's current bot owner while Ivo decides. Ivo receives the source run identity, original brief, source draft, and owner's request. The first provider turn accepts or rejects with a strict JSON object bound to the new Ivo session and its first pending prompt. Text quoted in the source, an owner command, or a `Bot` authorization header cannot accept the proposal. Acceptance transfers ownership and records one draft intent in the same SQLite transaction. Only that intent can authorize the second provider turn. The adapter saves Ivo's returned text as an artifact and attributes progress and the artifact to Ivo on the original conversation.

Acceptance expires after 60 seconds, including provider startup. Rejection, invalid acceptance, or expiry keeps Mara's completed result and records the reason in the original conversation. Canceling the recipient before acceptance or using stop-all has the same ownership behavior. After acceptance, cancel and stop-all cancel Ivo's work. A late response cannot transfer ownership again or revive the canceled run. Restart never automatically dispatches a pending turn. The source run keeps its frozen Mara configuration after task ownership changes.

The request context is limited to 16,000 characters; the source draft and each recipient turn are limited to 65,536 bytes. Before proposing, Agentis opens the source artifact without following a symlink, verifies it is a regular file, reads bounded bytes, and checks the actual size and SHA-256 against the saved artifact record. Missing files, symlinks, nonregular files, and changed content are rejected. The two turns count against run and task action budgets. The recipient also counts against global and per-bot concurrency. Both providers require their pinned executables, dedicated provider credentials, and isolated run containers. No provider substitution or session transfer occurs.

## Grant enforcement

Ivo uses Claude Agent SDK 0.3.263 with native CLI 2.1.263 and `claude-sonnet-5` at medium effort. Both handoff turns expose `tools: []`, no MCP servers or agents, and no external settings sources. Native initialization must report the exact model, API-key source and empty tool inventory. The workspace is read-only inside the provider container; Agentis saves the returned text outside that process. The per-run native session directory stays in its separate provider volume.

Agentis rejects native permission and question callbacks during handoff and exposes no bot-authorized owner commands or onward handoff operation. The second turn resumes the same provider session only after the first query closes and the acceptance transaction and unique draft claim succeed. Session loading uses SDK transcript read APIs without inference or another turn.

Schema `agentis.v2.gate0.5` replaces the prior provider selection. Earlier data roots are refused without migration or reset. Preserve earlier data and use a fresh data root. Historical Cursor failure evidence remains in verification records.
