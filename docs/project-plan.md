# Agentis project plan

Revision 3, September 6, 2026 (UTC). Gannon delegated product strategy and supplied his current Grok Bot usage under [KAT-3250](https://linear.app/kata-sh/issue/KAT-3250). The [conversational team decision](research/2026-09-06-workflow-research.md) supersedes the earlier recruitment prerequisite. Product Build still requires Todo approval and an explicit start; live evidence and merge gates remain in effect.

[Linear project](https://linear.app/kata-sh/project/agentis-63da0b4e8294) and [epic](https://linear.app/kata-sh/issue/KAT-3237) own acceptance criteria and status. This document owns product rationale and sequencing. The [runtime ADR](adrs/0001-runtime-and-execution-foundations.md) records architecture decisions; the [review](research/2026-09-05-project-review.md) preserves the research that motivated them. Change affected Linear AC before implementing a change to this direction.

1. **Product and initial user**

   Agentis runs recurring work through the agents the user chooses, retains results and decisions under the user's control, and provides recovery or takeover for unfinished work.

   Agentis serves people running business work through persistent named AI teammates. Conversational team usability is the primary product requirement. Gannon's software factory is the first operating context; chief-of-staff, marketing, engineering, and other business roles belong to the product audience. The first integration workload does not define a coding-only market.

   The first complete path is a request to a named coordinator, one bounded accepted specialist handoff when useful, visible progress/ownership, an inspectable artifact or proposed action, exact owner approval where needed, and a receipt or explicit unresolved outcome in the same conversation. The first integration reads GitHub project evidence and later creates one approved Linear follow-up. Pasted business inputs also exercise role-neutral artifact work. Real writes wait for the recovery gate.

   Start as a maintained Apache-2.0 open-source product, with Gannon accountable for maintenance and agents driving scoped delivery. Users supply eligible provider access and compute; no free-inference, paid-support, or hosted-service promise. The initial platform is macOS Apple silicon with a local daemon and browser client. KAT-3251 selects providers/versions, and KAT-3252 proves the execution boundary.

   The [strategy and evidence record](research/2026-09-06-workflow-research.md) separates one operator's report and screenshot from verified execution. The earlier five-user/ten-task recruitment requirement is superseded by this owner-directed decision. Demand and broader adoption remain unverified. Outreach still needs authorization.

   [KAT-3254](https://linear.app/kata-sh/issue/KAT-3254) compares three interactive team-workflow designs before the first runtime API is frozen. [The fixed 20-case evaluation](research/team-workflow-evaluation-v1.md) uses constructed inputs and explicit rubrics. Gate 1 requires at least 19/20 cases per supported provider, every mandatory core and safety case, one clean installation per provider on the primary platform without source edits or undocumented configuration, and one actual maintainer workflow. Measure setup, interaction, waiting, review/correction time and usage separately; establish a same-task manual baseline before claiming time saved. Agent assessment and human acceptance remain distinct.

   Gate 2 requires five daily workflow runs in each of two consecutive weeks for the initial operator, with recorded acceptance/corrections and persistent schedule/event/recovery evidence. These are internal engineering/use gates, not multi-user validation or production reliability guarantees. Change thresholds only through an explicit spec decision before execution. Bounded coordinator/specialist ownership is early; broad autonomous groups and unrestricted delegation remain later.

2. **Identity, ownership, and reuse**

   The canonical repository is `gannonh/agentis`. The package is `@agentis-labs/cli` version 2.0, with binary `agentis`. The rebuild has not been published; installing the currently published package must not be described as installing this rebuild. Never direct users to the unrelated unscoped `agentis` package.

   Foundation documentation landed on `main` at `4a2d18c9a864af087314609d163e892da1777b43` through PR #448. The former code remains on `archive/agentis-v1` at `78bf37491942552b6cb14cfe43b1a7463b723f48`. Branch promotion is complete and must not be repeated. OpenBot remains a reference project; the fork plan is superseded.

   Study OpenMausBot/CopilotKit behavior without copying their code, docs, or assets. Re-derive protocol behavior from specifications and provider documentation. Own prior Agentis material may be reused deliberately after checking fit and provenance. Preserve its lessons about versioned permissions, artifact provenance, durable invocation claims, signed webhook delivery, and verification evidence. Omit third-party enterprise and excluded adapter code. KAT-3239 added Apache-2.0 licensing and rebuild attribution while preserving archived material's own notices.

   CLI 2.0 uses a fresh, explicit data root, initially `~/.agentis/v2/`, overridable by an explicit option. Existing data stays untouched. Check schema identity on open and refuse unsupported versions with instructions to back up and choose a new data directory. No automatic reset, legacy compatibility, or migration runner. This follows the repository's no-migrations rule. A future change to that policy needs a new explicit decision before implementation.

3. **Positioning and provider support**

   Differentiate through controlled execution, retained work, observable decisions, and recovery across provider outages. Do not claim that competitors categorically lack local access. Do not imply that self-hosting prevents data being sent to model or connector providers. Show execution location, data access and billing mode during setup.

   [Provider research](https://linear.app/kata-sh/issue/KAT-3251) selects two eligible local providers and one supported transport per provider. Compare Codex app-server with codex-acp; consider Cursor ACP and the supported Claude SDK/ACP path. ACP is an option, and provider-specific behavior remains explicit. Session loading, questions, approvals, MCP configuration, attachments and usage reporting require capability evidence.

   Use the [provider evidence register](compliance.md). Keeping credentials in an official CLI does not establish integration eligibility. Claude subscription eligibility is unresolved until the provider policy requirement is satisfied. Cloud billing and lifecycle differ from local execution. No provider is advertised as supported from a preset, installation check, fake test or authentication dropout. Missing usage is unknown, not zero. Never silently substitute a provider, authentication method or session.

4. **Architecture**

   Use TypeScript with Effect on Node 24 for daemon and client service code, React 19/Vite for presentation, pnpm, strict TypeScript, Vitest and a consistent lint/format toolchain. Pin a tested Node patch and one supported stable Effect/schema/API family based on KAT-3251. Any release-candidate choice needs a concrete reason recorded before Build. Use one canonical domain schema system, Effect Schema, and derive the client and OpenAPI from its API description. Adapt external SDK schemas at their boundary without duplicating the domain model.

   Keep a single daemon and one SQLite database with transactional current-state tables, a durable log of meaningful transitions, and pending-action records. State, command receipt, event and execution intent commit atomically. Large/deletable content belongs in referenced blobs with explicit retention. Use short synchronous database operations and measure event-loop latency; add a single-owner database worker only if the measured workload requires it. Full event sourcing and a Rust backend require evidence of a problem the chosen design cannot meet.

   Model the minimum working concepts. A Task holds outcome, owner, workspace, constraints and completion evidence. A Run holds one attempt with a frozen bot/skill/grant/provider/model configuration and a distinct provider session id. A Thread holds conversation. An Artifact holds inspectable output and provenance. The first bounded coordinator/specialist exchange records participants, accepted ownership, and linked work. Broader groups added later preserve those invariants.

   Owner browser and CLI sessions authenticate even on localhost. Validate Host/Origin and mutating-request authority. Bot tools use scoped credentials and cannot resolve approvals or change grants. Scope approvals to the exact run, target, payload, duration and resolver. Persist the decision before executing. A token does not isolate a harness that can read the owner's credential files; KAT-3252 establishes the actual filesystem/network boundary before tools run.

   An execution environment owns process location, workspace roots, native tools/configuration, credentials, network policy and computer resources. Start with one environment and scratch resources. Screen separation does not isolate cookies, files or account actions. Defer a shared desktop and multiple computer providers until the selected workflow needs them and resource ownership is proven.

   Keep HTTP commands and replayable SSE. Specify snapshot/cursor ordering, deduplication, authorization filtering, expired-cursor resnapshot and bounded subscriber queues. Preserve transcripts, reconnect clients, reload provider sessions and reconcile uncertain actions as separate behaviors. Never replay external effects when replaying history.

   Enforce deadlines, stop-all, bounded concurrency/retries/action counts from the first tool-enabled slice. Persist action intent and use external idempotency/receipts where supported. Unknown external outcomes require reconciliation before retrying a non-idempotent action. Advertise only the audit coverage actually mediated or reported by the provider. The ADR defines these invariants in detail.

5. **Delivery gates**

   Packages define code ownership. Each implementing issue delivers an end-to-end result across the necessary layers. Create only packages/contracts used by the current slice. Every merged slice keeps the product working. The fixture launcher lands in the first daemon slice; provider proof is early and remains separate from fake tests.

   | Gate | Outcome and required evidence | Scope boundary |
   | --- | --- | --- |
   | Gate 0: Feasibility | The owner-directed workflow and interaction-prototype decision are recorded; provider/authority research selects two supported paths and execution boundary. Minimal CLI/daemon completes harmless work and one accepted coordinator/specialist handoff, saves an artifact, handles allow/deny/input/cancel and concurrent providers, and retains accurate interruption state. Exact-SHA fixture, packaged smoke and live proofs pass. | Scratch resources only; no broad UI, third-provider requirement or computer framework. |
   | Gate 1: Useful supervised work | One web workflow retains tasks/artifacts, enforces exact-action approvals, reconciles interrupted effects and supports clean installation, diagnostics and backup/restore. Both providers pass the fixed evaluation and mandatory core and safety cases; clean-install and actual maintainer-workflow evidence pass. | Real-resource mutations stay disabled until recovery verification. No autonomous groups or broad distribution matrix. |
   | Gate 2: Reliable recurring work | Persistent schedules and one event source work with timezone/DST, missed-run, overlap, deduplication, bounded retry and credential-expiry policies. Service installation and awake-host/persistent-runner behavior are proven. The initial operator records five daily workflow runs in each of two consecutive weeks. | One event source and runner initially. Explicit memory notes precede embeddings. |
   | Gate 3: Controlled delegation | Extend the proven bounded handoff with selected autonomous delegation, recipient acceptance, preserved ownership on failure, work limits and a measured comparison to one bot. Coding dispatch enters only when the selected work requires it. | Local-worktree first if needed; no four-target parity gate. |
   | Gate 4: Broader access | One additional runner/client/provider combination has auth, reconnect, cancellation, artifacts, install/update, diagnostics and restore proofs. Each supported combination has a maintainer. | Additional combinations enter independently. |
   | Phase 5: Demand-led ecosystem | No formal pass yet. Activate only bounded capabilities supported by user evidence, owner, success measure and cost/support assessment. | Parked: marketplaces, demonstrations, autonomous groups, multiple displays/computer providers, native mobile and multi-user/SSO. |

   Gate 0 requirements are [KAT-3247](https://linear.app/kata-sh/issue/KAT-3247); Gate 1 requirements are [KAT-3245](https://linear.app/kata-sh/issue/KAT-3245). Later gates stay at outcome level until their predecessor passes, then get full child specs and an explicit verification issue before Todo. Milestone completion counts alone cannot establish runtime or product evidence.

6. **Current issue sequence**

   | Issue | Work | Prerequisite |
   | --- | --- | --- |
   | [KAT-3249](https://linear.app/kata-sh/issue/KAT-3249) | Apply the foundation review (complete) | User approval to apply review |
   | [KAT-3250](https://linear.app/kata-sh/issue/KAT-3250) | Record conversational-team strategy, evaluation and operating model | Owner-delegated direction |
   | [KAT-3254](https://linear.app/kata-sh/issue/KAT-3254) | Compare interactive team-workflow prototypes | KAT-3250 |
   | [KAT-3251](https://linear.app/kata-sh/issue/KAT-3251) | Establish provider eligibility, billing, versions and protocols | Provider evidence/access |
   | [KAT-3252](https://linear.app/kata-sh/issue/KAT-3252) | Specify/probe authority and recovery boundaries | Disposable research environment |
   | [KAT-3239](https://linear.app/kata-sh/issue/KAT-3239) | Foundation documentation and release identity (complete) | KAT-3249 |
   | [KAT-3242](https://linear.app/kata-sh/issue/KAT-3242) | First live provider task through CLI/daemon | KAT-3239, KAT-3250, KAT-3251, KAT-3252 and KAT-3254 |
   | [KAT-3243](https://linear.app/kata-sh/issue/KAT-3243) | Second provider and capability conformance | KAT-3242 |
   | [KAT-3247](https://linear.app/kata-sh/issue/KAT-3247) | Verify feasibility | KAT-3243 and research evidence |
   | [KAT-3240](https://linear.app/kata-sh/issue/KAT-3240) | Conversational team workflow with retained tasks/artifacts | Gate 0 |
   | [KAT-3244](https://linear.app/kata-sh/issue/KAT-3244) | Exact-action approvals on a controlled target | KAT-3240 |
   | [KAT-3241](https://linear.app/kata-sh/issue/KAT-3241) | Recover actions and enable the selected real target | KAT-3244 |
   | [KAT-3246](https://linear.app/kata-sh/issue/KAT-3246) | Package and diagnose the supervised workflow | KAT-3241 |
   | [KAT-3245](https://linear.app/kata-sh/issue/KAT-3245) | Verify the team workflow with benchmark and maintainer evidence | KAT-3246 |

   KAT-3238 remains the completed historical first-breakout record. Gannon is accountable maintainer and has delegated strategic product/research decisions to Codex. Select implementation/support owners before each start and record a maintainer per supported integration. Priorities express the current cut line; estimates follow the feasibility evidence. Record timeboxes as data, keep one delivery slice in flight, and report evidence, blockers and next decision in the weekly project update.

7. **Later capabilities and their prerequisites**

   Routines persist their configuration revision, schedule and trigger identity before execution. Define missed-run catch-up, overlap, retry safety and notification policy. Service installation arrives with scheduling. A local daemon cannot work while the host sleeps. Document that limit or provide a persistent runner at the same gate. MCP tools do not supply inbound subscriptions by themselves; the selected event source needs verified polling, an outbound connection or authenticated ingress. A loopback port alone cannot receive internet webhooks.

   Memory starts with explicit notes and user preferences carrying source, scope, creation/verification time and supersession/deletion state. Keep authoritative state in SQLite; native files are derived views. Test correction, conflicts, scope, deletion and abstention. Add embeddings only from measured retrieval failures; reconsider native-extension costs then. Explain deletion coverage across local content and provider-retained histories.

   Skills/connectors start disabled and require review and per-bot grants. Run snapshots identify exact versions. Prefer MCP-native integrations; Composio may be a user-provided MCP endpoint. Scope OAuth and credentials per resource, validate transport authentication, and do not silently inherit broader native configuration. Avoid changes to the user's global harness settings.

   Handoff carries task, constraints, evidence, allowed actions and expected result. The receiver accepts ownership; the sender retains it if acceptance fails. Filter candidates by capabilities and availability; start with explicit/deterministic routing. A classifier requires measured ambiguous cases and an abstain path. Bound ancestry, messages, attempts and elapsed work. Serialize conflicting resource writes. Group autonomy requires comparison with one-bot results.

   Four coding dispatch candidates exist: local-worktree, cursor-cloud, claude-cloud and codex-cloud. They have different capabilities and billing. Local dispatch records an exact base SHA, clean-worktree policy, checkout/branch, checks, artifacts and PR evidence. Completion and merge readiness remain separate; follow Linear ownership/merge gates. Add one cloud target at a time with explicit lifecycle/observation/cancel/follow-up proof. Keep external agent/run identifiers and reconcile through supported read interfaces. Never use teleport as a read-only observer or hide a replacement session as continuation.

   Distribution starts on macOS Apple silicon with a packaged CLI and browser team workspace. Keep economical cross-platform core CI without claiming every desktop combination works. Add Electron, remote access and other clients only when they improve the chosen workflow. Define update behavior, redacted diagnostics, backup/restore and support ownership before declaring a combination supported.

   Audit records, permission enforcement, execution limits, diagnostics and recovery are early requirements. Only richer presentation, ecosystem compatibility and unvalidated breadth are deferred.

8. **Verification and current evidence**

   The [verification map](verification/README.md) defines the required evidence. Product support, user value, security and recovery are unverified until their issues record actual results. The [provider register](compliance.md) records documentation findings without treating them as account approval or executed tests.

   Every behavior change includes fixture evidence and focused live evidence when it touches a provider boundary. The fixture isolates configuration, credentials, executable selection and network; PATH stripping alone is insufficient. Pure rendering changes use relevant UI evidence; approval, artifact, client-state and recovery changes also need behavior proofs.

   Record PASS, FAIL or UNVERIFIED per requirement with exact SHA, environment, versions, commands, expected/observed result and artifact links. Never replace a failed or missing live test with fake success. Preserve counts, scorer identity, corrections and counterexamples in evaluation reporting. No feature expansion during a failed gate; revise the spec when evidence changes scope.
