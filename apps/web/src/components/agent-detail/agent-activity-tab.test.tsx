import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AgentActivityTab } from "./agent-edit-tabs"

describe("AgentActivityTab invocation labels", () => {
  it("labels webhook-triggered threads", () => {
    render(
      <AgentActivityTab
        information={{
          recentThreads: [
            {
              id: "thread_webhook",
              title: "Webhook run",
              documentCount: 0,
              invocationSource: {
                type: "webhook",
                webhookId: "webhook_1",
                webhookName: "Inbound alerts",
                deliveryId: "delivery_1",
              },
            },
          ],
          library: { items: [], totalCount: 0 },
          memories: { agent: [], global: [] },
          evaluations: [],
          hasEnabledSchedules: false,
          hasEnabledWebhooks: true,
        }}
      />
    )

    expect(screen.getByText("Webhook: Inbound alerts")).toBeInTheDocument()
  })
})
