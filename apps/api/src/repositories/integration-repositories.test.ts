import { afterEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "../test/setup.js"
import { FEATURED_TOOLKIT_SLUGS } from "./integration-seeds.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

describe("integration repositories", () => {
  it("seeds featured toolkits idempotently", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    ctx.repos.integrationToolkits.seedFeatured()

    const toolkits = ctx.repos.integrationToolkits.listFeatured()
    expect(toolkits.map((t) => t.slug).sort()).toEqual(
      [...FEATURED_TOOLKIT_SLUGS].sort()
    )
  })

  it("persists connection status across repository reads", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()

    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "pending",
      composioConnectionRequestId: "req-1",
    })

    const updated = ctx.repos.integrationConnections.update(connection.id, {
      status: "connected",
      composioConnectedAccountId: "acct-1",
      accountLabel: "octocat",
      scopes: ["repo"],
    })

    expect(updated?.status).toBe("connected")
    expect(updated?.composioConnectedAccountId).toBe("acct-1")

    const listed = ctx.repos.integrationConnections.listByUserId(
      ctx.config.composioUserId
    )
    expect(listed).toHaveLength(1)
    expect(listed[0]?.accountLabel).toBe("octocat")
  })

  it("creates and lists thread tool grants", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const thread = ctx.repos.threads.create({
      title: "Grant test",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })

    const grant = ctx.repos.toolAccessGrants.create({
      scopeType: "thread",
      scopeId: thread.id,
      toolkitSlug: "github",
      connectionId: connection.id,
    })

    const grants = ctx.repos.toolAccessGrants.listByScope("thread", thread.id)
    expect(grants).toHaveLength(1)
    expect(grants[0]?.id).toBe(grant.id)

    const removed = ctx.repos.toolAccessGrants.delete(grant.id)
    expect(removed).toBe(true)
    expect(
      ctx.repos.toolAccessGrants.listByScope("thread", thread.id)
    ).toHaveLength(0)
  })

  it("deletes grants before removing a connection", () => {
    ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    const thread = ctx.repos.threads.create({
      title: "Reset test",
      model: "gpt-4o-mini",
      mode: "agent",
    })
    const connection = ctx.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    ctx.repos.toolAccessGrants.create({
      scopeType: "thread",
      scopeId: thread.id,
      toolkitSlug: "github",
      connectionId: connection.id,
    })

    const deleted = ctx.repos.integrationConnections.deleteByToolkitSlug("github")
    expect(deleted).toBe(true)
    expect(
      ctx.repos.toolAccessGrants.listByScope("thread", thread.id)
    ).toHaveLength(0)
  })
})
