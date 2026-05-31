# Agentis

Agentis is a product context for configuring and running agents with durable working state.

## Language

**Workspace-scoped run**:
An agent run that happens within exactly one workspace, giving the agent a durable working context for the run.
_Avoid_: Workspace-less run, global run

**Agent-scoped tool**:
A capability made available to an agent and used by that agent during workspace-scoped runs.
_Avoid_: Workspace-scoped tool, when describing tool ownership or availability

**Tool permission**:
A binary agent-level setting that determines whether an agent may use a tool.
_Avoid_: Provider selection, integration connection

**Tool provider**:
The platform-level service that fulfills a tool capability when an agent is permitted to use it.
_Avoid_: Agent tool setting, tool permission

**Tool**:
A native Agentis capability that extends what an agent can do during a workspace-scoped run.
_Avoid_: Integration, connected app

**Integration**:
A connection that lets an agent interact with external software or external data sources.
_Avoid_: Tool, when describing native agent capabilities

**Native tool**:
An Agentis-owned tool that runs inside Agentis rather than through an external integration provider.
_Avoid_: Built-in integration, Composio tool

**Workspace file tool**:
A native tool that inspects, creates, edits, or executes against files in the run's workspace.
_Avoid_: Native tool, when the narrower file/workspace meaning is intended
