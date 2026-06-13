# Composio GitHub golden path — Manual UAT

**Issue:** [#413](https://github.com/gannonh/agentis/issues/413) — One Composio integration golden path on generic Agentis threads.

**Toolkit:** GitHub (`GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER`).

**PR:** [#425](https://github.com/gannonh/agentis/pull/425)

**Sign-off:** Automated + partial live verification on branch `feat/issue-413-one-composio-integration`. Complete OAuth once locally to finish the live tool-execution checkpoint.

---

## Prerequisites

1. Repo root `.env` with live services (no mocks):

   ```bash
   AGENTIS_MOCK_COMPOSIO=0
   AGENTIS_MOCK_RUNTIME=0
   COMPOSIO_API_KEY=<your key>
   COMPOSIO_REDIRECT_BASE_URL=http://127.0.0.1:3101
   AGENTIS_WEB_ORIGIN=http://127.0.0.1:5177
   # Plus AI Gateway credentials (AI_GATEWAY_PROVIDER + provider keys)
   ```

2. Start live dev:

   ```bash
   pnpm dev:live
   ```

3. Open **http://127.0.0.1:5177**.

CI and Playwright continue to use `AGENTIS_MOCK_COMPOSIO=1` per `AGENTS.md`.

---

## Canonical golden path

1. **Browse catalog (optional)** — `/integrations` lists Composio toolkits with search and category filters; connected/in-use toolkits appear in the top section. In mock mode (`AGENTIS_MOCK_COMPOSIO=1`) the catalog comes from `MOCK_COMPOSIO_TOOLKITS`.
2. **Connect GitHub** — `/integrations` → **Connect** on GitHub → complete Composio/GitHub OAuth → return to `/integrations?connected=github`.
3. **Start a generic thread** — `/threads/new` (default **Agentis** agent).
4. **Grant GitHub** — composer **Tools** → enable GitHub → confirm `GitHub enabled` chip.
5. **Run scripted prompt:**

   ```text
   List my GitHub repositories
   ```

6. **Pass** — run timeline shows a Composio tool step (`provider: composio`, `toolkitSlug: github`); assistant summarizes repository results.

---

## Failure-mode walkthrough

| Scenario | Action | Expected remediation |
|----------|--------|----------------------|
| Not connected | Prompt mentions GitHub without connecting | “GitHub is not connected. Connect it from Integrations, then grant it to this thread.” |
| Pending OAuth | Start Connect but do not finish OAuth | “GitHub connection is still pending. Finish OAuth on the Integrations page.” |
| Not granted | GitHub connected; skip Tools grant | “GitHub is connected but not granted to this thread. Enable it in the composer Tools menu.” |
| Composio off | Unset `COMPOSIO_API_KEY`; restart API | Integrations setup banner; Connect disabled |

Timeline preflight steps show the **human** remediation sentence (not machine codes like `toolkit_not_connected`).

Thread/agent grant failures from `POST /api/threads` (and agent grant routes) return a human-readable `error` with a separate machine `code` field — the web client surfaces `error` via `ApiError`.

Integration refresh (`POST /api/integrations/refresh`, optional `q`/`category` query params) syncs remote Composio accounts and returns the full integrations list response (`toolkits`, `categories`, config flags). It does **not** overwrite a granted `connectionId` with a different Composio account. When the bound account disappears remotely, the local row is marked `expired` and grants remain pointed at the original connection.

---

## Verification evidence (2026-06-08 / 2026-06-09)

### Live API / runtime

| Check | Result |
|-------|--------|
| `GET /api/runtime/health` → `composio.available: true` | Pass |
| `GET /api/integrations` → `composioMockEnabled: false`, `categories` present | Pass |
| `GET /api/integrations?q=github` filters catalog | Pass (`integrations.test.ts`) |
| `POST /api/integrations/github/connect` → `redirectUrl` host `connect.composio.dev` | Pass |
| OAuth redirect reaches GitHub sign-in | Pass (browser automation) |
| Preflight: GitHub not connected | Pass — `400` stream; error “GitHub is not connected…” |
| Preflight: GitHub pending | Pass — error “GitHub connection is still pending…” |

### Automated (mock Composio + mock runtime)

| Check | Result |
|-------|--------|
| Playwright: connect → grant → mock tool execute | Pass (`apps/web/e2e/composio-integrations.spec.ts`) |
| Playwright: Slack not connected remediation | Pass |
| API: GitHub connected + granted → Composio tool step | Pass (`run-executor.test.ts`) |
| API: GitHub connected, not granted → `toolkit_not_granted` | Pass |
| Unit: `checkPreflightRemediation()` matrix | Pass (`tool-execution-service.test.ts`) |
| Unit: repo heuristic excludes workspace/local/file/docker/npm/package/pypi prompts | Pass (`tool-execution-service.test.ts`) |
| API: refresh marks granted connection `expired` instead of retargeting account | Pass (`integrations.test.ts`) |
| API: grant failures return human `error` + machine `code` | Pass (`agents.test.ts`) |

### Manual checkpoint (requires human OAuth)

Complete **Connect GitHub** in a browser with your GitHub account, then run steps 4–6 above. Confirm:

- [ ] `/integrations` shows GitHub **connected**
- [ ] Thread run timeline includes a completed Composio GitHub tool step
- [ ] Assistant message summarizes repository data from live Composio

---

## Reset helpers

If Connect is stuck on **pending** or **error**:

1. `/integrations` → reset GitHub connection (or `DELETE /api/integrations/github/connection`).
2. Retry Connect.

---

## Related code

- Catalog assembly: [`apps/api/src/composio/integration-catalog.ts`](../../apps/api/src/composio/integration-catalog.ts)
- Curated tool: [`apps/api/src/composio/tool-catalog.ts`](../../apps/api/src/composio/tool-catalog.ts)
- Preflight: [`apps/api/src/composio/tool-execution-service.ts`](../../apps/api/src/composio/tool-execution-service.ts)
- Connection lifecycle: [`apps/api/src/composio/integration-service.ts`](../../apps/api/src/composio/integration-service.ts)
- Grant resolution: [`apps/api/src/agents/tool-grant-resolution.ts`](../../apps/api/src/agents/tool-grant-resolution.ts)
- E2E: [`apps/web/e2e/composio-integrations.spec.ts`](../../apps/web/e2e/composio-integrations.spec.ts)
