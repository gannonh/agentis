# Agentis verification skill acceptance

UAT Scope: KAT-3315, the verification skill and its isolated smoke task.
Target: CLI. Evidence mode: user-facing, nonvisual.

The automated smoke passed on implementation commit `47612889f9d05346f82e3e0e206bee7c3cce7497`, using Node 24.20.0 and pnpm 9.15.9 on macOS arm64. This is fake-provider fixture evidence. Live providers, other mapped workflows and Gate 0 acceptance remain UNVERIFIED by this run.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Public launch, doctor and task submission | PASS | [E2E log](logs/smoke-reviewed.log), [launch](smoke-reviewed/launch.json), [doctor](smoke-reviewed/doctor.json), [submission](smoke-reviewed/submit.json) |
| Completed task and succeeded run | PASS | [Public status](smoke-reviewed/status.json) |
| Exact artifact content, byte size, SHA-256 and owned path | PASS | [Artifact checks](smoke-reviewed/artifact.json), [retained file](smoke-reviewed/artifact/hello.md) |
| Daemon stopped, endpoint closed, scratch removed | PASS | [Cleanup](smoke-reviewed/cleanup.json), [independent check](logs/evidence-preservation.log) |
| Existing evidence directory refused without changes | PASS | [Preservation check](logs/evidence-preservation.log) |
| Interrupted run reports failure and still cleans up | PASS | [Interruption check](logs/interruption-final.log), [expected failure](interruption-final/result.json), [cleanup](interruption-final/cleanup.json) |
| Build in the PR checkout | PASS | [Build log](logs/build.log) |
| Documented manual launch, artifact check and cleanup | PASS | [Final log](logs/manual-trap-success.log), [cleanup](../manual-1788986197-89528/cleanup.json), [tested commands](examples/manual-session-tested.sh) |
| Manual command fails before submission | PASS (script exit 1 preserved) | [Failure log](logs/manual-trap-failure.log), [cleanup](../manual-1788986217-90871/cleanup.json), [injection](examples/manual-failure-injection.txt) |
| Startup fails before readiness and removes owned state | PASS (injected failure) | [Driver log](logs/startup-final.log), [process census and cleanup](startup-final/cleanup.json) |
| Late interruption after artifact verification | PASS (expected helper FAIL) | [Late interruption](logs/late-interruption.log), [cleanup](late-interruption/cleanup.json) |
| Missing threadId and incorrect launch effects | PASS (expected helper FAIL) | [Receipt regression check](logs/receipt-contract.log) |
| Baseline typecheck, lint and tests | PASS, 99 tests in 13 files | [Project checks](logs/project-checks.log) |

Screenshots and video are not applicable to this nonvisual CLI workflow. [The manifest](evidence.json) records commands, exit codes and artifact paths. The interrupted run's FAIL verdict is the expected outcome of the interruption test; it is separate from the passing smoke run.

The first manual attempt failed because a trailing slash in macOS `TMPDIR` broke a textual ownership check. The instructions now normalize that parent. [The failed log](logs/manual-reference.log) and [ownership-checked cleanup](../manual-1788984086-37042/cleanup.json) remain available; the rerun passed. The [earlier manual script](examples/manual-session-before-trap.txt) preserves the shell blocks tested via `/tmp/kat3315-manual-check.sh`. The executable manual example now includes the reviewed cleanup trap.

The earlier [final-smoke failure](final-smoke/failure.json) found a transient process-identity mismatch during teardown. Its [recovery receipt](final-smoke/recovery.json) confirms PID absence and owned-root removal. The helper now waits for launcher-owned teardown before checking ownership for fallback signals; the final normal, interruption and startup-failure runs all pass.

The reviewed manual recipe installs an EXIT/INT/TERM cleanup trap before launch. Its final success and injected command-failure runs both removed owned state and retained evidence. An intermediate launcher argv mismatch preserved state; its [recovery receipt](../manual-1788986029-75801/recovery.json) records the later process census and removal.

Independent spec and quality reviews pass with no remaining findings. [The review matrix](review.md) records all eight acceptance criteria.

## Run it yourself

From repository root, with the required Node and pnpm versions:

```sh
pnpm install --frozen-lockfile
pnpm build
EVIDENCE_DIR="docs/verification/verify-agentis/smoke-$(date +%s)-$$"
node .agents/skills/verify-agentis/helpers/smoke.mjs "$EVIDENCE_DIR"
cat "$EVIDENCE_DIR/result.json"
```

Expect exit code 0, a PASS verdict, and `artifact/hello.md` containing `# verification-smoke` followed by a newline. The evidence directory survives cleanup; the owned daemon and scratch directory do not.

Repeat interruption or injected startup failure with `python3 docs/verification/verify-agentis/acceptance/examples/interrupt-check.py FRESH_EVIDENCE_DIR` or `python3 docs/verification/verify-agentis/acceptance/examples/startup-check.py FRESH_EVIDENCE_DIR`. Each driver expects the helper to fail and then verifies cleanup and retained failure evidence. The startup hook replaces port allocation only in the public verification launcher; it does not change product files. Never delete earlier proof to rerun a check.

The receipt regression check runs with `python3 docs/verification/verify-agentis/acceptance/examples/receipt-check.py FRESH_EVIDENCE_PREFIX`. Add `artifact.json` as the interruption driver's second argument to interrupt after artifact verification. These injected cases validate the verification helper, not live-provider behavior.

Use `pstack:maintain-verification-skill` to update the skill and feature map as Agentis changes.
