import { afterEach, describe, expect, it } from "vitest"
import { threads } from "../db/schema.js"
import { createTestContext, type TestContext } from "../test/setup.js"
import {
  GENERIC_AGENTIS_AGENT_ID,
  GENERIC_AGENTIS_WORKSPACE_ID,
} from "../workspaces/constants.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("workspace repository", () => {
  it("ensures the generic Agentis agent and workspace idempotently", () => {
    ctx = createTestContext()

    const first = ctx.repos.workspaces.ensureGenericAgentisWorkspace()
    const second = ctx.repos.workspaces.ensureGenericAgentisWorkspace()

    expect(first).toMatchObject({
      id: GENERIC_AGENTIS_WORKSPACE_ID,
      agentId: GENERIC_AGENTIS_AGENT_ID,
      name: "Agentis workspace",
      backendType: "local-fs",
      backendRef: `workspaces/${GENERIC_AGENTIS_WORKSPACE_ID}`,
      status: "active",
    })
    expect(second.id).toBe(first.id)
    expect(ctx.repos.agents.getById(GENERIC_AGENTIS_AGENT_ID)).toMatchObject({
      id: GENERIC_AGENTIS_AGENT_ID,
      name: "Agentis",
    })
    expect(ctx.repos.workspaces.list()).toHaveLength(1)
  })

  it("provisions one default workspace when an agent is created", () => {
    ctx = createTestContext()

    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })

    const workspace = ctx.repos.workspaces.getDefaultByAgentId(agent.id)
    expect(workspace).toMatchObject({
      agentId: agent.id,
      name: "Research Agent workspace",
      backendType: "local-fs",
      status: "active",
    })

    const reused = ctx.repos.workspaces.createDefaultForAgent({
      agentId: agent.id,
      agentName: "Renamed Agent",
    })
    expect(reused.id).toBe(workspace?.id)
    expect(ctx.repos.workspaces.listByAgentId(agent.id)).toHaveLength(1)
  })

  it("backfills legacy threads to their agent default workspace", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const workspace = ctx.repos.workspaces.getDefaultByAgentId(agent.id)

    ctx.db
      .insert(threads)
      .values({
        id: "thread_legacy_agent",
        title: "Legacy agent thread",
        status: "active",
        model: "gpt-4o-mini",
        mode: "agent",
        projectId: null,
        agentId: agent.id,
        agentNameSnapshot: agent.name,
        agentConfigurationVersionId: agent.currentConfigurationVersion.id,
        workspaceId: null,
        sourceThreadId: null,
        sourceThreadTitle: null,
        sourceWorkflowJson: null,
        createdAt: "2026-05-29T00:00:00.000Z",
        updatedAt: "2026-05-29T00:00:00.000Z",
      })
      .run()

    ctx.repos.workspaces.backfillThreadWorkspaces()

    expect(ctx.repos.threads.getById("thread_legacy_agent")).toMatchObject({
      agentId: agent.id,
      workspaceId: workspace?.id,
    })
  })

  it("backfills plain legacy threads to generic Agentis", () => {
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

    ctx.repos.workspaces.ensureGenericAgentisWorkspace()

    expect(ctx.repos.threads.getById("thread_legacy_plain")).toMatchObject({
      agentId: GENERIC_AGENTIS_AGENT_ID,
      workspaceId: GENERIC_AGENTIS_WORKSPACE_ID,
    })
  })
})
