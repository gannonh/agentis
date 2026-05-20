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
STATUS_URL="$BASE_URL/support-agent/status"
BODY="$(mktemp)"
CODE="$(curl -sS --connect-timeout 5 --max-time 15 -o "$BODY" -w "%{http_code}" "$STATUS_URL")" || {
  rm -f "$BODY"
  echo "AI Search config check failed: could not reach $STATUS_URL" >&2
  exit 1
}

printf '%s HTTP %s\n' "$STATUS_URL" "$CODE"
cat "$BODY"
printf '\n'

STATE="$(node --input-type=module -e "
  const payload = JSON.parse(process.argv[1]);
  const aiSearch = payload.aiSearch;
  if (!aiSearch || typeof aiSearch.state !== 'string') {
    console.error('Missing aiSearch.state in /support-agent/status payload');
    process.exit(1);
  }
  console.log(aiSearch.state);
" "$(tr -d '\n' <"$BODY")")"

FORBIDDEN_PATTERN='(sk-[A-Za-z0-9_-]+|SUPPORT_AGENT_OPENAI_API_KEY|SUPPORT_AGENT_DEPLOYMENT_SECRET|env\.SUPPORT_AGENT)'
if grep -Eiq "$FORBIDDEN_PATTERN" "$BODY"; then
  echo "AI Search config check failed: browser-visible status contains forbidden credential or binding detail." >&2
  rm -f "$BODY"
  exit 1
fi

rm -f "$BODY"

case "$STATE" in
  missing|invalid|configured)
    echo "AI Search config state: $STATE"
  ;;
  *)
    echo "AI Search config check failed: unexpected state '$STATE'." >&2
    exit 1
  ;;
esac

if [[ "$STATE" == "missing" ]]; then
  echo "Expected locally until AI Search bindings are enabled in wrangler.toml."
fi

exit 0
