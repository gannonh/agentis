import { afterEach, describe, expect, it } from "vitest"
import { agentConfigurationVersions, toolAccessGrants } from "../db/schema.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("agent repository", () => {
  it("creates agents with an initial configuration version and stable roster ordering", () => {
    ctx = createTestContext()

    const zeta = ctx.repos.agents.create({
      name: "Zeta Agent",
      description: "Last alphabetically",
      systemPrompt: "Help with Zeta work.",
      model: "gpt-4o-mini",
    })
    const alpha = ctx.repos.agents.create({
      name: "Alpha Agent",
      systemPrompt: "Help with Alpha work.",
      model: "gpt-4.1-mini",
    })

    const versions = ctx.repos.agents.listConfigurationVersions(alpha.id)
    expect(versions).toHaveLength(1)
    expect(versions[0]).toMatchObject({
      agentId: alpha.id,
      version: 1,
      systemPrompt: "Help with Alpha work.",
      model: "gpt-4.1-mini",
    })
    expect(alpha.currentConfigurationVersion.id).toBe(versions[0]?.id)

    const agents = ctx.repos.agents.list()
    expect(agents.map((agent) => agent.id)).toEqual([alpha.id, zeta.id])
    expect(agents[0]?.toolGrantCount).toBe(0)
  })

  it("uses the newest configuration version as the current version", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })

    ctx.db
      .insert(agentConfigurationVersions)
      .values({
        id: "agent_version_latest",
        agentId: agent.id,
        version: 2,
        systemPrompt: "Answer with citations and source quality notes.",
        model: "gpt-4.1-mini",
        createdAt: "2026-05-23T22:00:00.000Z",
      })
      .run()

    const currentVersion = ctx.repos.agents.getById(
      agent.id
    )?.currentConfigurationVersion
    expect(currentVersion).toMatchObject({
      version: 2,
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
    })
    expect(currentVersion?.nativeTools).toEqual(["documents", "webSearch"])
    expect(
      ctx.repos.agents.list()[0]?.currentConfigurationVersion.version
    ).toBe(2)
  })

  it("updates identity fields without creating a configuration version", () => {
    ctx = createTestContext()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      description: "Finds sources",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })

    const updated = ctx.repos.agents.update(agent.id, {
      name: "Research Assistant",
      description: null,
    })

    expect(updated).toMatchObject({
      id: agent.id,
      name: "Research Assistant",
      description: undefined,
    })
    expect(ctx.repos.agents.listConfigurationVersions(agent.id)).toHaveLength(1)
  })

  it("updates prompt, model, cost limit, and grants in one operation", () => {
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
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
        maxCostPerRunUsd: null,
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )

    const updated = ctx.repos.agents.update(agent.id, {
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
      maxCostPerRunUsd: 1.5,
      toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
    })

    expect(updated).not.toBeNull()
    expect(updated!.currentConfigurationVersion).toMatchObject({
      version: 2,
      systemPrompt: "Answer with citations and source quality notes.",
      model: "gpt-4.1-mini",
      maxCostPerRunUsd: 1.5,
    })
    expect(updated!.toolGrantCount).toBe(1)
    expect(ctx.repos.agents.listConfigurationVersions(agent.id)).toHaveLength(2)
    expect(
      ctx.repos.toolAccessGrants
        .listByScope("agent", agent.id)
        .map((grant) => grant.toolkitSlug)
    ).toEqual(["slack"])
  })

  it("reloads replaced agent tool grants in stable toolkit order", () => {
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
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })

    ctx.repos.agents.update(agent.id, {
      toolGrants: [
        { toolkitSlug: "slack", connectionId: slack.id },
        { toolkitSlug: "github", connectionId: github.id },
      ],
    })

    expect(
      ctx.repos.toolAccessGrants
        .listByScope("agent", agent.id)
        .map((grant) => grant.toolkitSlug)
    ).toEqual(["github", "slack"])
  })

  it("preserves existing tool grant rows when grant edits are unchanged", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const github = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )
    const before = ctx.repos.toolAccessGrants.listByScope("agent", agent.id)[0]

    ctx.repos.agents.update(agent.id, {
      toolGrants: [{ toolkitSlug: "github", connectionId: github.id }],
    })

    const after = ctx.repos.toolAccessGrants.listByScope("agent", agent.id)[0]
    expect(after).toMatchObject({
      id: before?.id,
      createdAt: before?.createdAt,
    })
    expect(ctx.repos.agents.listConfigurationVersions(agent.id)).toHaveLength(1)
  })

  it("creates configuration versions for tool grant-only edits", () => {
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
    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: github.id }]
    )

    const updated = ctx.repos.agents.update(agent.id, {
      toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
    })!

    expect(updated.currentConfigurationVersion).toMatchObject({
      version: 2,
    })
    expect(
      ctx.repos.agents.getCurrentConfigurationSnapshot(agent.id)
    ).toMatchObject({
      version: 2,
      toolGrants: [{ toolkitSlug: "slack", connectionId: slack.id }],
    })
    expect(ctx.repos.agents.listConfigurationVersions(agent.id)).toMatchObject([
      { version: 1 },
      { version: 2 },
    ])
    expect(
      ctx.repos.toolAccessGrants
        .listByScope("agent", agent.id)
        .map((grant) => grant.toolkitSlug)
    ).toEqual(["slack"])
  })

  it("creates agents and tool grants in one repository operation", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })

    const agent = ctx.repos.agents.createWithGrants(
      {
        name: "Research Agent",
        systemPrompt: "Answer with citations.",
        model: "gpt-4o-mini",
      },
      [{ toolkitSlug: "github", connectionId: connection.id }]
    )

    expect(agent.toolGrantCount).toBe(1)
    expect(
      ctx.repos.toolAccessGrants.listByScope("agent", agent.id)
    ).toHaveLength(1)
  })

  it("rolls back agent creation when a grant insert fails", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })

    const agents = ctx.repos.agents

    expect(() =>
      agents.createWithGrants(
        {
          name: "Research Agent",
          systemPrompt: "Answer with citations.",
          model: "gpt-4o-mini",
        },
        [
          { toolkitSlug: "github", connectionId: connection.id },
          { toolkitSlug: "github", connectionId: connection.id },
        ]
      )
    ).toThrow()

    expect(ctx.repos.agents.list()).toHaveLength(0)
    expect(ctx.db.select().from(toolAccessGrants).all()).toHaveLength(0)
  })

  it("stores per-agent Composio tool grants", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const agent = ctx.repos.agents.create({
      name: "Research Agent",
      systemPrompt: "Answer with citations.",
      model: "gpt-4o-mini",
    })
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })

    const grant = ctx.repos.toolAccessGrants.create({
      scopeType: "agent",
      scopeId: agent.id,
      toolkitSlug: "github",
      connectionId: connection.id,
    })
    ctx.repos.toolAccessGrants.create({
      scopeType: "thread",
      scopeId: agent.id,
      toolkitSlug: "github",
      connectionId: connection.id,
    })

    const grants = ctx.repos.toolAccessGrants.listByScope("agent", agent.id)
    expect(grants).toHaveLength(1)
    expect(grants[0]?.id).toBe(grant.id)
    expect(ctx.repos.agents.getById(agent.id)?.toolGrantCount).toBe(1)
  })
})
