import { describe, expect, it } from "vitest"
import {
  agentDetailInformationSchema,
  agentDetailResponseSchema,
  agentListItemSchema,
  artifactSchema,
  artifactTypeSchema,
  connectIntegrationResponseSchema,
  createAgentRequestSchema,
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
  updateAgentPromotionDraftRequestSchema,
} from "./schemas.js"

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
          createdAt: now,
        },
        toolGrantCount: 1,
      },
      configurationVersions: [],
      toolGrants: [],
      information: {
        recentThreads: [],
        library: { items: [], totalCount: 0 },
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
    })
    expect(update.description).toBeNull()
    expect(() => updateAgentPromotionDraftRequestSchema.parse({})).toThrow()
    expect(() =>
      updateAgentPromotionDraftRequestSchema.parse({ name: "" })
    ).toThrow()
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
      },
    })
    expect(detail.agent.id).toBe("agent-1")
  })

  it("parses populated and empty agent detail information", () => {
    const now = new Date().toISOString()
    const empty = agentDetailInformationSchema.parse({
      recentThreads: [],
      library: { items: [], totalCount: 0 },
    })
    expect(empty.library.items).toHaveLength(0)

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
          artifactCount: 1,
        },
      ],
      library: {
        totalCount: 1,
        items: [
          {
            id: "artifact-1",
            title: "Research notes",
            description: null,
            type: "document",
            mimeType: "text/markdown",
            sizeBytes: 42,
            previewText: "Notes",
            metadata: null,
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
    })
    expect(populated.recentThreads[0]?.agentConfigurationVersionId).toBe(
      "agent-version-1"
    )
    expect(populated.library.totalCount).toBe(1)
    expect(() =>
      agentDetailInformationSchema.parse({
        recentThreads: [{ ...populated.recentThreads[0], artifactCount: -1 }],
        library: { items: [], totalCount: 0 },
      })
    ).toThrow()
    expect(() =>
      agentDetailInformationSchema.parse({
        recentThreads: [{ ...populated.recentThreads[0], artifactCount: 1.5 }],
        library: { items: [], totalCount: 0 },
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

  it("parses project, memory, context, and artifact payloads", () => {
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

    const context = projectContextSummarySchema.parse({
      project,
      goals: "Ship",
      memories: [memory],
      enabledMemoryCount: 1,
    })
    expect(context.enabledMemoryCount).toBe(1)

    const artifact = artifactSchema.parse({
      id: "artifact-1",
      title: "Brief",
      type: "document",
      mimeType: "text/plain",
      sizeBytes: 10,
      storageKey: "key",
      createdAt: now,
      updatedAt: now,
    })
    expect(artifact.type).toBe("document")
    expect(() => artifactTypeSchema.parse("folder")).toThrow()

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
