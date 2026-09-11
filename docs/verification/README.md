# Verification map

This is a map of requirements, not a PASS record. Linear issues own acceptance criteria; evidence must identify the tested commit and environment. [Plan](../project-plan.md), [runtime ADR](../adrs/0001-runtime-and-execution-foundations.md).

| Area | Required evidence | Owning issue |
| --- | --- | --- |
| Workflow | Owner-directed team-workflow decision, operator evidence, explicit assumptions, selected integration/environment and fixed constructed rubric; demand remains unverified | [KAT-3250](https://linear.app/kata-sh/issue/KAT-3250) |
| Interaction | Three interactive alternatives over the same team-workflow scenario; observed interaction counts, ownership/result visibility, keyboard and narrow-viewport proof | [KAT-3254](https://linear.app/kata-sh/issue/KAT-3254) |
| Provider eligibility | Official access/billing basis, pinned versions, transport comparison, capability matrix and support owner | [KAT-3251](https://linear.app/kata-sh/issue/KAT-3251) |
| Authority | Owner versus bot capabilities, native-tool bypass probes, filesystem/network/credential boundary and failure matrix | [KAT-3252](https://linear.app/kata-sh/issue/KAT-3252) |
| First provider | CLI/daemon scratch task, artifact, real allow/deny/input/cancel, limit enforcement, isolated fixture and actual packaged smoke | [KAT-3242](https://linear.app/kata-sh/issue/KAT-3242) |
| Second provider | Same live workflow, one accepted coordinator/specialist handoff, duplicate-dispatch prevention, negotiated differences, concurrent-bot isolation, errors/cancel/recovery and unknown-provider behavior | [KAT-3243](https://linear.app/kata-sh/issue/KAT-3243) |
| Gate 0 | All feasibility criteria reproduced with two live providers; dropout is unverified | [KAT-3247](https://linear.app/kata-sh/issue/KAT-3247) |
| Web task/artifact | Conversation assignment, visible participants/accepted ownership/peer updates, result/refresh/artifact access; snapshot/cursor expiry; waiting/error/approval states; safe rendering and keyboard behavior | [KAT-3240](https://linear.app/kata-sh/issue/KAT-3240) |
| Approval | Exact-action binding; single resolution; deny self-approval/escalation/cross-run/changed payload; controlled target receipt | [KAT-3244](https://linear.app/kata-sh/issue/KAT-3244) |
| Recovery | Forced-crash matrix, external effect counts, unknown-outcome reconciliation, orphan children, retention and backup/restore; then one approved real action | [KAT-3241](https://linear.app/kata-sh/issue/KAT-3241) |
| Packaging | Fresh installed package, explicit endpoint, actual doctor failures, startup/update interruption, redacted diagnostics and support matrix | [KAT-3246](https://linear.app/kata-sh/issue/KAT-3246) |
| Gate 1 | At least 19/20 fixed cases per provider and all mandatory core and safety cases, one clean install per provider on the primary platform with documented setup without application-source edits or undocumented configuration (record credentials/prerequisites used), one actual maintainer workflow, scorer identity, timings/failures, auth/recovery/restore proofs | [KAT-3245](https://linear.app/kata-sh/issue/KAT-3245) |
| Later gates | Create explicit child specs and a verification issue after predecessor passes; scheduled repeat use includes five daily workflow runs in each of two consecutive weeks for the initial operator, recording accepted and corrected outcomes | [KAT-3237](https://linear.app/kata-sh/issue/KAT-3237) epic until a verification issue exists |

The September 11 [KAT-3247 exact-SHA report](kat-3247/README.md) records **9 PASS / 0 FAIL / 0 UNVERIFIED** at `0af5e00dc7ac81288d9d7e556caa3a019ee7ef05`: both live provider suites, accepted/rejected handoffs, concurrency, containment, fixture isolation, packaged smoke and Linux core CI. At handoff, merge and milestone closure remain pending; Gate 1 has not been started or approved. Fixture reconnect/restart and native history loading do not certify real-resource recovery.

Record each proof with issue, exact SHA, provider/SDK/OS versions, environment, command/action, expected result, observed result, artifact/log/CI URL and PASS/FAIL/UNVERIFIED. Logs redact credentials and private data irrelevant to the proof. Missing credentials or provider features remain unverified. Gate 1 and Gate 2 thresholds above are the single home for those numbers; the [fixed evaluation](../research/team-workflow-evaluation-v1.md) owns case definitions, scoring and baseline measurement. Constructed cases and internal use establish engineering gates only, not adoption or production reliability. Prototype simulations cannot substitute for integrated or live proofs.

First CLI/daemon receipts for [KAT-3242](https://linear.app/kata-sh/issue/KAT-3242), including isolated `agentis verify launch` requirements, live in [kat-3242.md](kat-3242.md).

Forced-crash cases include before launch, after launch, while waiting for approval, after decision persistence, after external acceptance, before receipt persistence and before completion reaches the client. Count controlled external effects. A restart must never turn an uncertain non-idempotent effect into an automatic retry. Test duplicate submissions/resolutions, provider crashes, invalid or expired cursors, slow viewers, stop-all, invalid credentials, unsupported schemas and missing blobs.

Behavior PRs provide fixture evidence and focused live proof for changed provider behavior. Pure presentation work needs relevant UI evidence. Changes to approvals, artifact access, client state, authorization or recovery also need behavior evidence. Run checks proportionate to the change; preserve the real production contract when repairing tests.

Gate verdicts reference the integrated SHA and list every missing requirement. Product features stay within the current gate until it passes. A completed planning issue, a successful login, a fixture pass or a preserved transcript cannot stand in for unperformed acceptance.
