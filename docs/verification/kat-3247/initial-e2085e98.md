# Initial Gate 0 verification at e2085e98

Historical report. The [current report](README.md) tracks the authorized repairs and completion run. Statements about remaining scope and KAT-3336 below describe the initial assessment.

Gate 0 is **UNVERIFIED**. Gate 1 remains blocked. This report records the September 11, 2026 run on macOS Apple silicon at product commit `e2085e98c27d530b0c9e66224d07e853f68f5f17`. Product source and the existing conformance scripts were unchanged. New evidence helpers are retained beside this report.

## Requirement matrix

| KAT-3247 criterion | Verdict | Evidence and limits |
| --- | --- | --- |
| 1. Workflow, audience, fixed evaluation and chosen interaction | PASS | [Owner-directed workflow](../../research/2026-09-06-workflow-research.md), [fixed 20-case evaluation](../../research/team-workflow-evaluation-v1.md), and [KAT-3254 adoption](../../research/kat-3254/adoption.md) record the business-team audience, macOS Apple silicon and shared conversation design. Prototype evidence is simulated. External demand remains unverified. |
| 2. Provider access, billing, transport and authority decisions | PASS | [Provider setup](../../provider-setup.md), the [prior two-provider register](../kat-3243/README.md), and [authority research](../../research/execution-boundaries/README.md) record the decisions and unresolved limits. Current runs freeze Codex app-server with ChatGPT login and direct Claude SDK with API-key auth. This is no invoice reconciliation, policy refresh, hard spend-cap proof or real-resource recovery certification. |
| 3. Two live workflows, handoff, ownership and duplicate prevention | UNVERIFIED | [Codex](evidence/mara.json) and [Claude](evidence/ivo.json) each passed smoke, allow, deny, plan, input and cancel. [Handoff](evidence/handoff.json) passed accepted ownership transfer, artifact attribution, duplicate proposal prevention, concurrent approvals and stop-all. The [live rejection probe](evidence/rejected-handoff.json) failed to induce rejection. Ivo accepted, so live ownership retention after rejection remains unverified. Passing protocol fixtures cover rejection and late events separately. |
| 4. Distinguish restoration, reconnect, session loading and interrupted runs | PASS | [Public recovery receipt](evidence/recovery.json) proves cursor reconnect without omitted or repeated event IDs, retained transcript and artifacts after SIGKILL/restart, and a waiting fake run becoming interrupted without another attempt. Live native session loading passed on both providers. Fake restart proof does not certify live-provider execution recovery or real-resource reconciliation. |
| 5. Unknown provider and provider crash preserve peers | PASS | [Live containment receipt](evidence/crash-containment.json) records two pending native approvals, unknown provider rejection at the CLI schema boundary, SIGKILL of Ivo's exact owned Run container, Mara remaining pending and then completing after approval, and healthy HTTP. This certifies boundary rejection and one live provider crash, not every crash point. |
| 6. Fixture isolation from credentials, configuration, absolute executables and network | UNVERIFIED | [Public fake smoke](../verify-agentis/acceptance/kat-3247-e2085e98/) passed. The actual launcher declares `unverified-host-scratch`, replaces HOME and PATH, and starts a host process. No receipt establishes denied access through absolute executable paths or controlled network access for that process. Provider Run containers and Docker command fixtures do not prove isolation of the fixture launcher. |
| 7. Packaged smoke and declared core CI | PASS | [Local check logs](evidence/) record frozen install, build, typecheck, lint, 98 tests in 12 files, and actual packaged smoke on macOS arm64. [Core CI](https://github.com/gannonh/agentis/actions/runs/34640899622) passed at the same SHA on Linux x64, Node 24.20.0. CI excludes macOS and Windows and does not certify Docker Desktop isolation. |
| 8. Verification and compliance documents distinguish requirements from support | PASS | [Verification index](../README.md) and [compliance register](../../compliance.md) link this run and preserve the unsupported behavior and billing limits. |
| 9. Publish every verdict and retain the gate block | PASS | This matrix records every criterion. Overall Gate 0 remains UNVERIFIED. No Gate 1 approval follows from these receipts. |

A criterion marked PASS for documentation means the required distinctions or decisions are recorded. It does not convert each stated limitation into observed support.

## Commands and environment

[Environment](evidence/environment.json) records macOS 26.5.2 arm64, Node 24.20.0, pnpm 9.15.9, Docker Desktop context and immutable local image IDs. Existing images were used. Provisioning from an empty image cache was not tested.

Commands ran from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm pack:smoke
node .agents/skills/verify-agentis/helpers/smoke.mjs docs/verification/verify-agentis/acceptance/kat-3247-e2085e98
node scripts/live-provider-conformance.mjs /Users/gannonhall/.agentis/kat-3247-e2085e98 mara smoke allow deny plan input cancel
node scripts/live-provider-conformance.mjs /Users/gannonhall/.agentis/kat-3247-e2085e98 ivo smoke allow deny plan input cancel
node scripts/live-handoff-conformance.mjs /Users/gannonhall/.agentis/kat-3247-e2085e98
node docs/verification/kat-3247/rejected-handoff.mjs /Users/gannonhall/.agentis/kat-3247-rejection-e2085e98
node docs/verification/kat-3247/crash-containment.mjs /Users/gannonhall/.agentis/kat-3247-rejection-e2085e98
node docs/verification/kat-3247/recovery.mjs /Users/gannonhall/.agentis/kat-3247-recovery-e2085e98
```

The first attempt used `/Users/gannonhall/.agentis/kat-3243-validation-v3` and received HTTP 409 for all submissions. [Public status](evidence/existing-root-status.json) subsequently confirmed `stopAll: true` and zero active runs. The [failed receipt](evidence/mara-existing-root.json) is retained. The old latch was not reset.

Fresh roots received copies of the existing dedicated Codex and Claude auth volumes. Copy containers had no network, read-only source mounts, and no credential output. No host Codex login or Claude subscription credential was imported. The source volume suffix was `785854262ba07bc8a1bd4575`; destination suffixes were `401192422abda571281caa0d` and `9732029e35dd1709713b950e`. Each is the first 24 hex characters of SHA-256 of its absolute data root. This is a provisioned-environment verification, not a clean-login demonstration.

The existing live scripts write their receipts under KAT-3243. Each new receipt was copied into this directory, then its historical destination was restored from HEAD. The new helper scripts use the same public HTTP and daemon lifecycle pattern with explicit assertions for their added scenarios.

## Recovery and support boundaries

- Transcript restoration means retained Agentis messages and artifacts remain associated with their tasks. It is separate from starting provider work.
- SSE reconnect means reading retained event rows through `/v1/events?cursor=...`. The current HTTP test proves an event stream contains task submission. The separate public recovery helper reconnects from the last observed sequence and checks the exact remaining event IDs. Invalid-cursor and slow-client audits were not performed here.
- Provider-session loading passed with stable native identity, unchanged messages and no duplicate artifact. Codex repeated loading also passed. This is history loading, not continuation of an interrupted action.
- Interrupted runs remain distinct terminal or unresolved state. The public fake-provider SIGKILL/restart receipt covers interruption across reopen without another attempt. Real-resource reconciliation, safe retry, backup and restore remain KAT-3241 work.
- Codex native plan output and structured input passed. Dedicated blocking native plan approval remains unavailable. Claude plan rejection uses AskUserQuestion. MCP and attachment capabilities remain unavailable as documented.
- Provider credentials exist inside the provider's own container and are readable by same-user native tools there. Owner credentials and the database are separate. This accepted trust assumption is not a claim that provider credentials are hidden from their native tools.
- Invoice attribution, a hard financial cap, external demand, pilot usefulness and production reliability were not measured.

The first crash helper invocation omitted the unknown-provider command's endpoint and rejected for the wrong reason. Its [initial receipt](evidence/crash-containment-initial.json) is retained but does not prove unknown-provider handling. The corrected helper requires the invalid provider value in the schema error and passed on a second run. Both invocations observed live peer survival after provider-container SIGKILL.

[Artifact checks](evidence/artifact-checks.json) independently read nine returned files and matched every byte count and SHA-256 against the public metadata.

## Remaining work

[KAT-3336](https://linear.app/kata-sh/issue/KAT-3336/prove-fixture-launcher-isolation-required-by-gate-0) records the fixture boundary repair in Backlog and blocks this gate. Fixture isolation needs a demonstrable boundary or a separately approved specification change. PATH and HOME changes do not establish the required absolute-executable and network restrictions. Architecture repair is outside this verification ticket's stated scope.

A live rejection must actually occur before retained sender ownership can be certified. The failed prompt is retained verbatim in the rejection receipt. The accepted response is not evidence of how the rejected state behaves. No stub or provider substitution was used to force a live PASS.

The [cleanup and redaction receipt](evidence/cleanup-and-redaction.json) records no running containers and no literal owner-token contents in the scoped evidence set. Absolute paths and `owner.token` filenames are retained as provenance. The receipt names the scan scope, comparison, pattern, source SHA and rerunnable audit command. Provider state and auth volumes and dedicated data roots remain available for inspection. This run did not remove historical state or credentials.

The added live helpers await daemon exit. The separate cleanup receipt records the container inventory afterward. They do not individually certify endpoint disappearance, stopped-resource cleanup or removal of retained volumes.
