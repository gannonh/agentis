# Agentis PRD and MVP Roadmap

Agentis is an open-source, self-hosted agent workspace for teams that want long-running autonomous work, reusable agents, connected tools, and visible quality controls.

The MVP should let a user start work in a thread, connect tools through Composio, produce durable artifacts, promote repeatable work into an agent, invoke that agent again, and inspect run quality from a command center.

- Product overview: `docs/overview.md`
- Reference comps: `docs/comps`; app shell, thread composer, command center, agent detail, learning, integrations, and project creation screenshots.

## Current repo snapshot

- Frontend base: Vite, TypeScript, React 19.
- UI system: shadcn/ui monorepo, Tailwind 4, Hugeicons.
- Existing app state: starter screen with one shared button component.

## Product goals

- Provide a self-hosted path for teams to run capable AI agents against their own tools and data.
- Make the first-run experience understandable through a polished app shell, clear navigation, and demo-ready sample states.
- Use Composio as the primary integration layer for third-party tools and OAuth flows.
- Treat threads, agents, learnings, artifacts, and evaluations as first-class product surfaces.
- Build in vertical slices so every milestone can be demoed from the UI.

## MVP users

- Technical operators who want to automate recurring cross-tool workflows.
- Founders and small teams who want a self-hosted agent workspace with bring-your-own model keys.
- Developers who want to inspect, extend, and deploy agents from an open-source codebase.

## MVP product surfaces

- App shell and navigation: sidebar, workspace state, dark theme, empty states, responsive layout.
- Threads: prompt composer, transcript, run timeline, tool calls, abort, follow-ups, artifacts.
- Projects: shared context and goals available to threads.
- Integrations: Composio connection catalog, OAuth status, per-agent and per-thread tool access.
- Agents: create, configure, test, run, and reuse configured workers.
- Invocations: start with thread invocation, then add scheduled and Slack or webhook invocation.
- Learning: skills, memories, and rubrics as reviewable suggestions from prior runs.
- Command Center: roster, recent runs, quality, cost, active operations, and pending improvements.
- Library: durable artifact collection with search and download.

## MVP non-goals

- Full Hyperagent parity.
- Production-grade multi-tenant cloud hosting.
- Enterprise SSO, SCIM, audit exports, and complex RBAC.
- Native mobile apps.
- Advanced media generation pipelines.
- A full custom connector marketplace beyond Composio-backed integrations and a small local tool set.

## Core domain model

- Workspace: installation-level container for users, settings, providers, and connections.
- Project: scoped context, goals, memories, threads, and artifacts.
- Thread: conversational work session with messages, runs, tool calls, and artifacts.
- Run: one agent execution with status, steps, usage, costs, errors, and outputs.
- Integration connection: Composio-backed account connection with auth status and scopes.
- Tool access grant: explicit permission for a thread or agent to use a connected integration.
- Agent: reusable worker with identity, prompt, model, tools, skills, memory scope, rubrics, and invocation settings.
- Skill: reusable instruction or script package available to threads and agents.
- Memory: persisted fact or preference scoped globally, by project, or by agent.
- Rubric: evaluation criteria for scored runs.
- Evaluation: model-generated score and feedback tied to a run and rubric.
- Artifact: file, document, webpage, data table, image, or other run output.

## Roadmap

### M01: Foundation and Shell UI ✅

Goal: set up missing project tooling and build a polished, navigable shell for the key Agentis screens using mock data.

Deliverables:

- Repo hygiene for open-source development: README refresh, license confirmation, environment sample, contribution notes, and issue templates.
- Missing frontend tooling after audit: test runner, React testing utilities, route framework, API mock layer, typed fixtures, and CI checks.
- App shell with persistent sidebar, workspace/user footer, responsive content area, theme support, and route-level empty states.
- Mock screen shells for New Thread, Command Center, Agent Detail, Learning, Integrations, Project Create, and Library.
- Seeded demo data that matches the product concepts in the screenshots.
- Basic visual regression or screenshot coverage for the shell routes.

Acceptance:

- User can run the app locally and navigate every MVP route without backend services.
- Shell screens match the referenced product structure closely enough for stakeholder review.
- Mock data demonstrates agents, runs, integrations, learnings, and artifacts.
- Lint, typecheck, tests, and build run from documented commands.
- First contributor can clone, configure, and run the frontend using the README.

### M02: Threads and Run Lifecycle ✅

Goal: turn the new-thread shell into a functional session surface backed by a minimal local agent runtime.

Deliverables:

