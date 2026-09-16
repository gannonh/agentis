# UAT Evidence: KAT-3393 terminal run bookkeeping (completedAt + owning task updatedAt) on cancel through the public CLI and loopback daemon

UAT Scope: KAT-3393 terminal run bookkeeping (completedAt + owning task updatedAt) on cancel through the public CLI and loopback daemon
Target: cli
Evidence mode: user-facing
Timestamp: 2026-09-16T22:29:34.883Z
Git commit: cd18d4d

## Required Evidence Status
- E2E: Pass - `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/public-boundary-suite.log`
- Screenshots: Not applicable
- Video: Not applicable

## Slice-by-slice result
- Pass: Owner cancel stamps run completedAt and bumps the owning task updatedAt through the public CLI and /v1/status
- Pass: Stop-all stamps completedAt on every active run and bumps each owning task updatedAt
- Pass: Deadline failure and handoff rejection use the same terminal bookkeeping (checked-in automated tests)
- Pass: One exported active-run predicate serves every active-run query and the unwritten reconciling status is gone

## Evidence
- `docs/verification/verify-agentis/kat-3393-20260916-222934/responses/health.json` - Loopback daemon health for the host unverified-host-scratch fake run
- `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/serve.log` - Daemon readiness object: endpoint, pid, data root, boundary, provider fake
- `docs/verification/verify-agentis/kat-3393-20260916-222934/responses/status-before-cancel.json` - Public /v1/status before cancel: run waiting_input with completedAt null; task running
- `docs/verification/verify-agentis/kat-3393-20260916-222934/responses/status-after-cancel.json` - Public /v1/status after owner cancel: run canceled with numeric completedAt; owning task canceled with updatedAt == completedAt
- `docs/verification/verify-agentis/kat-3393-20260916-222934/responses/status-after-stop-all.json` - Public /v1/status after stop-all: every active run canceled with completedAt and each owning task updatedAt
- `docs/verification/verify-agentis/kat-3393-20260916-222934/responses/assertions.json` - Machine-checked comparison of before/after public snapshots for cancel and stop-all
- `docs/verification/verify-agentis/kat-3393-20260916-222934/responses/events-after-cancel.txt` - SSE transitions after cancel, including reason run_canceled

## Commands
- Exit 0: `"env" "TMPDIR=/home/gannonh/.katacode/tmp" "mise" "exec" "--" "pnpm" "--filter" "@agentis-labs/cli" "test"` -> `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/public-boundary-suite.log`
- Exit 0: `"mise" "exec" "--" "node" "packages/cli/dist/bin.js" "doctor" "--endpoint" "http://127.0.0.1:7717" "--data-root" "/home/gannonh/.katacode/tmp/kat3393-uat-data"` -> `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/doctor-before.log`
- Exit 0: `"mise" "exec" "--" "node" "packages/cli/dist/bin.js" "task" "submit" "--endpoint" "http://127.0.0.1:7717" "--data-root" "/home/gannonh/.katacode/tmp/kat3393-uat-data" "--brief" "KAT-3393 UAT cancel drive" "--fixture" "cancel"` -> `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/submit-cancel-fixture.log`
- Exit 0: `"mise" "exec" "--" "node" "packages/cli/dist/bin.js" "run" "cancel" "--endpoint" "http://127.0.0.1:7717" "--data-root" "/home/gannonh/.katacode/tmp/kat3393-uat-data" "--run" "6e8bb57a-7b9a-4924-ab58-5f1baad61335"` -> `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/cancel-run.log`
- Exit 0: `"sh" "-c" "mise exec -- node packages/cli/dist/bin.js task submit --endpoint 'http://127.0.0.1:7717' --data-root '/home/gannonh/.katacode/tmp/kat3393-uat-data' --brief 'KAT-3393 UAT stop-all drive' --fixture input && mise exec -- node packages/cli/dist/bin.js stop-all --endpoint 'http://127.0.0.1:7717' --data-root '/home/gannonh/.katacode/tmp/kat3393-uat-data'"` -> `docs/verification/verify-agentis/kat-3393-20260916-222934/logs/submit-second-then-stop-all.log`

## Notes
- Video: Skipped — CLI/API target with no visual surface; attempted: none (not applicable); suggested tooling: none required.
- Boundary: docker-fixture-container `verify launch` is unavailable in this environment (Docker socket permission denied). UAT ran the host `unverified-host-scratch` fake daemon over loopback HTTP. Live-provider, container isolation, and packaging remain UNVERIFIED here.
- Deadline path: RUN_DEADLINE_MS is 15 minutes, so the deadline branch was forced by the deterministic sweep test in store.test.ts rather than a live 15-minute wait.
- Intentional additive behavior beyond field unification: the deadline-exceeded and approval-denied paths now record a terminal failure message, and stop-all records one per-run run_canceled transition in addition to the aggregate stop_all event.
- Cleanup: the UAT daemon was stopped and loopback port 7717 verified released.

## Manual Run Instructions

Run from the repository root with Node 24.20.0 (`mise exec --` selects the pinned toolchain). Use a fresh data root and never copy `owner.token` into shared evidence.

1. `mise exec -- pnpm build`
   Expected: `packages/cli/dist/bin.js` is rebuilt without errors.
2. `mise exec -- node packages/cli/dist/bin.js serve --endpoint http://127.0.0.1:7717 --data-root /tmp/kat3393-manual --provider fake --execution-boundary unverified-host-scratch`
   Expected: readiness JSON with the endpoint, pid, and data root, and `GET /v1/health` returning `ok: true`. Leave this running.
3. `mise exec -- node packages/cli/dist/bin.js task submit --endpoint http://127.0.0.1:7717 --data-root /tmp/kat3393-manual --brief "manual cancel check" --fixture cancel`
   Expected: an accepted receipt with `taskId`, `runId`, and `effects: ["launch"]`. The fake engine drives this fixture to `waiting_input`.
4. `curl -s -H "authorization: Bearer $(node -e "process.stdout.write(JSON.parse(require('node:fs').readFileSync('/tmp/kat3393-manual/owner.token','utf8')).token)")" http://127.0.0.1:7717/v1/status`
   Expected: the run status is `waiting_input` with `completedAt: null`; the task status is `running`.
5. `mise exec -- node packages/cli/dist/bin.js run cancel --endpoint http://127.0.0.1:7717 --data-root /tmp/kat3393-manual --run <runId from step 3>`
   Expected: an accepted receipt with `effects: ["interrupt_provider"]`.
6. Repeat step 4.
   Expected: the run status is `canceled` with a numeric `completedAt`; the owning task is `canceled` with `updatedAt` equal to that `completedAt`; the thread contains a system message "The owner canceled this run."
7. `mise exec -- node packages/cli/dist/bin.js stop-all --endpoint http://127.0.0.1:7717 --data-root /tmp/kat3393-manual`
   Expected: accepted; repeat step 4 and every previously active run is `canceled` with a numeric `completedAt` and each owning task has a matching `updatedAt`.
8. Stop the `serve` process (Ctrl-C or kill its PID).
   Expected: loopback port 7717 is released and `/v1/health` stops answering.

Approval and merge permission follow Linear workflow states.
Follow the owning skill for the next workflow step.
