# Two-provider workflow evidence

The selected providers are Codex app-server and direct Claude Agent SDK. Live product source for the original KAT-3243 run is `3c76c681ecd1be59789311d3fb3dd7ab3d555bfe`. That live suite is equivalent to merged `edd5ad07e3e0b248ffb51c4fd7988b477aac888f`, whose PR head was `5415f5df`. The live suite was not re-run on this KAT-3302 follow-up. Verification of the original live receipts ran on macOS arm64, Docker Desktop, and Node 24.20.0 on September 7, 2026. The Codex quota fixture in this follow-up ran on Node 24.20.0 at SHA `71cccf2d11ce659840a9e9fba1f9757bc761fd69`. All nine Build acceptance criteria pass with the evidence distinctions below. The implementing PR is ready for Agent Review only after its own checks. This document does not grant merge permission.

The [rejected Cursor candidate](cursor-candidate-historical.md) and its failure receipts remain historical evidence. Cursor runtime paths were removed after owner approval and the [Claude feasibility gate](replacement-provider/README.md) passed. No fallback or third supported provider was added.

## Acceptance matrix

| Criterion | Result | Evidence and limits |
| --- | --- | --- |
| AC1: Same bounded workflow | PASS | Both selected providers returned `KAT3243_CONTAINER_OK` and approved command output `3243`. Exact auth, model, transport and image pins are recorded. |
| AC2: Provider-specific transport | PASS | Codex app-server JSONL and Claude SDK bridge retain native permission, question, plan and history semantics. |
| AC3: Capabilities and decisions | PASS | Both emitted blocking questions and resumed to Blue. Claude rejected a full plan through AskUserQuestion and returned REJECTED without execution. Codex retained native plan output; dedicated blocking plan approval remains explicitly unavailable. MCP and attachment gaps are typed. |
| AC4: Typed unavailable states | PASS | Public fixtures cover unknown providers and unsupported operations. Live missing scoped authentication fails without an artifact; it is a launcher failure, not a native authentication response. |
| AC5: Identity and history | PASS | Both text and tool-bearing sessions loaded with stable provider IDs, messages and one artifact. Repeated Codex load was stable. Canceled Claude history reconciliation has public regression coverage without replaying ownership/output. |
| AC6: Decisions and failures | PASS | Live allow, deny, input, cancel, and load passed on both selected providers. Claude missing-auth is live on product `3c76c681`. Codex missing-auth remains [the dirty `5e80f20` receipt](evidence/responses/provider-conformance-mara-no-auth.json) and is weaker evidence for KAT-3247. Claude quota uses the existing `QUOTA` stub fixture. Codex quota uses the KAT-3302 deterministic protocol fixture: accepted `turn/start`, then `turn/completed` with `TurnError` `usageLimitExceeded`. Command: `pnpm --filter @agentis-labs/cli exec vitest run test/codex.test.ts -t "classifies a protocol quota failure"`. Fixture SHA `71cccf2d11ce659840a9e9fba1f9757bc761fd69`. Receipt: [codex-quota-protocol-fixture.json](evidence/responses/codex-quota-protocol-fixture.json). Crash handling still uses deterministic fixtures. No real account quota was exhausted. |
| AC7: Bounded handoff | PASS | Live acceptance transferred ownership once, returned the exact attributed draft to the originating thread, refused duplicate dispatch and loaded without duplication. Native handoff tools are structurally absent. Rejection, timeout and stale-event handling have public fixture coverage. |
| AC8: Concurrency and stop-all | PASS | Both providers waited on separate native approvals. Limit bypass was rejected; stop-all canceled both, refused late approvals with no effects, and cleaned up without artifacts. |
| AC9: Fixtures plus real proof | PASS | This follow-up's public fixture suite is 99 tests across 13 files. Live workflows remain the original receipts, equivalent to merged `edd5ad07`. |

## Verification

The original live capture recorded frozen install, typecheck, lint, 96 tests across 12 files, build, and packaged CLI smoke. [Captured checks](evidence/logs/claude-final-checks.log) and [independent spec/quality review](replacement-provider/implementation-review.json) record that run. This KAT-3302 follow-up re-ran install, typecheck, lint, 99 tests across 13 files, build, and pack:smoke on Node 24.20.0. The extra test is the Codex quota fixture.

- [Claude live workflow](evidence/responses/provider-conformance-ivo-smoke-allow-deny-plan-input-cancel.json): all six cases pass, including text/tool session loading and terminal container cleanup.
- [Codex live workflow](evidence/responses/provider-conformance-mara-smoke-allow-deny-plan-input-cancel.json): all six cases pass, including repeated session loading and native plan output.
- [Claude missing auth](evidence/responses/provider-conformance-ivo-no-auth.json): typed launcher failure with no artifact on clean product `3c76c681`. [Codex missing auth](evidence/responses/provider-conformance-mara-no-auth.json): typed launcher failure with no artifact on dirty `5e80f20`. That Codex receipt is unrefreshed and remains a KAT-3247 limit.
- [Codex quota protocol fixture](evidence/responses/codex-quota-protocol-fixture.json): deterministic `QUOTA` brief, accepted `turn/start`, failed `turn/completed` with `usageLimitExceeded`, typed `quota`, no artifact, no live billing. Log: [codex-quota-protocol-fixture.log](evidence/logs/codex-quota-protocol-fixture.log).
- [Final combined handoff and concurrency](evidence/responses/live-handoff-conformance.json): both cases PASS on the replacement product source.

## Pins, authentication and boundaries

Codex is pinned to `0.153.4`, model `gpt-5.6-sol`, medium effort, native ChatGPT device authentication. Claude SDK is `0.3.263`, native CLI `2.1.263`, model `claude-sonnet-5`, medium effort and supported Anthropic API-key billing. Gannon owns integration and support. No subscription credential reuse or invoice attribution is claimed. [Claude image receipt](replacement-provider/product-environment.json) and [provider setup](../../provider-setup.md) document the environment.

Each native process runs in a nonroot container with a read-only root, its own retained provider home and restricted proxy network. Owner tokens, the database and host configuration are not mounted. Claude permits only Bash and AskUserQuestion for ordinary Runs; each handoff turn exposes no native tools. Every native initialization must match the expected model, authentication source and exact tool inventory. The feasibility receipt records the actual empty-tool draft inventory; implementation tests cover enforcement on both resumed handoff turns.

Schema `gate0.5` refused the earlier synthetic database. The operator [preserved its bytes and hashes](evidence/responses/schema0.5-preservation.json) before creating the fresh verification dataset. This is test preparation, not a product migration/reset path.

## Reproduce

Provision and authenticate both providers against the same dedicated synthetic data root, then run:

```sh
node scripts/live-provider-conformance.mjs DATA_ROOT mara smoke allow deny plan input cancel
node scripts/live-provider-conformance.mjs DATA_ROOT ivo smoke allow deny plan input cancel
node scripts/live-handoff-conformance.mjs DATA_ROOT
```

Run the combined script last: stop-all latches its dataset. Preserve old synthetic data before another run. The [manifest report](evidence/evidence.md) separates commands, historical attempts and final acceptance slices.