- Thread creation, thread list, thread detail, and persistent transcript storage.
- Composer with project selector, model selector, mode selector, attachment entry point, send, follow-up, and abort.
- Streaming run states: queued, running, tool-calling, completed, failed, aborted.
- Step timeline for reasoning summaries, tool calls, outputs, warnings, and errors.
- Runtime-disabled states for missing model keys or unavailable worker services.
- Minimal provider adapter with bring-your-own API key configuration.

Acceptance:

- User can create a thread, submit a prompt, watch a streaming response, and resume the thread later.
- User can abort a running response and see the transcript preserve the aborted state.
- User sees clear disabled reasons when model credentials or runtime services are missing.
- Recent threads in the sidebar and home screen update after successful runs.
- A demo run works against at least one configured model provider.

### M03: Composio Integrations and Tool Access ✅

Goal: let users connect external tools through Composio and grant those tools to threads and agents.

Deliverables:

- Integrations catalog with featured apps, search, categories, connection status, and refresh.
- Composio OAuth or connection flow for the first supported apps, starting with Slack, Gmail, Google Drive, GitHub, and Airtable.
- Backend storage for connection metadata, auth status, and workspace-level availability.
- Per-thread tool picker and visible connected-tool chips in the composer.
- Tool execution bridge from the runtime to Composio with step logging and error surfaces.
- Permission checks that prevent ungranted tools from running.

Acceptance:

- User can connect at least one Composio integration from the Integrations screen.
- User can enable a connected integration for a thread and run a prompt that calls it.
- Tool calls appear in the run timeline with inputs, outputs, duration, and errors.
- Attempts to use disconnected or ungranted tools produce a visible remediation path.
- Connection state survives app restart.

### M04: Projects, Context, and Artifacts ✅

Goal: make work durable by grouping threads into projects, injecting project context, and collecting generated artifacts.

Deliverables:

- Project create/edit flow with name, description, and goals.
- Project selector in the composer and thread metadata.
- Context assembly that injects project goals and selected project memories into runs.
- Artifact model with upload, generated output registration, download, and basic preview metadata.
- Library screen with search, filters, artifact cards, and project/thread provenance.
- Basic file storage abstraction for local self-hosted deployments.

Acceptance:

- User can create a project and start a thread inside it.
- Project goals are included in the run context and visible from the thread.
- A run can create at least one durable artifact and link it to the thread, project, and library.
- User can browse, search, and download artifacts from the Library.
- Deleting or archiving a project preserves clear artifact ownership rules.

### M05: Agent Creation and Configuration

Goal: let users create reusable agents with identity, model, tools, skills, memory scope, and test threads.

Deliverables:

- Agent roster in the sidebar and Command Center.
- Agent detail page with Overview, Identity, Activity, Model, Invocations, Tools, Skills, Memory, and Library tabs.
- Create/edit agent flow with name, icon, description, system prompt, model, cost limits, and access scope.
- Tool grant management for Composio integrations per agent.
- Test thread flow launched from an agent detail page.
- Agent version metadata for prompt and configuration changes.

Acceptance:

- User can create an agent from scratch and see it in navigation.
- User can edit the agent identity, prompt, model, and tool grants.
- User can start a new thread using a selected agent.
- Agent runs retain the agent version used for the run.
- Agent detail shows recent threads, configured tools, and empty observability states.

### M06: Promote Thread to Agent

Goal: convert a successful thread into a reusable draft agent that the user can review and run again.

Deliverables:

- Promote action from completed threads.
- Workflow summarizer that extracts purpose, repeated steps, required tools, suggested prompt, and suggested rubric criteria.
- Draft agent review screen with editable fields before creation.
- Tool access review that maps thread-used integrations to agent tool grants.
- First-run validation checklist for missing credentials, missing tools, or unsupported steps.
- Linkage from promoted agent back to source thread.

Acceptance:

- User can promote a completed thread into a draft agent.
- Draft agent includes a useful name, description, prompt, model recommendation, tool list, and rubric suggestion.
- User can edit and create the agent from the draft.
- Created agent can run a follow-up task based on the source workflow.
- Missing integration access blocks creation with clear remediation.

### M07: Invocations and Deployment

Goal: allow configured agents to run outside the manual thread composer through a small set of invocation paths.

Deliverables:

- Invocation settings for Thread, Schedule, Slack, and Webhook, with unsupported channels shown as disabled where needed.
- Schedule creation with cadence, timezone, prompt template, and selected project context.
- Slack invocation path through Composio for a configured workspace or channel.
- Webhook endpoint with signing secret, sample payload, and run history.
- Invocation run records linked to agent, trigger, inputs, outputs, and artifacts.
- Safety controls for disabled agents, missing credentials, rate limits, and cost limits.

