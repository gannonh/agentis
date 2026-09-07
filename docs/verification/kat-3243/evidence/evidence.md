# UAT Evidence: KAT-3243 two-provider container workflow and bounded handoff

UAT Scope: KAT-3243 two-provider container workflow and bounded handoff
Target: cli
Evidence mode: user-facing
Timestamp: 2026-09-07T20:54:17.982920+00:00
Git commit: 67596da736bd72e13bf778f4d97aaa355f5720ef

## Required Evidence Status
- E2E: Pass - `docs/verification/kat-3243/evidence/logs/cursor-live-workflow.log`
- Screenshots: Not applicable
- Video: Not applicable

## Slice-by-slice result
- Blocked: Same workflow through two live providers - Cursor completed the live workflow. Codex native login is pending; authenticated Codex and billing eligibility remain unverified.
- Blocked: Chosen transports preserve semantics - Codex app-server and Cursor ACP adapters implemented and fixture-tested. Live Cursor passed; authenticated Codex remains unverified.
- Fail: Capabilities and blocking decisions - Cursor live plan rejection passed, but the structured question probe completed without a blocking request. Unsupported attachment and MCP operations are explicit. Full capability conformance remains unverified.
- Pass: Typed unavailable states and isolation - Public-boundary fixtures cover unsupported/unknown providers and isolation. Both real-container provider launch paths returned typed unavailable authentication without artifacts.
- Blocked: Separate identities and deduplicated history - Live Cursor text and tool-bearing session reloads preserved identities, history, messages and one artifact. Authenticated Codex reload remains unverified.
- Blocked: Provider decisions and failures - Live Cursor smoke, allow, deny, plan rejection, cancel and load passed; both live missing-auth checks passed. Quota, crash and malformed cases have fixture coverage. Codex authenticated cases and Cursor blocking input remain unverified.
- Blocked: Bounded accepted specialist handoff - Acceptance, ownership, rejection, timeout, stale events, attribution and bounded source-artifact checks pass fixtures. Native Cursor project-policy startup/load probes succeeded; reported shell/read denials and no forbidden file were observed. Full live handoff and native Task/subagent enforcement remain unverified.
- Blocked: Concurrent bots and stop-all - Concurrency limits, isolation and stop-all pass public-boundary fixtures. Two authenticated live providers have not run concurrently.
- Blocked: Malformed fixtures and mandatory real proof - 72 tests pass, including protocol/error regressions. Partial real Cursor evidence is recorded; mandatory two-provider live evidence remains incomplete.

## Evidence
- `docs/verification/kat-3243/evidence/responses/container-load-ivo-fixed.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-load-ivo.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-smoke-ivo.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-tool-load-ivo.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/cursor-protocol-summary.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/cursor-question-probe.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/direct-host-control.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-policy-global-ro-failed.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-policy-load.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-policy.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/network-fixed.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/no-auth-ivo.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/no-auth-mara.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-cases-ivo.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-input.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-no-auth.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-smoke-allow-deny-plan-cancel.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-mara-no-auth.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/schema-refusal.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.
- `docs/verification/kat-3243/evidence/responses/test-data-preservation.json` - Sanitized receipt; final status and historical failures are explained in ../README.md.

## Commands
- Exit 0: `"node" "docs/verification/kat-3243/evidence/network-probe.mjs" "/Users/gannonhall/.agentis/kat-3243-validation"` -> `docs/verification/kat-3243/evidence/logs/provider-network.log`
- Exit 0: `"pnpm" "--filter" "@agentis-labs/cli" "exec" "vitest" "run" "test/container.test.ts"` -> `docs/verification/kat-3243/evidence/logs/container-cli-fixtures.log`
- Exit 0: `"node" "packages/cli/dist/bin.js" "provider" "provision" "--data-root" "/Users/gannonhall/.agentis/kat-3243-validation"` -> `docs/verification/kat-3243/evidence/logs/provider-provision.log`
- Exit 0: `"pnpm" "install" "--frozen-lockfile"` -> `docs/verification/kat-3243/evidence/logs/install.log`
- Exit 0: `"pnpm" "typecheck"` -> `docs/verification/kat-3243/evidence/logs/final-typecheck.log`
- Exit 0: `"pnpm" "lint"` -> `docs/verification/kat-3243/evidence/logs/final-lint.log`
- Exit 0: `"pnpm" "test"` -> `docs/verification/kat-3243/evidence/logs/final-test.log`
- Exit 0: `"pnpm" "build"` -> `docs/verification/kat-3243/evidence/logs/final-build.log`
- Exit 0: `"pnpm" "pack:smoke"` -> `docs/verification/kat-3243/evidence/logs/final-pack-smoke.log`
- Exit 0: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "ivo" "smoke" "allow" "deny" "plan" "cancel"` -> `docs/verification/kat-3243/evidence/logs/cursor-live-workflow.log`
- Exit 1: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "ivo" "input"` -> `docs/verification/kat-3243/evidence/logs/cursor-live-question.log`

## Notes
- Overall readiness: BLOCKED. Keep PR draft and Linear In Progress.
- Product source is the recorded commit; the later evidence commit only adds receipts and changes conformance report naming/fixture-mode diagnostics.
- Fixtures and native helper probes do not establish full live acceptance. Historical failed receipts are retained alongside corrected results.
- The evidence validator is expected to fail because original acceptance criteria remain Fail or Blocked. A passing E2E command does not establish overall readiness.

## Manual Run Instructions
1. Run the product using the documented local command for this target.
   Expected: the feature path is reachable without setup or launch errors.
2. Follow the same user path described in the acceptance slices above.
   Expected: each passing slice reaches the visible or inspectable outcome shown in the evidence.

Approval and merge permission follow Linear workflow states.
Follow the owning skill for the next workflow step.
