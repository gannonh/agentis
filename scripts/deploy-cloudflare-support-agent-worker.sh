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
WORKER_URL="https://${AGENTIS_SUPPORT_WORKER_NAME}.${AGENTIS_WORKERS_DEV_SUBDOMAIN}.workers.dev"

CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
pnpm dlx wrangler deploy apps/web/src/worker/support-agent-worker.ts \
  --name "$AGENTIS_SUPPORT_WORKER_NAME" \
  --compatibility-date 2026-05-16

printf '\nHealth check:\n'
curl -sS "$WORKER_URL/health"
printf '\n'
