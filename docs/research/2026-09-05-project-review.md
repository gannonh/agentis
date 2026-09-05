# Agentis project review

September 5, 2026. Research and recommendations for Gannon Hall. This document proposes changes; it does not replace the current Linear spec or authorize Build.

Adoption note: Gannon subsequently authorized applying this review in [KAT-3249](https://linear.app/kata-sh/issue/KAT-3249). The [revised plan](../project-plan.md) records the accepted direction. Findings below describe the pre-revision snapshot; user validation and live provider experiments remain unperformed.

My recommendation is to revise Phase 0 before starting its nine implementation tickets. The plan specifies substantial infrastructure before proving its provider, product, and execution assumptions. Its most important improvement would be an earlier demonstration that Agentis can complete useful work, preserve ownership of that work across interruptions, and explain what happened.

I reviewed the Agentis Linear project, all eleven issue records KAT-3237 through KAT-3247 with relations and discussions, all six milestones, the milestone convention document, and project comments and updates. I read the complete repository plan, verified remote branch tips, and inspected selected archived Agentis design documents. External research used provider documentation, protocol specifications, library documentation and source, and research papers. No Agentis runtime exists on the reviewed main branch, so the findings concern the plan. I did not execute authenticated provider jobs, test competitors hands-on, or interview prospective users.

The repository snapshot is `61b01dd97998e3340867fbf413a14aafb4e2b917`. Remote `main` already points there; `archive/agentis-v1` remains at `78bf37491942552b6cb14cfe43b1a7463b723f48`. The working tree was clean before this report. The eleven Linear records comprise the epic, one completed planning issue, and nine Backlog implementation issues. The project's In Progress status is consistent with its documented use as a live-project roster, not evidence that Build has started. [Linear project](https://linear.app/kata-sh/project/agentis-63da0b4e8294), [milestone convention](https://linear.app/kata-sh/document/milestone-use-kata-sh-16084ef16dd5), [reviewed plan](https://github.com/gannonh/agentis/blob/61b01dd97998e3340867fbf413a14aafb4e2b917/project-plan.md).

1. **Define a first user and a result they will repeatedly use.**

   The product definition lists a roster, shared computer, routines, memory, groups, connectors, mobile clients, and coding dispatch. It does not select a first customer, establish their current workaround, or specify why they would return after trying the product. Feature parity cannot resolve those questions.

   My proposed initial user is a technical founder or operator managing recurring work across documents, issue trackers, and repositories. This is a hypothesis based on the proposed capabilities, not validated demand. Start with one recurring workflow: review selected sources, produce a cited briefing and proposed actions, then carry an approved action through to a verifiable result. Let a user begin with one named bot and add a specialist when the work calls for it.

   Before expanding implementation, observe five prospective users doing this work with their current tools. Collect ten concrete tasks, their inputs, expected outputs, frequency, setup burden, and actual time spent reviewing and correcting results. Include failures and abandoned tasks. Use the same tasks to compare Agentis with the user's existing agent application.

   The first release should answer: Can a user give Agentis this job again next week with less supervision? Choose a primary measure such as accepted recurring outcomes per active user per week. Track review time and correction effort alongside it. Bot count, messages sent, and successful model responses do not establish product value.

   If the evidence instead favors repository work, bring local coding dispatch forward and narrow the first product accordingly. If it favors research and operations, defer coding dispatch until the first recurring non-coding workflow earns repeat use. The present plan commits to both without evidence about their relative value.

2. **Rewrite the differentiation around control and continuity.**

   The claim that Grok Bot cannot reach local files is too broad. Its current documentation describes configurable local command execution and private-network access. Those features do not establish equivalence with direct local stdio MCP, but they invalidate a categorical local-access distinction. [Grok Bot local execution](https://docs.x.ai/grok-bot/approvals-security-and-privacy), [private networks](https://docs.x.ai/grok-bot/private-networks).

   Named bots, routines, and shared computers already appear in Grok Bot's documented product. Zed also documents hosting external agents over ACP. Agentis needs a reason to exist beyond collecting those capabilities in another interface. [Grok Bot overview](https://docs.x.ai/grok-bot/overview), [Zed external agents](https://github.com/zed-industries/zed/blob/main/docs/src/ai/external-agents.md).

   I would test this product promise: "Agentis runs recurring work through the agents you choose, keeps the results and decisions under your control, and lets you recover or take over unfinished work."

   Make that promise observable through portable task records, retained artifacts, clear approval history, explicit execution location, and recovery that does not silently repeat external actions. Provider independence should mean that Agentis retains the user's work when a provider becomes unavailable. It should not imply that hidden provider session state transfers perfectly between engines.

   Local storage also needs precise language. A self-hosted daemon can still send prompts, files, and tool results to model and connector providers. Explain the data path during setup. Do not describe self-hosting alone as keeping all information on the machine.

3. **Validate provider access before committing to universal subscription support.**

   The plan assumes users can run bots through existing subscriptions while official CLIs hold credentials. Credential custody and permission to offer that integration are separate questions.

   Anthropic's Agent SDK documentation says third-party products need prior approval to offer claude.ai login or rate limits. The proposed Claude ACP adapter explicitly uses that SDK. These sources do not establish Agentis's eligibility. Record provider confirmation or a clearly supported authentication mode before advertising Claude subscription support. This is a dependency on a provider's published integration policy, not a conclusion that every local CLI invocation is prohibited. [Anthropic SDK policy](https://code.claude.com/docs/en/agent-sdk/overview), [Claude ACP adapter](https://raw.githubusercontent.com/agentclientprotocol/claude-agent-acp/main/README.md).

   Cursor documents Cloud Agents as charged at model API pricing and asks users to set a spending limit. A subscription login therefore does not justify a promise of no additional usage cost. Show the billing mode and applicable limits for each execution target. [Cursor Cloud Agents billing](https://cursor.com/docs/cloud-agent).

   Create a short provider evidence matrix before the main runtime contract is approved:

   | Integration | Evidence already available | Required proof for Agentis |
   | --- | --- | --- |
   | Codex local | Official app-server supports rich clients and Codex-managed ChatGPT authentication | Approval, cancel, recovery, MCP, model discovery, and installed-version behavior |
   | Cursor local | Official ACP documentation includes authentication, sessions, permission requests, and extensions | Per-bot configuration isolation and full handling of blocking requests |
   | Claude local | ACP adapter uses the Agent SDK | Allowed distribution/authentication path plus the same behavioral checks |
   | Cursor cloud | Documented beta API for agents and runs | Durable observation, cancellation, result reconciliation, and cost display |
   | Claude cloud | Current docs describe creation and CLI follow-ups | Pinned CLI version, account eligibility, observation, and cancellation contract |
   | Codex cloud | Installed CLI exposes experimental exec/status/list/diff/apply | Machine-readable lifecycle and precise support for follow-up, cancel, and PR creation |

   Local inspection found Codex CLI 0.150.1 and Claude Code 2.1.185. Those are observations about this machine, not support guarantees. Do not advertise an integration because a preset exists or a command is installed.

4. **Use ACP as an integration option with explicit capabilities.**

   The generic ACP engine is a reasonable starting point. The plan's claim that providers differ mainly by command and detection presets is too optimistic.

   ACP makes session loading conditional on the advertised `loadSession` capability. Loading can also replay conversation history, so Agentis must reconcile that history with its own transcript. A provider session identifier, an Agentis thread identifier, and an execution attempt identifier need distinct meanings. [ACP session setup](https://agentclientprotocol.com/protocol/v1/session-setup).

   Cursor's ACP documentation defines blocking question and plan-approval methods. A client that handles only text and ordinary tool approvals can hang. Supporting these requires protocol behavior beyond a command preset. [Cursor ACP](https://prod.cursor.com/docs/cli/acp).

   Add capability fields only for behavior the first workflow exercises: session recovery, permission requests, user questions, MCP configuration, attachments, and usage reporting. Report unsupported behavior explicitly. Include typed reasons such as unavailable binary, authentication required, unsupported operation, provider limit, and lost session.

   OpenAI explicitly presents app-server as an interface for integration into other products, including conversation history, approvals, authentication, and streamed events. Evaluate a direct Codex adapter against codex-acp in the first provider proof. Choose one supported Codex path for the first release based on capability and maintenance evidence. The current plan reserves non-ACP support for a distant escape hatch even though a first-party option is already relevant. [Codex app-server](https://learn.chatgpt.com/docs/app-server).

   Keep one public engine contract, a shared ACP implementation, and small provider-specific modules where actual behavior requires them. Avoid speculative adapters and stubs that appear selectable in the UI.

5. **Replace the Phase 0 dependency chain with working slices.**

   The current blockers are approximately docs → toolchain → contracts → core and engines → server → UI and CLI → verification. Live providers are deferred to the final verification issue. That exposes API and permission assumptions after the surrounding architecture has already been implemented. [Engine ticket](https://linear.app/kata-sh/issue/KAT-3243), [verification ticket](https://linear.app/kata-sh/issue/KAT-3247).

   A package is a code boundary. It does not need to be a delivery milestone. Keep modular code, but let each implementing issue change the narrow path through contracts, runtime, server, and UI required to demonstrate a result.

   I would deliver the foundation in this order:

   | Slice | Demonstrable result |
   | --- | --- |
   | Provider proof and minimal scaffold | One real provider performs a bounded task; an approval is accepted and denied; cancellation stops work |
   | Persistent task through the UI | User submits a task, sees progress, opens a saved artifact, refreshes, and still sees the correct result |
   | Recovery and authorization | Forced interruption produces an accurate state; stale approvals fail; retries do not duplicate controlled actions |
   | Second provider | The same workflow runs through a second provider; unsupported capabilities are visible |
   | Repeatable installation and evidence | A clean install reproduces the workflow; the fake fixture exercises failure cases; both live provider paths pass |

   Build contracts from the exercised workflow. Remove Phase 3 DispatchEvent stubs from Phase 0. Keep useful cross-platform checks, but replace placeholder smoke tests with an actual packaged startup and fixture exchange as soon as the first slice exists.

6. **Make task ownership and execution attempts explicit.**

   The current object hierarchy centers Bot → Thread → Turn → Item. That is sufficient for a chat transcript but ambiguous for a routine that retries, hands off, dispatches externally, and continues over several conversations.

   Add a minimal Task and Run distinction. A Task holds the requested outcome, current owner, relevant workspace, constraints, and completion evidence. A Run records one attempt with its provider session, configuration snapshot, status, timing, and result. A Thread is the conversation about the work. An Artifact is an output the user can inspect and retain. Avoid a generic workflow engine at this stage.

   Group threads should have participants; placing them exclusively under a single Bot needs an explicit ownership rule. A bot can be the current task owner without owning every conversation or artifact forever.

   Freeze the bot configuration, selected skills, grants, model settings, and workspace for each run. Changing a bot's profile or permissions halfway through a run must have defined behavior. The previous Agentis ADR already recognized versioning tool permissions with agent configuration. Preserve that design lesson. [Archived permissions ADR](https://github.com/gannonh/agentis/blob/78bf37491942552b6cb14cfe43b1a7463b723f48/docs/adrs/0002-version-native-tool-permissions-with-agent-configuration.md).

   This distinction also gives the UI useful answers: who owns this task, what attempt is active, what is waiting on the user, and which output proves completion.

7. **Specify recovery before describing the core as durable.**

   "Restart preserves transcripts and resumes" currently conflates a readable history, SSE reconnection, provider-session recovery, and continued execution. Separate their acceptance criteria.

   Consider a bot posting an approved update. The service accepts the update; the daemon crashes before recording success. An idempotency key on the original chat command does not prevent a second post. Recovery needs a recorded action intent, the external receipt when available, and a way to reconcile uncertain outcomes.

   For the first workflow, persist command receipt, state transition, event, and pending execution intent transactionally. Use external idempotency keys where supported. If the remote result cannot be established, show an explicit unknown outcome and require reconciliation before retrying. Never replay external effects merely because the transcript is being rebuilt.

   A minimal run lifecycle should distinguish queued, running, waiting for approval, waiting for input, interrupted, reconciling, succeeded, failed, and canceled. An uncertain external action can remain a separate action state under the run. Completion must be terminal for that attempt; a follow-up creates a new attempt linked to the same task.

   Test crash boundaries around launch, tool acceptance, approval persistence, provider completion, and UI notification. On restart, locate or stop orphaned children before starting replacement attempts. Graceful shutdown tests alone cannot prove behavior after a forced process kill.

8. **Simplify persistence while retaining an audit record.**

   SQLite, a single local daemon, schema validation, and HTTP commands with SSE are proportionate choices. Full event sourcing across all domains adds event-version handling, deterministic projection rebuilds, snapshots, and retention obligations before the product needs them.

   My default would be transactional current-state tables, an append-only record of meaningful transitions, and a small table of pending external work. Write state and its event together. Introduce event-sourced domains only if reconstructing their state from historical events is an actual requirement. An audit trail and client replay do not by themselves require every domain to be event-sourced.

   Define retention separately for durable decisions, message content, token deltas, tool output, screenshots, and downloaded files. Keep large or deletable content behind blob references. Otherwise the later "forget" action will remove a memory row while leaving the same content in logs, summaries, exports, or provider histories. Describe deletion coverage honestly.

   For SSE, specify the snapshot cursor, snapshot-to-stream ordering, duplicate suppression, expired-cursor response, bounded subscriber queues, reconnect behavior, and authorization filtering. A global sequence number does not settle those behaviors. Disconnecting a slow viewer should not block agent execution.

   `node:sqlite` exposes synchronous database operations in the versioned Node 24 documentation inspected. Keep transactions short and measure event-loop latency during replay and large histories. If the measurements require a worker, give that worker sole database ownership. Do not split the daemon into another language without evidence. [Node SQLite API](https://nodejs.org/download/release/v24.13.1/docs/api/sqlite.html).

9. **Honor the Effect preference through a coherent architecture decision.**

   Gannon's epic reply already selects CLI 2.0 and `gannonh/agentis`, and prefers Effect with TypeScript while leaving the backend choice dependent on requirements. The issue descriptions still frame those choices as unanswered. [Epic and discussion](https://linear.app/kata-sh/issue/KAT-3237).

   I recommend TypeScript with Effect on Node for the daemon and client service code. Use it for process lifetime, cancellation, bounded queues, retries of safe operations, timeouts, and typed failures. These are immediate runtime concerns. Effect scopes provide resource acquisition and release mechanisms, but they do not make side effects durable across a process crash. [Effect resource scopes](https://effect.website/docs/v3/resource-management/scope).

   Use React normally for presentation, with Effect-backed services at asynchronous boundaries. A Rust backend would add a second implementation language and integration boundary before a demonstrated need. Reconsider it only for a measured resource problem or a native capability that cannot be obtained through a suitable dependency.

   Resolve schema ownership before KAT-3240. Prefer one canonical schema system. Evaluate Effect Schema and its HTTP API/client/OpenAPI facilities before committing to Zod plus separate generators and a second validation vocabulary. Upstream HttpApi source explicitly supports deriving these consumers from one description. [Effect Schema](https://effect.website/docs/v3/schema/introduction), [Effect HttpApi source](https://raw.githubusercontent.com/Effect-TS/effect/main/packages/effect/src/unstable/httpapi/HttpApi.ts).

   Version discipline matters: Effect's current site advertises 4.0 as a release candidate, while older documentation routes lead to v3 and current HTTP API source is under an unstable namespace. Pin one tested version family and use matching documentation. Do not let different implementation tickets select incompatible examples independently. My default is the supported stable release unless the provider proof establishes a concrete reason to accept the release candidate. [Effect release status](https://effect.website/).

10. **Replace loopback-owner authorization before enabling real tools.**

    KAT-3244 explicitly requires loopback requests to receive owner privileges without a bearer. That creates an authorization design risk for a service able to control tools and resolve approvals. A local source address does not identify the user or distinguish the user's browser from a bot process. [Server ticket](https://linear.app/kata-sh/issue/KAT-3244).

    Use authenticated local sessions, strict Host and Origin validation, and a deliberate CLI bootstrap path. A one-time local browser bootstrap can exchange a short-lived code for an HttpOnly same-origin cookie. CLI access can use an OS-protected credential. Validate mutating requests independently of UI visibility. The MCP transport specification specifically calls for Origin validation against DNS rebinding and recommends authentication even for local servers. Apply the same reasoning to Agentis's privileged HTTP interface. [MCP transport security](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

    Give bot tools credentials scoped to the bot, run, and allowed commands. A bot's MCP connection must not be able to approve its own action, increase its grants, or impersonate the owner. The generic `--mcp` control interface needs a separate privilege model from the owner's CLI.

    If a harness runs with unrestricted access as the same OS user, it may be able to read the daemon's credentials or contact its control endpoints. Tokens alone cannot isolate arbitrary code with equivalent OS privileges. Document that trust model and enforce filesystem/network isolation when claiming restrictions against the agent. Include access to the owner's credential stores and admin API in the first execution-boundary proof.

11. **Make approvals enforceable and bind them to the exact action.**

    An approval card is only a presentation. The daemon must validate its scope, run, target, arguments or content digest, expiry, and resolver identity. Reject a stale card after the proposed action changes. Resolve competing browser-tab responses atomically. Persist the decision before allowing controlled execution.

    Map provider permission semantics explicitly, including session-wide grants, plan approval, questions, cancellation, and decisions surviving a disconnected UI. Show users what they are approving: recipient, destination, file or workspace, external effect, and duration of permission.

    Agentis-owned MCP policy cannot prevent a harness from performing the same action through its built-in shell, browser, native connector, or inherited configuration. Decide which routes are permitted and test those boundaries. Per-bot connector enablement must not imply stronger isolation than the actual runtime supplies.

    Move stop-all, run deadlines, maximum concurrent runs, bounded retries, and action limits into the first tool-enabled release. Add provider cost accounting where observable, but label missing usage as unknown. Exact hard dollar limits are not credible if a provider exposes delayed usage or no enforceable budget interface.

    The claim that every tool action is audited also needs a coverage definition. Record actions mediated by Agentis and events supplied by the harness. Do not claim complete observation of undisclosed internals. A local append-only table is not automatically tamper-proof against code that can write the database.

12. **Separate the execution environment from a bot's screen.**

    The architecture puts harnesses in local child processes while Docker owns the bot computer. That leaves an important unresolved question: when the harness invokes its built-in terminal or file tools, does it operate on the host or inside the displayed computer? The answer affects both correctness and security.

    Define an execution environment containing workspace roots, process location, filesystem access, network policy, secret access, and computer resources. Mount those resources consistently. The UI should always identify where a task is running and what data it can reach.

    Separate displays prevent some focus conflicts. They do not isolate files, browser profiles, cookies, shared downloads, or account actions. Grok Bot explicitly documents its account-wide shared-computer boundary; Agentis should make its own boundary equally clear. [Grok Bot shared computer](https://docs.x.ai/grok-bot/overview).

    Start computer use with one controlled browser environment and takeover behavior. Add parallel screens only after proving resource ownership for browser profiles, downloads, and shared workspace writes. Let users share specific resources deliberately. Do not implement Docker desktop, host control, and Docker over SSH together in Phase 1.

    Require an end-to-end proof that the model can consume a screenshot, act through the selected tools, recover from a blocked interaction, and return an artifact. A screenshot API alone does not prove the selected coding harness performs the intended non-coding workflow reliably.

13. **Move background reliability alongside the first routine.**

    Routines arrive in Phase 1, unattended morning briefings form part of Gate 2, and service installation waits until Phase 4. Define what unattended means when the laptop sleeps, the application closes, credentials expire, or the machine misses a schedule.

    The first routine needs a persistent schedule, timezone and daylight-saving policy, missed-run behavior, overlap policy, deduplication key, run deadline, bounded retry policy, and visible failure reason. Persist the work before acknowledging a trigger. Treat changing a routine as a configuration revision so an active attempt has a stable definition.

    Install the daemon as a service on the first supported runner when scheduled work becomes part of the product promise. A local service still cannot execute while the host sleeps. Either explain the awake-host requirement or support a persistent remote runner at that milestone. Broad remote-access UI can come later.

    MCP tool availability does not establish an inbound event subscription. Slack or GitHub triggers need their own delivery mechanism, credentials, verification, and deduplication. A separate loopback webhook port is not reachable by an external service. Select one trigger source and specify polling, a persistent outbound connection, or authenticated ingress as part of that vertical slice.

    The archived invocation-worker guide already specifies durable claims, unique scheduled slots, stale-claim behavior, signed webhooks, replay windows, and payload limits. Use those requirements as a checklist rather than rediscovering them after routines fail. The archive is evidence of previous design work, not proof that its code meets the new architecture. [Archived invocation worker](https://github.com/gannonh/agentis/blob/78bf37491942552b6cb14cfe43b1a7463b723f48/docs/guides/invocation-worker.md).

14. **Design memory around correction, provenance, and deletion.**

    The plan moves from MEMORY.md and topic files to summaries and top-k vector retrieval. It never settles which representation owns a fact or how a correction removes its prior meaning from all retrieval paths.

    Start with explicit preferences and source-linked notes. Store scope, source, creation time, last verification time, and replacement/deletion state. Distinguish an instruction explicitly given by the user from a model's inference. Treat retrieved content as evidence with provenance, not as authority to change permissions.

    Use SQLite as the canonical store if that remains the persistence decision. Generate native memory or skill files as derived views where necessary. Do not allow independent edits in both files and database without an ownership rule. Do not modify a user's global harness configuration simply to enable one bot.

    Evaluate useful behavior before selecting an embedding system: recall a preference, prefer a newer correction, resolve conflicting notes, respect a workspace scope, forget a deleted fact, and abstain when the answer is unavailable. LongMemEval explicitly evaluates temporal reasoning, updates, and abstention alongside recall. Those categories are a useful starting point for Agentis tests; benchmark scores are not evidence of performance on this product's workflows. [LongMemEval](https://arxiv.org/abs/2410.10813).

    Begin with scoped text search and explicit notes. Add embeddings only when measured retrieval failures justify them. The later sqlite-vec choice also adds a SQLite extension, so reconcile it with the blanket no-native-dependencies requirement before implementation. [sqlite-vec](https://github.com/asg017/sqlite-vec).

15. **Constrain collaboration before adding group autonomy.**

    Description matching answers which bot sounds relevant. It does not establish which bot has the required tools, capacity, permissions, or context. A handoff should carry the task, constraints, evidence, allowed actions, and expected result. The recipient should accept ownership explicitly, and the sender should retain responsibility if acceptance fails.

    Start with user-selected delegation or deterministic routing for the first recurring workflow. Add a classifier only after collecting ambiguous cases. Filter candidates by capabilities and availability, provide an abstain path, and prevent a handoff from increasing authority.

    One-hop depth is useful but does not prevent messaging loops, duplicate responses in groups, recursive coding dispatch, or two agents changing the same resource. Track the task's delegation ancestry and cap total work, messages, and elapsed time. Serialize conflicting writes, not all activity globally.

    Research on multi-agent failures identifies system-design, inter-agent alignment, and verification failures. It supports testing coordination explicitly; it does not establish that more agents will improve Agentis's outcomes. Compare a single bot against a delegated version on the same tasks before adding autonomous group behavior. [MAST research](https://arxiv.org/abs/2503.13657).

16. **Treat cloud dispatch as target-specific execution with a shared result model.**

    Engine choice and execution target are separate concepts worth keeping. The current dispatch interface nevertheless makes create, follow-up, cancel, observe, and PR delivery look more uniform than the evidence establishes.

    Cursor's current v1 API is a public beta with a durable agent and separate runs. Its SSE stream is scoped to one run, and v1 webhooks are listed as forthcoming. Store both external identifiers and reconcile state through the supported read APIs after reconnecting. [Cursor Cloud Agents API](https://prod.cursor.com/docs/cloud-agent/api/endpoints).

    Freshly opened Anthropic documentation confirms `claude --cloud` and follow-up submission. Follow-up submission queues a message and exits; it does not wait for completion, and that path does not support stream-json. Teleport changes local repository state and session context. It should not serve as a read-only observation method for a background dispatcher. Older search results showed the deprecated `--remote` spelling, which is why the freshly fetched documentation is the basis for this recommendation. [Claude cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web).

    Start with local worktree dispatch if the chosen workflow needs code changes. Resolve the requested base to a commit, record the checkout and branch, define dirty-worktree behavior, run acceptance checks, and retain evidence with the resulting PR. A job can finish successfully without being merge-ready. Respect the project's Linear ownership and merge gates when executing repository work.

    Add one cloud target next. Require a supported lifecycle proof before adding the others. Show unsupported follow-up or cancel behavior explicitly. Do not conceal a switch to a new provider session as continuation of the original one.

    Gate 3 also needs a count correction: the design lists four execution targets, while the plan refers to three. Replace "as applicable" with an explicit supported-target matrix and per-target acceptance criteria.

17. **Strengthen the gates around useful outcomes and failure handling.**

    Gate 0's "live or documented dropout" wording is ambiguous even though its constraints say not to fake a pass. A provider blocked on authentication remains unverified. A fixture pass can establish Agentis protocol behavior; it cannot establish live provider compatibility. [Gate 0 ticket](https://linear.app/kata-sh/issue/KAT-3247).

    Keep fixture evidence, with temporary configuration and data, an explicit fake-engine registry, no real credential access, and controlled network access. Removing PATH entries alone does not prevent absolute executable paths, inherited credentials, or child processes from reaching real services.

    Replace "three consecutive sessions" as the main daily-use gate with a defined task set and observation window. Suggested initial targets below are product proposals, not industry standards or measured Agentis performance:

    | Dimension | Proposed early gate |
    | --- | --- |
    | Installation | At least 4 of 5 pilot users reach a first accepted result without a developer editing configuration |
    | Usefulness | At least 18 of 20 defined tasks produce an accepted artifact or completed action; report human correction time |
    | Repeat use | At least 3 pilot users repeat the selected workflow during a second week |
    | Authorization | No unapproved controlled action in the adversarial test set; no self-approval through bot tools |
    | Recovery | Every tested interruption resolves to an accurate state; no automatic duplicate of an uncertain non-idempotent action |
    | Provider support | Each advertised provider passes the live workflow with pinned version and capability evidence |
    | Operations | Scheduled runs, missed triggers, cancellation, credential expiry, backup, and restore have recorded proofs |

    Measure task quality separately from runtime correctness. Use deterministic fixtures for failure handling and curated real tasks for output quality. Publish the number of trials and failures. Twenty tasks can guide an early pilot; they cannot establish a production reliability guarantee.

18. **Preserve artifacts and reduce setup work in the first user experience.**

    The current early UI emphasizes engine doctor, roster, and bot settings. Users should encounter a supported task template, connect only the required capability, and get a useful result before configuring a roster. Keep model and effort controls available in settings; supply clear supported defaults in the first-run path.

    Build a task view around outcome, owner, progress, waiting reason, actions, artifacts, and evidence. Chat remains available, but finding the finished work should not require searching a long transcript. Notifications should lead to the exact pending decision or result and stay quiet when nothing actionable changed.

    Bring back a minimal Artifact record: type, file or URL, originating task/run, creation time, and the evidence needed to inspect it. The archive already has an artifact/provenance model. Reuse that understanding selectively, without importing its whole Library system. [Archived artifact ADR](https://github.com/gannonh/agentis/blob/78bf37491942552b6cb14cfe43b1a7463b723f48/docs/adrs/0005-use-artifact-as-library-primitive.md).

    Include readable approval cards, keyboard operation, recoverable errors, large-transcript behavior, and safe rendering of model-generated content. A stream can work correctly while the UI still makes the product difficult to trust or use.

19. **Narrow distribution and define the operating model.**

    Phase 1 combines an npm CLI, Docker/Caddy deployment, and signed Electron releases on three operating systems. Alongside three computer providers and more engine presets, that creates a large support matrix before the first user-value gate.

    Pick one primary pilot environment based on the selected users. Keep inexpensive portable CI, but distinguish core compatibility from a fully supported desktop distribution. Prove installation, start/stop, update interruption, and recovery on the primary environment first. Add the Electron shell when desktop notifications or takeover materially improve the selected workflow.

    Keep the chosen 2.0 package identity. Explicitly recognize old Agentis data and refuse accidental overwrite. Preserve the user's originals and provide a separate new data location or documented fresh-start procedure; do not add a v1 compatibility layer. The plan's versioned-migrations requirement and the repository's blanket no-migrations rule need an explicit policy resolution before either is implemented. The review does not assume an exception.

    Define who maintains each supported integration, how an incompatible provider release disables support safely, and what diagnostic bundle a user can export without secrets. Account for persistent-computer cost, model usage, connector charges, disk growth, and maintenance effort when comparing self-hosting with hosted alternatives.

    Choose whether the first release is a personal tool, a maintained community product, or the foundation of a paid service. If sustainability requires revenue, test willingness to pay for managed operation or administration before investing in a marketplace. Self-hosting and open source describe delivery and licensing; they do not establish distribution or a business model.

20. **Reconcile Linear with the decisions and evidence already present.**

    I recommend the following edits before approving Build. These are proposed changes; I have not applied them to Linear.

    | Existing issue | Proposed revision |
    | --- | --- |
    | [KAT-3237](https://linear.app/kata-sh/issue/KAT-3237) | Record the user's settled 2.0/repository choices and Effect preference. Add first-user hypothesis, first workflow, provider-access evidence, success measures, and explicit non-goals. Link durable architecture decisions under docs. |
    | [KAT-3238](https://linear.app/kata-sh/issue/KAT-3238) | Retain the completed historical planning record. Its verification proved the original breakout existed, not that the approach was sound. Create a new revision-planning issue if adopting this review. |
    | [KAT-3239](https://linear.app/kata-sh/issue/KAT-3239) | Recognize that remote main already contains the rebuild and the archive tip is intact. Remove settled version/home blockers. Keep missing license, notices, contribution docs, verification rules, and a clear unshipped quickstart. |
    | [KAT-3242](https://linear.app/kata-sh/issue/KAT-3242) | Select a coherent Effect/schema version and tested Node range. Build only the scaffold used by the first slice. Replace placeholder smoke evidence with real packaged startup. |
    | [KAT-3240](https://linear.app/kata-sh/issue/KAT-3240) | Derive the smallest contracts from the first workflow, settle schema ownership, and remove future dispatch stubs. Define task/run/approval identifiers and failure states. |
    | [KAT-3241](https://linear.app/kata-sh/issue/KAT-3241) | Decide transactional state versus full event sourcing. Add atomic action intent, reconciliation, cursor expiry, retention, and backup/restore requirements. Resolve the migration-policy conflict. |
    | [KAT-3243](https://linear.app/kata-sh/issue/KAT-3243) | Move live provider proof to the beginning. Add native-protocol comparison, authentication eligibility, capability negotiation, blocking requests, cancellation, and session recovery. Remove selectable stub support. |
    | [KAT-3244](https://linear.app/kata-sh/issue/KAT-3244) | Replace unauthenticated loopback-owner AC. Define owner versus bot authority, resource ownership, forced-crash behavior, and bounded streaming. |
    | [KAT-3245](https://linear.app/kata-sh/issue/KAT-3245) | Deliver the first useful task, artifact, approval, failure, and recovery path. Make settings support that workflow. Define state ownership instead of merely banning a large store file. |
    | [KAT-3246](https://linear.app/kata-sh/issue/KAT-3246) | Bring the fixture launcher into the first runtime slice. Separate owner CLI and scoped bot MCP. Keep explicit endpoint selection; split broad control/MCP features if not needed by the first workflow. |
    | [KAT-3247](https://linear.app/kata-sh/issue/KAT-3247) | Require real evidence for every advertised provider. Separate transcript restore from execution recovery. Add failure-boundary and authorization proofs. A dropout remains blocked or unverified. |

    Keep Linear as the acceptance/status authority and repository documents as the durable product and architecture rationale. Move the root project plan into docs when revising it, and link one canonical version from the epic. Avoid maintaining a second accepted specification that silently disagrees with Linear comments.

    Label gates by outcomes, retaining the project's existing milestone convention. My proposed sequence is:

    | Milestone | Exit evidence | Deliberately deferred |
    | --- | --- | --- |
    | Feasibility | Chosen user/workflow; provider-policy evidence; live bounded task through two providers; execution-boundary proof | Large package skeleton, third engine, computer providers |
    | Useful supervised work | A real task produces an accepted artifact, with approval and recovery visible through one client | Autonomous groups, advanced memory, cloud dispatch breadth |
    | Reliable recurring work | Persistent schedules and one event source; missed-run policy; pilot repeat use; budgets and diagnostics | Marketplace, multi-screen concurrency, multiple remote transports |
    | Controlled delegation | One specialist handoff and, if validated by users, local coding dispatch with verification evidence | Four-target parity gate |
    | Broader access | One proven remote runner and additional client/provider combinations added independently | Enterprise and marketplace scope without demand |

    Add research or decision issues only for uncertainties that can change this sequence: first workflow, provider authentication, execution isolation, recovery model, and schema/runtime choice. Keep later features at low detail until their predecessor works. Assign decision owners and evidence-based exit conditions rather than collecting open questions indefinitely.

    All nine implementation tickets currently have High priority. Express the actual cut line through the revised milestone scope and dependency order. Give each outcome an accountable owner, and record estimates only after the provider and execution proofs reduce the uncertainty. Counting the completed planning ticket as Gate 0 progress is administratively valid, but report product evidence separately from issue completion.

The choices I would retain are the single-user starting point, TypeScript/React reuse, one local SQLite store, HTTP commands and SSE, an explicit engine boundary, isolated verification fixtures, graceful unavailability, fresh licensing/identity, and deferred native mobile clients. The changes above preserve those choices while bringing product evidence, authority boundaries, and recoverable execution to the start of the project.
