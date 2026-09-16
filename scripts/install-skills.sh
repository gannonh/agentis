#!/usr/bin/env bash
# Stay in the caller's cwd. `npx skills add` writes into the current project.
set -euo pipefail

# Copy a skill onto disk. Best-effort: a registry or network hiccup for a single
# skill must not abort dependency setup (this script runs from worktree:setup and
# from the Cloud Agent environment install).
add_skill() {
  if ! npx --yes skills add "$@" -y --copy --agent claude-code codex; then
    echo "install-skills: skipped 'skills add $*' (command failed)" >&2
  fi
}

# gannonh/skills
add_skill gannonh/skills --skill thermo-run
add_skill gannonh/skills --skill readme

# gannonh/plan-build-verify
# add_skill gannonh/plan-build-verify --skill plan
# add_skill gannonh/plan-build-verify --skill build
# add_skill gannonh/plan-build-verify --skill verify
# add_skill gannonh/plan-build-verify --skill verify
# add_skill gannonh/plan-build-verify --skill triage

# cursor plugin skills (for non-cursor agents)
add_skill cursor/plugins --skill thermos
add_skill cursor/plugins --skill thermo-nuclear-code-quality-review
add_skill cursor/plugins --skill thermo-nuclear-review
add_skill cursor/plugins --skill unslop

# misc third-party skills
add_skill anthropics/claude-plugins-community --skill eli5
add_skill humanlayer/skills --skill show-me
add_skill pbakaus/agent-reviews@resolve-reviews
