# Fixed comparison protocol

Freeze this protocol before the recorded comparison. KAT-3254 is disposable interaction research. All content and behavior is original, fictional, and simulated. No provider or connector runs.

## Decision and scenario

Choose the primary entry point for one named coordinator, one specialist, and one task. Compare A, a shared team room; B, a manager direct message with separate specialist activity; and C, a work list with linked conversation. Each uses exactly the request, reply, source snapshot, artifact, and action defined in `prototypes/scenario.js` and `prototypes/app.js`. Preserve all three alternatives.

Alex asks Mara to review fictional `northstar/launchpad`, deliver a cited release brief, and propose one Linear follow-up. Mara offers a bounded read-only handoff. Ivo accepts. Alex limits the brief to release blockers. Ivo returns the brief. Alex inspects both source excerpts, connects the fictional destination, and approves the exact proposed issue. The simulation records a receipt, or interrupts after simulated external acceptance and before receipt delivery.

## Procedure

Use a fresh isolated Chromium context for each alternative and input mode. Run desktop at 1440 × 1080 with mouse input and narrow at 390 × 844 with keyboard input. Alternate order A, B, C is fixed. This is one deterministic run per condition, with prior knowledge of the interface. It does not control for learning or estimate population performance.

Run this canonical loop through the visible UI.

1. Choose the demonstration provider and execution location. Allow the source read for the first task. No task or specialist starts during setup.
2. Open the conversation, if needed, and send the supplied ordinary request. Submission starts the first task after connection and source authority.
3. Simulate the handoff proposal and Ivo's explicit acceptance.
4. Open the linked conversation if needed and send the supplied clarification reply.
5. Simulate the artifact delivery. Open the brief, expand both source excerpts, and close it.
6. Open the exact action. Connect the fictional Linear account/project, then separately approve the exact action once.
7. Simulate the completion receipt. Open and inspect the receipt, then close it.

Record human activations, setup activations, keyboard Tab/Enter/Escape presses, navigation changes, detail openings, and researcher controls separately. A navigation change changes the primary view. Opening a modal or source disclosure is a detail opening, not a navigation change. The fixed text is prefilled; typing time and provider response time are excluded. The two source disclosures are required for this inspection protocol. The simulation buttons represent agent events or injected faults, never human work.

Count first-run provider/environment selection, source permission, and destination connection as setup. A connected repeat task would omit these three activations, but that repeat-task path is not implemented or measured. Report its omitted cost only as an inference.

## Location probes

At pending handoff, accepted handoff, artifact-ready, completed, failed-handoff, and unknown-outcome states, open an independent page in the same browser context at the ordinary landing view, with collapsed optional details and page scroll at the top. Close the probe page afterward so measurement cannot change the canonical loop. This uses the same saved state as a reload. Read current owner, latest result, pending action, or the error banner through their rendered browser elements. Record exact visible text, bounding rectangle, whether initially in the viewport, scroll needed, deliberate opening count, and elapsed milliseconds from starting the browser locator call to receiving text and visibility data. Also record the effort to open the artifact and exact action in the canonical loop.

These timings are actual automated known-target retrieval times, including browser-driver overhead. They measure neither human search nor comprehension. The inspector authored the code and knows the target. Screenshot inspection supplies qualitative layout findings, not a usability study. No timing differences will be used as evidence of human speed. The selection prioritizes the existing one-opening visibility constraint, observed navigation, and information placement. Draws remain draws.

## Failure and retention probes

Run these separately from the canonical interaction count in each condition.

- Refresh a pending handoff, accepted handoff, pending approval, unknown action, and completion. Ownership, messages, task count, specialist starts, and simulated effects must remain unchanged.
- Repeat the last notification in each state. Replaying that event must not add a task, specialist start, message, receipt, or external effect.
- Fail the handoff. Mara remains owner and specialist starts remain zero. A deliberate new offer may be accepted once.
- In A, keep routine specialist work updates unavailable before acceptance and after a failed handoff. Open them only after accepted work starts.
- Interrupt after approval and simulated external acceptance but before the receipt. Show the brief alongside unknown action status. Do not offer automatic retry. A simulated read-only lookup finds the existing receipt without another effect.
- Deny an action. Keep the brief and record zero effects. Approval is disabled until artifact inspection and destination connection.
- Inspect distinct human, role, provider, execution location, scope, and unavailable capabilities.
- Use Tab, Shift+Tab, Enter, and Escape across the primary loop and dialogs. Check focus indication, modal confinement, exact opener focus restoration, readable payload, and document/modal horizontal overflow. Open the unknown-action dialog separately from the error banner and work card, and verify focus returns to each actual opener. This does not establish screen-reader or full accessibility conformance.
- Fail verification on page exceptions or requests outside the loopback origin.

## Evidence format

`verify.mjs` writes the exact source commit, source cleanliness, SHA-256 file hashes, platform/tool versions, start command, scenario, event log, observed measurements, screenshots, and PASS/FAIL/UNVERIFIED verdicts. Every browser HTML, CSS, and JavaScript response is hashed against the local source before those same bytes reach the browser. This includes reloads and probe pages. Redirects, unexpected resources, missing assets, and hash mismatches fail verification. Browser caching and service workers cannot bypass the check. A later evidence-only commit can contain the record of an earlier exact code commit. Preserve failed runs if they change the interpretation; do not label an unexecuted assertion PASS.

PASS applies to simulated UI behavior only. Live provider eligibility, authentication, authorization enforcement, external recovery, scheduling, computer control, business value, and human usability remain UNVERIFIED. This fixture does not implement or stand in for `agentis verify launch`.
