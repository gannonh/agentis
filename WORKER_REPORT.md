# Worker Report — Issue #418 Command Center live metrics wire-up

## Summary

Command Center now loads fleet summary, agent roster metrics, and recent runs from live API endpoints backed by run cost attribution (#417). Fixture data is no longer used for summary cards, roster run/cost/last-active columns, or the recent runs panel. Score trends, needs-attention queue, pending count, and cost breakdown by model remain explicitly fixture-backed with an updated `DemoDataNotice`.

## Files changed

| File | Why |
| --- | --- |
| `packages/shared/src/cost-schemas.ts` | Added Zod schemas/types for roster metrics and recent runs API responses |
| `apps/api/src/repositories/run-repository.ts` | Added `getAgentRosterMetrics()` and `listRecentRuns()` aggregations |
| `apps/api/src/repositories/run-repository.test.ts` | Extended repository tests for roster/recent-run aggregation |
| `apps/api/src/routes/command-center.ts` | Added `GET /roster` and `GET /recent-runs` routes |
| `apps/api/src/routes/command-center.test.ts` | New route integration tests |
| `apps/web/src/lib/api/command-center-client.ts` | Web client for command center API endpoints |
| `apps/web/src/lib/api/command-center-client.test.ts` | Client unit tests |
| `apps/web/src/hooks/use-command-center.ts` | Hook to load summary + roster + recent runs in parallel |
| `apps/web/src/routes/command-center.tsx` | Wired live metrics; removed fixture fallback for operational data |
| `apps/web/src/routes/command-center.test.tsx` | Updated/expanded page tests for API-backed behavior |
| `apps/web/src/components/command-center/fleet-stats.tsx` | Decoupled from fixture schema; added `FleetMetrics` type |
| `apps/web/src/components/command-center/recent-runs-panel.tsx` | API run type, thread deep links, loading/empty states |

## Tests and commands

```bash
pnpm typecheck          # exit 0
pnpm build              # exit 0
pnpm lint               # exit 0 (1 pre-existing warning in thread-prompt-composer.tsx)

# Targeted tests
cd apps/api && pnpm exec vitest run src/routes/command-center.test.ts src/repositories/run-repository.test.ts
# Test Files  2 passed (2), Tests  4 passed (4)

cd apps/web && pnpm exec vitest run src/routes/command-center.test.tsx src/lib/api/command-center-client.test.ts src/routes/agent-create-to-test-path.test.tsx
# Test Files  3 passed (3), Tests  8 passed (8)
```

## Acceptance criteria status

- [x] Summary cards use API only for agents, active runs, total runs, and total cost; avg score is `—`
- [x] Agent roster rows show real run count, cost, last active from API (zeros/`—` when no runs)
- [x] Recent runs panel lists API runs with cost and `/threads/:threadId` deep links
- [x] Empty state when no runs; no silent fixture fallback for operational metrics
- [x] Misleading fixture fields removed from production metrics path; remaining fixture surfaces labeled in `DemoDataNotice`

## Residual risks / blockers

1. **Cost breakdown panel** still shows total only with “No cost data yet” — by-model breakdown is not in scope for #418 and remains a placeholder until a future slice.
2. **Pending / needs-attention** still use fixture workspace data (HA-GAP-07 out of scope).
3. **Quality score/trend columns** remain placeholders until rubrics ship (#422).
4. **Roster period** aggregates all-time completed runs, while agent usage API defaults to 14 days — intentional for Command Center fleet view, but may diverge from agent detail charts in #419.
5. **UAT not run** against a live dev server with real thread runs in this session; API and UI tests provide coverage with mock/test DB.

## Recommended next steps

1. Manual UAT: run three threads on one agent, open `/command-center`, confirm counts/costs/recent runs match API responses.
2. Open PR from `feat/wave1-command-center-418`; link #418 and note dependency on #417.
3. #419 can reuse `GET /api/agents/:id/usage` for agent detail observability charts.
4. Consider a follow-up to wire cost breakdown by model from aggregated usage data when product wants parity with HyperAgent sidebar.
