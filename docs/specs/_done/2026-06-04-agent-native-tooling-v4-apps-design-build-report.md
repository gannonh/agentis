# Build completion report: App artifact runtime

## Spec

`docs/specs/_done/2026-06-04-agent-native-tooling-v4-apps-design.md`

## SHAs

- Base: `0758db60a8de980b0a3666a50065ecce2ef5f698`
- Head: `ae759bab` (merged in #411)

## Tasks completed

1. Renamed Artifact type enum value from `hyperapp` to `app` in shared schemas, tests, Library UI, and API mappers (legacy `hyperapp` rows still map to `app`).
2. Added shared App schemas, error codes, and the `apps` native permission id (`defaultSelected: false`).
3. Added `app_state` persistence (migration `0028_app_state`, Drizzle schema, `AppStateRepository`).
4. Implemented `AppService`, bundle validation/storage, and versioned Artifact persistence for `type = "app"`.
5. Added runtime tools `createApp`, `editApp`, and `findApps` with capability catalog integration and permission-denied failure path.
6. Added bounded native timeline payloads and App cards in the thread timeline.
7. Extended Artifact workspace with sandboxed App runtime, parent-proxied bridge, and App state API routes.
8. Added automated tests and ran required quality commands.

## Key files

- Shared: `packages/shared/src/app-schemas.ts`, `packages/shared/src/native-tools.ts`, `packages/shared/src/artifact-schemas.ts`
- API: `apps/api/src/artifact-apps/*`, `apps/api/drizzle/0028_app_state.sql`, `apps/api/src/routes/artifacts.ts`, `apps/api/src/runtime/run-executor.ts`, `apps/api/src/native-tools/native-tool-capability-catalog.ts`, `apps/api/src/native-tools/native-tool-payload.ts`
- Web: `apps/web/src/components/artifact-apps/*`, `apps/web/src/routes/artifact-workspace.tsx`, `apps/web/src/components/thread/run-timeline.tsx`

## Verification

```bash
pnpm typecheck   # pass
pnpm build       # pass
pnpm lint        # pass
```

Targeted tests:

```bash
cd apps/api && pnpm test -- artifact-apps artifacts.test native-tool-capability-catalog native-tool-payload  # 41 passed
cd apps/web && pnpm test -- artifact-apps app-srcdoc run-timeline  # 16 passed
pnpm --filter @workspace/shared test -- app-schemas  # 7 passed
```

## Review gates

- TDD used for schema, validator, service, capability catalog, route, and web srcdoc tests.
- Spec compliance: implemented against approved acceptance criteria; deferred capabilities not added.
- Code quality: passed typecheck/build/lint; no independent subagent review (single-agent path).

## Approved deviations

- None.

## Known follow-up

- Manual UAT with mock runtime still recommended per spec test plan (steps 1–10).
- Playwright E2E for App workspace not added in this build slice.

## Transition

Ready for Verify phase against acceptance criteria 1–11.
