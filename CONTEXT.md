# Agentis

Agentis is a product context for configuring and running agents with durable working state.

## Language

**Workspace-scoped run**:
An agent run that happens within exactly one workspace, giving the agent a durable working context for the run.
_Avoid_: Workspace-less run, global run

**Agent-scoped tool**:
A capability made available to an agent and used by that agent during workspace-scoped runs.
_Avoid_: Workspace-scoped tool, when describing tool ownership or availability

**Agent configuration**:
A versioned set of run-affecting choices for an agent.
_Avoid_: Agent identity, agent profile

**Built-in Agentis agent**:
The platform-owned default agent that cannot be user-edited and has access to basic native tools.
_Avoid_: Custom agent, user-configured agent

**Basic tool**:
A native tool included in the built-in Agentis agent's default capability set.
_Avoid_: Integration, custom agent permission

**Tool permission**:
A binary agent-level setting in agent configuration that determines whether an agent may use a tool.
_Avoid_: Disabled tool, provider selection, integration connection

**Tool provider**:
The platform-level service that fulfills a tool capability when an agent is permitted to use it.
_Avoid_: Agent tool setting, tool permission

**Provider availability**:
The operational readiness of a tool provider needed to fulfill permitted tool use.
_Avoid_: Tool permission, enabled state

**Tool**:
A native Agentis capability that extends what an agent can do during a workspace-scoped run.
_Avoid_: Integration, connected app

**Native tool capability catalog**:
The Agentis-owned catalog that maps user-controlled tool permission ids to runtime tool exposure, prompt contribution, provider availability requirements, timeline evidence, default selection, and user-facing metadata. The first cataloged permission is web search. Workspace file tools remain basic native tools and stay outside the first catalog slice.
_Avoid_: Tool provider, integration catalog, when describing native Agentis capabilities

**Integration**:
A connection that lets an agent interact with external software or external data sources.
_Avoid_: Tool, when describing native agent capabilities

**Native tool**:
An Agentis-owned tool that runs inside Agentis rather than through an external integration provider.
_Avoid_: Built-in integration, Composio tool

**Workspace file tool**:
A native tool that inspects, creates, edits, or executes against files in the run's workspace.
_Avoid_: Native tool, when the narrower file/workspace meaning is intended

**Web search**:
A native tool that lets an agent search the web for current information during a workspace-scoped run.
_Avoid_: Search, when specificity matters

**Artifact**:
The durable Library primitive for uploaded files and agent-generated output. Artifacts have a type such as `document`, `webpage`, `slides`, `hyperapp`, `table`, `image`, `video`, or `other`; thread, project, or global visibility scope; version history; storage; and provenance metadata.
_Avoid_: Document, when referring to Library-wide behavior or non-markdown outputs

**Artifact type**:
The subtype of a Library Artifact. `document` means a markdown Document. `webpage` and `slides` are sibling artifact types, not document types.
_Avoid_: Document type, when describing non-markdown artifacts

**Document**:
The markdown-specific Artifact subtype. Documents support markdown preview, markdown/code view, section updates, appends, version history, download, source/provenance display, and visibility scope management.
_Avoid_: Artifact, when specifically referring to markdown document authoring and document runtime tools

**Artifact workspace**:
The work surface for opening an Artifact from Library, run timeline provenance, or project context. It provides type-specific preview/edit behavior, version history, download, source/provenance display, and visibility scope management. Markdown Documents may keep the `/documents/:documentId` route as a compatibility workspace.
_Avoid_: Library preview, when referring to the full artifact route

**Artifact visibility scope**:
The access boundary for an Artifact: `thread`, `project`, or `global`. Scope can change through artifact workspace/API/tool flows when the target project or thread context is valid; provenance remains visible separately and should not be described as scope.
_Avoid_: Source, provenance, agent visibility
