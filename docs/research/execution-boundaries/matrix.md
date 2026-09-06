# Authority and forced-crash matrix

This matrix is the verification handoff for [KAT-3252](https://linear.app/kata-sh/issue/KAT-3252). The [research contract](README.md) defines expected behavior. The [probe guide](probes/README.md) explains scope and reruns. Every integrated product check below remains UNVERIFIED. Observed counterexamples are individually identified; no simulator result passes a product gate.

For each integrated run record exact source SHA, host/VM/container/provider versions, image/configuration digest, principal and Run IDs, command/injection point, durable state, external count and receipt lookup, surviving process/container identities, expected/actual outcome, and redacted evidence link. Run every supported provider with its native tools enabled only as proposed. Record authentication dropout as UNVERIFIED.

## Adversarial cases

| ID | Attempt | Required observation | Present evidence | Next owning issue |
| --- | --- | --- | --- | --- |
| A01 | No auth, wrong/expired/revoked token, bot token at admin endpoint, spoofed owner role | Deny all protected reads/writes, no state change | Synthetic missing/bot token 401 observed; production UNVERIFIED | KAT-3242 |
| A02 | Bot approves own or another bot's action, mints owner session, edits grants, broadens handoff | Deny independently of prompt wording or native provider permission | UNVERIFIED | KAT-3244 |
| A03 | Cross-Run token/action/artifact reuse or wrong audience | Deny access and dispatch, retain attributable denial | UNVERIFIED | KAT-3243 / KAT-3244 |
| A04 | Foreign Origin, invalid Host, forwarded identity, DNS rebinding, direct CLI call | Reject supplied invalid Origin/Host; absent Origin requires valid CLI credential; location confers no authority | UNVERIFIED | KAT-3242 |
| A05 | Native shell absolute path, symlink, environment, inherited MCP configuration reads owner secret | Container prevents access, even if generated path is known | Host synthetic credential/config reads succeeded with sanitized environment; container UNVERIFIED | KAT-3242 |
| A06 | Native shell or MCP child calls admin through loopback, host gateway, IPv4/IPv6, proxy, inherited config | No admin route or owner credential; admin still denies invalid identity | Synthetic stdio child reached admin with read credential; provider/container UNVERIFIED | KAT-3242 / KAT-3243 |
| A07 | Bot browser shares owner cookies, downloads, local storage, CDP socket or host profile | Owner context inaccessible; isolated profile and scoped artifacts | Synthetic owner-cookie browser access observed; native provider browser isolation UNVERIFIED | KAT-3242 |
| A08 | Native hooks/plugins/config enable broader tool, absolute executable or child escape | Fail configuration or confine all descendants consistently | Synthetic inherited variable removed; absolute-path access remains. Provider route UNVERIFIED | KAT-3242 / KAT-3243 |
| A09 | Container reaches Docker socket, host mount, host process, provider credential or arbitrary egress | Deny host paths/control; document actual in-container provider-secret exposure; deny unapproved egress | Docker unavailable; UNVERIFIED | KAT-3242 / KAT-3251 |
| A10 | Change action arguments/content/account/target after approval; replace symlink or remote precondition | Reject old binding; require new intent/card | UNVERIFIED | KAT-3244 |
| A11 | Two tabs allow/deny, duplicate command key, changed payload with same key, cross-Run approval | One immutable resolution; identical command replays its receipt; changed command rejected | UNVERIFIED | KAT-3244 |
| A12 | Expired, canceled, revoked or restart-invalidated approval; wall clock rollback | No dispatch claim; pending expiry never silently extends | UNVERIFIED | KAT-3244 / KAT-3241 |
| A13 | Cancellation, stop-all or deadline races approval/dispatch | Atomic winner; stop requested distinct from confirmed stop and external effect outcome | UNVERIFIED | KAT-3242 / KAT-3244 |
| A14 | Provider plan/session-wide permission, prompt injection, retrieved owner instruction | No added Agentis authority; native bypass disabled or confined | UNVERIFIED | KAT-3243 / KAT-3244 |
| A15 | Replay transcript, SSE history, provider load, completion event or command | No new external effect; one terminal Run result and deduplicated client item | UNVERIFIED | KAT-3240 / KAT-3241 |
| A16 | Slow/disconnected viewer, expired cursor, browser disappears during approval | Bounded queues, snapshot resync, persistent decision and original expiry | UNVERIFIED | KAT-3240 |
| A17 | Unknown non-idempotent outcome, unavailable receipt query, eventual-consistency miss | Preserve unknown; no automatic resend or false absence/success | Same local dispatch state with zero/one effects observed; recovery UNVERIFIED | KAT-3241 |
| A18 | Exhaust concurrency, attempts, output, deadline or observed usage; hidden native tool | Reject new work/stop according to limits; unknown usage labeled; unobservable route invalidates total-count claim | UNVERIFIED | KAT-3242 / KAT-3243 |
| A19 | Unsupported schema, missing blob, escaping artifact path, partial restore | Preserve original data, refuse execution/access, no fallback/reset/migration | UNVERIFIED | KAT-3242 / KAT-3241 |

## Forced-crash cases

Use SIGKILL or the platform's equivalent forced termination, separately from graceful cancellation. Keep the controlled endpoint alive to count effects. A second restart must preserve the same result. Never use a preserved transcript as the oracle for an external effect.

| ID | Injection point | Required recovery | Disposable observation | Next owning issue |
| --- | --- | --- | --- | --- |
| C01 | Before launch intent commit | No child or effect | UNVERIFIED | KAT-3242 |
| C02 | Launch intent committed, before spawn | Resolve launch once, at most one owned child | UNVERIFIED | KAT-3242 |
| C03 | Spawned, before child/container identity commit | Find by durable launch identity or stop; no replacement until accounted for | `crash_after_launch`: absent local action, 0 effects, child survived. Container discovery UNVERIFIED | KAT-3242 / KAT-3241 |
| C04 | Provider active or blocked awaiting input | Interrupted Run, confirmed stop or explicit unresolved ownership | UNVERIFIED for live providers | KAT-3242 / KAT-3243 |
| C05 | Waiting for approval | Zero effects; restart invalidates unclaimed approval | `crash_waiting_approval`: pending, 0 effects. Restart policy UNVERIFIED | KAT-3244 / KAT-3241 |
| C06 | Mid-approval transaction, including conflicting decisions | Either no committed decision or exactly one; never partial permission | UNVERIFIED | KAT-3244 |
| C07 | Approval committed, before dispatch claim | No effect; invalidate unclaimed approval on daemon restart | `crash_approval_persisted`: approved, 0 effects. Integrated revalidation UNVERIFIED | KAT-3244 / KAT-3241 |
| C08 | Dispatch claim committed, before send | Treat claimed intent conservatively; receipt/authoritative absence reconciliation | `crash_before_external`: dispatching, 0 effects. Recovery UNVERIFIED | KAT-3241 |
| C09 | Endpoint accepts effect, before response reaches daemon | Count 1; reconcile receipt/key without blind resend | UNVERIFIED. Current probe waits until response before kill | KAT-3241 |
| C10 | Response received, before local receipt commit | Count 1; same unknown local state as C08; query external evidence | `crash_external_accepted`: dispatching, 1 effect. Recovery UNVERIFIED | KAT-3241 |
| C11 | Receipt transaction interrupted | Either old unknown state or complete receipt, never a partial success | UNVERIFIED | KAT-3241 |
| C12 | Receipt committed, before terminal event | Reuse receipt, finalize local result without repeat effect | `crash_receipt_persisted`: recorded, 1 effect. Finalization UNVERIFIED | KAT-3241 |
| C13 | Terminal result committed, before client completion delivery | Redeliver durable result once logically; no effect replay | `crash_before_delivery`: completed, 1 effect. Client behavior UNVERIFIED | KAT-3240 / KAT-3241 |
| C14 | Child/grandchild running when daemon dies | Stop-all/deadline enforced independently; discover and confirm termination | Child survived all seven host parent kills; container/watchdog UNVERIFIED | KAT-3242 / KAT-3241 |
| C15 | During orphan cleanup or second recovery restart | No duplicate replacement; retain unresolved ownership and action state | UNVERIFIED | KAT-3241 |
| C16 | Artifact bytes written before reference commit, or reference present with missing bytes | No fabricated artifact success; coherent restore and bounded cleanup | UNVERIFIED | KAT-3240 / KAT-3241 |
| C17 | Owner browser loss during pending/committed approval | Durable waiting/decision, no automatic resubmit or expiry extension | UNVERIFIED | KAT-3244 |
| C18 | Non-idempotent effect accepted; ledger query cannot establish outcome | Preserve unresolved outcome across repeated restarts, automatic effect count unchanged | UNVERIFIED | KAT-3241 |

The seven captured crashes verify local-state/effect-count observations and actual parent SIGKILL only. They do not implement recovery, container ownership, exact-action approvals, or a provider adapter. The first shipping daemon slice must introduce its own isolated `agentis verify launch` evidence; that command does not exist here.