Acceptance:

- User can schedule an agent and see a run created at the expected time.
- User can trigger an agent from at least one external channel, Slack or webhook.
- Invocation runs appear in agent activity, recent runs, and Command Center.
- Disabled invocations explain what configuration is missing.
- Cost and rate limits stop runs before execution and log the reason.

### M08: Learning System

Goal: capture skills, memories, and rubrics from agent work and make them reviewable before reuse.

Deliverables:

- Learning dashboard with Skills, Memories, Rubrics, and conversation-derived suggestions.
- Skill records with title, description, instructions, source thread, scope, and agent/project assignment.
- Memory suggestions with importance, scope, source, accept, edit, dismiss, and delete actions.
- Rubric builder with weighted criteria and agent assignment.
- Post-run suggestion pipeline for memories, skills, prompt improvements, and rubric criteria.
- Runtime context assembly that applies accepted skills and memories to future runs.

Acceptance:

- User can review and accept a memory suggestion from a completed thread.
- User can create or accept a skill and attach it to an agent.
- User can create a rubric for an agent and see it listed in Learning and Agent Detail.
- Accepted memories and skills are included in subsequent run context.
- Dismissed suggestions stay dismissed and remain auditable.

### M09: Evaluations and Command Center

Goal: give users a management view for agent quality, usage, cost, active operations, and improvement opportunities.

Deliverables:

- Command Center summary metrics for agents, active runs, total runs, average score, cost, and pending improvements.
- Agent roster with run counts, quality score, trend, cost per run, total cost, and last active timestamp.
- Recent runs panel with filters and links to run details.
- Rubric-based evaluator that scores completed runs where rubrics exist.
- Needs Attention queue for failed runs, low scores, missing rubrics, and pending improvement suggestions.
- Active operations panel for currently running or queued work.

Acceptance:

- User can see live and recent agent activity from Command Center.
- Runs with rubrics receive scores and criterion-level feedback.
- Score and cost summaries update after new runs.
- User can open a Needs Attention item and resolve or dismiss it.
- Command Center handles no-data, low-data, and active-run states cleanly.

### M10: Self-Hosted MVP Hardening

Goal: package Agentis for reliable self-hosted use and prepare the open-source project for MVP release.

Deliverables:

- Docker Compose setup for app, API, worker, database, queue, and object storage.
- Environment validation and setup wizard for model provider keys, Composio credentials, storage, and base URLs.
- Local authentication for single-user and small-team installs.
- Backup and restore documentation for database and artifact storage.
- Security pass for secret handling, OAuth callback configuration, tool permission boundaries, and webhook signing.
- Seed demo workspace for reviewers and contributors.
- MVP documentation: architecture overview, deployment guide, user guide, contributor guide, and troubleshooting.

Acceptance:

- User can install Agentis locally from the README and complete setup without private project knowledge.
- A fresh self-hosted install can run the core demo: create project, connect tool, run thread, create artifact, promote agent, invoke agent, view Command Center.
- Secrets are never exposed in frontend bundles, logs, or exported artifacts.
- Worker restart does not lose completed run history or artifacts.
- MVP docs explain supported features, known limits, and extension points.

## MVP demo script

1. Start Agentis locally with Docker Compose.
2. Complete setup with a model key and Composio credentials.
3. Create a project with goals.
4. Connect GitHub or Slack from Integrations.
5. Start a thread in the project and grant the connected tool.
6. Run a task that calls the tool and produces an artifact.
7. Promote the successful thread into an agent.
8. Attach a rubric and run the agent again.
9. Trigger the agent through a schedule, Slack, or webhook.
10. Review the run, artifact, cost, score, and improvement item in Command Center.

## Open questions

- Backend stack: API framework, database, queue, object storage, and worker runtime.
- Model support: first provider, routing interface, usage accounting, and default local or cloud options.
- Self-host scope: Docker Compose only for MVP, with Kubernetes docs later.
- Auth scope: single-user install first or small-team workspace first.
- External invocation priority: Slack first, webhook first, or schedule first.
- Artifact types: documents and files first, with webpages/slides/images later.

## Suggested MVP cut line

MVP readiness requires M01 through M10. If scope needs compression, the smallest coherent private alpha is M01 through M05 plus a thin M10 install path. The smallest coherent public MVP includes Composio integrations, promotion, one external invocation path, evaluations, and self-host packaging.