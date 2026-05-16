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
WORKER_FILE="${TMPDIR:-/tmp}/agentis-support-agent-preview-worker.mjs"

cat > "$WORKER_FILE" <<'WORKER'
export default {
  async fetch() {
    return Response.json({
      ok: true,
      service: "agentis-support-agent-preview",
      kind: "cloudflare-smoke-test"
    })
  }
}
WORKER

CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
pnpm dlx wrangler deploy "$WORKER_FILE" \
  --name "$AGENTIS_SUPPORT_WORKER_NAME" \
  --compatibility-date 2026-05-16
