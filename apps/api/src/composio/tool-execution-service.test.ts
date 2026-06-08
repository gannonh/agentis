import { afterEach, describe, expect, it } from "vitest"
import { createComposioClient } from "./composio-client.js"
import { ToolExecutionService } from "./tool-execution-service.js"
import { createTestContext, type TestContext } from "../test/setup.js"

let ctx: TestContext | undefined

afterEach(() => {
  ctx?.cleanup()
  ctx = undefined
})

function createService() {
  ctx = createTestContext()
  ctx.repos.integrationToolkits.seedFeatured()
  const thread = ctx.repos.threads.create({
    title: "Composio preflight",
    model: "gpt-4o-mini",
    mode: "agent",
  })
  const service = new ToolExecutionService(
    ctx.repos,
    ctx.config,
    createComposioClient(ctx.config)
  )
  return { service, thread }
}

describe("ToolExecutionService.checkPreflightRemediation", () => {
  it("returns null when GitHub is connected and granted", () => {
    const { service, thread } = createService()
    const connection = ctx!.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })
    ctx!.repos.toolAccessGrants.create({
      scopeType: "thread",
      scopeId: thread.id,
      toolkitSlug: "github",
      connectionId: connection.id,
    })

    expect(
      service.checkPreflightRemediation("List my GitHub repositories", thread.id)
    ).toBeNull()
  })

  it("requires connection before grant", () => {
    const { service, thread } = createService()

    const error = service.checkPreflightRemediation(
      "List my GitHub repositories",
      thread.id
    )

    expect(error?.code).toBe("toolkit_not_connected")
    expect(error?.message).toContain("not connected")
  })

  it("requires grant when GitHub is connected", () => {
    const { service, thread } = createService()
    ctx!.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "connected",
      composioConnectedAccountId: "acct-github",
    })

    const error = service.checkPreflightRemediation(
      "List my GitHub repositories",
      thread.id
    )

    expect(error?.code).toBe("toolkit_not_granted")
    expect(error?.message).toContain("not granted")
  })

  it("blocks pending GitHub connections", () => {
    const { service, thread } = createService()
    ctx!.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "pending",
      composioConnectionRequestId: "req-github",
    })

    const error = service.checkPreflightRemediation(
      "List my GitHub repositories",
      thread.id
    )

    expect(error?.code).toBe("connection_pending")
    expect(error?.message).toContain("pending")
  })

  it("blocks expired GitHub connections", () => {
    const { service, thread } = createService()
    ctx!.repos.integrationConnections.create({
      toolkitSlug: "github",
      status: "expired",
      composioConnectedAccountId: "acct-github",
    })

    const error = service.checkPreflightRemediation(
      "List my GitHub repositories",
      thread.id
    )

    expect(error?.code).toBe("connection_expired")
    expect(error?.message).toContain("expired")
  })

  it("ignores prompts without explicit toolkit intent", () => {
    const { service, thread } = createService()

    expect(
      service.checkPreflightRemediation("Summarize this status update", thread.id)
    ).toBeNull()
  })
})
