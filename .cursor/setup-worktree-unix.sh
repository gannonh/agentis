#!/usr/bin/env bash
set -euo pipefail

# Cursor worktree bootstrap. ROOT_WORKTREE_PATH is set by Cursor to the main checkout.
root="${ROOT_WORKTREE_PATH:-}"

echo "[agentis] worktree setup in $(pwd)"

pnpm install

copy_env() {
  local rel="$1"

  if [[ -n "$root" && -f "$root/$rel" ]]; then
    cp "$root/$rel" "$rel"
    echo "[agentis] copied $rel from main worktree"
  fi
}

copy_env ".env"
copy_env "apps/web/.env"

echo "[agentis] worktree setup complete"
