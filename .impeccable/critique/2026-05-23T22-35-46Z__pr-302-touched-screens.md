---
target: "PR #302 touched screens"
total_score: 22
p0_count: 0
p1_count: 2
timestamp: 2026-05-23T22-35-46Z
slug: pr-302-touched-screens
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Command Center reports active agents, runs, costs, pending items, and trends with limited proof of where values come from. |
| 2 | Match System / Real World | 2 | “Command Center” and “full knowledge access” imply operational control and permission scope that the UI does not yet explain. |
| 3 | User Control and Freedom | 2 | Agent detail exposes disabled tabs and actions; users can see future capabilities without a clear path or rationale. |
| 4 | Consistency and Standards | 3 | The visual system is cohesive, but tool grant selection uses “Granted” before save and green success for a pending selection. |
| 5 | Error Prevention | 2 | Required fields prevent empty submission, but prompt, model, and grant choices lack scaffolding that would prevent weak or risky agents. |
| 6 | Recognition Rather Than Recall | 2 | Main actions are visible, but agent creation from the picker and permission boundaries require inference. |
| 7 | Flexibility and Efficiency | 2 | Search, roster actions, detail actions, and agent-start flows are limited or disabled, which weakens expert flow. |
| 8 | Aesthetic and Minimalist Design | 3 | Calm workbench restraint is working; inert dashboard density and repeated side data add mild noise. |
| 9 | Error Recovery | 3 | Not Found and roster retry paths are clear; recovery is solid for the current slice. |
| 10 | Help and Documentation | 1 | The touched screens have little contextual help for prompts, models, permissions, grants, or quality metrics. |
| **Total** | | **22/40** | **Acceptable, significant improvements needed before users feel confident.** |

#### Anti-Patterns Verdict

**Does this look AI-generated?** Not immediately. The interface avoids the obvious AI SaaS tropes: purple gradients, vague magic visuals, floating orbs, mascot energy, and decorative spectacle. The product slop shows up in meaning, not styling: synthetic-looking zeros, disabled future controls, vague permission language, and blank prompt creation.

**LLM assessment**: The product has a credible restrained workbench baseline. `/agents/new` is the strongest touched surface after the recent polish. The weaker screens feel like operational placeholders: Command Center looks like a dashboard before the underlying telemetry earns it, and Agent detail shows many capability panels that users cannot act on yet.

**Deterministic scan**: The detector command was attempted against the touched source files, but `detect.mjs` exited with `Error: bundled detector not found.` No deterministic rule counts, rule names, or file findings were available.

**Visual overlays**: Browser QA succeeded for representative pages and screenshots were captured. The live detector overlay could not run because the detector bundle was unavailable. No reliable user-visible overlay is available for this critique.

#### Overall Impression

The baseline is visually calm and more coherent than the first slice usually is, but trust is not yet high enough. The biggest opportunity is to make every operational claim explicit: what an agent can access, what metrics are real, what controls are available now, and what the next useful action is.

#### What’s Working

1. **The workbench restraint fits Agentis.** IBM Plex Sans, dark neutral surfaces, compact controls, and subtle borders support the “capable, calm, exact” direction.
2. **`/agents/new` now has a credible creation surface.** The form hierarchy is clear, tool grants feel connected to integrations, and footer spacing no longer feels accidental.
3. **The app shell provides useful continuity.** Sidebar access to threads, agents, projects, library, integrations, and Command Center makes the product feel like one workspace.

#### Priority Issues

**[P1] Command Center looks precise before it is truthful**

**Why it matters**: Technical operators will distrust a monitoring surface if it shows exact-looking zeros, costs, pending counts, and trends without making data availability clear. A command center needs provenance, scope, and actionable state.

**Fix**: Convert unavailable telemetry into explicit setup/empty states. Show which metrics are live, which are pending instrumentation, and what action unlocks each panel. If values are placeholders, do not render them as operational facts.

**Suggested command**: `harden`

**[P1] Permission and access language is too vague**

**Why it matters**: “Full knowledge access” and broad tool grants create risk in an agent product. Users need exact boundaries before delegating work across tools, memory, projects, and library artifacts.

**Fix**: Replace generic access claims with scoped language: project memories, library files, connected integrations, tool actions, account count, and write permissions. Use “Selected” before save and “Granted” only after persistence.

**Suggested command**: `clarify`

**[P2] Agent detail exposes too many locked controls**

**Why it matters**: Disabled tabs, disabled configure buttons, and inactive thread actions make the page feel like a preview shell. Users see capability but cannot tell what is available in this slice.

**Fix**: Hide unavailable future tabs or present them as roadmap rows with short rationale. Keep visible only what the user can understand or act on. Add precise empty states for Invocations, Integrations, Tools, Skills, Memory, and Library.

**Suggested command**: `distill`

**[P2] Agent creation needs operational scaffolding**

**Why it matters**: A blank system prompt asks users to know how to design a reusable agent before the product teaches them. Weak prompts will create weak agents, which reflects poorly on the platform.

**Fix**: Add a lightweight prompt contract scaffold: role, operating rules, tool-use boundaries, output expectations. Add short model guidance and grant implications. Keep the form single-screen, but teach through placeholders and inline helper text.

**Suggested command**: `clarify`

**[P2] Navigation density competes with primary work**

**Why it matters**: The sidebar shows global nav, agent list, project list, thread badges, utility links, and account info at once. On active work screens, this creates background noise and compresses the main content.

**Fix**: Keep current location strong, reduce inactive list weight, and consider collapsing secondary groups when the active screen has a demanding workflow. In the agent picker, keep “Create from scratch” discoverable before long lists become common.

**Suggested command**: `polish`

#### Persona Red Flags

**Alex, power user**: Alex expects the Command Center to triage and accelerate work. Disabled search/action affordances and all-zero rows make it feel non-operational. They will question whether this screen is worth visiting.

**Jordan, first-timer**: Jordan can create an agent, but the blank system prompt and vague “tool grants” language force them to invent product concepts. On Agent detail, “full knowledge access” sounds important but does not explain what is actually accessible.

**Sam, accessibility-dependent user**: The flow appears keyboard-reachable at a high level, but disabled controls and non-actionable tabs create screen-reader noise. Sam needs explicit state text for unavailable capabilities, selected grants, and empty metric panels.

**Casey, distracted mobile user**: `/agents/new` is workable on mobile, but Command Center’s table and dense sidebar mental model are not. Casey needs clearer single-column summaries and fewer competing background items.

#### Minor Observations

- “Granted” should become “Selected” until the agent is saved.
- Command Center’s “Needs attention” and “Pending 1” need visible causality.
- Agent detail repeats empty description state in multiple regions.
- Agent-blue could do more work for current selection and focus, but stay restrained.
- `/threads/new` looks calmer than Command Center because it has one dominant task.

#### Questions to Consider

- What must Command Center prove before it deserves the name?
- What exact resources can an agent read and write in this milestone?
- Should agent creation start from a blank prompt, or from an editable operating contract?
- Which future capabilities should be visible now, and which should wait until they work?
