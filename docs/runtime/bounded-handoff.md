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

## Grant enforcement and limit

Agentis places a per-run native Cursor policy at `.cursor/cli.json` inside the handoff workspace, then mounts that workspace read-only. Ordinary provider configuration and native session state remain in the separate writable provider home volume. The policy denies `Shell(*)`, `Read(**)`, `Read(/**)`, `Write(**)`, `Write(/**)`, `WebFetch(*)`, and `Mcp(*:*)`. These use Cursor's documented [permission tokens and deny precedence](https://cursor.com/docs/cli/reference/permissions) and [project-level permissions configuration](https://cursor.com/docs/cli/reference/configuration). A changed policy causes launch to fail; a changed or missing policy causes session loading to fail.

Agentis also denies native permission, question, and plan callbacks during this handoff, and exposes no bot-authorized owner commands or onward handoff operation. The adapter writes only the returned draft text outside the provider process. Completed recipient sessions can be loaded for history inspection without another acceptance or draft turn.

Cursor ACP does not expose a documented pre-execution deny hook for its native Task/subagent tool. Its tool notifications can arrive after execution. Agentis rejects tool-bearing acceptance, but this cannot prove that Cursor performed no native subagent work. Prompt instructions and observed tool notifications are not enforcement of that native behavior. The live no-onward-delegation criterion remains unverified at that native boundary.

The new handoff table requires schema `agentis.v2.gate0.4`. Earlier data roots are refused without migration or reset. Preserve the old data root and choose a fresh one for this candidate.
