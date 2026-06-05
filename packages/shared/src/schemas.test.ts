import { describe, expect, it } from "vitest"
import {
  agentDetailInformationSchema,
  agentDetailResponseSchema,
  agentListItemSchema,
  documentDetailResponseSchema,
  documentSchema,
  documentTypeSchema,
  updateDocumentContentRequestSchema,
  updateDocumentContentResponseSchema,
  connectIntegrationResponseSchema,
  createAgentRequestSchema,
  createSavedMemoryRequestSchema,
  savedMemorySchema,
  createThreadRequestSchema,
  integrationToolkitSchema,
  integrationsListResponseSchema,
  messageSchema,
  projectContextSummarySchema,
  projectMemorySchema,
  projectSchema,
  projectStatusSchema,
  runSchema,
  threadDetailSchema,
  threadToolGrantsResponseSchema,
  threadSchema,
  toolAccessGrantSchema,
  updateAgentRequestSchema,
  agentPromotionDraftSchema,
  createAgentPromotionDraftResponseSchema,
  hasBlockingProposedToolGrants,
  proposedToolGrantsToInputs,
  updateAgentPromotionDraftRequestSchema,
  workspaceSchema,
  type ProposedToolGrant,
} from "./schemas.js"
import {
  DEFAULT_CUSTOM_AGENT_NATIVE_TOOLS,
  NATIVE_TOOL_CAPABILITY_CATALOG,
  nativeToolPermissionIdSchema,
} from "./native-tools.js"
import { searchWebInputSchema, searchWebResultSchema } from "./web-search.js"

