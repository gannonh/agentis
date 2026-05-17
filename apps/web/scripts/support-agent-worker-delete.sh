#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ -z "${AGENTIS_SUPPORT_WORKER_NAME:-}" ]]; then
  echo "AGENTIS_SUPPORT_WORKER_NAME is required in .env" >&2
  exit 1
fi

cd "$APP_DIR"
exec wrangler delete "$AGENTIS_SUPPORT_WORKER_NAME" --env preview --config wrangler.toml "$@"
