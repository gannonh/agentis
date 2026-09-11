# Independent evidence review

Reviewed by `gpt-5.6-luna` at max effort through a native Codex read-only lane. The reviewer inspected the requirement matrix, evidence, decision trail and helpers. The reviewer ran no providers, Docker operations or tests.

The reviewer agreed that AC3 and AC6 remain UNVERIFIED, that AC4 limits fake restart evidence, and that AC5 distinguishes schema rejection from live provider crash.

| Finding | Disposition |
| --- | --- |
| Absolute paths and owner.token filenames remain in public smoke evidence | Retained as required provenance. The report now specifies that the redaction result concerns token contents. No owner token value was found. |
| The redaction receipt omitted source SHA, scan scope and comparison details | Added `audit-evidence.mjs`, recorded those fields and the additional API-key pattern, then reran it successfully. |
| Added helpers await daemon exit but do not individually prove endpoint/container/root cleanup | Documented the limitation. The separate inventory showed no running containers. Dedicated roots and provider/auth volumes remain available for inspection. |

The comment review found zero comments or suppressions in the helpers and requested zero deletions. No comments were restored, no architect sketch or constraint encoding was needed, and no application-code change was proposed.

Attention remains on actual live rejection and fixture isolation. The initial invalid-provider probe and the rejected-handoff scenario failure remain in the evidence rather than being replaced by a passing summary.

## Repair review

The sections above describe the initial evidence-only change. The continuation added runtime repairs after Gannon instructed completion.

An independent inherited-model architecture lane compared the Docker implementation with a separate OS-sandboxed worker. A `gpt-5.6-luna@max` lane reviewed the packaged smoke and isolation checks. The coordinator reviewed and integrated their findings before commit `e2769a79f7e59d7c4d5c771a29a6874f2151df2b`.

| Finding | Disposition |
| --- | --- |
| Whole-daemon isolation includes the fresh fixture token/database and image-local executables | Report the precise host-isolation scope; do not claim separation within the fixture daemon. |
| Relay process errors, unbounded connections and incomplete shutdown could leave host processes | Handle pipe errors, cap active relays at 32, await relay exits, and remove only inspected container IDs. Public lifecycle checks exercise launcher kill and external container stop. |
| Readiness needs host-visible files and a still-running container | Check the endpoint, profile, owner credential, workspace and container after health succeeds. |
| Smoke helpers parsed one line while the CLI emits multiline JSON | Parse the accumulated JSON document. Both packaged and lifecycle paths were then driven successfully. |
| Empty check output and a read of a Unix socket could falsely establish isolation | Require the exact 14 checks and use socket-path absence. Assert exact mounts, non-root UID/GID, configuration environment and canonical scratch root. |
| Artifact prefix checks could follow a symlink outside scratch | Require a regular file and canonical path containment, plus literal content, byte count and SHA-256. |
| Failed probes could leave their host symlink or temporary installation | Remove the symlink in finally and always remove the temporary installation. Private fixture diagnostic roots are deliberately retained on failure; runtime cleanup is checked separately. |
| A digest taken from an arm64 environment might exclude Linux x64 | Live `docker buildx imagetools inspect` confirmed that the pinned digest is a multiarch OCI index containing amd64 and arm64 manifests. |
| Image provisioning and direct unverified fake serving might be confused with fixture egress/fallback | Image fetching occurs on the trusted host before the offline container starts. `verify launch` has no host execution fallback. Generic direct fake serving remains explicitly unverified and cannot select the enforced fixture boundary. |

The initially failed receipts remain preserved. Final acceptance uses the committed repairs, not these preliminary dirty-source checks.

A final independent code review of `e2769a79` against `70e8b204` found no material correctness issues and no useless new comments or suppressions. It covered fixture containment, relay lifetime/cleanup, readiness, packaged probes and the Claude prompts. The reviewer did not run tests or providers. Its remaining request for live accepted/rejected handoff evidence was satisfied by the committed-SHA receipts.

## External review corrections

Codex review identified global fixture discovery as a cleanup ownership bug (P1) and hard-coded audit roots as a reproduction defect (P2). Cursor independently reported the same cleanup bug. Both were fixed in `0af5e00dc7ac81288d9d7e556caa3a019ee7ef05`; all three GitHub review threads received a disposition and were resolved.

The helper now cleans container/root state only from validated readiness for its own launch. Before readiness, it stops only its spawned launcher and retains unidentified diagnostic roots. A regression reproduced the old behavior terminating a separate live fixture; the corrected helper preserves that fixture's endpoint, marker, owner token and container. The audit accepts explicit scope/root/output arguments and records missing inputs as FAIL without exposing secrets. Four helper regression tests pass locally and in Linux core CI. The full fresh-root rerun is recorded under `evidence/reviewed/`.
