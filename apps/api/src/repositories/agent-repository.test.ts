import { afterEach, describe, expect, it } from "vitest"
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

    const grants = ctx.repos.toolAccessGrants.listByScope("agent", agent.id)
    expect(grants).toHaveLength(1)
    expect(grants[0]?.id).toBe(grant.id)
    expect(ctx.repos.agents.getById(agent.id)?.toolGrantCount).toBe(1)
  })
})
