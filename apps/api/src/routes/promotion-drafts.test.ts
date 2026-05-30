import { afterEach, describe, expect, it, vi } from "vitest"
import { eq } from "drizzle-orm"
import { createApp } from "../app.js"
import { agentPromotionDrafts, threads } from "../db/schema.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("promotion draft routes", () => {
  it("creates and reads a draft from an active source thread", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      draft: {
        id: string
        threadId: string
        sourceThreadTitle: string
        name: string
        systemPrompt: string
        model: string
      }
    }
    expect(body.draft).toMatchObject({
      threadId: created.thread.id,
      sourceThreadTitle: "Investigate support backlog",
      name: "Investigate support backlog Agent",
      model: "gpt-4o-mini",
    })
    expect(body.draft.systemPrompt).toContain("Review support backlog patterns")

    const read = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`
    )

    expect(read.status).toBe(200)
    const readBody = (await read.json()) as { draft: { id: string } }
    expect(readBody.draft.id).toBe(body.draft.id)
  })

  it("persists generated intelligence and edited-field markers", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt:
        "Review support backlog patterns, label severity, and draft replies.",
      model: "gpt-4o-mini",
      mode: "plan",
      toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
    })
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      draft: {
        id: string
        intelligence: {
          suggestedPurpose: string
          repeatedSteps: string[]
          requiredTools: { toolkitSlug: string; connectionId?: string }[]
          suggestedPrompt: string
          modelRecommendation: { model: string; reason?: string }
          rubricCriteria: string[]
        }
        editedFields: string[]
      }
    }
    expect(body.draft.intelligence).toMatchObject({
      suggestedPurpose:
        "Review support backlog patterns, label severity, and draft replies.",
      repeatedSteps: [
        "Review support backlog patterns",
        "label severity",
        "draft replies",
      ],
      requiredTools: [{ toolkitSlug: "github", connectionId: github.id }],
      suggestedPrompt:
        "Use the source thread context to review support backlog patterns, label severity, and draft replies.",
      modelRecommendation: {
        model: "gpt-4o-mini",
        reason: "Uses the model from the source thread.",
      },
      rubricCriteria: [
        "Uses the source thread context",
        "Completes the repeated steps consistently",
        "Explains tool usage and assumptions",
      ],
    })
    expect(body.draft.editedFields).toEqual([])

    const updated = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Routes support backlog patterns.",
          intelligence: {
            rubricCriteria: ["Assigns the right severity"],
          },
        }),
      }
    )

    expect(updated.status).toBe(200)
    const updatedBody = (await updated.json()) as {
      draft: {
        intelligence: { suggestedPrompt: string; rubricCriteria: string[] }
        editedFields: string[]
      }
    }
    expect(updatedBody.draft.intelligence).toMatchObject({
      suggestedPrompt:
        "Use the source thread context to review support backlog patterns, label severity, and draft replies.",
      rubricCriteria: ["Assigns the right severity"],
    })
    expect(updatedBody.draft.editedFields).toEqual([
      "description",
      "rubricCriteria",
    ])
  })

  it("does not mark unchanged draft fields as edited", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)
    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await response.json()) as {
      draft: {
        id: string
        name: string
        description: string
        systemPrompt: string
        model: string
        toolGrants: { toolkitSlug: string; connectionId?: string }[]
      }
    }

    const updated = await app.request(
      `/api/agent-promotion-drafts/${draft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          systemPrompt: draft.systemPrompt,
          model: draft.model,
          toolGrants: draft.toolGrants,
        }),
      }
    )

    expect(updated.status).toBe(200)
    const updatedBody = (await updated.json()) as {
      draft: { editedFields: string[] }
    }
    expect(updatedBody.draft.editedFields).toEqual([])
  })

  it("derives repeated steps from rich source thread messages", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Support follow-up workflow",
      prompt: "Help me triage support requests.",
      model: "gpt-4.1-mini",
      mode: "plan",
    })
    ctx.repos.messages.create({
      threadId: created.thread.id,
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "Inspect GitHub issues. Then draft a reply. Then post the response.",
        },
      ],
    })
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      draft: {
        intelligence: {
          repeatedSteps: string[]
          suggestedPrompt: string
          modelRecommendation: { model: string }
        }
      }
    }
    expect(body.draft.intelligence.repeatedSteps).toEqual([
      "Help me triage support requests",
      "Inspect GitHub issues",
      "draft a reply",
      "post the response",
    ])
    expect(body.draft.intelligence.suggestedPrompt).toBe(
      "Use the source thread context to help me triage support requests."
    )
    expect(body.draft.intelligence.modelRecommendation.model).toBe(
      "gpt-4.1-mini"
    )
  })

  it("persists editable draft fields and keeps source-derived grants", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
      toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
    })
    const app = createApp(ctx.repos, ctx.config)
    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const body = (await response.json()) as { draft: { id: string } }
    const draftRow = ctx.db
      .select({ toolGrantsJson: agentPromotionDrafts.toolGrantsJson })
      .from(agentPromotionDrafts)
      .where(eq(agentPromotionDrafts.id, body.draft.id))
      .get()
    expect(JSON.parse(draftRow?.toolGrantsJson ?? "[]")).toEqual([
      { toolkitSlug: "github", connectionId: github.id },
    ])

    const updated = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Reviews and routes support backlog patterns.",
          systemPrompt: "Route support issues with clear severity labels.",
          model: "gpt-4.1-mini",
        }),
      }
    )

    expect(updated.status).toBe(200)
    const updatedBody = (await updated.json()) as {
      draft: {
        name: string
        description: string
        systemPrompt: string
        model: string
        toolGrants: { toolkitSlug: string; connectionId?: string }[]
      }
    }
    expect(updatedBody.draft).toMatchObject({
      name: "Support Triage Agent",
      description: "Reviews and routes support backlog patterns.",
      systemPrompt: "Route support issues with clear severity labels.",
      model: "gpt-4.1-mini",
    })
    expect(updatedBody.draft.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])

    const read = await app.request(
      `/api/agent-promotion-drafts/${body.draft.id}`
    )
    const readBody = (await read.json()) as { draft: { name: string } }
    expect(readBody.draft.name).toBe("Support Triage Agent")
  })

  it("creates draft validation metadata from source thread tool usage", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Open a GitHub issue and update the CRM account",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.steps.create({
      runId: created.run.id,
      type: "tool-call",
      status: "completed",
      title: "Create GitHub issue",
      payload: { toolkitSlug: "github", toolSlug: "GITHUB_CREATE_ISSUE" },
    })
    ctx.repos.steps.create({
      runId: created.run.id,
      type: "tool-call",
      status: "completed",
      title: "Lookup CRM account",
      payload: { toolkitSlug: "crm", toolSlug: "CRM_LOOKUP" },
    })
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      draft: {
        proposedToolGrants: {
          toolkitSlug: string
          connectionId?: string
          validationStatus: string
        }[]
        unsupportedSourceSteps: { title: string; reason: string }[]
      }
    }
    expect(body.draft.proposedToolGrants).toMatchObject([
      {
        toolkitSlug: "github",
        connectionId: github.id,
        validationStatus: "valid",
      },
    ])
    expect(body.draft.unsupportedSourceSteps).toMatchObject([
      { title: "Lookup CRM account", reason: "unsupported_tool" },
    ])
  })

  it("rejects public edits to generated validation metadata", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as { draft: { id: string } }

    const updated = await app.request(
      `/api/agent-promotion-drafts/${draft.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          proposedToolGrants: [
            {
              toolkitSlug: "github",
              required: true,
              validationStatus: "valid",
            },
          ],
        }),
      }
    )

    expect(updated.status).toBe(400)
    expect((await updated.json()) as { code: string }).toMatchObject({
      code: "invalid_promotion_draft",
    })
  })

  it("validates proposed required grants against current integration access", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Notify support channel",
      prompt: "Send a Slack message",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.steps.create({
      runId: created.run.id,
      type: "tool-call",
      status: "completed",
      title: "Send Slack message",
      payload: { toolkitSlug: "slack", toolSlug: "SLACK_SEND_MESSAGE" },
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as { draft: { id: string } }

    const blocked = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Notifier",
          systemPrompt: "Send support updates.",
        }),
      }
    )

    expect(blocked.status).toBe(400)
    expect(
      (await blocked.json()) as { code: string; remediation?: string }
    ).toMatchObject({
      code: "toolkit_not_connected",
      remediation: "Connect Slack before creating this agent.",
    })

    const slack = ctx.repos.integrationConnections.create({
      toolkitSlug: "slack",
      status: "connected",
      composioConnectedAccountId: "acct-slack",
    })
    const read = await app.request(`/api/agent-promotion-drafts/${draft.id}`)
    const readBody = (await read.json()) as {
      draft: {
        toolGrants: { toolkitSlug: string; connectionId?: string }[]
        proposedToolGrants: { toolkitSlug: string; validationStatus: string }[]
      }
    }
    expect(readBody.draft.proposedToolGrants).toMatchObject([
      { toolkitSlug: "slack", validationStatus: "valid" },
    ])
    expect(readBody.draft.toolGrants).toMatchObject([
      { toolkitSlug: "slack", connectionId: slack.id },
    ])

    const createdAgent = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Notifier",
          systemPrompt: "Send support updates.",
        }),
      }
    )
    expect(createdAgent.status).toBe(201)
  })

  it("creates an agent from proposed grants when access is present", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Open a GitHub issue",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.steps.create({
      runId: created.run.id,
      type: "tool-call",
      status: "completed",
      title: "Create GitHub issue",
      payload: { toolkitSlug: "github", toolSlug: "GITHUB_CREATE_ISSUE" },
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as { draft: { id: string } }

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Issue Creator",
          systemPrompt: "Open GitHub issues from requests.",
        }),
      }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      agent: { toolGrantCount: number }
      toolGrants: { toolkitSlug: string; connectionId: string }[]
    }
    expect(body.agent.toolGrantCount).toBe(1)
    expect(body.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])
  })

  it("keeps required proposed grants when create payload includes explicit grants", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Open a GitHub issue",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    ctx.repos.steps.create({
      runId: created.run.id,
      type: "tool-call",
      status: "completed",
      title: "Create GitHub issue",
      payload: { toolkitSlug: "github", toolSlug: "GITHUB_CREATE_ISSUE" },
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as { draft: { id: string } }

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Issue Creator",
          systemPrompt: "Open GitHub issues from requests.",
          toolGrants: [],
        }),
      }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      agent: { toolGrantCount: number }
      toolGrants: { toolkitSlug: string; connectionId: string }[]
    }
    expect(body.agent.toolGrantCount).toBe(1)
    expect(body.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])
  })

  it("rejects agent creation while draft validation analysis is pending", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Open a GitHub issue",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const now = new Date().toISOString()
    const db = ctx.db
    expect(() =>
      db
        .insert(agentPromotionDrafts)
        .values({
          id: "draft-pending-validation",
          threadId: created.thread.id,
          sourceThreadTitle: created.thread.title,
          name: "Issue Creator",
          description: null,
          systemPrompt: "Open GitHub issues from requests.",
          model: "gpt-4o-mini",
          toolGrantsJson: "[]",
          intelligenceJson: "{}",
          editedFieldsJson: "[]",
          proposedToolGrantsJson: null,
          unsupportedSourceStepsJson: null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    ).not.toThrow()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      "/api/agent-promotion-drafts/draft-pending-validation/create-agent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Issue Creator",
          systemPrompt: "Open GitHub issues from requests.",
        }),
      }
    )

    expect(response.status).toBe(400)
    expect((await response.json()) as { code: string }).toMatchObject({
      code: "validation_analysis_pending",
    })
  })

  it("creates an agent from no-tool drafts without grant validation noise", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Summarize backlog",
      prompt: "Summarize support patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as { draft: { id: string } }

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Backlog Summarizer",
          systemPrompt: "Summarize support backlog patterns.",
        }),
      }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      agent: { toolGrantCount: number }
    }
    expect(body.agent.toolGrantCount).toBe(0)
  })

  it("creates deterministic defaults for thin source threads", async () => {
    ctx = createTestContext()
    const thread = ctx.repos.threads.create({
      title: "",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)

    const first = await app.request(
      `/api/threads/${thread.id}/promotion-drafts`,
      {
        method: "POST",
      }
    )
    const second = await app.request(
      `/api/threads/${thread.id}/promotion-drafts`,
      {
        method: "POST",
      }
    )

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    const firstBody = (await first.json()) as {
      draft: {
        id: string
        name: string
        description: string
        systemPrompt: string
      }
    }
    const secondBody = (await second.json()) as { draft: { id: string } }
    expect(secondBody.draft.id).toBe(firstBody.draft.id)
    expect(firstBody.draft).toMatchObject({
      name: "New Agent",
      description: "Created from a thread.",
      systemPrompt: "Use the context from this thread.",
    })
  })

  it("applies draft edits while creating an agent in a single command", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as {
      draft: { id: string }
    }
    const rubricCriteria = [
      "Assigns the right severity",
      "Explains the handoff",
    ]

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Routes support backlog patterns.",
          systemPrompt: "Assign severity and next steps.",
          model: "gpt-4.1-mini",
          draftUpdates: {
            intelligence: { rubricCriteria },
          },
        }),
      }
    )

    expect(response.status).toBe(201)
    expect(ctx.repos.agentPromotionDrafts.getById(draft.id)).toMatchObject({
      intelligence: { rubricCriteria },
      editedFields: ["rubricCriteria"],
    })
  })

  it("keeps draft edits unchanged when agent creation cannot be loaded", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as {
      draft: { id: string; intelligence: { rubricCriteria: string[] } }
    }
    vi.spyOn(ctx.repos.agents, "createWithGrants").mockReturnValueOnce({
      id: "agent_missing",
      name: "Support Triage Agent",
      description: "Routes support backlog patterns.",
      systemPrompt: "Assign severity and next steps.",
      model: "gpt-4.1-mini",
      maxCostPerRunUsd: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentConfigurationVersion: {
        id: "agent_version_missing",
        agentId: "agent_missing",
        version: 1,
        systemPrompt: "Assign severity and next steps.",
        model: "gpt-4.1-mini",
        maxCostPerRunUsd: null,
        createdAt: new Date().toISOString(),
      },
      toolGrantCount: 0,
    })

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Routes support backlog patterns.",
          systemPrompt: "Assign severity and next steps.",
          model: "gpt-4.1-mini",
          draftUpdates: {
            intelligence: { rubricCriteria: ["Assigns severity"] },
          },
        }),
      }
    )

    expect(response.status).toBe(500)
    expect(ctx.repos.agentPromotionDrafts.getById(draft.id)).toMatchObject({
      intelligence: { rubricCriteria: draft.intelligence.rubricCriteria },
      editedFields: [],
    })
  })

  it("rejects conflicting tool grant sources in a promotion command", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const slack = ctx.repos.integrationConnections.create({
      toolkitSlug: "slack",
      status: "connected",
      composioConnectedAccountId: "acct-slack",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
      toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as { draft: { id: string } }

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Routes support backlog patterns.",
          systemPrompt: "Assign severity and next steps.",
          model: "gpt-4.1-mini",
          toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
          draftUpdates: {
            toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
          },
        }),
      }
    )

    expect(response.status).toBe(400)
    expect((await response.json()) as { code: string }).toMatchObject({
      code: "conflicting_tool_grants",
    })
    expect(
      ctx.repos.agentPromotionDrafts.getById(draft.id)?.toolGrants
    ).toEqual([{ toolkitSlug: "github", connectionId: github.id }])
  })

  it("creates an agent from draft edits in a single promotion command", async () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
      toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
    })
    const app = createApp(ctx.repos, ctx.config)
    const draftResponse = await app.request(
      `/api/threads/${created.thread.id}/promotion-drafts`,
      { method: "POST" }
    )
    const { draft } = (await draftResponse.json()) as {
      draft: {
        id: string
        name: string
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
    }
    expect(draft.sourceWorkflow).toMatchObject({
      summary: "Investigate support backlog",
      firstUserPrompt: "Review support backlog patterns",
    })

    ctx.repos.threads.touch(created.thread.id, {
      title: "Renamed support backlog source",
    })

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Routes support backlog patterns.",
          systemPrompt: "Assign severity and next steps.",
          model: "gpt-4.1-mini",
          toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
        }),
      }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      agent: {
        id: string
        name: string
        description?: string
        systemPrompt: string
        model: string
        toolGrantCount: number
        sourceThread?: { id: string; title: string }
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
      toolGrants: { toolkitSlug: string; connectionId?: string }[]
    }
    expect(body.agent).toMatchObject({
      name: "Support Triage Agent",
      description: "Routes support backlog patterns.",
      systemPrompt: "Assign severity and next steps.",
      model: "gpt-4.1-mini",
      toolGrantCount: 1,
      sourceThread: {
        id: created.thread.id,
        title: "Investigate support backlog",
      },
      sourceWorkflow: {
        summary: "Investigate support backlog",
        firstUserPrompt: "Review support backlog patterns",
      },
    })
    expect(body.toolGrants).toMatchObject([
      { toolkitSlug: "github", connectionId: github.id },
    ])
    const reloaded = await app.request(`/api/agents/${body.agent.id}`)
    expect(reloaded.status).toBe(200)
    const reloadedBody = (await reloaded.json()) as {
      agent: {
        sourceThread?: { id: string; title: string }
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
    }
    expect(reloadedBody.agent.sourceThread).toMatchObject({
      id: created.thread.id,
      title: "Investigate support backlog",
    })
    expect(reloadedBody.agent.sourceWorkflow).toMatchObject({
      summary: "Investigate support backlog",
      firstUserPrompt: "Review support backlog patterns",
    })
    expect(ctx.repos.agentPromotionDrafts.getById(draft.id)?.name).toBe(
      "Investigate support backlog Agent"
    )
  })

  it("preserves source context when creating an agent from a legacy draft", async () => {
    ctx = createTestContext()
    const created = ctx.repos.threads.createWithInitialRun({
      title: "Investigate support backlog",
      prompt: "Review support backlog patterns",
      model: "gpt-4o-mini",
      mode: "plan",
    })
    const draft = ctx.repos.agentPromotionDrafts.create({
      threadId: created.thread.id,
      sourceThreadTitle: created.thread.title,
      name: "Support Backlog Agent",
      description: "Helps triage support backlog patterns.",
      systemPrompt: "Help triage support backlog patterns.",
      model: "gpt-4o-mini",
      toolGrants: [],
    })
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      `/api/agent-promotion-drafts/${draft.id}/create-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Support Triage Agent",
          description: "Routes support backlog patterns.",
          systemPrompt: "Assign severity and next steps.",
        }),
      }
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      agent: {
        sourceThread?: { id: string; title: string }
        sourceWorkflow?: { summary: string; firstUserPrompt?: string }
      }
    }
    expect(body.agent.sourceThread).toMatchObject({
      id: created.thread.id,
      title: "Investigate support backlog",
    })
    expect(body.agent.sourceWorkflow).toMatchObject({
      summary: "Investigate support backlog",
      firstUserPrompt: "Review support backlog patterns",
    })
  })

  it("allows draft creation for legacy threads without an agent", async () => {
    ctx = createTestContext()
    ctx.db
      .insert(threads)
      .values({
        id: "thread_legacy_plain",
        title: "Legacy plain thread",
        status: "active",
        model: "gpt-4o-mini",
        mode: "plan",
        projectId: null,
        agentId: null,
        agentNameSnapshot: null,
        agentConfigurationVersionId: null,
        workspaceId: null,
        sourceThreadId: null,
        sourceThreadTitle: null,
        sourceWorkflowJson: null,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      })
      .run()
    const app = createApp(ctx.repos, ctx.config)

    const response = await app.request(
      "/api/threads/thread_legacy_plain/promotion-drafts",
      { method: "POST" }
    )

    expect(response.status).toBe(201)
    expect((await response.json()) as { draft: { sourceThreadTitle: string } })
      .toMatchObject({ draft: { sourceThreadTitle: "Legacy plain thread" } })
  })

  it("rejects draft creation for missing and agent-owned source threads", async () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Support Triage Agent",
      systemPrompt: "Handle support triage.",
      model: "gpt-4o-mini",
    })
    const agentThread = ctx.repos.threads.createWithInitialRun({
      title: "Test Support Triage Agent",
      prompt: "Test this agent",
      model: "gpt-4o-mini",
      mode: "agent",
      agentId: agent.id,
      agentNameSnapshot: agent.name,
    })
    const app = createApp(ctx.repos, ctx.config)

    const missing = await app.request("/api/threads/missing/promotion-drafts", {
      method: "POST",
    })
    const agentOwned = await app.request(
      `/api/threads/${agentThread.thread.id}/promotion-drafts`,
      { method: "POST" }
    )

    expect(missing.status).toBe(404)
    expect((await missing.json()) as { code: string }).toMatchObject({
      code: "thread_not_found",
    })
    expect(agentOwned.status).toBe(400)
    expect((await agentOwned.json()) as { code: string; error: string }).toMatchObject({
      code: "thread_already_has_agent",
      error:
        "This thread already uses an agent. Open that agent to adjust future runs.",
    })
  })
})
