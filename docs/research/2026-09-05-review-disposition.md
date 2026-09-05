# Project review disposition

September 5, 2026. [KAT-3249](https://linear.app/kata-sh/issue/KAT-3249) applies the authorized planning changes from the [project review](2026-09-05-project-review.md). The [revised plan](../project-plan.md) records the adopted direction. This table distinguishes changes to the plan from evidence still to be collected.

| Review finding | Change applied | Evidence or implementation owner |
| --- | --- | --- |
| 1. First user and repeatable result | Added founder/operator hypothesis, one-workflow scope, task rubric, baseline and pilot targets | KAT-3250, KAT-3245 |
| 2. Differentiation | Replaced parity-led positioning with controlled execution, retained work and recovery | Epic and plan; validate through pilot |
| 3. Provider access | Added eligibility/billing register; removed universal subscription support assumptions | KAT-3251 |
| 4. Provider capabilities | Select one transport per provider; compare Codex app-server with ACP and test blocking requests/recovery | KAT-3251, KAT-3242, KAT-3243 |
| 5. Working slices | Rewrote nine specs and dependencies around live CLI, second provider, web task, approval and recovery | KAT-3239 through KAT-3247 |
| 6. Work ownership | Added Task, Run, Thread, Artifact and frozen run configuration | KAT-3242, KAT-3240 |
| 7. Recovery | Separated transcript, client, session and effect recovery; required crash matrix before real actions | KAT-3252, KAT-3241 |
| 8. Persistence | Chose transactional SQLite current state, transition log and pending actions | Runtime ADR, KAT-3242, KAT-3241 |
| 9. Effect | Chose TypeScript/Effect on Node, one Effect Schema contract and a tested stable version family | Runtime ADR, KAT-3251 |
| 10. Local authorization | Required authenticated owner control from the first endpoint and scoped bot tools | KAT-3252, KAT-3242 |
| 11. Enforceable approval | Bound approval to exact action/run/target/content/scope/expiry and denied bot self-approval | KAT-3252, KAT-3244 |
| 12. Execution environment | Required filesystem/network/native-tool/credential boundary; deferred shared desktops | KAT-3252 |
| 13. Background reliability | Moved service lifecycle and trigger failure policy alongside scheduling | Gate 2 |
| 14. Memory | Started with correctable notes, provenance, scope and deletion; deferred embeddings | KAT-3240 when needed, Gate 2 |
| 15. Collaboration | Required recipient acceptance, preserved ownership, limits and one-bot comparison | Gate 3 |
| 16. Cloud dispatch | Recorded four candidates; deferred parity and required target-specific lifecycle proof | KAT-3251, Gates 3–4 |
| 17. Evidence gates | Replaced six milestone definitions; required two live providers and explicit pilot/failure evidence | KAT-3247, KAT-3245 |
| 18. First-run experience | Prioritized a task template, inspectable retained artifact and understandable failure states | KAT-3240, KAT-3246 |
| 19. Distribution and operation | Narrowed initial environment; added support/operating-model decision and diagnostics/restore | KAT-3250, KAT-3246 |
| 20. Planning consistency | Recorded CLI 2.0/canonical repo, removed settled-decision label and old blockers, moved rationale under docs | KAT-3249, KAT-3239 |

The earlier migration-runner suggestion is not adopted. The repository rule requires preserving existing data and refusing unsupported schemas without migrations or destructive reset. The [runtime ADR](../adrs/0001-runtime-and-execution-foundations.md) records the fresh-data policy and the decision needed before promising in-place schema upgrades.

KAT-3238 retains its completed historical description and status. Product implementation and the three research issues remain Backlog. No provider, authorization boundary, recovery behavior or pilot outcome is certified by this documentation revision.
