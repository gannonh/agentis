# Worker Report — Issue #420 Learning Dashboard API (Read Path)

## Summary

Implemented HA-GAP-04: API-backed Learning dashboard read models for skills, memories, rubrics, and pending suggestion counts. The `/learning` route now loads from `/api/learning/*` endpoints instead of fixture fallbacks. Fresh installs show intentional empty states for skills, rubrics, and pending suggestions; memories reflect existing migration-seeded saved memories (3 rows from `0014_orange_phalanx.sql`).

## Files Changed

| Area | Files | Why |
|------|-------|-----|
| Shared schemas | `packages/shared/src/learning-schemas.ts`, `learning-schemas.test.ts`, `index.ts` | Zod contracts for summary, paginated lists, and skill create |
| DB | `apps/api/src/db/schema.ts`, `drizzle/0030_learning_read_models.sql`, `drizzle/meta/_journal.json` | New `skills`, `rubrics`, `learning_suggestions` tables |
| API repos | `skill-repository.ts`, `rubric-repository.ts`, `learning-suggestion-repository.ts`, `saved-memory-repository.ts`, `index.ts`, `mappers.ts` | Read models + paginated memory listing |
| API routes | `routes/learning.ts`, `routes/learning.test.ts`, `app.ts` | `GET /api/learning/summary`, list endpoints, `POST /api/learning/skills` |
| Web client | `lib/api/learning-client.ts` | Typed fetch helpers for Learning API |
| Web UI | `routes/learning.tsx`, `skills-card.tsx`, `learning-secondary-panel.tsx`, `learning-banner.tsx`, `learning.test.tsx` | Replace fixture/demo fallback with API data and empty states |

## Commands Run

```bash
pnpm typecheck          # exit 0
pnpm lint               # exit 0 (pre-existing warning in thread-prompt-composer.tsx)
pnpm build              # exit 0
pnpm exec vitest run src/routes/learning.test.ts        # api: 4 passed
pnpm exec vitest run src/routes/learning.test.tsx       # web: 10 passed
```

## Validation Output

- **API summary (fresh DB):** `{ skillsCount: 0, memoriesCount: 3, rubricsCount: 0, pendingSuggestionsCount: 0 }`
- **Create skill:** `POST /api/learning/skills` → summary `skillsCount: 1`, list returns paginated skill
- **Learning UI:** No `DemoDataNotice`; shows "No skills stored yet", "No rubrics yet", "No conversations yet" when API returns empty collections
- **Populated UI test:** Mocks return 2 skills → card shows preview names and "View all 2 skills →"

## Residual Risks / Blockers

1. **Migration-seeded memories:** Fresh installs after migrations include 3 saved memories from `0014_orange_phalanx.sql`, so `memoriesCount` and the Memories pillar are not zero on a brand-new DB. This is pre-existing seed data, not fixture fallback.
2. **Pending suggestions:** `learning_suggestions` table exists for HA-GAP-05; count stays 0 until the post-run pipeline ships (#421).
3. **Rubrics CRUD / scoring:** Read-only list + empty state only; full rubric lifecycle is #422.
4. **Drizzle snapshot:** Migration SQL was authored manually (`0030_learning_read_models.sql`) because `drizzle-kit generate` requires an interactive TTY in this environment. Journal entry was updated; meta snapshot JSON was not regenerated.

## Recommended Next Steps

1. **#421 (HA-GAP-05):** Populate `learning_suggestions` post-run and wire accept/dismiss UI.
2. **#422 (HA-GAP-06):** Rubric CRUD + run evaluation scoring.
3. Consider whether migration-seeded demo memories should be excluded from Learning empty-state UX or moved to an explicit seed command (#426 HA-GAP-26).
4. Add `0030` snapshot to `drizzle/meta/` via interactive `pnpm db:generate` when a TTY is available.

## Acceptance Criteria Status

- [x] `GET /api/learning/summary` returns counts for skills, memories, rubrics, pending suggestions
- [x] List endpoints for skills, memories, rubrics with pagination
- [x] Learning UI uses API; fixture fallback removed
- [x] Fresh install shows intentional empty states (skills/rubrics/suggestions/conversations; memories reflect DB seeds)
- [x] Schema migration included (`0030_learning_read_models.sql`)
- [x] Tests cover API summary/list behavior and Learning UI empty/populated paths
