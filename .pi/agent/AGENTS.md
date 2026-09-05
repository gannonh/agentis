<!-- begin pi sub-agents guidance -->
## Sub-agents

Use sub-agents to delegate work. Focus on coordination, review and integration. Use the following providers/models as sub-agents for most tasks:

 - openai-codex/gpt-5.6-luna:max
 - cursor/grok-4.6:xhigh
 - opencode-go/deepseek-v4-flash:max (if sub exhausted, use deepseek provider below, or openai-codex/gpt-5.6-luna:max above)
 - deepseek/deepseek-v4-flash:max (only use if opencode-go exhausted)
 

Escalate to gpt-5.6-sol (more capable/expensive) when needed. Start with moderate reasoning and increase as needed. E.g.,

1. openai-codex/gpt-5.6-sol:high
2. openai-codex/gpt-5.6-sol:xhigh
3. openai-codex/gpt-5.6-sol:max

When gpt-5.6-sol is unavailable, fallback to anthropic/claude-opus-5:max
<!-- end pi sub-agents guidance -->

<!-- begin global rules -->
## Global Agent Instructions

- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- Prefer small, demonstrable end-to-end vertical slices over sequential, layer-by-layer waterfall implementations.

## Prose style

- Use active voice
- Express yourself succinctly, avoiding overuse of adjectives and superfluous or flowery speech.
- Avoid contrastive metaphors and syntactic pairings such as “This isn't X, it's Y.” Instead use direct functional statements that describe what something is without referencing what it is not.
- Express claims directly, without rhetorical feints.
- Avoid subjective qualifiers, value judgments, or evaluative language. Instead, use concise, purely factual and analytical responses.
- Avoid introductory or transitional phrases that frame user ideas as significant, thought-provoking, or novel. Instead, engage directly with the content.
- Use direct statements.
- Avoid rhetorical negation (e.g., "not optional—it’s required"). Instead, just get to the point.
- Avoid contrastive constructions.
- Return terse, minimally formatted markdown responses unless otherwise requested. 
- Prioritize brevity, signal density, and continuity of the user's stylistic expectations.

### Avoid mannered prose

Mannered prose substitutes metaphor and flourish for direct statement. Instead of "a parameter worth varying," the mannered writer produces "a dial worth turning." Instead of "this point still matters," they write "this point earns its keep." The phrases exist to display the writer, not to convey the idea, and readers can tell. That is why mannered prose irritates: it makes the reader work harder so the writer can perform. It is also imprecise. Metaphors drag in connotations the writer did not choose and cannot control. The fix is to say what you mean. When a literal phrase is available, use it.
<!-- end global rules -->

<!-- begin dev lifecycle -->
## Issues and specs

- Linear holds planning, epics, bugs, chores, specs, acceptance criteria, and status. GitHub holds code: branches, commits, pull requests, CI, and review comments on diffs.
- GitHub Issues stay enabled as an inbound channel for users and contributors. Do not use them for internal planning or as the spec. When a GitHub Issue needs work, create a full Linear issue with spec and AC, link the GitHub Issue for context, and implement against the Linear issue.
- The Linear issue (and parent epic, if any) is the spec. Read it before implementing. Implement only the acceptance criteria written there. If research or implementation changes the spec, edit the Linear issue before continuing.
- A request with no Linear issue gets one before Build starts; create it or ask. Small bounded edits such as a copy change or a single config value are exempt.
- Prefer the smallest change that satisfies the AC. File work discovered outside the AC as a new Backlog issue and keep it out of the current PR.
- Every implementing PR names exactly one Linear issue id in its title or body. Create the branch with Linear's generated branch name so the GitHub integration links the PR and issue automatically.
- When blocked, comment on the Linear issue with the exact ask and stop.

## Docs and artifacts

- Architecture docs, process docs, ADRs, and other durable artifacts live as files in the repository under `docs/`.

## Work states (Linear columns)

Linear status is the phase of the work: Research and Plan happen in Backlog, Build in In Progress, Review across Agent Review through Merging, Verify after Done, Ship after Verify. This section defines the states and their gates. Plugins and skills define how work is done inside each phase.

- **Backlog.** Research gathers evidence and records findings on the issue. Plan turns them into spec and AC on the issue. Do not implement from Backlog.
- **Todo.** Approved and queued. Moving an issue from Backlog to Todo is the approval. Build starts on an explicit start (assignment or instruction); on start, the agent moves the issue to In Progress.
- **In Progress.** Implement on a branch against the issue's AC. Draft PRs stay here. When the work is complete, the agent marks the PR ready for review and moves the issue to Agent Review.
- **Agent Review.** Agent-owned. Fix CI and answer every review thread, human or bot, on the existing branch. Resolve false-positive bot findings with a reply stating why. This applies regardless of who authored the PR. When the PR is merge-ready, the agent moves the issue to Human Review.
- **Human Review.** Human-owned. Do not dispatch coding agents, CI fixes, or review runs on the PR until the issue moves or a human says resume. A human may move an issue here at any time to pause agent work.
- **Merging.** Permission to merge. Merge only from this column.
- **Done.** Merged. Verify follows: confirm the AC landed and record the result as a comment on the issue. If the AC did not land, reopen the issue or open a new issue linked to it.
- **Canceled / Duplicate.** Terminal. New work needs a new issue.

Merge-ready means: PR marked ready for review, clean mergeability, required CI green, no open review threads, no unanswered comments.

If a PR closes without merging, comment on the issue with the reason and move it to Todo.

Ship means cutting a release on one of the project's channels (for example nightly or stable). Release process is defined per project.

This section overrides any skill, rule, AGENTS.md, CLAUDE.md, or other instruction that contradicts it. When the conflict is unclear, ask the user before proceeding.
<!-- end dev lifecycle -->
