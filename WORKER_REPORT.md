# Worker Report — Issue #419 Agent Detail Observability Panel

## Summary

Implemented HA-GAP-03: the Agent Detail Overview tab now loads real 14-day usage and cost data from `GET /api/agents/:agentId/usage?periodDays=14` (#417), renders a daily cost chart and per-model breakdown, shows an honest evaluations empty state with a Learning CTA until rubrics ship (#422), and lists configuration versions from the existing agent detail API (or an explicit empty state).

Preset/fixture agents show a notice that usage observability is API-backed only; they do not call the usage endpoint.

## Files changed

| File | Why |
|------|-----|
| `apps/web/src/lib/api/agents-client.ts` | Added `getAgentUsage()` client using `agentUsageResponseSchema`. |
| `apps/web/src/hooks/use-agent-usage.ts` | Hook for loading/retrying agent usage with loading/error/ready states. |
| `apps/web/src/components/agent-detail/agent-overview-tab.tsx` | Replaced static usage fixture with API-driven chart, model breakdown, evaluations empty state, and version history panel. |
| `apps/web/src/routes/agent-detail.tsx` | Passes `agentId` and `configurationVersions` into the overview tab. |
| `apps/web/src/components/agent-detail/agent-overview-tab.test.tsx` | Component tests for usage loading, populated/empty/error states, fixture notice, evaluations CTA, and version history. |
| `apps/web/src/routes/agent-detail.test.tsx` | Integration test for API-backed usage wiring; adjusted assertions for duplicate model labels. |
| `apps/web/src/lib/api/agents-client.test.ts` | Client test for usage endpoint URL and response parsing. |

## Tests and commands

```bash
pnpm typecheck
# Tasks: 4 successful, 4 total

pnpm lint
# Tasks: 2 successful, 2 total (1 pre-existing warning in thread-prompt-composer.tsx)

cd apps/web && pnpm exec vitest run \
  src/components/agent-detail/agent-overview-tab.test.tsx \
  src/routes/agent-detail.test.tsx \
  src/lib/api/agents-client.test.ts
# Test Files  3 passed (3)
# Tests       40 passed (40)
```

## Validation output

- **Typecheck:** pass (all 4 packages)
- **Lint:** pass (no new errors)
- **Targeted tests:** 40/40 pass covering loading, populated usage, zero-run empty state, error/retry, fixture notice, evaluations CTA, version history list/empty, and page-level usage API wiring

## Residual risks / blockers

- **Chart date alignment:** Daily series is built client-side from UTC date keys returned by the API; local-timezone edge cases at day boundaries are possible but consistent with the API's UTC bucketing.
- **Fixture agents:** Preset agents (e.g. Senior Reviewer) intentionally do not fetch usage; observability shows a demo notice instead of misleading numbers.
- **Evaluations:** Still empty by design until #422 (HA-GAP-06); CTA links to `/learning` (fixture-backed today).
- **No live UAT:** Verification used unit tests with mocked API responses; no browser UAT against a running dev server with real completed runs.

## Recommended next steps

1. Manual UAT: create an API agent, run a few threads, confirm Overview shows non-zero 14-day cost and model lines.
2. #418 can reuse `getAgentUsage` patterns or shared cost formatting if Command Center wires fleet metrics.
3. When #422 lands, replace `EvaluationsEmptyState` with rubric scores from the evaluation API.

## Commit

```
feat(web): wire agent detail overview to usage API
```

Branch: `feat/wave1-agent-observability-419` (local commit only; not pushed per task instructions).
