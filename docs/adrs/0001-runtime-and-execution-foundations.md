# Runtime and execution foundations

Accepted under [KAT-3249](https://linear.app/kata-sh/issue/KAT-3249). Acceptance of the design does not prove its runtime behavior. KAT-3251 and KAT-3254 are Done research. Gannon accepted the Docker Desktop Run-container boundary, trusted-host assumptions, and in-container provider-credential exposure on 2026-09-06 (Linear comment `65ad3da3-25e1-4ab9-96d1-fe7d37051d46`). Target-platform isolation, provider egress, watchdog, and recovery remain UNVERIFIED.

1. **Runtime and contracts**

   Use TypeScript with Effect on Node 24. Effect owns asynchronous service composition, resource lifetime, cancellation, typed failure, bounded concurrency and safe retry policy. React owns presentation. Choose one supported stable Effect version family and matching API/schema packages/types. Pin the tested Node patch. An explicit, evidenced decision precedes use of a release candidate.

   Effect Schema is the canonical domain schema system. Derive API clients and OpenAPI from the same API definition. External SDK schemas remain external; translate at the integration boundary. Create packages only when used by the current end-to-end slice. Native code, an additional backend language, full event sourcing and a workflow framework need a measured requirement.

2. **Work records and invariants**

   Task owns the requested outcome, accountable bot, workspace, constraints, status and evidence. Run owns one attempt, provider session reference and frozen configuration. Thread owns conversation with explicit human/bot participants and linked task ownership. The first bounded coordinator/specialist handoff records proposed and accepted ownership; failure leaves ownership with the sender. Peer messages are attributable and deduplicated without re-executing effects. Broader group autonomy remains later. Artifact records inspectable output and task/run/source provenance.

   Capture bot revision, skill versions, grants, provider, model/effort and environment at run creation. Later configuration edits do not silently change an active attempt. A follow-up is a new attempt linked to the same task. Distinguish Agentis ids from external provider ids.

   Run states are queued, running, waiting for approval, waiting for input, interrupted, reconciling, succeeded, failed and canceled. Enforce allowed transitions and one terminal result per attempt. Represent unknown external action outcomes separately, with receipts and reconciliation evidence.

3. **Persistence and recovery**

   SQLite current-state tables are authoritative. A command transaction writes its receipt/idempotency result, state transition, meaningful event and pending-action intent together. Provider calls and external effects occur outside that transaction. Rebuilding a client view or replaying history never executes effects.

   External side effects use provider idempotency keys when supported. Persist receipt identifiers and query external state on uncertain outcomes. A non-idempotent effect with unknown outcome cannot retry automatically. Surface a reconciliation task when the result cannot be established. Model cancellation requests and confirmed stop separately if the provider cannot guarantee immediate termination.

   Recovery distinguishes readable transcript, SSE resync, provider-session loading, action reconciliation and child-process ownership. Detect/reconcile or stop orphaned children before launching replacements. Effect cleanup covers managed resource lifetime while the process runs; forced process death requires durable recovery logic.

   Test interruption before/after launch, approval persistence, external acceptance, receipt recording and completion delivery. Use a controlled endpoint with observable effect counts before enabling real resources. KAT-3241 owns that enablement gate.

   The database uses short transactions. Measure event-loop latency during replay and retained-history operations. If required, a dedicated worker becomes the sole DB owner.

4. **Authorization and execution environment**

   Local address grants no owner authority. Authenticate owner browser/CLI sessions from the first HTTP command. Validate Host, Origin, session and mutating-request authority. Use a deliberate local bootstrap and OS-protected owner credentials. Do not trust forwarded proxy identity or expose privileged APIs without authentication.

   Bot MCP credentials identify a bot and run and enumerate allowed operations. They cannot resolve approvals, mint owner credentials, edit grants or impersonate a user. The owner's administrative CLI and a bot's tools have separate authorization. Transport tokens must be validated for their intended recipient; do not pass arbitrary caller tokens through to downstream APIs.

   Bind approval to run, action target, exact argument/content digest, allowed scope, expiry and resolver. Persist a single atomic decision before execution. Reject changed actions, expired cards, cross-run reuse and duplicate resolution. UI shows destination, effect, relevant content and permission duration.

   The KAT-3252 research candidate is one dedicated non-root Linux container per Run inside Docker Desktop's VM on macOS Apple silicon. Keep the owner daemon, database, CLI and browser on the host. Put the provider harness and every native shell/file/browser/MCP child inside the Run container. Mount only reviewed input copies and private scratch output. Never mount owner credentials, global harness settings, Docker/SSH sockets, or host browser profiles. Drop capabilities, prohibit privilege gain, use private namespaces and a read-only root filesystem, and bound resources. Fail launch if the boundary is unavailable; there is no host-process fallback.

   Offline scratch probes use no network. The live candidate requires an internal network with an established proxy restricted to approved provider destinations and the narrow bot gateway. No direct internet, host/LAN route, administrative API destination, or arbitrary URL forwarding is allowed. The exact proxy/provider configuration remains UNVERIFIED and must be pinned and exercised before live launch. Provider credentials remain in provider-owned configuration inside the environment. Same-user native tools may read those provider credentials; this candidate does not prove their secrecy. Host owner/root, Docker, the kernel/hypervisor, daemon and provider executable remain trusted. Gannon must accept those limitations before implementation.

   The [disposable Linux probe](../research/execution-boundaries/probes/README.md) reproduced synthetic owner-credential reads after environment sanitization, administrative access through a synthetic stdio child, and browser access with a synthetic owner session. Seven SIGKILL probes recorded surviving children and showed that identical local dispatch state can accompany zero or one external effects. These are counterexamples to unrestricted host execution and local-state-only recovery, not Agentis runtime proofs. Docker access was denied on the research host; no container or macOS provider boundary was exercised. Native provider configuration, online egress, credential custody, approval/recovery enforcement, independent stop/deadline enforcement, and auth dropout remain UNVERIFIED. See the [adversarial and forced-crash matrix](../research/execution-boundaries/matrix.md).

   The research specifies five-minute exact-action approvals bounded by the Run deadline, atomic single resolution and dispatch claim, changed-action rejection, immediate revocation narrowing, and restart invalidation of unclaimed approvals. Claimed actions reconcile before any retry. Browser loss never resubmits a command or renews expiry. Unknown non-idempotent outcomes receive zero automatic retries. The detailed identities, binding fields, records, scratch/control targets and numeric limit proposals live in the [research contract](../research/execution-boundaries/README.md); they remain proposals for Gannon's boundary decision. Real-resource mutations stay disabled until KAT-3241's integrated recovery gate passes.

   The environment defines where processes run, mounted workspace roots, credential custody, filesystem/network policy and computer resources. Native shell/file/browser/MCP behavior must match that environment. Separate screens do not isolate files, cookies or logins. Begin with one environment and scratch resources; resource sharing is explicit.

   Enforce stop-all, run deadlines, bounded concurrent runs, retries and action counts before enabling tools. Quota/billing failures are visible. Meter costs only where the provider reports them and describe enforcement limits; missing data stays unknown.

5. **Provider boundary**

   One public engine contract describes exercised behavior. Shared ACP transport is permitted; first-party native protocols and small provider modules implement actual differences. KAT-3251 chooses two supported providers and one transport per provider. No selectable stubs, silent provider substitution or hidden provider-session replacement.

   Negotiate recovery, permission, question/plan, MCP, attachment and usage capabilities. Handle blocking requests. Preserve provider semantics for session-wide grants, cancel and reconnect. Loading a provider session may replay history; reconcile it without duplicating Agentis items.

   Support requires published eligibility plus live evidence. Official credential custody is insufficient evidence for subscription integration permission. Use provider-owned authentication flows and credential storage; do not extract, pool or proxy subscription tokens. No provider tokens enter Agentis records or logs. Record the supported billing mode; never advertise unlimited or no-additional-cost usage without provider evidence, and treat missing usage as unknown. Show execution and billing mode and the boundary of information sent to providers, including where files, prompts and tool outputs are sent despite local storage of Agentis records.

6. **Streaming, content and retention**

   HTTP commands use validated payloads and idempotency keys. SSE uses an explicit snapshot cursor, ordered transition into live streaming, duplicate suppression, authorization filtering and bounded subscriber queues. An expired cursor requests a fresh authorized snapshot. A slow/disconnected viewer cannot stall a run.

   Durable decisions, messages, transient deltas, tool output and blobs have separate retention policies. Keep large or deletable content behind references. Audit only mediated or reported actions and document omissions. A local append-only table does not establish tamper resistance against code that can modify the database.

   Delete/supersede memory content across canonical records, indexes, derived native files and exports where controlled. State which transcript, backup or provider copies remain. Memory carries source, scope, timestamps and explicit-user versus model-inference provenance. Treat retrieved content as evidence, never authority to change grants.

7. **Data-version policy**

   Use `~/.agentis/v2/` by default for the rebuild, with explicit override. Check a schema identifier before opening application tables. Preserve existing/unsupported data and refuse to run against it. Backups include coherent database and blob references. Restore only the supported schema and validate referenced content.

   Do not implement old-API compatibility, automatic data migration, destructive schema reset or fallback storage. Changing that rule or promising in-place upgrades needs a later explicit decision before implementation. Version 2.0 names the product generation; it does not authorize overwriting 1.x data.

8. **Consequences and evaluation**

   The initial system can remain one daemon with one database and thin clients. Work records outlive an engine session, while provider-specific limitations remain visible. The cost is an explicit recovery model, permission boundary and support matrix, all required by the product's promises.

   Gate evidence is defined in the [verification map](../verification/README.md); provider findings live in the [provider register](../compliance.md).
