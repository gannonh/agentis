# UAT Evidence: M02 threads and run lifecycle (feat/M02-threads-and-run-lifecycle @ 957bd96f)

UAT Scope: M02 threads and run lifecycle (feat/M02-threads-and-run-lifecycle @ 957bd96f)
Target: web
Timestamp: 2026-05-21T20:22:45.000Z
Git commit: 957bd96f

## Slice-by-slice result
- Pass: Runtime health and composer enabled
- Pass: Create thread via API
- Pass: Stream run and persist messages (real OpenAI)
- Pass: Abort with partial transcript (mock runtime)
- Pass: Sidebar and recent threads from API
- Fail: Create thread from new-thread UI (agent-browser)

## Evidence
- `recordings/m02-ui-walkthrough.webm` - Browser walkthrough: new-thread shell, thread detail stream, reload
- `screenshots/01-new-thread.png` - New thread home with runtime available and API-backed sidebar threads
- `screenshots/05-thread-detail-response.png` - Thread detail after real OpenAI run completed
- `screenshots/06-thread-reload.png` - Thread detail after reload shows persisted assistant message
- `responses/runtime-health.json` - API runtime health: available true, gpt-4o-mini
- `responses/create-thread.json` - POST /api/threads returns 201 with thread, message, run
- `responses/list-threads.json` - GET /api/threads lists persisted threads for sidebar
- `logs/playwright-ci-mock.log` - Playwright e2e: create+stream+persist and abort slices (mock runtime)
- `logs/06-reload-body.txt` - Page body includes assistant text after reload

## Commands
- Exit 0: `pnpm --filter api test` -> `logs/api-unit-tests.log`
- Exit 0: `pnpm --filter web test` -> `logs/web-unit-tests.log`
- Exit 0: `CI=1 pnpm exec playwright test apps/web/e2e/thread-lifecycle.spec.ts` -> `logs/playwright-ci-mock.log`

## Notes
- uat-evidence/ is not gitignored; do not commit unless requested.
- Dev servers were started for UAT; stop with port kill or Ctrl+C when finished reviewing.

## Manual Run Instructions
1. Run the product using the documented local command for this target.
   Expected: the feature path is reachable without setup or launch errors.
2. Follow the same user path described in the acceptance slices above.
   Expected: each passing slice reaches the visible or inspectable outcome shown in the evidence.

Recommendation: Pending user sign-off
Please reply: accept / reject
