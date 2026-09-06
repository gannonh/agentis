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

## PR review corrections

The four Codex findings on PR #455 were confirmed against `03802071456aa6756d03a538417c4ea9b789c7af`.

| Reproduction | Correction and regression proof |
| --- | --- |
| A server with an extra CSS comment passed five browser conditions while the verifier recorded the unchanged local CSS hash. The sixth condition failed separately on keyboard focus; the old verifier never rejected the source mismatch. | Intercept every browser resource, compare its body with the recorded local hash, and deliver those same verified bytes. `verify-source-binding.mjs` rejects altered HTML, CSS, both JavaScript modules, redirects, and HTML changed only on a later probe page. |
| Sending the request immediately recorded `taskCount: 1` in the connection stage. | Start at connection, then source authority, then request availability. Browser checks record zero tasks and specialist starts through setup. Version 1 data is preserved and refused. |
| A's routine disclosure claimed that Ivo indexed S1 and S2 before acceptance and after handoff failure. | Gate routine work updates on a recorded specialist start. Check hidden updates before acceptance and after failure, then open them after a new offer is accepted. |
| Escape from the unknown-action work-card dialog focused the error-banner button. | Retain the actual opener element. Updating destination connection rerenders only the dialog. Check both unknown-action openers using Close on desktop and Escape with the narrow keyboard path. |

The stricter verifier also exposed two equally named linked-conversation controls in C. The driver now targets the task-overview control explicitly. The first changed-source preflight failed on that ambiguity; the corrected run passed all six conditions. The final committed-source record supersedes these exploratory runs. An independent read-only review found no remaining issue in the four fixes.

The first committed-source capture at `05ed665f121148a1da242d8c7e2da4c759769758` exposed an intermittent dismissal race in C's keyboard condition. Native dialog dismissal restored focus before the queued `close` handler ran. That handler could then move focus during the next keyboard action, opening the previous detail instead of the intended action. Close and Escape now share synchronous dismissal and focus restoration, so no queued handler can redirect the next action. The failed record is retained in [focus-race.json](evidence/focus-race.json).
