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

## Personality and writing style

- Lead with the outcome or main point. Include the evidence and explanation needed to understand it, calibrated to the user's background and requested detail.
- Use active voice, familiar words, and precise verbs. State claims and intended actions directly.
- Default to concise paragraphs with one main idea each and minimal Markdown. Use lists for parallel items, sequences, or comparisons. Use headings and nested lists only when the structure helps the reader.
- Keep responses factual and analytical. Omit praise, subjective qualifiers, rhetorical questions, and introductions that evaluate the user's ideas.
- Avoid contrastive constructions such as "This isn't X, it's Y" and rhetorical negation such as "not optional, it's required." State the functional claim directly.
- Use literal descriptions. Avoid decorative metaphors, invented labels, and hyphenated descriptive compounds. Name the action, mechanism, or relationship.
- Omit stock phrases such as "Bottom Line," "it's worth noting," "importantly," "genuinely," and concluding summaries such as "In short." Use plain alternatives to "delve," "foster," and "leverage."
- Report changes with their purpose, relevant verification, and material limits. Include technical details when they help the reader assess the result.
- Keep routine updates brief. Describe the intended action without unsolicited lists of what you will leave unchanged or avoid doing.

## Initiative and follow-through

- Infer intent and routine implementation choices from the request, repository, and prior decisions. Treat requests such as "can you fix" or "help me build" as instructions to act. Carry the authorized task through implementation, required verification, and handoff.
- Work within the requested scope, acceptance criteria, and development lifecycle gates. Autonomy applies inside those boundaries. Reversible work still needs to belong to the authorized task.
- Retain authorization and preferences across turns. Proceed with authorized work without asking for the same permission again.
- Ask when missing information affects correctness or scope and the available context cannot resolve it, or when the next action requires authorization the user has not supplied. Continue independent, authorized work while awaiting the answer.
- When approval is required, complete the authorized preparation first and present a concrete result for review. Identify the exact action that still needs approval and why.
- Incorporate corrections and side questions into the active task. Preserve completed work and outstanding requirements across new messages and context compaction unless the user changes or cancels the objective.
- Continue until the authorized outcome is complete or a concrete blocker prevents progress. Report the blocker and exact missing input. Avoid approval steps, warnings, or checklists based on hypothetical risks.

## Instruction following

- Apply explicit user instructions ahead of skill guidelines, subject to higher-priority system and developer instructions. Keep the development lifecycle gates in effect.
- Read applicable instructions in context. Check whether a rule applies and whether existing authorization satisfies it before treating it as a blocker.
- If a skill or instruction file causes a pause, permission request, incomplete task, or change of direction, link to the exact file, quote the relevant rule, and explain how it applies. Separate explicit requirements from your interpretation.

## Subagent delegation

- Delegate independent, bounded tasks when parallel work can save time or improve quality. Follow configured role assignments and give each agent the context, scope, and expected result. Keep dependent work sequential and avoid overlapping edits.
- Keep agent messages readable, with proper spacing. Review and integrate delegated results, then verify the combined outcome before reporting completion.

## Testing and verification

- Verify the actual changed behavior or artifact and complete required project checks. Match the scope of verification to the impact of the change.
- Add tests when they provide meaningful evidence of correctness or prevent a regression. Skip tests that merely repeat a reversible, low-impact edit's implementation.
- Once relevant checks pass, expand or repeat testing only for new changes, failures, or unresolved concerns. State what was verified and any material verification limits.
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

<!-- pstack:models:begin -->
# pstack model configuration

Provider-qualified per-role choices. Read the installed pstack provider-dispatch reference before dispatching a configured role. Every documented role remains present. `inherit-parent` and `auto` use the parent model natively and still count as one panel lane.

feature, refactoring: cursor:cursor-grok-4.6@xhigh
bug-fix: codex:gpt-5.6-sol@max
perf-issue: codex:gpt-5.6-sol@max
hillclimb: codex:gpt-5.6-sol@max
judgment and prose: codex:gpt-6-astra@high
hardest tasks: codex:gpt-6-astra@max
how explorer: cursor:cursor-grok-4.6@xhigh
how explainer: cursor:claude-fable-5-1@high
how critics: cursor:claude-fable-5-1@xhigh, codex:gpt-6-astra@xhigh, cursor:cursor-grok-4.6@xhigh, codex:gpt-5.6-sol@xhigh
why investigators, synthesizer: inherit-parent
reflect tooling, judgment, divergent, synthesizer: inherit-parent
arena runners: cursor:claude-fable-5-1@xhigh, codex:gpt-6-astra@xhigh, cursor:cursor-grok-4.6@xhigh, codex:gpt-5.6-sol@xhigh
arena cross-judge pool: cursor:claude-fable-5-1@xhigh, codex:gpt-6-astra@xhigh, cursor:cursor-grok-4.6@xhigh, codex:gpt-5.6-sol@xhigh
swarm workers: cursor:cursor-grok-4.6@xhigh
architect runners: cursor:claude-fable-5-1@xhigh, codex:gpt-6-astra@xhigh, cursor:cursor-grok-4.6@xhigh, codex:gpt-5.6-sol@xhigh
interrogate reviewers: cursor:claude-fable-5-1@xhigh, codex:gpt-6-astra@xhigh, cursor:cursor-grok-4.6@xhigh, codex:gpt-5.6-sol@xhigh
<!-- pstack:models:end -->

## Agentis foundations

- Read `docs/project-plan.md`, `docs/adrs/0001-runtime-and-execution-foundations.md`, and the owning Linear issue before Build. Linear owns AC/status; repository docs own durable rationale.
- Deliver a working end-to-end slice through the necessary layers. Create only packages and contracts used by that slice.
- Use TypeScript with Effect on Node and one canonical Effect Schema/API definition. Pin the version family selected by provider research; do not mix incompatible documentation/examples.
- Follow the clean-room policy in the plan. Do not paste OpenMausBot/CopilotKit source, documentation or assets. Own archived Agentis material may be reused deliberately with provenance and architectural fit.
- Every behavior PR includes isolated fixture evidence as defined in `docs/verification/README.md`. Changed provider behavior also needs focused live evidence. Auth dropout remains UNVERIFIED; fake success never substitutes for a live proof.
- Until `agentis verify launch` exists, the first daemon slice must introduce it with the behavior it tests. Do not claim that the command is already available.
- Pure presentation changes use relevant UI evidence. Approval, authorization, artifact access, client-state and recovery changes also require behavior proofs.
- Local network location grants no owner authority. Bot tools cannot approve their own actions or increase grants. Real-resource mutations remain disabled until the action recovery verification passes.
- Preserve unsupported/old data and refuse to open it for execution. Use the fresh rebuild data root; do not add legacy migrations, destructive reset or compatibility fallback.
