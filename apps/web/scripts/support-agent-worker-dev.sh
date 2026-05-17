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

cd "$APP_DIR"
exec wrangler dev \
  --env preview \
  --config wrangler.toml \
  --ip "${WORKER_DEV_IP:-127.0.0.1}" \
  --port "${WORKER_DEV_PORT:-8787}" \
  --env-file "$ENV_FILE" \
  --show-interactive-dev-session=false \
  "$@"
