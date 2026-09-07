# UAT Evidence: KAT-3243 two-provider container workflow and bounded handoff

UAT Scope: KAT-3243 two-provider container workflow and bounded handoff
Target: cli
Evidence mode: user-facing
Timestamp: 2026-09-07T21:23:01.399900+00:00
Git commit: c7cf2c70

## Required Evidence Status
- E2E: Pass - `docs/verification/kat-3243/evidence/logs/cursor-live-workflow.log`
- Screenshots: Not applicable
- Video: Not applicable

## Slice-by-slice result
- Pass: Same bounded workflow through both live providers - Both returned the exact draft marker using their selected authentication and pinned executables. Auth/billing/support details are documented; invoice attribution is not claimed.
- Pass: Provider-specific transport semantics - Codex app-server and Cursor ACP preserve distinct native plan/input semantics. Codex native plans are retained without inventing a blocking plan-approval RPC.
- Fail: Capabilities and blocking decisions - Codex blocking input and native plans passed; Cursor plan rejection passed. Cursor completed without emitting the required blocking question. Unsupported MCP/attachment operations are explicit.
- Pass: Typed unavailable states and isolation - Public-boundary fixtures cover unsupported/unknown providers; real-container missing-auth paths passed without artifacts.
- Pass: Separate identifiers and deduplicated history - Both providers completed text/tool session loading with stable identities, messages and artifact counts. Native Codex plan duplicate delivery is covered by regression.
- Blocked: Decisions, cancellation and provider failures - Both live allow/deny/cancel/load paths passed; Codex structured input passed. Missing auth passed; quota/crash/malformed cases have fixture coverage. Cursor blocking input remains unproven.
- Fail: Bounded accepted specialist handoff - Live acceptance, single ownership transfer, source context, attributed draft return, duplicate refusal and load passed. The native Cursor Task test launched a subagent despite the configured denial hook. Rejection/timeout remain fixture evidence.
- Pass: Concurrency, limits and stop-all - Corrected live retry held both providers on native approvals with separate identities, rejected per-bot/global limit bypass, canceled both via stop-all, rejected both late approvals with HTTP 409 and no dispatch effects, and cleaned up without late artifacts.
- Blocked: Malformed fixtures and mandatory real proof - 80 tests pass and both providers have live receipts. Full conformance remains incomplete because of the Cursor question and native delegation failures.

## Evidence
- `docs/verification/kat-3243/evidence/responses/codex-authentication.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-load-ivo-fixed.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-load-ivo.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-smoke-ivo.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/container-tool-load-ivo.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/cursor-protocol-summary.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/cursor-question-probe.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/direct-host-control.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/live-handoff-conformance-historical-before-fix.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/live-handoff-conformance-intermediate-text-approval.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/live-handoff-conformance.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-hook-config.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-policy-global-ro-failed.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-policy-load.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-policy.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/native-cursor-subagent-policy.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/network-fixed.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/no-auth-ivo.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/no-auth-mara.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-cases-ivo.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-input.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-no-auth.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-smoke-allow-deny-plan-cancel.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-mara-no-auth.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-mara-plan.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-mara-smoke-allow-deny-plan-input-cancel.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/schema-refusal.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/stop-all-test-data-preservation.json` - Receipt; current and historical outcomes are distinguished in ../README.md.
- `docs/verification/kat-3243/evidence/responses/test-data-preservation.json` - Receipt; current and historical outcomes are distinguished in ../README.md.

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
- Exit 1: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "mara" "smoke" "allow" "deny" "plan" "input" "cancel"` -> `docs/verification/kat-3243/evidence/logs/codex-live-workflow.log`
- Exit 1: `"node" "scripts/live-handoff-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3"` -> `docs/verification/kat-3243/evidence/logs/live-handoff-concurrency.log`
- Exit 0: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "mara" "plan"` -> `docs/verification/kat-3243/evidence/logs/codex-native-plan.log`
- Exit 0: `"pnpm" "test"` -> `docs/verification/kat-3243/evidence/logs/resumed-test.log`
- Exit 0: `"pnpm" "typecheck"` -> `docs/verification/kat-3243/evidence/logs/resumed-typecheck.log`
- Exit 0: `"pnpm" "lint"` -> `docs/verification/kat-3243/evidence/logs/resumed-lint.log`
- Exit 0: `"pnpm" "build"` -> `docs/verification/kat-3243/evidence/logs/resumed-build.log`
- Exit 0: `"pnpm" "test"` -> `docs/verification/kat-3243/evidence/logs/corrected-test.log`
- Exit 0: `"pnpm" "typecheck"` -> `docs/verification/kat-3243/evidence/logs/corrected-typecheck.log`
- Exit 0: `"pnpm" "lint"` -> `docs/verification/kat-3243/evidence/logs/corrected-lint.log`
- Exit 0: `"pnpm" "build"` -> `docs/verification/kat-3243/evidence/logs/corrected-build.log`
- Exit 0: `"pnpm" "pack:smoke"` -> `docs/verification/kat-3243/evidence/logs/corrected-pack-smoke.log`
- Exit 1: `"node" "scripts/live-handoff-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3"` -> `docs/verification/kat-3243/evidence/logs/corrected-live-handoff-concurrency.log`
- Exit 0: `"node" "scripts/live-handoff-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "--concurrency-only"` -> `docs/verification/kat-3243/evidence/logs/corrected-live-concurrency-retry.log`

## Notes
- Overall readiness BLOCKED. Both providers are authenticated; no further login is required.
- Cursor native Task launched despite configured denial: FAIL. Cursor blocking question emission remains unproven. These prevent ready-for-review.
- 80 tests and required checks pass. Final live accepted handoff and concurrency/stop-all pass. Fixtures and reviews do not override native enforcement failure.
- Latest product code is c7cf2c70; earlier receipts identify their own source, and native hook helper ran against the same container source before commit. Later evidence edits only update docs and harness selection/prompt.
- Original Codex create_plan failure was an invalid cross-provider probe. Corrected native plan probe passed; no dedicated blocking plan-approval RPC is claimed.
- Readiness validator is expected to exit 1 for Fail/Blocked criteria.

## Manual Run Instructions
1. Run the product using the documented local command for this target.
   Expected: the feature path is reachable without setup or launch errors.
2. Follow the same user path described in the acceptance slices above.
   Expected: each passing slice reaches the visible or inspectable outcome shown in the evidence.

Approval and merge permission follow Linear workflow states.
Follow the owning skill for the next workflow step.
