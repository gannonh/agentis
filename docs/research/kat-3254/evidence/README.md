# Browser screenshots

Captured at source commit `6035f90c950af50a5602c0139c67afabe98f57f3`. All agent behavior is simulated. [Measurements and interaction log](results.json). [Method](../protocol.md).

Main pages use full-page captures. Modal captures use the actual viewport; a second image preserves the lower content when it scrolls.

| Alternative/input | Captures |
| --- | --- |
| A / mouse / 1440 × 1080 | [start](A-mouse-start.png) · [brief-ready](A-mouse-brief-ready.png) · [artifact](A-mouse-artifact.png) · [approval](A-mouse-approval.png) · [complete](A-mouse-complete.png) · [handoff-failed](A-mouse-handoff-failed.png) · [unknown](A-mouse-unknown.png) |
| B / mouse / 1440 × 1080 | [start](B-mouse-start.png) · [brief-ready](B-mouse-brief-ready.png) · [artifact](B-mouse-artifact.png) · [approval](B-mouse-approval.png) · [complete](B-mouse-complete.png) · [handoff-failed](B-mouse-handoff-failed.png) · [unknown](B-mouse-unknown.png) |
| C / mouse / 1440 × 1080 | [start](C-mouse-start.png) · [brief-ready](C-mouse-brief-ready.png) · [artifact](C-mouse-artifact.png) · [approval](C-mouse-approval.png) · [complete](C-mouse-complete.png) · [handoff-failed](C-mouse-handoff-failed.png) · [unknown](C-mouse-unknown.png) |
| A / keyboard / 390 × 844 | [start](A-keyboard-start.png) · [brief-ready](A-keyboard-brief-ready.png) · [artifact](A-keyboard-artifact.png) · [artifact-bottom](A-keyboard-artifact-bottom.png) · [approval](A-keyboard-approval.png) · [approval-bottom](A-keyboard-approval-bottom.png) · [complete](A-keyboard-complete.png) · [handoff-failed](A-keyboard-handoff-failed.png) · [unknown](A-keyboard-unknown.png) |
| B / keyboard / 390 × 844 | [start](B-keyboard-start.png) · [brief-ready](B-keyboard-brief-ready.png) · [artifact](B-keyboard-artifact.png) · [artifact-bottom](B-keyboard-artifact-bottom.png) · [approval](B-keyboard-approval.png) · [approval-bottom](B-keyboard-approval-bottom.png) · [complete](B-keyboard-complete.png) · [handoff-failed](B-keyboard-handoff-failed.png) · [unknown](B-keyboard-unknown.png) |
| C / keyboard / 390 × 844 | [start](C-keyboard-start.png) · [brief-ready](C-keyboard-brief-ready.png) · [artifact](C-keyboard-artifact.png) · [artifact-bottom](C-keyboard-artifact-bottom.png) · [approval](C-keyboard-approval.png) · [approval-bottom](C-keyboard-approval-bottom.png) · [complete](C-keyboard-complete.png) · [handoff-failed](C-keyboard-handoff-failed.png) · [unknown](C-keyboard-unknown.png) |

[Source-attribution rejection evidence](source-binding.json) records six expected failures against the same source commit. The earlier [focus-race failure](focus-race.json) and its [screenshot](focus-race.png) preserve the failed capture that led to synchronous dismissal.