describe("shared schemas", () => {
  it("parses a thread detail payload", () => {
    const now = new Date().toISOString()
    const parsed = threadDetailSchema.parse({
      thread: {
        id: "thread-1",
        title: "Test",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        createdAt: now,
        updatedAt: now,
      },
      messages: [
        {
          id: "msg-1",
          threadId: "thread-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
          status: "completed",
          createdAt: now,
        },
      ],
      runs: [
        {
          id: "run-1",
          threadId: "thread-1",
          status: "completed",
          model: "gpt-4o-mini",
          startedAt: now,
          finishedAt: now,
        },
      ],
      steps: [],
    })

    expect(parsed.thread.id).toBe("thread-1")
    expect(parsed.messages).toHaveLength(1)
  })

  it("parses selected-agent thread creation requests", () => {
    const parsed = createThreadRequestSchema.parse({
      prompt: "List files",
      mode: "plan",
      model: "gpt-4o-mini",
      agentId: "agent_research",
    })

    expect(parsed.agentId).toBe("agent_research")
  })

  it("parses workspace payloads and workspace-backed thread metadata", () => {
    const now = new Date().toISOString()
    const workspace = workspaceSchema.parse({
      id: "workspace_agentis",
      agentId: "agent_agentis",
      name: "Agentis workspace",
      backendType: "local-fs",
      backendRef: "workspaces/workspace_agentis",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    const thread = threadSchema.parse({
      id: "thread-1",
      title: "Inspect workspace files",
      status: "active",
      model: "gpt-4o-mini",
      mode: "plan",
      agentId: workspace.agentId,
      workspaceId: workspace.id,
      createdAt: now,
      updatedAt: now,
    })

    expect(workspace.backendType).toBe("local-fs")
    expect(thread.workspaceId).toBe("workspace_agentis")
  })

  it("parses agent-bound thread and run metadata without affecting plain threads", () => {
    const now = new Date().toISOString()
    const parsed = threadDetailSchema.parse({
      thread: {
        id: "thread-1",
        title: "Test Research Agent",
        status: "active",
        model: "gpt-4.1-mini",
        mode: "agent",
        agentId: "agent-1",
        agentNameSnapshot: "Research Agent",
        agentConfigurationVersionId: "agent-version-2",
        sourceThread: {
          id: "source-thread-1",
          title: "Investigate support backlog",
        },
        sourceWorkflow: {
          summary: "Investigate support backlog",
          firstUserPrompt: "Review support backlog patterns",
        },
        createdAt: now,
        updatedAt: now,
      },
      messages: [],
      runs: [
        {
          id: "run-1",
          threadId: "thread-1",
          status: "queued",
          model: "gpt-4.1-mini",
          agentId: "agent-1",
          agentConfigurationVersionId: "agent-version-2",
          startedAt: now,
        },
      ],
      steps: [],
    })

    const version = agentDetailResponseSchema.parse({
      agent: {
        id: "agent-1",
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4.1-mini",
        createdAt: now,
        updatedAt: now,
        currentConfigurationVersion: {
          id: "agent-version-2",
          agentId: "agent-1",
          version: 2,
          systemPrompt: "Answer with citations.",
          model: "gpt-4.1-mini",
          nativeTools: ["webSearch"],
          createdAt: now,
        },
        toolGrantCount: 1,
      },
      configurationVersions: [],
      toolGrants: [],
      information: {
        recentThreads: [],
        library: { items: [], totalCount: 0 },
        memories: { agent: [], global: [] },
      },
    }).agent.currentConfigurationVersion

    expect(parsed.thread.agentId).toBe("agent-1")
    expect(parsed.thread.agentNameSnapshot).toBe("Research Agent")
    expect(parsed.thread.agentConfigurationVersionId).toBe("agent-version-2")
    expect(parsed.thread.sourceThread?.id).toBe("source-thread-1")
    expect(parsed.thread.sourceWorkflow?.summary).toBe(
      "Investigate support backlog"
    )
    expect(parsed.runs[0]?.agentConfigurationVersionId).toBe("agent-version-2")
    expect(version).not.toHaveProperty("toolGrants")

    const plainThread = threadSchema.parse({
      id: "plain-thread",
      title: "Plain thread",
      status: "active",
      model: "gpt-4o-mini",
      mode: "plan",
      createdAt: now,
      updatedAt: now,
    })
    const plainRun = runSchema.parse({
      id: "plain-run",
      threadId: plainThread.id,
      status: "queued",
      model: "gpt-4o-mini",
      startedAt: now,
    })

    expect(plainThread.agentId).toBeUndefined()
    expect(plainThread.agentConfigurationVersionId).toBeUndefined()
    expect(plainRun.agentConfigurationVersionId).toBeUndefined()
  })

  it("rejects empty create thread prompts", () => {
    expect(() => createThreadRequestSchema.parse({ prompt: "" })).toThrow()
  })

  it("keeps native tool permissions in their shared native-tool contract", () => {
    expect(nativeToolPermissionIdSchema.parse("webSearch")).toBe("webSearch")
    expect(nativeToolPermissionIdSchema.parse("documents")).toBe("documents")
    expect(DEFAULT_CUSTOM_AGENT_NATIVE_TOOLS).toEqual([
      "webSearch",
      "documents",
    ])
    expect(NATIVE_TOOL_CAPABILITY_CATALOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "webSearch",
          runtimeToolName: "searchWeb",
          label: "Search",
          group: "Research",
          defaultSelected: true,
        }),
        expect.objectContaining({
          id: "documents",
          runtimeToolName: "documents",
          label: "Documents",
          group: "Data",
          defaultSelected: true,
        }),
      ])
    )
  })

  it("requires web search queries and result URLs to be safe for source links", () => {
    expect(() => searchWebInputSchema.parse({ query: "   " })).toThrow()
    expect(searchWebInputSchema.parse({ query: "  Agentis news  " }).query).toBe(
      "Agentis news"
    )
    expect(() =>
      searchWebResultSchema.parse({
        title: "Unsafe result",
        url: "javascript:alert(1)",
      })
    ).toThrow()
    expect(
      searchWebResultSchema.parse({
        title: "Safe result",
        url: "https://example.com/news",
      }).url
    ).toBe("https://example.com/news")
  })

  it("parses thread-seeded agent draft contracts", () => {
    const now = new Date().toISOString()
    const draft = agentPromotionDraftSchema.parse({
      id: "draft-1",
      threadId: "thread-1",
      sourceThreadTitle: "Investigate support backlog",
      name: "Support Backlog Agent",
      description: "Helps triage support backlog patterns.",
      systemPrompt: "Help triage support backlog patterns.",
      model: "gpt-4o-mini",
      sourceWorkflow: {
        summary: "Investigate support backlog",
        firstUserPrompt: "Review support backlog patterns",
      },
      toolGrants: [{ toolkitSlug: "github", connectionId: "conn-1" }],
      intelligence: {
        suggestedPurpose: "Triage support backlog patterns.",
        repeatedSteps: ["Review incoming issues", "Assign severity"],
        requiredTools: [{ toolkitSlug: "github", connectionId: "conn-1" }],
        suggestedPrompt:
          "Review support backlog patterns and propose next steps.",
        modelRecommendation: {
          model: "gpt-4o-mini",
          reason: "Matches the source thread model.",
        },
        rubricCriteria: ["Finds the right issue", "Explains the severity"],
      },
      editedFields: ["name", "rubricCriteria"],
      createdAt: now,
      updatedAt: now,
    })

    const response = createAgentPromotionDraftResponseSchema.parse({ draft })

    expect(response.draft.threadId).toBe("thread-1")
    expect(response.draft.sourceWorkflow?.summary).toBe(
      "Investigate support backlog"
    )
    expect(response.draft.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: "conn-1" },
    ])
    expect(response.draft.intelligence).toMatchObject({
      suggestedPurpose: "Triage support backlog patterns.",
      repeatedSteps: ["Review incoming issues", "Assign severity"],
      requiredTools: [{ toolkitSlug: "github", connectionId: "conn-1" }],
      suggestedPrompt:
        "Review support backlog patterns and propose next steps.",
      modelRecommendation: {
        model: "gpt-4o-mini",
        reason: "Matches the source thread model.",
      },
      rubricCriteria: ["Finds the right issue", "Explains the severity"],
    })
    expect(response.draft.editedFields).toEqual(["name", "rubricCriteria"])

    const draftWithValidation = agentPromotionDraftSchema.parse({
      ...draft,
      proposedToolGrants: [
        {
          toolkitSlug: "github",
          toolName: "GITHUB_CREATE_ISSUE",
          displayName: "Create issue",
          required: true,
          validationStatus: "missing_access",
          remediation: {
            code: "toolkit_not_connected",
            message: "Connect GitHub before creating this agent.",
          },
        },
      ],
      unsupportedSourceSteps: [
        {
          id: "step-1",
          title: "Call unsupported CRM tool",
          reason: "unsupported_tool",
          toolName: "CRM_LOOKUP",
          details: "No matching integration is available.",
        },
      ],
    })
    expect(draftWithValidation.proposedToolGrants).toHaveLength(1)
    expect(draftWithValidation.unsupportedSourceSteps).toHaveLength(1)
    expect(() =>
      agentPromotionDraftSchema.parse({
        ...draft,
        proposedToolGrants: [
          {
            toolkitSlug: "github",
            required: true,
            validationStatus: "unknown",
          },
        ],
      })
    ).toThrow()

    expect(() =>
      agentPromotionDraftSchema.parse({
        ...draft,
        editedFields: ["nativeTools"],
      })
    ).toThrow()
    expect(() =>
      agentPromotionDraftSchema.parse({ ...draft, name: "" })
    ).toThrow()
    expect(() =>
      agentPromotionDraftSchema.parse({ ...draft, systemPrompt: "" })
    ).toThrow()
    expect(() =>
      agentPromotionDraftSchema.parse({
        ...draft,
        sourceWorkflow: { ...draft.sourceWorkflow, firstUserPrompt: "" },
      })
    ).toThrow()

    const update = updateAgentPromotionDraftRequestSchema.parse({
      name: "Support Triage Agent",
      description: null,
      systemPrompt: "Route support issues with severity labels.",
      model: "gpt-4.1-mini",
      intelligence: {
        rubricCriteria: ["Assigns severity", "Explains handoff"],
      },
    })
    expect(update.description).toBeNull()
    expect(update.intelligence?.rubricCriteria).toEqual([
      "Assigns severity",
      "Explains handoff",
    ])
    expect(() => updateAgentPromotionDraftRequestSchema.parse({})).toThrow()
    expect(() =>
      updateAgentPromotionDraftRequestSchema.parse({ name: "" })
    ).toThrow()
    expect(() =>
      updateAgentPromotionDraftRequestSchema.parse({
        name: "Support Triage Agent",
        proposedToolGrants: [
          { toolkitSlug: "github", required: true, validationStatus: "valid" },
        ],
      })
    ).toThrow()
  })

  it("evaluates and converts proposed tool grants", () => {
    const grants: ProposedToolGrant[] = [
      {
        toolkitSlug: "github",
        toolName: "GITHUB_CREATE_ISSUE",
        displayName: "GitHub create issue",
        required: true,
        validationStatus: "valid",
        connectionId: "conn-1",
      },
      {
        toolkitSlug: "linear",
        toolName: "LINEAR_CREATE_ISSUE",
        displayName: "Linear create issue",
        required: true,
        validationStatus: "missing_access",
      },
      {
        toolkitSlug: "slack",
        toolName: "SLACK_SEND_MESSAGE",
        displayName: "Slack send message",
        required: false,
        validationStatus: "pending_connection",
      },
    ]

    expect(hasBlockingProposedToolGrants(grants)).toBe(true)
    expect(
      hasBlockingProposedToolGrants([
        { ...grants[0], validationStatus: "pending_connection" },
      ])
    ).toBe(true)
    expect(hasBlockingProposedToolGrants([grants[0]])).toBe(false)
    expect(hasBlockingProposedToolGrants([grants[2]])).toBe(false)
    expect(proposedToolGrantsToInputs(grants)).toEqual([
      { toolkitSlug: "github", connectionId: "conn-1" },
    ])
    expect(proposedToolGrantsToInputs([])).toEqual([])
  })

  it("parses agent create, list, detail, update, and grant payloads", () => {
    const now = new Date().toISOString()
    const createInput = createAgentRequestSchema.parse({
      name: "Research Agent",
      description: "Finds source-backed answers",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
      toolGrants: [
        { toolkitSlug: "github", connectionId: "conn-1" },
        { toolkitSlug: "linear" },
      ],
    })
    expect(createInput.toolGrants).toHaveLength(2)
    expect(() =>
      createAgentRequestSchema.parse({
        name: "",
        systemPrompt: "Answer with citations.",
      })
    ).toThrow()
    expect(() =>
      createAgentRequestSchema.parse({
        name: "Research Agent",
        systemPrompt: "",
      })
    ).toThrow()

    const updated = updateAgentRequestSchema.parse({
      description: null,
      model: "gpt-4.1-mini",
      toolGrants: [{ toolkitSlug: "github", connectionId: "conn-1" }],
    })
    expect(updated.description).toBeNull()

    const listItem = agentListItemSchema.parse({
      id: "agent-1",
      name: "Research Agent",
      description: "Finds source-backed answers",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
      sourceThread: {
        id: "thread-1",
        title: "Investigate support backlog",
      },
      sourceWorkflow: {
        summary: "Review support backlog patterns",
        firstUserPrompt: "Review support backlog patterns",
      },
      createdAt: now,
      updatedAt: now,
      currentConfigurationVersion: {
        id: "agent-version-1",
        agentId: "agent-1",
        version: 1,
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        nativeTools: ["webSearch"],
        createdAt: now,
      },
      toolGrantCount: 2,
    })
    expect(listItem.currentConfigurationVersion.version).toBe(1)
    expect(listItem.sourceThread?.id).toBe("thread-1")
    expect(listItem.sourceWorkflow?.summary).toBe(
      "Review support backlog patterns"
    )
    expect(() =>
      agentListItemSchema.parse({ ...listItem, toolGrantCount: -1 })
    ).toThrow()
    expect(() =>
      agentListItemSchema.parse({ ...listItem, toolGrantCount: 1.5 })
    ).toThrow()
    expect(() =>
      agentListItemSchema.parse({
        ...listItem,
        sourceWorkflow: { summary: "" },
      })
    ).toThrow()

    const unlinkedAgent = agentListItemSchema.parse({
      ...listItem,
      id: "agent-2",
      sourceThread: undefined,
      sourceWorkflow: undefined,
    })
    expect(unlinkedAgent.sourceThread).toBeUndefined()

    const grants = [
      {
        id: "grant-1",
        scopeType: "agent",
        scopeId: "agent-1",
        toolkitSlug: "github",
        connectionId: "conn-1",
        createdAt: now,
      },
    ]

    const detail = agentDetailResponseSchema.parse({
      agent: listItem,
      configurationVersions: [listItem.currentConfigurationVersion],
      toolGrants: grants,
      information: {
        recentThreads: [],
        library: { items: [], totalCount: 0 },
        memories: { agent: [], global: [] },
      },
    })
    expect(detail.agent.id).toBe("agent-1")
  })

  it("parses populated and empty agent detail information", () => {
    const now = new Date().toISOString()
    const empty = agentDetailInformationSchema.parse({
      recentThreads: [],
      library: { items: [], totalCount: 0 },
      memories: { agent: [], global: [] },
    })
    expect(empty.library.items).toHaveLength(0)
    expect(empty.memories.global).toHaveLength(0)

    const populated = agentDetailInformationSchema.parse({
      recentThreads: [
        {
          id: "thread-1",
          title: "Test Research Agent",
          status: "active",
          model: "gpt-4o-mini",
          agentConfigurationVersionId: "agent-version-1",
          createdAt: now,
          updatedAt: now,
          lastRunStatus: "completed",
          summary: "Checked the repository",
          documentCount: 1,
        },
      ],
      library: {
        totalCount: 1,
        items: [
          {
            id: "document-1",
            title: "Research notes",
            description: null,
            type: "document",
            contentFormat: "markdown",
            mimeType: "text/markdown",
            sizeBytes: 42,
            previewText: "Notes",
            metadata: null,
            visibilityScope: "thread",
            projectId: null,
            projectNameSnapshot: null,
            threadId: "thread-1",
            threadTitleSnapshot: "Test Research Agent",
            runId: "run-1",
            agentId: "agent-1",
            agentNameSnapshot: "Research Agent",
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      memories: {
        agent: [
          {
            id: "memory-agent-1",
            content: "Use source quality notes in every brief.",
            category: "memory_category_tools_workflows",
            usageGuidance: "Use in research briefs.",
            tags: ["research"],
            importance: "high",
            date: "2026-05-28",
            scope: "agent",
            associatedAgent: "agent-1",
            source: "user-generated",
            provenance: "created manually by user",
            pinnedToContext: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        global: [],
      },
    })
    expect(populated.recentThreads[0]?.agentConfigurationVersionId).toBe(
      "agent-version-1"
    )
    expect(populated.library.totalCount).toBe(1)
    expect(() =>
      agentDetailInformationSchema.parse({
        recentThreads: [{ ...populated.recentThreads[0], documentCount: -1 }],
        library: { items: [], totalCount: 0 },
        memories: { agent: [], global: [] },
      })
    ).toThrow()
    expect(() =>
      agentDetailInformationSchema.parse({
        recentThreads: [{ ...populated.recentThreads[0], documentCount: 1.5 }],
        library: { items: [], totalCount: 0 },
        memories: { agent: [], global: [] },
      })
    ).toThrow()
    expect(() =>
      agentDetailInformationSchema.parse({
        recentThreads: [
          {
            id: "thread-1",
            title: "Test Research Agent",
            status: "active",
            model: "gpt-4o-mini",
            agentConfigurationVersionId: "agent-version-1",
            createdAt: now,
            updatedAt: now,
          },
        ],
        library: { items: [], totalCount: 0 },
        memories: { agent: [], global: [] },
      })
    ).toThrow()
  })

  it("parses integration and grant payloads", () => {
    const now = new Date().toISOString()
    const toolkit = integrationToolkitSchema.parse({
      slug: "github",
      name: "GitHub",
      description: "Manage repos",
      category: "developer",
      featured: true,
      status: "connected",
      connectedAccountCount: 1,
      availableTools: ["GITHUB_LIST_REPOS"],
    })
    expect(toolkit.slug).toBe("github")

    const grant = toolAccessGrantSchema.parse({
      id: "grant-1",
      scopeType: "thread",
      scopeId: "thread-1",
      toolkitSlug: "github",
      connectionId: "conn-1",
      createdAt: now,
    })
    expect(grant.scopeType).toBe("thread")

    const list = integrationsListResponseSchema.parse({
      toolkits: [toolkit],
      composioConfigured: true,
      composioMockEnabled: false,
    })
    expect(list.toolkits).toHaveLength(1)

    const connect = connectIntegrationResponseSchema.parse({
      connection: {
        id: "conn-1",
        toolkitSlug: "github",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
      redirectUrl: "https://example.com/oauth",
    })
    expect(connect.redirectUrl).toContain("oauth")

    const grants = threadToolGrantsResponseSchema.parse({
      grants: [grant],
      availableToolkits: [toolkit],
    })
    expect(grants.grants).toHaveLength(1)
  })

  it("parses project, memory, context, and document payloads", () => {
    const now = new Date().toISOString()
    const project = projectSchema.parse({
      id: "project-1",
      name: "Launch",
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    expect(project.name).toBe("Launch")
    expect(() => projectStatusSchema.parse("deleted")).toThrow()

    const memory = projectMemorySchema.parse({
      id: "memory-1",
      projectId: project.id,
      content: "Remember pricing",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    })
    expect(memory.enabled).toBe(true)

    const createdMemoryRequest = createSavedMemoryRequestSchema.parse({
      content: "User prefers TypeScript over JavaScript.",
      category: "memory_category_preference",
      importance: "high",
      usageGuidance: "Use when choosing implementation language.",
      tags: ["typescript", "preference"],
      scope: "global",
      pinnedToContext: true,
    })
    expect(createdMemoryRequest.pinnedToContext).toBe(true)

    const agentMemoryRequest = createSavedMemoryRequestSchema.parse({
      content: "Remember the sales prospecting workflow.",
      category: "memory_category_tools_workflows",
      importance: "medium",
      scope: "agent",
      associatedAgents: ["Sales Prospector", "Research Agent"],
    })
    expect(agentMemoryRequest.associatedAgents).toEqual([
      "Sales Prospector",
      "Research Agent",
    ])

    const threadDerivedMemory = savedMemorySchema.parse({
      id: "memory-thread-derived",
      content: "Launch readiness updates should call out blockers directly.",
      category: "memory_category_preference",
      usageGuidance: "Use when drafting launch updates.",
      tags: ["launch", "blockers"],
      importance: "high",
      date: "2026-05-28",
      scope: "agent",
      associatedAgent: "agent-launch-pm",
      associatedAgents: ["agent-launch-pm", "agent-support"],
      source: "thread-derived",
      sourceThreadId: "thread-launch-plan",
      sourceThreadTitle: "Launch readiness weekly update",
      provenance: "Launch readiness weekly update",
      pinnedToContext: true,
      createdAt: now,
      updatedAt: now,
    })
    expect(threadDerivedMemory.sourceThreadId).toBe("thread-launch-plan")
    expect(threadDerivedMemory.associatedAgents).toEqual([
      "agent-launch-pm",
      "agent-support",
    ])

    expect(() =>
      savedMemorySchema.parse({
        ...threadDerivedMemory,
        id: "memory-invalid-source",
        source: "seeded",
      })
    ).toThrow()
    expect(() =>
      savedMemorySchema.parse({
        ...threadDerivedMemory,
        id: "memory-missing-thread-lineage",
        sourceThreadId: undefined,
        sourceThreadTitle: undefined,
      })
    ).toThrow()
    expect(() =>
      savedMemorySchema.parse({
        ...threadDerivedMemory,
        id: "memory-user-with-thread-lineage",
        source: "user-generated",
      })
    ).toThrow()

    expect(() =>
      savedMemorySchema.parse({
        id: "memory-project-scope",
        content: "Remember project planning notes.",
        category: "memory_category_project_context",
        usageGuidance: "Use when planning.",
        tags: [],
        importance: "medium",
        date: "2026-05-28",
        scope: "project",
        associatedAgent: null,
        source: "seeded",
        provenance: "test fixture",
        pinnedToContext: false,
        createdAt: now,
        updatedAt: now,
      })
    ).toThrow()
    expect(() =>
      createSavedMemoryRequestSchema.parse({
        content: "Remember project planning notes.",
        category: "memory_category_project_context",
        importance: "medium",
        scope: "project",
      })
    ).toThrow()

    const context = projectContextSummarySchema.parse({
      project,
      goals: "Ship",
      memories: [memory],
      enabledMemoryCount: 1,
    })
    expect(context.enabledMemoryCount).toBe(1)

    const document = documentSchema.parse({
      id: "document-1",
      title: "Brief",
      type: "document",
      contentFormat: "markdown",
      mimeType: "text/plain",
      sizeBytes: 10,
      storageKey: "key",
      visibilityScope: "global",
      createdAt: now,
      updatedAt: now,
    })
    expect(document.type).toBe("document")
    expect(() =>
      documentSchema.parse({
        ...document,
        visibilityScope: "project",
        projectId: null,
      })
    ).toThrow()
    expect(() =>
      documentSchema.parse({ ...document, sizeBytes: -1 })
    ).toThrow()
    const documentDetail = documentDetailResponseSchema.parse({
      document,
      content: "# Brief",
      truncated: false,
      selectedVersion: 1,
      currentVersion: 1,
      versions: [{ id: "version-1", version: 1, createdAt: now }],
    })
    expect(documentDetail.versions[0]?.version).toBe(1)
    expect(documentDetail.selectedVersion).toBe(1)
    expect(() => documentTypeSchema.parse("webpage")).toThrow()
    expect(() => documentTypeSchema.parse("slides")).toThrow()
    expect(() => documentTypeSchema.parse("folder")).toThrow()

    const updateRequest = updateDocumentContentRequestSchema.parse({
      content: "# Updated",
      baseVersion: 1,
      changeSummary: "Updated in document workspace",
    })
    expect(updateRequest.baseVersion).toBe(1)
    const updateResponse = updateDocumentContentResponseSchema.parse({
      document,
      currentVersion: 2,
    })
    expect(updateResponse.currentVersion).toBe(2)

    const detail = threadDetailSchema.parse({
      thread: {
        id: "thread-1",
        title: "Test",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        projectId: project.id,
        createdAt: now,
        updatedAt: now,
      },
      messages: [],
      runs: [],
      steps: [],
      projectContext: context,
    })
    expect(detail.projectContext?.project.id).toBe("project-1")
  })

  it("accepts minimal entities", () => {
    const now = new Date().toISOString()
    expect(
      threadSchema.parse({
        id: "t",
        title: "x",
        status: "active",
        model: "gpt-4o-mini",
        mode: "agent",
        createdAt: now,
        updatedAt: now,
      })
    ).toBeDefined()
    expect(
      messageSchema.parse({
        id: "m",
        threadId: "t",
        role: "assistant",
        parts: [{ type: "text", text: "hi" }],
        status: "streaming",
        createdAt: now,
      })
    ).toBeDefined()
    expect(
      runSchema.parse({
        id: "r",
        threadId: "t",
        status: "queued",
        model: "gpt-4o-mini",
        startedAt: now,
      })
    ).toBeDefined()
  })
})
