# Two-provider workflow evidence

Overall readiness: **BLOCKED**. The implementation is available for review in a draft PR. KAT-3243 remains In Progress; the original acceptance criteria are not complete.

Latest product source: `c7cf2c70` (earlier receipts identify their original source). This revision fixes native Codex plan retention, stale approval dispatch and expired-approval cleanup, and adds the documented Cursor subagent hook for conformance testing. Verification ran on macOS arm64 with Docker Desktop and Node 24.20.0 on September 7, 2026.

## Acceptance matrix

PASS means the stated criterion is established; FAIL records an observed unsuccessful check; UNVERIFIED includes partial evidence and blocked live checks.

| Criterion | Status | Evidence and limits |
| --- | --- | --- |
| AC1: Same bounded workflow through both live providers | PASS | Both returned the exact draft marker using their selected authentication and pinned executables. Auth/billing/support details are documented; invoice attribution is not claimed. |
| AC2: Provider-specific transport semantics | PASS | Codex app-server and Cursor ACP preserve distinct native plan/input semantics. Codex native plans are retained without inventing a blocking plan-approval RPC. |
| AC3: Capabilities and blocking decisions | FAIL | Codex blocking input and native plans passed; Cursor plan rejection passed. Cursor completed without emitting the required blocking question. Unsupported MCP/attachment operations are explicit. |
| AC4: Typed unavailable states and isolation | PASS | Public-boundary fixtures cover unsupported/unknown providers; real-container missing-auth paths passed without artifacts. |
| AC5: Separate identifiers and deduplicated history | PASS | Both providers completed text/tool session loading with stable identities, messages and artifact counts. Native Codex plan duplicate delivery is covered by regression. |
| AC6: Decisions, cancellation and provider failures | UNVERIFIED | Both live allow/deny/cancel/load paths passed; Codex structured input passed. Missing auth passed; quota/crash/malformed cases have fixture coverage. Cursor blocking input remains unproven. |
| AC7: Bounded accepted specialist handoff | FAIL | Live acceptance, single ownership transfer, source context, attributed draft return, duplicate refusal and load passed. The native Cursor Task test launched a subagent despite the configured denial hook. Rejection/timeout remain fixture evidence. |
| AC8: Concurrency, limits and stop-all | PASS | Corrected live retry held both providers on native approvals with separate identities, rejected per-bot/global limit bypass, canceled both via stop-all, rejected both late approvals with HTTP 409 and no dispatch effects, and cleaned up without late artifacts. |
| AC9: Malformed fixtures and mandatory real proof | UNVERIFIED | 80 tests pass and both providers have live receipts. Full conformance remains incomplete because of the Cursor question and native delegation failures. |

## Verification

Required checks passed: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (80 tests in 11 files), `pnpm build`, and `pnpm pack:smoke`. Captured output is in [evidence/logs](evidence/logs). Independent implementation spec and quality reviews passed within the implemented scope; those reviews do not resolve the live acceptance blockers.

[Final Cursor workflow](evidence/responses/provider-conformance-ivo-smoke-allow-deny-plan-cancel.json) records five passing real product cases: exact draft marker, approved command output, denial, plan rejection and cancellation. Successful text and tool-bearing sessions reloaded without duplicate history, public messages or artifacts. Terminal container cleanup passed. `fixtureMode` is false.

[Final Cursor question check](evidence/responses/provider-conformance-ivo-input.json) failed: the provider completed without the required blocking request. Earlier [protocol question probe](evidence/responses/cursor-question-probe.json) also returned plain text. Structured blocking question behavior remains unverified live.

Both real-container provider launch paths passed missing-auth checks: [Codex](evidence/responses/provider-conformance-mara-no-auth.json) and [Cursor](evidence/responses/provider-conformance-ivo-no-auth.json). These prove the unavailable-auth path only. Codex refuses the missing credential in the container launcher before executing the provider binary; this is not a native Codex authentication response. The owner subsequently completed native Codex login successfully; [authentication receipt](evidence/responses/codex-authentication.json). Authentication is resolved for both providers.

## Pinned environment and boundaries

- Codex app-server `0.153.4`; model `gpt-5.6-sol`, reasoning medium; native ChatGPT device authentication.
- Cursor CLI `2026.09.02-c22c1a3`, ACP 1 with SDK 1.4.0; model `gpt-5.6-sol[context=272k,reasoning=medium,fast=false]`; Cursor user API key imported privately from ignored `.env` into the dedicated provider volume.
- Base image Node 24.20.0 Bookworm slim, index SHA-256 `ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e`; Squid `5.7-2+deb12u6`.
- Docker image IDs: Codex `sha256:3faa3d64ce3ffa7c3d5f1d62d5bd5cab1b1d5692247fbec207a1edec24e4d6a1`; Cursor `sha256:30f0e87f2bdee3eecd1d7104bfb66162df4ff0bfc7b141565c81ea472ad66871` (arm64).
- Cursor Linux arm64 archive SHA-256 `fb7bc635be6172ebcf68f907fd9217e3614da51916455c6d7fdb66690997884c`, 177647834 bytes. Image built locally; no image redistribution.

