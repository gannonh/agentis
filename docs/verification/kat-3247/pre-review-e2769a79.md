# Gate 0 verification before external helper review

Historical acceptance report. Subsequent external review found helper cleanup ownership and audit portability defects; the [current report](README.md) includes their repairs and final evidence.

**All nine verification criteria PASS** on product and harness commit `e2769a79f7e59d7c4d5c771a29a6874f2151df2b`, September 11, 2026. Both live providers completed without authentication dropout. The repair and verification work is complete. At this handoff, PR #465 awaits human review and merge; milestone closure still requires its in-scope issues to be Done. Gate 1 has not been started or approved.

The [initial assessment](initial-e2085e98.md) recorded two gaps. The [repair design](repair-design.md) explains the fixture-container boundary and corrected handoff prompt. Initial failures and preliminary dirty-source checks remain preserved; the receipts below use the committed repairs. Subsequent report/evidence commits do not change product or harness code.

## Requirement matrix

| KAT-3247 criterion | Verdict | Evidence and limits |
| --- | --- | --- |
| 1. Workflow, audience, fixed evaluation and chosen interaction | PASS | [Owner-directed workflow](../../research/2026-09-06-workflow-research.md), [fixed 20-case evaluation](../../research/team-workflow-evaluation-v1.md), and [chosen conversation design](../../research/kat-3254/adoption.md) record the business-team audience and macOS Apple silicon target. Prototype evidence is simulated; external demand remains unverified. |
| 2. Provider access, billing, transport and authority decisions | PASS | [Provider setup](../../provider-setup.md), [provider register](../../compliance.md), and [authority research](../../research/execution-boundaries/README.md) record decisions and limits. Codex uses ChatGPT login; direct Claude SDK uses an API key. This is not invoice reconciliation, policy recertification, a hard spend-cap proof or real-resource recovery certification. |
| 3. Two live workflows, handoff, ownership and duplicate prevention | PASS | [Codex](evidence/repaired/mara.json) and [Claude](evidence/repaired/ivo.json) each passed smoke, allow, deny, plan, input and cancel. [Accepted handoff](evidence/repaired/handoff.json) proves ownership transfer, attributed artifact, duplicate proposal prevention, concurrent approvals and stop-all. [Native rejection](evidence/repaired/rejected-handoff.json) proves Ivo rejects an unsupported outcome, Mara retains completed ownership, and the original artifact remains unchanged. Existing protocol tests cover late/stale event rejection. |
| 4. Distinguish restoration, reconnect, session loading and interrupted runs | PASS | [Recovery receipt](evidence/repaired/recovery.json) proves exact cursor replay, retained transcript/artifacts after daemon SIGKILL/restart, and a waiting fake run becoming interrupted without another attempt. Both native providers passed session-history loading. This does not certify continuation of interrupted actions or real-resource reconciliation. |
| 5. Unknown provider and provider crash preserve peers | PASS | [Containment receipt](evidence/repaired/crash-containment.json) records unknown-provider rejection at the CLI schema boundary, SIGKILL of Ivo's exact owned Run container, Mara remaining pending and then completing after approval, and healthy HTTP. This covers one live crash point. |
| 6. Fixture isolation from credentials, configuration, absolute executables and network | PASS | [Installed-package isolation](evidence/repaired/packaged-isolation.json) proves all 14 denial checks in the actual launched container, exact mounts, matching non-root identity, explicit environment and writable scratch. Host credentials/configuration, host-only executables, symlink escape, host writes, Docker socket and external IPv4/IPv6/host-network access are blocked. The fresh fixture token/database and image-local executables remain inside the intended boundary. |
| 7. Packaged smoke and declared core CI | PASS | [Local checks](evidence/repaired/checks.json) passed frozen install, typecheck, lint, 98 tests in 12 files, build and installed-tarball smoke on macOS arm64. [Linux x64 core CI](https://github.com/gannonh/agentis/actions/runs/34647883058) passed on the same SHA and Node 24.20.0, including packaged fixture isolation. [CI receipt](evidence/repaired/core-ci.json) records every job and step. Windows and automated macOS CI remain excluded. |
| 8. Verification and compliance documents distinguish requirements from support | PASS | [Verification index](../README.md) and [compliance register](../../compliance.md) record current evidence and retain unsupported recovery, billing and provider capabilities. |
| 9. Publish every verdict and retain gate controls | PASS | Every criterion has a verdict and evidence. No authentication dropout occurred. This verifies the bounded Gate 0 workflow; merge, milestone closure and Gate 1 start remain governed by the lifecycle. |

A documentation PASS means the required decisions and distinctions are recorded. It does not turn their limitations into observed support.

## Reproduction and provenance

[Environment](evidence/repaired/environment.json) records macOS 26.5.2 arm64, Node 24.20.0, pnpm 9.15.9, Docker Desktop and image identities. Provider pins remain Codex app-server 0.153.4 with `gpt-5.6-sol`/medium and Claude SDK 0.3.263, native CLI 2.1.263 with `claude-sonnet-5`/medium. [Provisioning](evidence/repaired/provisioning.json) records copies of existing dedicated auth volumes through network-disabled containers with read-only sources and no credential output. This is a provisioned-environment run, not a clean-login demonstration.

[Acceptance commands and exit codes](evidence/repaired/acceptance-run.json) record all eight drives in order. Commands ran from this checkout:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm pack:smoke
node scripts/live-provider-conformance.mjs /Users/gannonhall/.agentis/kat-3247-completion-20260911 mara smoke allow deny plan input cancel
node scripts/live-provider-conformance.mjs /Users/gannonhall/.agentis/kat-3247-completion-20260911 ivo smoke allow deny plan input cancel
node scripts/live-handoff-conformance.mjs /Users/gannonhall/.agentis/kat-3247-completion-20260911
node docs/verification/kat-3247/rejected-handoff.mjs /Users/gannonhall/.agentis/kat-3247-completion-rejection-20260911 docs/verification/kat-3247/evidence/repaired/rejected-handoff.json
node docs/verification/kat-3247/crash-containment.mjs /Users/gannonhall/.agentis/kat-3247-completion-rejection-20260911 docs/verification/kat-3247/evidence/repaired/crash-containment.json
node docs/verification/kat-3247/recovery.mjs /Users/gannonhall/.agentis/kat-3247-completion-recovery-20260911 docs/verification/kat-3247/evidence/repaired/recovery.json
node docs/verification/kat-3247/fixture-lifecycle.mjs docs/verification/kat-3247/evidence/repaired/fixture-lifecycle.json
node .agents/skills/verify-agentis/helpers/smoke.mjs docs/verification/verify-agentis/acceptance/kat-3247-completion-20260911
node docs/verification/kat-3247/audit-evidence.mjs
```

Use fresh dedicated roots and new evidence destinations for a rerun. The handoff suite intentionally latches stop-all. The first two live scripts write to their historical KAT-3243 destinations; this run copied the new receipts into `evidence/repaired/` and restored the historical files byte-for-byte.

[Artifact verification](evidence/repaired/artifact-checks.json) independently read ten native artifact files and matched their byte counts and SHA-256 values. The packaged smoke separately verifies literal artifact content, size, hash and canonical containment. The [public fixture smoke](../verify-agentis/acceptance/kat-3247-completion-20260911/result.json) retains its artifact copy and confirms container, supervisor, endpoint and temporary-root cleanup.

[Lifecycle checks](evidence/repaired/fixture-lifecycle.json) passed launcher SIGKILL, external container stop and missing-Docker failure. The launcher has no host fallback. A trusted host TCP relay preserves local CLI/SSE access while the fixture container has only its own loopback network. Generic direct fake serving remains explicitly `unverified-host-scratch` for controlled debugging/recovery and cannot claim `docker-fixture-container`.

## Limits and cleanup

- The fixture boundary protects host resources outside its fresh mounted root. It does not isolate the fake engine from its own daemon token/database, or certify protection from host administration or kernel escapes.
- Provider credentials remain readable by native tools in their own provider container. Owner credentials and the database stay outside those provider containers.
- History loading and transcript restoration are distinct from action recovery. Real-resource reconciliation, safe retries, backup and restore remain later-gate work.
- Codex dedicated blocking native plan approval, MCP and attachments remain unavailable as recorded. Claude plan rejection uses AskUserQuestion.
- Provider policy research was not re-fetched. Invoice attribution, hard financial caps, external demand, pilot usefulness and production reliability were not measured.
- Dedicated provider roots/auth/state volumes and private lifecycle diagnostic roots remain for inspection. Completed public smoke roots were removed after their evidence was copied. Historical state was not reset or deleted.

[Cleanup/redaction audit](evidence/repaired/cleanup-and-redaction.json) records the exact scan scope, token comparison and container inventory. Paths and `owner.token` filenames remain as provenance; token contents are excluded. This is a scoped audit, not a claim that every possible secret or stopped resource was enumerated. [Independent review](review.md) records findings and their dispositions.
