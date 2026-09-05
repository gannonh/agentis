# Verification map

This is a map of requirements, not a PASS record. Product implementation remains Backlog. Linear issues own acceptance criteria; evidence must identify the tested commit and environment. [Plan](../project-plan.md), [runtime ADR](../adrs/0001-runtime-and-execution-foundations.md).

| Area | Required evidence | Owning issue |
| --- | --- | --- |
| Workflow | Five observed users, ten actual tasks, baseline, chosen workflow/integrations/environment and fixed pilot rubric; disclose missing access | [KAT-3250](https://linear.app/kata-sh/issue/KAT-3250) |
| Provider eligibility | Official access/billing basis, pinned versions, transport comparison, capability matrix and support owner | [KAT-3251](https://linear.app/kata-sh/issue/KAT-3251) |
| Authority | Owner versus bot capabilities, native-tool bypass probes, filesystem/network/credential boundary and failure matrix | [KAT-3252](https://linear.app/kata-sh/issue/KAT-3252) |
| First provider | CLI/daemon scratch task, artifact, real allow/deny/input/cancel, limit enforcement, isolated fixture and actual packaged smoke | [KAT-3242](https://linear.app/kata-sh/issue/KAT-3242) |
| Second provider | Same live workflow, negotiated differences, concurrent-bot isolation, errors/cancel/recovery and unknown-provider behavior | [KAT-3243](https://linear.app/kata-sh/issue/KAT-3243) |
| Gate 0 | All feasibility criteria reproduced with two live providers; dropout is unverified | [KAT-3247](https://linear.app/kata-sh/issue/KAT-3247) |
| Web task/artifact | Submit/result/refresh/artifact access; snapshot and cursor expiry; waiting/error states; safe rendering and keyboard behavior | [KAT-3240](https://linear.app/kata-sh/issue/KAT-3240) |
| Approval | Exact-action binding; single resolution; deny self-approval/escalation/cross-run/changed payload; controlled target receipt | [KAT-3244](https://linear.app/kata-sh/issue/KAT-3244) |
| Recovery | Forced-crash matrix, external effect counts, unknown-outcome reconciliation, orphan children, retention and backup/restore; then one approved real action | [KAT-3241](https://linear.app/kata-sh/issue/KAT-3241) |
| Packaging | Fresh installed package, explicit endpoint, actual doctor failures, startup/update interruption, redacted diagnostics and support matrix | [KAT-3246](https://linear.app/kata-sh/issue/KAT-3246) |
| Gate 1 | At least 18/20 accepted tasks and 4/5 clean-install users, correction times and all failures, both providers, auth/recovery/restore proofs | [KAT-3245](https://linear.app/kata-sh/issue/KAT-3245) |
| Later gates | Create explicit child specs and a verification issue after predecessor passes; scheduled repeat use includes at least three users in a second week | Epic and milestone descriptions |

Record each proof with issue, exact SHA, provider/SDK/OS versions, environment, command/action, expected result, observed result, artifact/log/CI URL and PASS/FAIL/UNVERIFIED. Logs redact credentials and private data irrelevant to the proof. Missing credentials, participant access or provider features remain unverified. Small pilot samples do not establish production reliability.

The first daemon slice introduces `agentis verify launch`; it is not implemented yet. The launcher must use temporary configuration and data, an explicit fake-engine registry, no access to real provider credentials and controlled network. Probe inherited settings, absolute executable paths and child processes; stripping PATH alone is insufficient. Print endpoint, PID and log locations, then clean up on exit/failure. Fake tests establish Agentis behavior; they cannot certify live provider eligibility or output quality.

Forced-crash cases include before launch, after launch, while waiting for approval, after decision persistence, after external acceptance, before receipt persistence and before completion reaches the client. Count controlled external effects. A restart must never turn an uncertain non-idempotent effect into an automatic retry. Test duplicate submissions/resolutions, provider crashes, invalid or expired cursors, slow viewers, stop-all, invalid credentials, unsupported schemas and missing blobs.

Behavior PRs provide fixture evidence and focused live proof for changed provider behavior. Pure presentation work needs relevant UI evidence. Changes to approvals, artifact access, client state, authorization or recovery also need behavior evidence. Run checks proportionate to the change; preserve the real production contract when repairing tests.

Gate verdicts reference the integrated SHA and list every missing requirement. Product features stay within the current gate until it passes. A completed planning issue, a successful login, a fixture pass or a preserved transcript cannot stand in for unperformed acceptance.
