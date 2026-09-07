# Two-provider workflow evidence

Overall readiness: **BLOCKED**. The implementation is available for review in a draft PR. KAT-3243 remains In Progress; the original acceptance criteria are not complete.

Product source: `67596da736bd72e13bf778f4d97aaa355f5720ef`. The subsequent evidence commit adds these receipts and adjusts only conformance report filenames and fixture-mode diagnostics. Verification ran on macOS arm64 with Docker Desktop and Node 24.20.0 on September 7, 2026.

## Acceptance matrix

PASS means the stated criterion is established; FAIL records an observed unsuccessful check; UNVERIFIED includes partial evidence and blocked live checks.

| Criterion | Status | Evidence and limits |
| --- | --- | --- |
| AC1: Same workflow through two live providers | UNVERIFIED | Cursor completed the live workflow. Codex native login is pending; authenticated Codex and billing eligibility remain unverified. |
| AC2: Chosen transports preserve semantics | UNVERIFIED | Codex app-server and Cursor ACP adapters implemented and fixture-tested. Live Cursor passed; authenticated Codex remains unverified. |
| AC3: Capabilities and blocking decisions | FAIL | Cursor live plan rejection passed, but the structured question probe completed without a blocking request. Unsupported attachment and MCP operations are explicit. Full capability conformance remains unverified. |
| AC4: Typed unavailable states and isolation | PASS | Public-boundary fixtures cover unsupported/unknown providers and isolation. Both real-container provider launch paths returned typed unavailable authentication without artifacts. |
| AC5: Separate identities and deduplicated history | UNVERIFIED | Live Cursor text and tool-bearing session reloads preserved identities, history, messages and one artifact. Authenticated Codex reload remains unverified. |
| AC6: Provider decisions and failures | UNVERIFIED | Live Cursor smoke, allow, deny, plan rejection, cancel and load passed; both live missing-auth checks passed. Quota, crash and malformed cases have fixture coverage. Codex authenticated cases and Cursor blocking input remain unverified. |
| AC7: Bounded accepted specialist handoff | UNVERIFIED | Acceptance, ownership, rejection, timeout, stale events, attribution and bounded source-artifact checks pass fixtures. Native Cursor project-policy startup/load probes succeeded; reported shell/read denials and no forbidden file were observed. Full live handoff and native Task/subagent enforcement remain unverified. |
| AC8: Concurrent bots and stop-all | UNVERIFIED | Concurrency limits, isolation and stop-all pass public-boundary fixtures. Two authenticated live providers have not run concurrently. |
| AC9: Malformed fixtures and mandatory real proof | UNVERIFIED | 72 tests pass, including protocol/error regressions. Partial real Cursor evidence is recorded; mandatory two-provider live evidence remains incomplete. |

## Verification

Required checks passed: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (72 tests in 11 files), `pnpm build`, and `pnpm pack:smoke`. Captured output is in [evidence/logs](evidence/logs). Independent implementation spec and quality reviews passed within the implemented scope; those reviews do not resolve the live acceptance blockers.

[Final Cursor workflow](evidence/responses/provider-conformance-ivo-smoke-allow-deny-plan-cancel.json) records five passing real product cases: exact draft marker, approved command output, denial, plan rejection and cancellation. Successful text and tool-bearing sessions reloaded without duplicate history, public messages or artifacts. Terminal container cleanup passed. `fixtureMode` is false.

[Final Cursor question check](evidence/responses/provider-conformance-ivo-input.json) failed: the provider completed without the required blocking request. Earlier [protocol question probe](evidence/responses/cursor-question-probe.json) also returned plain text. Structured blocking question behavior remains unverified live.

Both real-container provider launch paths passed missing-auth checks: [Codex](evidence/responses/provider-conformance-mara-no-auth.json) and [Cursor](evidence/responses/provider-conformance-ivo-no-auth.json). These prove the unavailable-auth path only. Codex refuses the missing credential in the container launcher before executing the provider binary; this is not a native Codex authentication response. Two Codex device login attempts expired before authentication completed.

