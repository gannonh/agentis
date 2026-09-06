# Select the shared team room for the first conversation

Select **A, shared team room with a persistent current-work strip and attached result/action cards**, for the first browser workflow. It completes the fixed task with 10 normal activations and no main-view changes. B ties those counts but puts specialist messages in a separate disclosure and pushes the result/action cards farther down. C needs 12 activations and four view changes. This selects a research direction for the first slice. It is not a user-usability or product-value verdict.

[KAT-3254](https://linear.app/kata-sh/issue/KAT-3254) owns the decision. The [strategy](../2026-09-06-workflow-research.md) supplied the initial preference; this comparison preserves all three original alternatives and their [walkthrough](README.md).

## Evidence and method

The final browser run passed at source commit `b74231e148709bcd381eef9fbdc21ca2cb85419e` with a clean source tree. The later evidence/documentation commit does not change the tested prototype. [Raw results](evidence/results.json) contain SHA-256 hashes of every source/protocol file and the full action log. Start and verification commands are in the [walkthrough](README.md#reproduce-the-browser-evidence).

The inspector was Codex using Playwright 1.58.2 and Chromium 151.0.7922.173 on Linux 7.1.9-arch1-2, with Node v26.8.1 and Python 3.14.7. Node ran only the research driver; this does not select the production toolchain or claim macOS support. The [protocol](protocol.md) fixes the scenario, definitions, order, and limits. There was one run per alternative and input condition, using prefilled messages and known targets. No people participated in a usability study.

Each alternative used Mara as coordinator, Ivo as engineering specialist, and Alex as human owner. Every request, clarification, cited artifact, proposed action, simulated fault, and receipt used the same content and shared state transitions. The layouts differ in where conversation, peer activity, and task details live. The static prototype makes no network calls; the browser checks recorded no external request or page exception.

## Observed interaction cost

The task loop includes request, clarification, artifact opening, two source disclosures, artifact closing, exact-action opening, approval, receipt opening, and receipt closing. Setup is separate. Research buttons stand in for the agents and are excluded from human work.

| Alternative | Desktop task clicks | First-run setup clicks | Main-view changes | Detail openings | Research controls | Narrow task activations | Narrow keyboard presses |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A, shared team room | 10 | 3 | 0 | 5 | 4 | 10 | 39 |
| B, manager DM | 10 | 3 | 0 | 5 | 4 | 10 | 41 |
| C, task first | 12 | 3 | 4 | 5 | 4 | 12 | 51 |

Narrow first-run setup also required three activations in each alternative. Keyboard counts include normal task and setup traversal, Enter activations, and Escape closes. They exclude the separate focus-confinement probe. Research controls used pointer input even in keyboard runs, so these counts describe the human path through the simulated scenario. They are not a minimal keystroke optimization or a prediction for an asynchronous product.

The setup steps were provider/execution selection, task-scoped source read, and destination account/project connection. The destination connection remained separate from exact-action approval. The prototype does not implement a second connected task; omitting those setup steps on later work is an expectation, not a measured repeat-use result.

C's four view changes were opening the first conversation, submission to task overview, opening the clarification conversation, and reply back to overview. Its extra two activations came from opening those conversations. A and B needed no optional peer disclosure to answer the clarification because both showed the exact question in the main conversation.

## Observed location and error visibility

Every owner/result/action label was locatable with zero deliberate openings. The artifact content and exact action each required one opening. Source excerpts are additional inspection disclosures. At desktop size, every probed label and error banner fit in the initial viewport. At 390 × 844, owner and error banners fit; result and action labels required a scroll in every alternative. A programmatic scroll-to-element call is recorded as one scroll operation, not as one human gesture.

The table records actual known-target browser retrieval time in milliseconds. It includes driver overhead and excludes scrolling after retrieval. It does not measure human search or comprehension, and no timing difference influenced the selection.

| Condition | Owner after acceptance | Completed result | Pending action | Failed-handoff error | Unknown-outcome error |
| --- | ---: | ---: | ---: | ---: | ---: |
| A desktop | 25.84 | 24.91 | 24.39 | 25.10 | 25.01 |
| B desktop | 24.18 | 25.24 | 30.69 | 22.19 | 24.87 |
| C desktop | 30.48 | 30.50 | 25.45 | 32.30 | 25.08 |
| A narrow keyboard | 24.16 | 31.26 | 24.87 | 24.74 | 25.28 |
| B narrow keyboard | 24.14 | 24.36 | 25.25 | 28.03 | 28.47 |
| C narrow keyboard | 27.69 | 33.25 | 29.97 | 32.37 | 23.67 |

A's artifact-ready result/action labels began at desktop y=455.5/626 pixels. B placed them at y=705.5/876, below its specialist panel. On narrow screens those positions were A y=1153.7/1324.2 and B y=1399.7/1570.2. C's reloaded work-list labels were closer to the top at narrow y=916/1086.5. C therefore has a real compact-task advantage after refresh despite its higher conversation-navigation cost. The evidence does not establish which layout wins for many retained tasks.

All layouts used the same current-work strip and prominent error banner. Failure visibility is a tie. The failed handoff said Mara retained ownership, with zero specialist starts. Unknown outcome said the action might exist, retained Ivo as owner, preserved the brief, and withheld completion. The research footer intentionally reveals the fixture's effect count; a real operator would need external reconciliation evidence.

## Visual comparison and tradeoffs

[A desktop](evidence/A-mouse-brief-ready.png) keeps acceptance, clarification, and the specialist result in one attributed conversation beside the result/action cards. It uses the fewest observed interactions, tied with B, and less vertical space than B for the result. Keep routine updates collapsible, but do not collapse ownership changes or blocking questions. The newest message is visible after each simulated event.

[B desktop](evidence/B-mouse-brief-ready.png) gives the coordinator a separate conversation and a visible specialist summary. It may suit an operator who wants a single point of contact. This run did not test whether its separation improves comprehension. The extra summary repeats ownership and pushes the result lower. Opening specialist messages is optional in the measured task.

[C desktop](evidence/C-mouse-brief-ready.png) gives the result a durable task entry and links its conversation. [C narrow](evidence/C-keyboard-brief-ready.png) places the reloaded result closer to the top. Its navigation cost is concrete for the first assignment, while benefits for a task backlog remain untested.

[A narrow approval](evidence/A-keyboard-approval.png) and its [lower portion](evidence/A-keyboard-approval-bottom.png) preserve the exact payload without horizontal overflow. [B unknown outcome](evidence/B-keyboard-unknown.png) illustrates the shared error treatment. All six conditions passed the complete scenario. The three keyboard conditions also passed focus indication, Tab/Shift+Tab confinement, Escape dismissal, and focus restoration. No screen-reader assessment was performed.

## Acceptance verdicts

| Requirement | Verdict and evidence |
| --- | --- |
| Three interactive alternatives over the same fixed scenario | PASS. A/B/C switcher, shared `scenario.js`, six fresh-context browser runs and 48 screenshots. |
| Assignment, accepted handoff, clarification, artifact, exact approval, receipt, interrupted/unknown | PASS for simulated presentation and transitions in each alternative. The driver records 147 successful checks across six runs. |
| Receiver acceptance, sender retention on failure, no duplicate refresh/notification work | PASS in the isolated browser fixture. Pending/accepted handoffs, pending approval, unknown outcome, completion, and denial retain state without another task/start/effect. |
| Distinct human, role, provider, location; unavailable capabilities | PASS for presentation. Fictional provider and browser execution are explicit; computer control, scheduling, remote execution, and live connections are unavailable. |
| Conversation assignment and explicit setup/authority | PASS in simulation. No roster, builder, source-file configuration, or credential input. Three setup activations are counted separately. |
| Click/navigation/location/error comparison | PASS as agent inspection under the fixed protocol. Human search times and usability remain UNVERIFIED. |
| Selection, original artifacts, walkthrough, keyboard and narrow viewport | PASS for this research decision and recorded browser conditions. All alternatives remain runnable. |
| Requirements for KAT-3242 and KAT-3240 | Defined in [adoption requirements](adoption.md). The downstream issue comments record the handoff and do not start product Build. |

## Corrections and unresolved limits

Preflight found and corrected an old-message scroll position, a hidden clarification in B, an omitted C navigation count, an incorrect “approval required” label after approval, and permission-duration wording that contradicted the flow. Browser checks found a dialog focus-cycle issue and inconsistent restored focus indication. The driver initially checked focus before the asynchronous close event; it now waits for actual restoration. A read-only reviewer also identified lost focus on C navigation. The final run includes the corrected behavior. [Preflight findings](preflight.md) preserve the failures and scope of corrections.

A's selection rests on the first-conversation scenario and the observed navigation/placement tradeoff. Human comprehension, typing and correction effort, multiple tasks, long transcripts, realistic peer volume, real response latency, concurrent clients, and multi-tab conflict handling remain untested. All narrow layouts require scrolling to results; first-slice browser work should preserve one-opening access and verify it with actual retained content.

The JavaScript state table and browser local storage are disposable fixtures. They are not proposed runtime contracts, a security boundary, or recovery implementation. The fixed approval payload is inspectable but does not prove digest binding, expiry enforcement, tamper resistance, authentication, or external exactly-once behavior. Provider eligibility, billing, live auth, external recovery, scheduling, computer control, business value, and production readiness remain UNVERIFIED. KAT-3251 and KAT-3252 still own provider and execution-boundary research. Gannon retains maintainer acceptance.