[Provider setup](../../provider-setup.md) documents auth, billing limits and support ownership. Successful usage does not prove invoice attribution or Codex plan entitlement. Gannon owns integration/support decisions.

[Network receipt](evidence/responses/network-fixed.json) records the isolated internal Run network and exact provider proxy allowlist, with private/arbitrary destinations denied. [Host control](evidence/responses/direct-host-control.json) records the synthetic listener comparison. Containers use nonroot execution, a read-only root, scratch mounts and scoped provider credentials; no owner token or host fallback.

[Native Cursor policy probe](evidence/responses/native-cursor-policy.json) records successful startup and exact marker with the project policy mounted read-only at `/workspace/.cursor/cli.json`. Provider text reported command/read permission denial, no owner permission callbacks occurred, and the forbidden file was absent. Native tool notifications still reported completed and do not expose raw results; this observation is not universal enforcement proof. [Native policy load](evidence/responses/native-cursor-policy-load.json) succeeded with the same policy. This earlier probe did not establish native Task enforcement; the later Task-specific probe below records FAIL despite the documented hook. Agentis rejects onward delegation and owner-only operations. See [handoff contract](../../runtime/bounded-handoff.md).

Historical failures remain in the evidence directory: initial Cursor load, initial missing-auth classification, and the unsuccessful read-only global Cursor config approach. Corrected receipts and final workflow results supersede those attempts. Raw exploratory protocol streams are retained privately outside the repository; compact observations are included here.

The product refused the old synthetic schema without migration ([receipt](evidence/responses/schema-refusal.json)). The operator then preserved that test database separately before creating the new synthetic dataset ([preservation receipt](evidence/responses/test-data-preservation.json)); the product does not reset or migrate unsupported data.

## Latest live results and corrections

[Codex workflow](evidence/responses/provider-conformance-mara-smoke-allow-deny-plan-input-cancel.json) passed smoke, allow, deny, structured input, cancellation and both session reload cases. Its `plan` case used an invalid Cursor-specific `create_plan` request; retain that failed probe without interpreting it as Codex planning failure. The corrected [native Codex plan probe](evidence/responses/provider-conformance-mara-plan.json) passed with a retained native `plan` item, no approval, and an explicit unavailable blocking-plan-approval capability.

The [accepted handoff](evidence/responses/live-handoff-conformance-intermediate-text-approval.json) passed through both authenticated providers. Its concurrency setup returned a plain-text approval request from Cursor, so that intermediate attempt did not establish concurrency. The [final retry](evidence/responses/live-handoff-conformance.json) used the previously successful native tool prompt and passed concurrency, limits, stop-all, late-approval rejection and cleanup. The first stop-all run exposed late approval state revival; [historical receipt](evidence/responses/live-handoff-conformance-historical-before-fix.json) retains the failure. The fix cancels pending approvals, checks actionable run state before expiry, removes replay dispatch effects, and terminates the provider on expired rejected decisions. Public regressions include actual process termination.

The [native subagent probe](evidence/responses/native-cursor-subagent-policy.json) is **FAIL**: a Task invocation progressed to completion and produced a native child agent ID and the synthetic child marker despite immutable `subagentStart` denial configuration. No denial marker or permission callback was observed. This supersedes the earlier assumption that documented configuration and static wiring might establish enforcement. No real-resource work was requested. Probe containers/network and its isolated state volume were cleaned up.

## Remaining gate

Authentication requires no further user action. Cursor must demonstrate blocking questions and enforce no native onward delegation before these requirements can pass. Do not weaken the spec, call the native Task failure a pass, or infer enforcement from prompt instructions. Keep the PR draft and Linear In Progress until the provider behavior is corrected or the owner explicitly approves a different specification.

## Reproduce live acceptance

The preserved receipts contain exact commands and source state. For a provisioned fresh synthetic dataset, run `node scripts/live-provider-conformance.mjs DATA_ROOT mara smoke allow deny plan input cancel` and the corresponding Cursor cases. `scripts/live-handoff-conformance.mjs DATA_ROOT` exercises accepted handoff and concurrent approvals followed by stop-all; run it last because stop-all latches that dataset. Provider credentials remain in scoped Docker volumes. Never reset a product dataset to rerun a probe; preserve synthetic test data explicitly, as recorded in the test-data archival receipts.

The synthetic stopped dataset was preserved before retesting ([receipt](evidence/responses/stop-all-test-data-preservation.json)); provider credentials were retained and required no new login. The final verification dataset is now stop-all latched.

The generated [manifest report](evidence/evidence.md) lists exact commands and receipts. Its passing-command summary is partial evidence; its blocked/failing slice results determine readiness.
