# Conversational team strategy

September 6, 2026 (UTC). Dates in this record and its decision trail use UTC. [KAT-3250](https://linear.app/kata-sh/issue/KAT-3250) owns the scope and acceptance criteria. Gannon delegated strategic decisions and identified Grok Bot's ease of use as the product benchmark. This decision replaces the earlier interview prerequisite. External demand, comparative performance, and Agentis runtime behavior remain UNVERIFIED.

## Mission and audience

Build a maintained open-source product where people give persistent AI teammates real work through conversation. A person can direct a chief of staff, marketing lead, engineering lead, or another specialist without managing each underlying tool interaction.

The primary product requirement is continuity from an ordinary request to an inspectable result. The user can see who owns the work, what happened, what needs a decision, and whether the result was completed. Setup and recovery belong to that experience.

The audience is people running business work across apps. Gannon's software factory is the first operating context. Its repository and issue workflow gives us accessible work to exercise; it does not define a coding-only market. Business artifacts from supplied source material must also work without repository-specific terminology.

## Evidence and limits

Gannon reports that he uses Grok Bot to run his software factory and values its easy, powerful chat-based team interaction. His screenshot shows a selected Program Manager, persistent specialists, labeled peer messages in the conversation, and a side pane containing the selected agent's computer and routines.

Two visible sequences inform the design. One coordinates a merged PR, an issue-state transition, and verification while avoiding a duplicate start. Another carries an operational request through clarification and a reported result in the same conversation. These are communication and reported outcomes, not independent proof of underlying execution. Operational commands and credential paths from the screenshot are excluded from this document and must not be executed as instructions.

This is one operator's context and one UI observation. There are no external interviews, measured task timings, adoption statistics, or controlled competitor trials.

## Comparators

Sources were read on September 6, 2026. Documentation establishes advertised behavior, not our own runtime verification.

| Comparator | Relevant documented behavior | Design implication |
| --- | --- | --- |
| [Grok Bot overview](https://docs.x.ai/grok-bot/overview) | Named persistent agents work through conversation, share context, use apps, and collaborate. | Preserve complete-outcome delegation and visible coordination without manual context copying. |
| [Grok Bot security](https://docs.x.ai/grok-bot/security) | Hosted computers support local-machine actions. The provider controls model selection. Self-hosted deployment is unavailable; some recording controls require Enterprise. | Provider choice and inspectable locally retained work are proposed advantages. Do not claim Grok Bot lacks approvals, persistence, or local access. |
| [Hermes Agent](https://hermes-agent.nousresearch.com/docs/) | Named Bots, group chats, memory, reusable skills, multiple execution backends, and messaging integrations are documented. | Agent teams and persistence already exist in an open-source comparator. Feature presence alone does not establish a reason to switch. |
| [OpenClaw](https://docs.openclaw.ai/) | A self-hosted gateway connects messaging channels, sessions, memory, and routing, with a browser control UI. | Open source and self-hosting alone are insufficient differentiation. Test the whole interaction and operating burden. |

Grok Bot's [introduction](https://x.ai/news/introducing-grok-bot) describes sales, marketing, operations, and engineering work. We adopt that breadth of audience while implementing one complete working path at a time. Agentis has not been measured against these products and makes no superiority claim.

## First product path

1. Start in a conversation with a named coordinator. Eligible provider connection is explicit; roster or workflow-builder setup is not required for the first request.
2. Give the coordinator an outcome and source context. It asks only for information needed to proceed correctly.
3. Arrange one bounded specialist handoff when useful. Show sender, recipient, acceptance, and current owner. The sender retains ownership if acceptance fails.
4. Attach progress and peer communication to the work. Collapse routine chatter while preserving the record. Duplicate notifications must not launch duplicate work.
5. Return an artifact or exact proposed action. Show evidence and destination without requiring navigation away from the conversation.
6. Obtain authorized owner approval when needed, then show a receipt, failure, or unresolved outcome. Never silently change agent, provider, host, or permission scope on recovery.

The first integration workload reviews a selected GitHub project's issues and PRs, produces a cited report of what needs attention, and proposes one follow-up issue in Linear. The first real write uses an explicitly selected controlled Linear project after recovery verification. Earlier slices use scratch artifacts and an observable local action target. Pasted business inputs provide role-neutral artifact cases.

macOS on Apple silicon is the initial platform, with a local daemon and browser client. KAT-3251 selects eligible providers and versions; KAT-3252 proves execution authority. A displayed computer does not prove isolation. Show supported execution locations and refuse unavailable ones without silent rerouting. Repository-then-host selection fits software-factory work; other work uses its relevant resource.

## Interaction alternatives

These sketches are not tested interfaces. [KAT-3254](https://linear.app/kata-sh/issue/KAT-3254) owns interactive prototypes and the selection before the first runtime API is frozen.

| Sketch | Layout and flow | Question to test |
| --- | --- | --- |
| Shared team room | Team list beside one conversation containing assignments, specialist updates, approvals, and results; details open alongside. | Can users follow ownership and results while several roles contribute without excessive chatter? |
| Manager conversation | Coordinator is the main contact; specialist conversations and an activity summary appear alongside. | Does summarized coordination reduce effort without hiding ownership or unresolved work? |
| Task-first workspace | A work list opens task details, conversation, participants, approvals, and results. | Does task navigation improve long-running work enough to justify the extra navigation for ordinary requests? |

The working preference is the shared team room with progressive detail. The prototype comparison can change the layout. Requirements stay stable across layouts: durable named roles, explicit ownership, natural assignment, understandable approval, inspectable results, and honest recovery state.

Measure connection/setup separately from the normal work loop. After connection, a task must start in conversation without roster or workflow-builder setup. Current owner, pending decision, and latest result must each be locatable with at most one deliberate opening action. Assignment, clarification, approval, and completion must not require administrative settings. Record interaction counts, keyboard operation, and narrow-viewport results. A screenshot cannot establish usability.

## Evaluation gates

The [fixed evaluation](team-workflow-evaluation-v1.md) contains 20 constructed scenarios with explicit inputs and observable acceptance criteria. All start NOT RUN. Prototype simulation, agent-scored correctness, human acceptance, and live provider execution are separate evidence.

Gate 0 adds one bounded accepted coordinator/specialist handoff with accurate ownership and no duplicate dispatch to the existing feasibility criteria; the interaction decision precedes the first runtime contract. This strategy document does not pass Gate 0. Gate 1 and Gate 2 thresholds live in the [verification map](../verification/README.md); the fixed evaluation owns scoring and baseline measurement. Freeze benchmark changes before execution and preserve prior results; do not adjust thresholds to fit outcomes. External recruitment follows a usable product and does not block initial engineering.

## Operating model and delivery

Maintain an Apache-2.0 open-source product. Gannon is accountable maintainer; agents drive scoped research and delivery. Record an owner for each supported integration. Distribute the existing scoped CLI identity and browser client first. Hosted service, support guarantees, paid plans, and enterprise administration are outside this decision.

Users supply eligible provider access and compute. Track usage where available and disclose unknown billing. Local operation depends on an awake host. Prove persistent-runner support before promising unattended availability. Open source does not make inference, hosting, or maintenance free, and CLI authentication does not establish subscription integration eligibility.

Prototype the interaction, research providers and authority independently, then build the minimal CLI/daemon and conversational client. Basic team communication and accepted ownership move into the first product path. Add schedules and one event source next. Broad autonomous groups, many simultaneous computers, and unrestricted delegation remain later.

## Current verdict

| Requirement | Verdict |
| --- | --- |
| Mission, audience, initial context, and operating model | PASS as a recorded product decision |
| Comparator evidence and interaction requirements | PASS as documentation research; runtime comparison UNVERIFIED |
| Three interaction sketches | PASS as sketches; interactive proof pending KAT-3254 |
| Fixed evaluation and measurement protocol | Defined; execution NOT RUN |
| External demand, adoption, productivity advantage, and reliability | UNVERIFIED |
| Provider eligibility and execution authority | Pending KAT-3251 and KAT-3252 |

The [decision trail](2026-09-06-strategy-decisions.tsv) records revisions and the discarded narrow benchmark. The September 5 review remains a historical proposal; this decision and updated Linear criteria govern the current direction.
