# Preflight findings

These exploratory runs were on the uncommitted prototype before the final recorded source SHA. They are development observations, not acceptance evidence. The final clean-source run is [results.json](evidence/results.json).

| Observation | Disposition |
| --- | --- |
| Initial screenshot showed the oldest conversation messages after artifact delivery, hiding acceptance. | Scroll the conversation to its newest message after rendering the simulated event. |
| B collapsed Ivo's exact question, while the driver sent its prefilled answer without reading the question. | Put the exact question in the coordinator summary. Preserve optional detailed specialist messages. |
| C changed to overview after assignment, but that navigation was absent from the counter. | Count both assignment and reply navigation. C's observed total became four. |
| Protocol specified landing-view probes; the driver probed the current view. | Probe an independent page with the same saved state and the ordinary landing view. Close it without changing the canonical path. |
| Approved action card still said approval was required. | Show “approved, awaiting receipt” and assert it after approval. |
| Permission text expired when the review closed, but approval closed the review before the action. | Specify one exact action for the attempt with no standing permission. No clock-based expiry claim. |
| First browser assertion sometimes checked focus before the dialog close event restored it. | Wait for the actual focused opener with a bounded browser wait. |
| Keyboard focus could cycle outside the intended dialog controls. | Wrap Tab/Shift+Tab between dialog controls. The final driver verifies both directions. |
| Focus restored after mixed pointer research controls and keyboard use lacked a visible indicator. | Keep a visible outline on focused buttons, disclosures, and input. |
| C navigation removed the focused button. | Focus the destination heading or composer and verify it. |
| Full-page capture of a scrolled page with a modal produced confusing placement. | Capture modals at viewport size, preserving top and bottom images where they scroll. |

Three exploratory automated runs failed before these corrections. A fourth passed all six conditions on uncommitted source. A separate final run passed all six conditions on the committed source. The first screenshot exploration preceded those automated runs. No failed probe was reclassified as a live-provider or human-usability result.

The read-only interaction reviewer identified the clarification, navigation, protocol, action-label, duration, and navigation-focus defects. The orchestrator inspected the source, made the corrections, and ran the browser proof. The separate comment review found no code comments or suppressions to remove. This was agent review, not maintainer acceptance.
