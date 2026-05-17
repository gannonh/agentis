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

BASE_URL="${1:-${SUPPORT_AGENT_WORKER_LOCAL_URL:-http://${WORKER_DEV_IP:-127.0.0.1}:${WORKER_DEV_PORT:-8787}}}"
BASE_URL="${BASE_URL%/}"
STATUS=0

check_path() {
  local path="$1"
  local body
  local code

  body="$(mktemp)"
  code="$(curl -sS --connect-timeout 5 --max-time 15 -o "$body" -w "%{http_code}" "$BASE_URL$path")" || STATUS=$?

  printf '%s %s HTTP %s\n' "$BASE_URL" "$path" "$code"
  cat "$body"
  printf '\n'
  rm -f "$body"

  if [[ ! "$code" =~ ^2[0-9][0-9]$ ]]; then
    STATUS=1
  fi
}

check_path "/health"
check_path "/support-agent/status"

exit "$STATUS"
