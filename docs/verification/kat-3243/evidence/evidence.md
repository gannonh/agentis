# UAT Evidence: KAT-3243 two-provider container workflow and bounded handoff

UAT Scope: KAT-3243 two-provider container workflow and bounded handoff
Target: cli
Evidence mode: user-facing
Timestamp: 2026-09-07T22:08:42.896908+00:00
Git commit: 3c76c681ecd1be59789311d3fb3dd7ab3d555bfe

## Required Evidence Status
- E2E: Pass - `docs/verification/kat-3243/evidence/logs/cursor-live-workflow.log`
- Screenshots: Not applicable
- Video: Not applicable

## Slice-by-slice result
- Pass: Same bounded workflow through both live providers - Both selected providers returned `KAT3243_CONTAINER_OK` and approved command output `3243`. Exact auth, model, transport and image pins are recorded.
- Pass: Provider-specific transport semantics - Codex app-server JSONL and Claude SDK bridge retain native permission, question, plan and history semantics.
- Pass: Capabilities and blocking decisions - Both emitted blocking questions and resumed to Blue. Claude rejected a full plan through AskUserQuestion and returned REJECTED without execution. Codex retained native plan output; dedicated blocking plan approval remains explicitly unavailable. MCP and attachment gaps are typed.
- Pass: Typed unavailable states and isolation - Public fixtures cover unknown providers and unsupported operations. Live missing scoped authentication fails without an artifact; it is a launcher failure, not a native authentication response.
- Pass: Separate identifiers and deduplicated history - Both text and tool-bearing sessions loaded with stable provider IDs, messages and one artifact. Repeated Codex load was stable. Canceled Claude history reconciliation has public regression coverage without replaying ownership/output.
- Pass: Decisions, cancellation and provider failures - Live allow, deny, input, cancel, and load passed on both selected providers. Claude missing-auth is live. Codex missing-auth remains the dirty `5e80f20` receipt. Claude quota uses the existing stub fixture. Codex quota uses the KAT-3302 deterministic protocol fixture at SHA `71cccf2d11ce659840a9e9fba1f9757bc761fd69`. Crash handling still uses deterministic fixtures. No real account quota was exhausted.
- Pass: Bounded accepted specialist handoff - Live acceptance transferred ownership once, returned the exact attributed draft to the originating thread, refused duplicate dispatch and loaded without duplication. Native handoff tools are structurally absent. Rejection, timeout and stale-event handling have public fixture coverage.
- Pass: Concurrency, limits and stop-all - Both providers waited on separate native approvals. Limit bypass was rejected; stop-all canceled both, refused late approvals with no effects, and cleaned up without artifacts.
- Pass: Malformed fixtures and mandatory real proof - 96 tests pass, covering malformed/error and lifecycle cases, alongside the selected providers’ live workflows and combined handoff/concurrency proof.

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
- `docs/verification/kat-3243/replacement-provider/offline-setup.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/replacement-provider/implementation-review.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/replacement-provider/product-environment.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/replacement-provider/preflight.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/replacement-provider/runs/claude-feasibility-26af3cd8-d801-4765-ba34-de51b99437ba/receipt.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-cursor-no-auth-historical.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/evidence/responses/schema0.5-preservation.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/evidence/responses/live-handoff-conformance-cursor-historical.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/evidence/responses/provider-conformance-ivo-smoke-allow-deny-plan-input-cancel.json` - Recorded receipt; historical and current evidence distinguished in README.
- `docs/verification/kat-3243/evidence/responses/codex-quota-protocol-fixture.json` - Deterministic Codex quota fixture for KAT-3302. Accepted `turn/start`, then failed `turn/completed` with `usageLimitExceeded`. Typed `quota` at SHA `71cccf2d11ce659840a9e9fba1f9757bc761fd69`. Not a live billing receipt.

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
- Exit 0: `"sh" "-c" "pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm pack:smoke"` -> `docs/verification/kat-3243/evidence/logs/claude-final-checks.log`
- Exit 0: `"node" "packages/cli/dist/bin.js" "provider" "provision" "--provider" "claude" "--data-root" "/Users/gannonhall/.agentis/kat-3243-validation-v3"` -> `docs/verification/kat-3243/evidence/logs/claude-product-provision.exit`
- Exit 0: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "ivo" "smoke" "allow" "deny" "plan" "input" "cancel"` -> `docs/verification/kat-3243/evidence/logs/claude-product-live.log`
- Exit 0: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3" "mara" "smoke" "allow" "deny" "plan" "input" "cancel"` -> `docs/verification/kat-3243/evidence/logs/codex-replacement-live.log`
- Exit 0: `"node" "scripts/live-provider-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-claude-no-auth-v5" "ivo" "no-auth"` -> `docs/verification/kat-3243/evidence/logs/claude-missing-auth.log`
- Exit 0: `"node" "scripts/live-handoff-conformance.mjs" "/Users/gannonhall/.agentis/kat-3243-validation-v3"` -> `docs/verification/kat-3243/evidence/logs/claude-codex-handoff-concurrency.log`
- Exit 0: `"pnpm" "--filter" "@agentis-labs/cli" "exec" "vitest" "run" "test/codex.test.ts" "-t" "classifies a protocol quota failure"` -> `docs/verification/kat-3243/evidence/logs/codex-quota-protocol-fixture.log`

## Notes
- Current selection is Codex plus Claude SDK; all nine Build slices pass. Cursor failure receipts are historical and remain rejected.
- Live receipts identify exact source and fixtureMode=false. Those live allow, deny, input, cancel, load, and handoff receipts stay equivalent to merged `edd5ad07` (PR head `5415f5df`). They were not re-run on this follow-up.
- Claude quota and crash remain deterministic stub fixtures. Codex quota is the KAT-3302 protocol fixture (`fixtureMode=true`, SHA `71cccf2d11ce659840a9e9fba1f9757bc761fd69`). No real account quota was exhausted.
- Codex missing-auth remains dirty `5e80f20` and is an explicit KAT-3247 limit.
- Claude plan rejection uses AskUserQuestion; dedicated native plan approval and unsupported MCP/attachments remain unavailable.
- Provision command produced no stdout; its output_path records the captured exit status. Product image identity is recorded separately.
- Stop-all is latched on the final synthetic dataset. Earlier schema bytes were archived without product migration or credential replacement.

## Manual Run Instructions
1. Run the product using the documented local command for this target.
   Expected: the feature path is reachable without setup or launch errors.
2. Follow the same user path described in the acceptance slices above.
   Expected: each passing slice reaches the visible or inspectable outcome shown in the evidence.

Approval and merge permission follow Linear workflow states.
Follow the owning skill for the next workflow step.
