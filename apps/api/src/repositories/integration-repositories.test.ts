import { describe, expect, it } from "vitest"
import { createTestContext } from "../test/setup.js"
import { FEATURED_TOOLKIT_SLUGS } from "./integration-seeds.js"

describe("integration repositories", () => {
  it("seeds featured toolkits idempotently", () => {
    const ctx = createTestContext()
    ctx.repos.integrationToolkits.seedFeatured()
    ctx.repos.integrationToolkits.seedFeatured()

    const toolkits = ctx.repos.integrationToolkits.listFeatured()
    expect(toolkits.map((t) => t.slug).sort()).toEqual(
      [...FEATURED_TOOLKIT_SLUGS].sort()
    )
    ctx.cleanup()
  })

  it("persists connection status across repository reads", () => {
    const ctx = createTestContext()
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
    ctx.cleanup()
  })

  it("creates and lists thread tool grants", () => {
    const ctx = createTestContext()
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
    ctx.cleanup()
  })
})
