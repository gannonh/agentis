---
type: Research Note
title: "Ideation: Agentis (surprise-me)"
description: Decomposition skipped — surprise-me mode
tags: []
timestamp: "2026-06-14T00:00:00Z"
date: 2026-06-08
focus: surprise-me
mode: repo-grounded
topic: open-ideation
---
# Ideation: Agentis (surprise-me)

## Grounding Context

**Codebase:** Vite/React web app, Hono/SQLite API, workspace-scoped runs, native tooling V1–V3, V4 artifact types (document, webpage, slides, app). Fixture-backed: Command Center, Agents, Integrations, Learning. API-backed: threads, projects, Library, workspace execution.

**Strategy:** Open self-hostable platform with model optionality for knowledge workers. Tracks: native tooling, integrations, UX fidelity, agent evaluations. ROI/cost crux for small businesses.

**Active work:** V4 App artifact runtime, static artifacts, Library refactor to artifact primitive.

**External:** HyperAgent (Airtable standalone agents); LensAI/AgentROI cost attribution; OrchVis/StarCraft command-center patterns; TeamBench multi-dimensional eval gates; self-hosted alternatives (Cabinet, Magec).

## Topic Axes

Decomposition skipped — surprise-me mode

## Ranked Ideas

### 1. Run Lineage Layer

**Description:** Persist a single lineage graph linking runs → tool calls → `workspace_executions` → artifact versions → memory writes → promotion drafts. Command Center, Learning, promotion intelligence, and ROI metrics query this layer instead of building separate pipelines.

**Basis:** direct: V3 stores execution provenance in `workspace_executions`; artifacts have version history and provenance; promotion drafts snapshot source workflows (`agent-promotion-service.ts`).

**Rationale:** One indexing investment unlocks the evals track, fleet visibility, learning extraction, and promotion suggestions — compounding value across strategy tracks.

**Downsides:** Foundational schema/API work before visible UI wins; requires careful privacy and retention policy.

**Confidence:** 82%

**Complexity:** High

**Status:** Explored

### 2. Wire Command Center to Live Metrics (Fixture Retirement)

**Description:** Replace fixture-derived quality, cost, and roster signals with API aggregates from real runs while keeping the existing Command Center component schema. Retire `demo-workspace` data for operational panels as part of the same push.

**Basis:** direct: `command-center.tsx` merges API agents with `getWorkspace().commandCenter` fixtures; STRATEGY.md drafts run quality pass rate and headcount leverage; recent runs/needs-attention panels are fixture-only.

**Rationale:** Hardest Command Center UX is already built; wiring real data is the fastest path to honest fleet oversight and ROI storytelling.

**Downsides:** Exposes gaps in backend aggregation; may surface embarrassing empty states until data exists.

**Confidence:** 88%

**Complexity:** Medium

**Status:** Unexplored

### 3. Agent OEE Scorecard

**Description:** Augment Command Center with an Overall Equipment Effectiveness-style composite: rubric-passing runs × artifact yield × human-intervention minutes avoided, normalized by fleet cost — one index that punishes expensive low-quality runs.

**Basis:** external: manufacturing OEE; LensAI unit economics. direct: STRATEGY.md ROI crux; fixture separates `avgScore` from `totalCost` with no composite.

**Rationale:** SMB buyers need one answer to "are we getting cheaper or better?" — aligns product metrics with the strategy problem statement.

**Downsides:** Requires operationalized rubrics and cost attribution first; composite metrics can be gamed or misunderstood.

**Confidence:** 75%

**Complexity:** Medium

**Status:** Unexplored

### 4. Bounded Deliverables, Not Cloud Compute Parity

**Description:** Explicitly deprioritize HyperAgent-style cloud VM/browser parity. Double down on the shipped vertical slice: workspace files, sandboxed commands, artifact types, and Composio — package deliverables instead of provisioning full compute environments.

**Basis:** direct: PRD non-goal "Full Hyperagent parity"; V3 default `local-process` sandbox; STRATEGY approach emphasizes self-hosted ROI.

**Rationale:** Cloud compute chase is expensive and misaligned with SMB cost sensitivity; artifacts + sandbox + integrations are demoable differentiation today.

**Downsides:** May lose users expecting full browser automation; requires crisp positioning against HyperAgent.

**Confidence:** 80%

**Complexity:** Low (primarily product/strategy alignment + scope discipline)

**Status:** Unexplored

### 5. Learning Loop Closure

**Description:** Auto-extract learning candidates (skills, memories, rubric hints) from completed runs; on accept, route into project/agent memory scopes that already inject into run context. Replace fixture-only Learning suggestions with a real review queue.

**Basis:** direct: `learning.tsx` falls back to fixture candidates; API path only reconstructs accepted thread-derived memories; project context injection is live in `run-context.ts`.

**Rationale:** Closes the gap between "agents that run" and "agents that get smarter" — core to delegation and reuse without re-explaining context every run.

**Downsides:** Extraction quality risk; noisy suggestions could erode trust; needs human review UX.

**Confidence:** 78%

**Complexity:** Medium–High

**Status:** Unexplored

### 6. Promotion Lanes with Dimension Gates

**Description:** Wire empty rubrics and promotion-draft `rubricCriteria` into staged promotion lanes (Shadow → Canary → Fleet). Each lane requires passing named eval dimensions before agent or rubric changes affect production runs.

**Basis:** external: TeamBench/CI dimension gates. direct: fixture `needsAttention` includes "New Rubric"; `rubrics: []` in Learning; promotion drafts already carry `rubricCriteria`.

**Rationale:** Makes evals track tangible — knowledge workers delegate more when agent changes are gated like safe software releases.

**Downsides:** Adds workflow friction; needs eval infrastructure before lanes mean anything.

**Confidence:** 72%

**Complexity:** High

**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | Phantom Fleet Dashboard | Merged into #2 (live metrics) |
| 2 | Kill the Fixture Layer (standalone) | Too broad alone; folded into #2 as operational prerequisite |
| 3 | Command Center as default home | Conflicts with artifact-first/inversion ideas; weaker than wiring existing CC |
| 4 | Folder Is the Agent | High architecture churn; revisit after lineage layer |
| 5 | Squad runs | Large runtime change; premature before single-agent evals work |
| 6 | Connect-in-Context integrations | Strong adjacent idea; cut for survivor cap — good refine candidate |
| 7 | Million-User SQLite | Constraint-flip probe, not actionable improvement |
| 8 | Managed Agentis Cloud | Distribution pivot, not product improvement within current strategy |
| 9 | HyperAgent Parity Sprint | Contradicts PRD non-goal without explicit strategy change |
| 10 | Separation Minimums Map | Premature before live fleet metrics exist |