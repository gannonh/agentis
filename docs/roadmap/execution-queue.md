# Foundational execution queue

**Purpose:** Short, ordered list of what we are building *now* — separate from long-horizon ideation (`docs/ideation/`) and direction (`STRATEGY.md`).

**How to pick up work:** Start here → open the linked GitHub issue → new worktree from `main` → branch → PR.

**List open queue:**

```bash
gh issue list --repo gannonh/agentis --label ready-for-agent --search "execution queue" --json number,title,state --jq '.[] | "#\(.number) \(.title)"'
```

Or read the table below.

---

## Queue

| # | Status | Slice | Issue |
|---|--------|-------|-------|
| 1 | **Shipped** | Gateway model catalog + composer picker | PR branch `cursor/2dddaf88` |
| 2 | **Shipped** | Research golden path (web search → Library brief) + live finalizer | PR branch `cursor/2dddaf88` |
| 3 | **Shipped** | Thread runtime UX — tool results & document creation in chat | [#412](https://github.com/gannonh/agentis/issues/412) (PR [#424](https://github.com/gannonh/agentis/pull/424)) |
| 4 | Open | One Composio integration golden path (generic thread) | [#413](https://github.com/gannonh/agentis/issues/413) |
| 5 | Open | Honest UI for fixture-backed surfaces | [#414](https://github.com/gannonh/agentis/issues/414) |
| 6 | Open | Self-host docs (Cloudflare + Tavily keyless) | [#415](https://github.com/gannonh/agentis/issues/415) |

**Next recommended:** [#413](https://github.com/gannonh/agentis/issues/413) (Composio integration golden path).

---

## Wave 1 — HyperAgent gap (honest operations)

Source: `docs/roadmap/hyperagent-gap-roadmap.md`. **Start after Wave 0 gate** (#412–#415 complete).

| # | Status | Slice | Issue | Depends on |
|---|--------|-------|-------|------------|
| 7 | Open | Run cost attribution API | [#417](https://github.com/gannonh/agentis/issues/417) | — |
| 8 | Open | Command Center live metrics wire-up | [#418](https://github.com/gannonh/agentis/issues/418) | #417 |
| 9 | Open | Agent detail observability panel | [#419](https://github.com/gannonh/agentis/issues/419) | #417 |
| 10 | Open | Learning dashboard API (read path) | [#420](https://github.com/gannonh/agentis/issues/420) | — |
| 11 | Open | Post-run learning suggestions + accept/dismiss | [#421](https://github.com/gannonh/agentis/issues/421) | #420 |
| 12 | Open | Rubrics and run evaluation scoring | [#422](https://github.com/gannonh/agentis/issues/422) | #420 |
| 13 | Open | Needs-attention queue (live) | [#423](https://github.com/gannonh/agentis/issues/423) | #421, #422 (partial OK) |

**Parallel after Wave 0:** #417 and #420 can run in parallel. #418 and #419 can follow #417 in parallel.

---

## Not this queue

`docs/ideation/2026-06-08-open-ideation.md` holds **future bets** (lineage layer, OEE scorecard, promotion lanes). Wave 1 supersedes the "Command Center live metrics" ideation item — see `docs/roadmap/hyperagent-gap-roadmap.md` for full gap map.

---

## Adding items in a fresh session (no chat context)

When planning happens in a new agent session and you need durable tracking:

### 1. Capture the decision in git

Ask the agent to **update this file** with a new row (or strike through completed rows), then commit. One paragraph of *why* in the issue body is enough — do not rely on chat history.

### 2. Create a GitHub issue per slice

From the repo root:

```bash
gh issue create --repo gannonh/agentis \
  --title "Short imperative title" \
  --label "enhancement,ready-for-agent" \
  --body "$(cat <<'EOF'
## Context
Link to this file: docs/roadmap/execution-queue.md

## Goal
One sentence.

## Acceptance criteria
- [ ] Observable outcome 1
- [ ] Tests / UAT note

## References
- Paths or ADRs
EOF
)"
```

Then add the issue URL to the table in this file.

### 3. Point agents at the issue

In a new Cursor session:

> Read `docs/roadmap/execution-queue.md` and implement GitHub issue #413.

Or use Kata / `gh issue view 412` if you use that workflow.

### 4. Optional Compound Engineering flow

| Step | Skill / action | Output |
|------|----------------|--------|
| Direction | `/ce-strategy` | `STRATEGY.md` (rare) |
| Ideas | `/ce-ideate` | `docs/ideation/*.md` (not the sprint board) |
| **Execution** | **This file + `gh issue create`** | **Issues #NNN** |
| Plan one slice | `/ce-plan` on the issue body | Plan in issue comment or spec |
| Build | Agent + worktree | PR |
| Learn | `/ce-compound` | `docs/solutions/` |

### 5. After merge

- Mark row **Shipped** in this file (PR link or issue close).
- `gh issue close NNN --comment "Shipped in PR #…"`.
- New worktree from `origin/main` for the next open issue.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-08 | Queue created; shipped items 1–2 from `cursor/2dddaf88`; opened #412–#415 |
| 2026-06-08 | Wave 1 HyperAgent gap slices opened #417–#423 from `hyperagent-gap-roadmap.md` |
| 2026-06-08 | Shipped #412 (thread tool-result cards, document links, durable-artifact refresh) in PR #424 |
