# Execution authority and recovery research

Research for [KAT-3252](https://linear.app/kata-sh/issue/KAT-3252), dated September 6, 2026. This document specifies the candidate boundary for Gannon's decision. It does not approve implementation or enable real-resource mutations. The [ADR](../../adrs/0001-runtime-and-execution-foundations.md) records the decision status. The [matrix](matrix.md) separates observed counterexamples from future verification.

## Finding and selected candidate

Select one local execution environment for initial implementation research: a dedicated Linux container per Run inside Docker Desktop's Linux VM on macOS Apple silicon. The owner daemon, administrative CLI, and owner browser remain on macOS. Every model-controlled process, including the provider harness and its native shell, file tools, browser, and MCP children, runs inside the Run container. Screens are display resources within that container.

This is the recommended boundary, pending Gannon's acceptance and target-platform proof. A host process with a containerized browser alone fails the requirement because native shell and file tools still operate on the host. A same-user host process with scoped Agentis tokens also fails. The disposable probe read a synthetic owner credential through an absolute path after environment sanitization, then authenticated to a synthetic administrative endpoint. A stdio subprocess did the same. A browser carrying a synthetic owner cookie also accessed the endpoint.

The tested host was Linux x86_64, not the selected macOS platform. Docker Engine access returned permission denied, including outside the agent session sandbox. No container was launched. This research therefore establishes the need for the boundary and provides a concrete candidate, but does not establish that candidate's enforcement. Gannon must accept the boundary and the remaining proof requirements before runtime Build starts. An unavailable isolation mechanism must fail launch, with no host-execution fallback.

## Identities and allowed operations

An owner is the authenticated human principal. Browser and CLI are separate clients with independently revocable credentials for that principal. A bot is a persistent identity; a Run credential adds a specific attempt, audience, expiry, and enumerated grants. A credential's server-side record establishes identity. Request fields, local addresses, transport session IDs, and object IDs do not establish authority.

| Caller | Allowed operations | Prohibited operations |
| --- | --- | --- |
| Owner browser | Submit work, inspect authorized tasks and artifacts, resolve exact approvals, cancel, stop-all, manage future grants | Reuse revoked sessions or silently broaden an active Run |
| Owner CLI | Explicitly exposed owner commands through its own authenticated session | Forward owner credentials into a provider process, tool, prompt, or MCP configuration |
| Bot with Run credential | Read granted inputs, report progress, write bounded scratch output, propose an action, request a bounded handoff | Resolve any approval, approve itself, modify grants, mint owner sessions, impersonate the owner, select a new execution environment, access ungranted Runs or artifacts |
| Provider/MCP child | The same or narrower Run grants | Treat native permission prompts, plan acceptance, or provider session grants as Agentis owner approval |
| Unauthenticated caller | Narrow local bootstrap exchange with a one-use owner-held challenge | Read work, access artifacts, resolve approvals, change configuration, or launch work |

The daemon creates a random bootstrap challenge through deliberate owner CLI interaction. The browser exchanges it once for a short-lived HttpOnly, SameSite session cookie. Use a CSRF token for mutations, an exact Origin allowlist, and Host validation. Keep the CLI credential in the owner-only data directory, outside Run mounts. Bootstrap details, secure cookie behavior on the selected local origin, and session expiry remain integration proofs. Never use provider login credentials for owner bootstrap.

The administrative listener binds only to loopback and requires authentication on every protected request. Browser mutations require the expected Origin. CLI requests may omit Origin only with a valid CLI credential. Invalid supplied Origin is rejected on either route. Do not trust forwarded identity headers. A bot credential has a different audience and cannot authorize administrative routes. The narrow bot gateway validates bot, Run, audience, expiry, current revocations, and operation on each request. Neither listener uses a network source address as identity.

MCP stdio launches a child under the launching process's authority. Streamable HTTP requires Origin validation and recommends loopback binding and authentication. A disconnected stream does not itself cancel a request. These protocol properties do not provide filesystem or process isolation. [MCP transports, 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

## Execution location and resources

The following table is a required launch contract for the candidate. Every row remains UNVERIFIED on macOS. There is no shipping launcher in this repository.

| Resource | Required placement and access |
| --- | --- |
| Owner daemon and SQLite | macOS owner account, fresh `~/.agentis/v2/`. No database, blobs directory, owner session, or administrative socket mounted into a Run |
| Provider and native processes | One named container per Run in Docker Desktop's Linux VM. Non-root UID, private PID/IPC/network namespaces, all capabilities dropped, `no-new-privileges`, default seccomp enabled, read-only root filesystem |
| Run input | Daemon creates a reviewed copy of explicitly granted inputs and mounts it read-only at `/input`. No host checkout, home, parent directory, or arbitrary user-selected bind mount |
| Workspace and output | Dedicated scratch volume mounted at `/workspace`, private tmpfs at `/tmp`. Daemon imports bounded output through an authorized copy operation, rejects symlinks/path escapes and oversized content, hashes bytes before creating Artifact records |
| Native configuration | Private `/run-home` and explicit configuration root. Fixed executable/image versions, empty default connector registry, explicit approved MCP definitions. No inherited owner environment, global/project harness configuration, instructions, hooks, plugins, credential helpers, SSH agent, Docker socket, host browser profile, or device mounts |
| Provider credentials | Provider-owned eligible authentication inside a dedicated provider configuration volume, created deliberately for this environment. No copying subscription credentials from the owner's host profile. No credential values in Agentis records, logs, prompts, or artifacts |
| Integration credentials | Host-side trusted action executor retains later controlled-target and real integration credentials. They never enter the Run container. Gateway exposes fixed operations, never arbitrary URL forwarding or bearer-token passthrough |
| Network | Scratch-only probe uses `--network none`. Live provider launch requires a private internal network with no direct internet/host/LAN route and an established HTTP CONNECT proxy that admits only provider-research-approved destinations and the dedicated bot gateway. Administrative endpoint is never a proxy destination. No host networking, published Run ports, Docker socket, generic host bridge, or inherited proxy configuration |
| Computer | No desktop control in the first provider slice. If a browser is used for a probe, it has a fresh per-Run profile inside the same boundary, scratch downloads, and no owner cookies. Host display, accessibility, clipboard, camera, microphone, and keychain access are absent. Additional screens add no authority |
| Host hardware | Proposed initial container limits are 2 CPUs, 2 GiB RAM, 128 processes, 128 MiB tmpfs and 100 MiB retained Run output. Two active Runs maximum. These defaults require measurement on the supported Mac before acceptance |

The live-network design uses an existing proxy, not a custom policy engine. Its exact package/version and provider destination allowlist must be pinned with provider research before live launch. Proxy rules must deny IP literals and private, loopback, link-local, metadata, host-gateway, IPv6-local and DNS-rebinding destinations after name resolution, and revalidate redirects and CONNECT destinations. The sole private-service exception is a dedicated bot-gateway service on the internal container network at one fixed service identity/address and port. That service exposes only Run-scoped operations and has no generic HTTP tunnel or administrative routes. Its authenticated upstream connection to the host executor is configured by the owner daemon, never chosen by bot arguments. A domain allowlist alone does not prove safe egress. Until this configuration and the gateway are exercised, only the offline scratch profile is specified well enough to probe independently.

Docker documents that Desktop containers run in its VM and can reach host services through `host.docker.internal`. A default container network therefore does not meet the proposed host-access restriction. `--network none` leaves only the container's loopback interface. [Desktop networking](https://docs.docker.com/desktop/features/networking/), [host connectivity](https://docs.docker.com/desktop/features/networking/networking-how-tos/), [none network driver](https://docs.docker.com/engine/network/drivers/none/).

Use explicit Docker options for the offline candidate, including `--pull=never`, `--network=none`, `--read-only`, `--user=10001:10001`, `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--pids-limit=128`, `--memory=2g`, `--cpus=2`, and a bounded writable tmpfs. Use an already reviewed immutable image digest. The [container probe](probes/container_probe.py) encodes these options without changing host Docker settings. Docker's container run reference defines these controls. [Container run](https://docs.docker.com/reference/cli/docker/container/run).

### Credential and trusted-host limits

The same-UID provider harness and its native tools may read provider credentials inside their container. Read-only credential mounts still permit reading. This candidate protects owner control and other host resources; it does not establish secrecy of the active provider's credentials from model-controlled native tools. Eligible provider authentication, credential extraction resistance, quota exposure, and destination restrictions must be tested for each selected provider. If a provider requires broad host credential access or uncontrolled native networking, that provider path fails the boundary rather than acquiring an exception.

The host owner, root, Docker Desktop, kernel/hypervisor, daemon, action executor, and configured provider executable remain trusted. A malicious host administrator can inspect or alter credentials, records, container mounts, and audit data. Agentis cannot claim tamper resistance against that administrator. A container escape is outside the demonstrated evidence. Data deliberately sent to providers can leave the host. Network allowlisting does not prevent a bot from sending granted data to an allowed provider.

No current official provider is tested by these probes. The synthetic stdio server exercises the subprocess route, not a provider's MCP discovery, lifecycle conformance, or permission implementation. Native browser/configuration isolation and provider credential custody remain UNVERIFIED even though the synthetic counterexamples succeeded.

## Exact-action approval contract

The daemon generates immutable `ActionIntentId` and `ApprovalId` values. The approval binds the owner principal, `TaskId`, `RunId`, action ID, tool and operation version, destination account and immutable resource ID, canonical validated arguments, exact content bytes/digest, relevant resource preconditions, grant revision, and expiry. Use schema-derived canonical serialization with fixed field ordering and SHA-256. Bind actual bytes, not a UI summary or a mutable pathname. Reject unsupported values during validation.

The owner sees the destination account/resource, intended effect, full consequential content or immutable accessible content reference, scope, and expiry. Browser and CLI render the daemon's frozen action. Editing any consequential field creates a new intent and approval, canceling the old pending one. File effects bind a confined resolved resource and content digest; symlink substitution or changed remote preconditions requires a new proposal. A broad shell command or a session-wide native grant is not an exact-action approval.

An approval expires five minutes after creation, and no later than the Run deadline. The deadline uses elapsed monotonic time while alive and a persisted wall-clock bound across restart. If elapsed time cannot be established after clock rollback, refuse dispatch and require a new approval. Disconnecting a browser never extends expiry.

Resolve approval by an atomic compare-and-set from `pending` to one of `allowed`, `denied`, `expired`, or `canceled`. Store resolver principal, resolution time, command idempotency key, and command result in the same transaction. Competing tabs have one winner. Repeating the same command key and payload returns that result. A different key cannot revise a decision; a reused key with different payload is rejected. Bot callers cannot enter this operation at all.

Immediately before dispatch, atomically claim the allowed intent and recheck its binding, expiry, current grants/revocations, Run state, stop-all generation, resource preconditions, and remaining limits. Claim and action-attempt reservation commit together. Only one worker can claim an intent. Never execute a model-supplied URL or arbitrary command under an owner's approval for a named operation.

Cancellation wins if it commits before the dispatch claim. After claim, cancellation means stop requested and may leave an external outcome unknown. Approval expiry prevents a new claim; it cannot undo an already accepted external action. Grant revocation narrows effective authority immediately and requests cancellation of active work. Frozen configuration cannot preserve withdrawn authority.

Browser loss leaves pending approvals waiting until expiry and committed decisions durable. Reconnect reads state and never resubmits an approval implicitly. Daemon loss marks active Runs interrupted and invalidates pending or allowed-but-unclaimed approvals. The owner must approve a newly proposed action on a new Run after recovery. Previously claimed actions reconcile first; they never receive a fresh approval as an automatic retry shortcut.

## Records and recovery contract

Use separate opaque random UUIDs for `TaskId`, `RunId`, `ArtifactId`, `ActionIntentId`, `ApprovalId`, and `CommandId`. Store their kinds through the canonical Effect schemas when implementation is approved. No identifier is a bearer credential. Provider session IDs, external request keys, receipt IDs, and event cursors are separate fields.

| Record | Required immutable or durable information |
| --- | --- |
| Task | Requested outcome, owner, accountable bot, workspace identity, constraints, linked Runs, status, evidence |
| Run | Task ID, attempt ID, bot revision, skill hashes, grants snapshot, provider/transport/executable versions, model/effort, image digest, environment/configuration digest, workspace identity, deadline and limits, provider session reference, launch ownership |
| Artifact | Task/Run IDs, source provenance, media type, byte size, immutable content hash/blob reference, creation time and access scope. Missing/unsafe blob references fail access |
| Action intent | Run, frozen exact action/digest, approval reference, durable state, dispatch claim, external idempotency key if supported, receipt/reconciliation evidence and unresolved-outcome reason |
| Command/transition | Caller, idempotency key and payload digest, result, previous/new state, monotonic event sequence, timestamp. Duplicate replay returns the existing result |
| Launch ownership | Run and daemon instance IDs, container ID/name and labels, launch-intent state, process start identity, stop request and confirmed termination. A PID alone is insufficient |

Configuration edits affect future Runs. Current effective grants are the frozen grant set intersected with current revocations and stop state. A follow-up is a new Run under the same Task. Provider session continuation is an explicitly supported operation, not a reason to reuse a terminal Run or bypass reconciliation.

SQLite current state remains authoritative. One short transaction persists command receipt, state transition, event, and action intent. Provider/network calls occur after commit. Use coherent database/blob backup, and preserve the fresh-data policy: inspect schema identity before application writes, refuse unsupported data, preserve the original bytes, and never migrate, reset, or fall back to another store silently.

The action lifecycle is `pending approval → allowed → dispatch claimed → confirmed success | confirmed no effect | unknown`. Denied, expired, and canceled-before-claim actions cannot dispatch. A timeout or transport loss after claim produces unknown unless external evidence establishes an outcome. Run cancellation and action outcome are separate. A canceled Run can retain an unresolved action; it cannot display that action as undone or successful.

The selected later controlled operation is one append to a synthetic issue ledger with an observable count and receipt. Store a stable external idempotency key before sending when the endpoint supports it. On restart, query the receipt/key and verify destination and argument digest. Confirmed acceptance records the receipt without repeating the effect. Authoritative absence permits a new dispatch only under the endpoint's documented idempotency guarantee or a new exact owner approval. A search returning no matching item, an eventual-consistency delay, or an unavailable endpoint does not establish absence.

For a non-idempotent unknown outcome, automatic retries are zero. Show the unresolved intent and evidence to the owner. Reconcile through a supported external read or owner inspection. If absence cannot be established, preserve unknown and keep automatic execution blocked. A deliberate later owner decision to risk a duplicate must be a new intent and explicit approval acknowledging that risk, never a generic Retry button.

After daemon loss, first freeze dispatch and inspect persisted launch intents and container labels. Stop or account for every owned container, including one launched before its ID reached SQLite, before any replacement starts. Prefer confirmed termination and a new Run for the first slice. Do not attach by reused PID, launch a second provider session silently, or treat transcript loading as execution recovery. Container removal and process-tree termination must be observed independently. The disposable Unix process-group cleanup is not evidence for Docker recovery.

Commit an artifact and terminal transition before completion delivery. SSE reconnect, snapshot rebuild, provider-history replay, and receipt display never execute an action. Deduplicate delivery by event/item ID. A slow viewer cannot block execution. Missing blobs or partial artifact writes prevent a successful artifact claim and remain visible as failures.

## Targets and limits

The first provider slices use generated GitHub-like JSON/text evidence in `/input`, a scratch Markdown brief in `/workspace`, and an Agentis scratch tool with bounded read/write operations. They use no actual repository token, owner browser cookies, or real issue tracker. The later approval slice uses an isolated synthetic issue-ledger endpoint with resettable temporary storage, effect counts, request digests, receipts, optional idempotency, and fault injection. The probe's generated append ledger is the smallest demonstration of that target, not the implementation of the later verifier.

One approved real Linear follow-up remains the later selected workload. Real-resource mutations stay disabled until the integrated recovery gate passes and the owner explicitly grants that target. This research's GitHub draft PR and Linear evidence comment are owner-authorized delivery actions by the coding agent; they are not actions by an Agentis runtime bot and do not count as recovery evidence.

| Limit | Proposed first-slice value | Required enforcement/observation |
| --- | --- | --- |
| Stop-all | Durable latch; only owner can clear for future work | Block new launch and dispatch before canceling all owned containers/provider sessions. Request graceful stop, then force after 5 seconds. Report requested, confirmed, and unconfirmed separately |
| Run deadline | 15 minutes including input/approval wait | Daemon rejects dispatch after deadline; independent container lease/watchdog terminates computation after daemon loss. Watchdog remains UNVERIFIED |
| Concurrency | 2 active Runs globally, 1 per bot; 1 consequential action in flight globally | Transactional admission and dispatch claim. A bounded specialist handoff shares the Task budget and cannot reset limits |
| Retry | At most 2 retries for a demonstrably safe read, 1s then 2s backoff | Count each attempt against the same Run deadline and action budget. No hidden provider/session replacement. Zero automatic retries for non-idempotent unknown outcomes |
| Action count | 20 mediated tool attempts per Run, 40 per Task including handoffs; 1 consequential action per Run | Reserve count before dispatch, including denied/failed attempts and retries. Count native tools through proven provider hooks or disable their use. Unobservable routes invalidate claims of a total action limit |
| Output | 100 MiB per Run; 1 MiB per tool response | Reject oversized writes/imports, bound streaming queues, terminate excess generation. Docker writable volumes need an independently proven quota or enforcement mechanism; the memory limit alone is insufficient |
| Observable usage | Record provider-reported input/output tokens and currency cost with source/time. Stop at 100,000 reported total tokens or USD 1 reported cost when available | These are delayed observations, not a hard spend cap. Unknown cost stays unknown. A provider-side account limit is needed for a hard financial bound. Missing usage does not bypass time/action limits |

Numeric values are conservative research defaults for Gannon's boundary decision. They are not measured capacity claims or enforced features. Container resources constrain native shell work even when tool counts cannot be observed, but do not establish a complete action audit or dollar cap.

## Evidence and remaining decision

[Run the probes](probes/README.md). [Host results](evidence/host.json) show the counterexamples; [sandbox results](evidence/sandbox.json) show which operations the coding session itself prevented. PASS in those files means the stated experiment reproduced its expected observation. Several PASS observations demonstrate that the unrestricted host model is unsafe for the desired boundary.

The current recommendation rejects same-user unrestricted host tools and selects the container candidate for further proof. Gannon still owns acceptance. Required UNVERIFIED work includes macOS container isolation, online provider egress/configuration, provider credential exposure and eligibility, actual native tool/browser/MCP bypasses, exact approval race enforcement, integrated forced-crash/reconciliation and orphan cleanup, watchdog/resource/usage limits, and provider auth dropout. The [matrix](matrix.md) assigns these to the existing implementation and verification issues. No product gate is passed by this document or these probes.
