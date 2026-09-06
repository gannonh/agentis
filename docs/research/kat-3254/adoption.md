# Interaction requirements for the first working slices

The [KAT-3254 comparison](comparison.md) selects A, a shared team conversation with current owner/status/next action above it and attached result/action cards. The six browser runs at `6035f90c950af50a5602c0139c67afabe98f57f3` establish simulated interaction evidence only. Linear owns the target issues' acceptance criteria and lifecycle gates. This document does not start product Build or freeze an API.

## KAT-3242, first provider through CLI and daemon

[KAT-3242](https://linear.app/kata-sh/issue/KAT-3242) implements the first scratch task. Carry only the information that its CLI, daemon, provider attempt, and artifact path actually use.

| Exercised information | Interaction requirement |
| --- | --- |
| Human owner/session and named bot with role | Attribute the request and each progress item. Human authority is distinct from the teammate identity and its role. |
| Task and current accountable bot | Retain the requested outcome, constraints, explicit current owner, and readable status. The first slice may use only its single actual bot. |
| Conversation and attempt references | Link the request, input question, answer, progress, and result to the same task and attempt. A follow-up or replacement attempt must be visible. |
| Frozen provider and execution location | Keep these distinct from bot name/role. Show the selected provider/location during setup and relevant failures. Disclose unavailable capabilities; never imply silent substitution. |
| Waiting state and reason | Preserve actual input and permission questions. Distinguish approval recorded, awaiting receipt, interruption, and unresolved outcome when exercised by the controlled flow. |
| Artifact and provenance | Return an inspectable result with task, attempt, author, and source references. Completion text alone is insufficient. |
| Command/message identity and retained outcome | Refresh/reconnect or repeated delivery reads the retained state without starting another attempt or repeating an action. Preserve unresolved external outcomes. |

Do not add unused team orchestration, roster, schedule, computer, connector, or web-client contracts to KAT-3242. It must support attributable participants and explicit ownership, but it need not prebuild an unused handoff API. When KAT-3243 exercises the bounded specialist path, add its actual proposal and receiver acceptance together with that path. Failure leaves the sender owner; repeated notification must not duplicate specialist execution. The subsequent browser slice consumes that working behavior.

Keep existing KAT-3242 owner/bot authorization, real allow/deny/input/cancel, deadlines, isolated fixture launcher, persistence, and live-provider evidence. The prototype's fictional GitHub/Linear connections and receipt do not authorize or implement those integrations. Controlled permission handling uses only the real operations exercised by the first slice; broader exact-action enforcement remains with KAT-3244 and external recovery with KAT-3241.

## KAT-3240, retained conversational work in the browser

[KAT-3240](https://linear.app/kata-sh/issue/KAT-3240) adopts the selected shared-room direction on its already working task/provider path.

- Start the first request in conversation with the named coordinator after explicit eligible connection and source authority. Require no roster setup, workflow builder, or source-file editing. Keep setup outside the normal task interaction count.
- Keep current owner, status/waiting reason, pending decision, and latest result attached to the task. The owner label must use accepted ownership. Show sender, receiver, proposed/accepted/failed handoff, and attributable peer updates. Collapse routine chatter, not acceptance, failure, or blocking questions.
- Ask clarification and accept the answer in the same conversation. The exact question must remain visible even when routine peer activity is collapsed. Avoid manual copying between coordinator and specialist threads.
- Open artifact content and exact-action detail with at most one deliberate opening each from the current task. Keep provenance and source evidence inspectable. Retain those references across conversation navigation, refresh, and resnapshot.
- Represent completed artifact and unknown external action independently. A ready brief can coexist with an unresolved action. Show the owner, missing receipt, and permitted next step without a success banner or automatic non-idempotent retry.
- Present actual permission requests with destination account/project, operation, exact content, scope, duration, attempt, resolver, and recorded decision/receipt. Show that destination connection grants no action approval. KAT-3240 remains read-only for source integrations; create only request/receipt contracts already exercised by its controlled workflow. Add new exact-action execution with KAT-3244 and enable real writes only after KAT-3241.
- Separate the human owner, named teammate, role, provider, and execution location. Expose provider/host details during setup and relevant errors. Mark unavailable computer control, scheduling, or remote execution explicitly.
- Preserve keyboard access to the entire request/question/artifact/permission/receipt path, visible focus, modal dismissal and focus restoration, readable errors, and usable 390-pixel layout without horizontal overflow. Verify result/action access with real retained content, including scroll cost.
- Deduplicate actual streamed messages and command delivery. Snapshot refresh must never start work or replay an external effect. Use the existing runtime's ownership, attempt, event, artifact, and permission records rather than copying the prototype's state table or local storage.

The comparison did not exercise a general artifact library, multiple task management, configurable teams, broad group autonomy, memory, or schedules. It supplies no requirement for those contracts. Existing provider, authorization, persistence, safe-rendering, cursor, recovery, and live verification criteria remain in force.
