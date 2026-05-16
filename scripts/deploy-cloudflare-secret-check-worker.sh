#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN must be set in the environment or .env}"

AGENTIS_SUPPORT_WORKER_NAME="${AGENTIS_SUPPORT_WORKER_NAME:-agentis-support-agent-preview}"
AGENTIS_WORKERS_DEV_SUBDOMAIN="${AGENTIS_WORKERS_DEV_SUBDOMAIN:-gannonh-agentis}"
WORKER_FILE="${TMPDIR:-/tmp}/agentis-support-agent-secret-check-worker.mjs"
WORKER_URL="https://${AGENTIS_SUPPORT_WORKER_NAME}.${AGENTIS_WORKERS_DEV_SUBDOMAIN}.workers.dev"

cat > "$WORKER_FILE" <<'WORKER'
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "agentis-support-agent-preview"
      })
    }

    if (url.pathname === "/secret-check") {
      return Response.json({
        ok: true,
        hasProviderKey: Boolean(env.SUPPORT_AGENT_OPENAI_API_KEY),
        hasDeploymentSecret: Boolean(env.SUPPORT_AGENT_DEPLOYMENT_SECRET)
      })
    }

    return Response.json({ ok: false, error: "Not found" }, { status: 404 })
  }
}
WORKER

CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
pnpm dlx wrangler deploy "$WORKER_FILE" \
  --name "$AGENTIS_SUPPORT_WORKER_NAME" \
  --compatibility-date 2026-05-16

printf '\nHealth check:\n'
curl -sS "$WORKER_URL/health"
printf '\n\nSecret check:\n'
curl -sS "$WORKER_URL/secret-check"
printf '\n'