## Pinned environment and boundaries

- Codex app-server `0.153.4`; model `gpt-5.6-sol`, reasoning medium; native ChatGPT device authentication.
- Cursor CLI `2026.09.02-c22c1a3`, ACP 1 with SDK 1.4.0; model `gpt-5.6-sol[context=272k,reasoning=medium,fast=false]`; Cursor user API key imported privately from ignored `.env` into the dedicated provider volume.
- Base image Node 24.20.0 Bookworm slim, index SHA-256 `ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e`; Squid `5.7-2+deb12u6`.
- Docker image IDs: Codex `sha256:3faa3d64ce3ffa7c3d5f1d62d5bd5cab1b1d5692247fbec207a1edec24e4d6a1`; Cursor `sha256:30f0e87f2bdee3eecd1d7104bfb66162df4ff0bfc7b141565c81ea472ad66871` (arm64).
- Cursor Linux arm64 archive SHA-256 `fb7bc635be6172ebcf68f907fd9217e3614da51916455c6d7fdb66690997884c`, 177647834 bytes. Image built locally; no image redistribution.

[Provider setup](../../provider-setup.md) documents auth, billing limits and support ownership. Successful usage does not prove invoice attribution or Codex plan entitlement. Gannon owns integration/support decisions.

[Network receipt](evidence/responses/network-fixed.json) records the isolated internal Run network and exact provider proxy allowlist, with private/arbitrary destinations denied. [Host control](evidence/responses/direct-host-control.json) records the synthetic listener comparison. Containers use nonroot execution, a read-only root, scratch mounts and scoped provider credentials; no owner token or host fallback.

[Native Cursor policy probe](evidence/responses/native-cursor-policy.json) records successful startup and exact marker with the project policy mounted read-only at `/workspace/.cursor/cli.json`. Provider text reported command/read permission denial, no owner permission callbacks occurred, and the forbidden file was absent. Native tool notifications still reported completed and do not expose raw results; this observation is not universal enforcement proof. [Native policy load](evidence/responses/native-cursor-policy-load.json) succeeded with the same policy. Cursor native Task/subagent preexecution enforcement has no demonstrated deny hook and remains UNVERIFIED. Agentis rejects onward delegation and owner-only operations. See [handoff contract](../../runtime/bounded-handoff.md).

Historical failures remain in the evidence directory: initial Cursor load, initial missing-auth classification, and the unsuccessful read-only global Cursor config approach. Corrected receipts and final workflow results supersede those attempts. Raw exploratory protocol streams are retained privately outside the repository; compact observations are included here.

The product refused the old synthetic schema without migration ([receipt](evidence/responses/schema-refusal.json)). The operator then preserved that test database separately before creating the new synthetic dataset ([preservation receipt](evidence/responses/test-data-preservation.json)); the product does not reset or migrate unsupported data.

## Resume live acceptance

1. Complete native Codex authentication using `node packages/cli/dist/bin.js provider login --data-root /Users/gannonhall/.agentis/kat-3243-validation-v3` and its browser flow. Do not paste credentials into a task or repository file.
2. Run `node scripts/live-provider-conformance.mjs /Users/gannonhall/.agentis/kat-3243-validation-v3 mara smoke allow deny plan input cancel`. Record actual supported behavior; do not convert absent features into passes.
3. Exercise the documented full accepted/rejected/timed-out handoff and two-provider concurrency/stop-all after both providers authenticate. Resolve or explicitly revise the spec for unavailable Cursor structured question and native delegation enforcement before claiming acceptance.
4. Capture new receipts, update this matrix and rerun the evidence validator. Keep the PR draft until all required acceptance gates pass.

The generated [manifest report](evidence/evidence.md) lists exact commands and receipts. Its passing-command summary is partial evidence; its blocked/failing slice results determine readiness.
