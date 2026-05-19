import { describe, expect, test } from "vitest"

import { supportAgentChatRequestFixture } from "./chat-fixtures"
import {
  resolveSupportAgentDeploymentScope,
  supportAgentBillingDeploymentId,
  supportAgentDemoDeploymentId,
} from "./knowledge-deployment-scope"

describe("support agent deployment scope", () => {
  test("defaults to the demo deployment when request omits deploymentId", () => {
    expect(resolveSupportAgentDeploymentScope(supportAgentChatRequestFixture)).toEqual({
      organizationId: "org_agentis_demo",
      deploymentId: supportAgentDemoDeploymentId,
      agentId: supportAgentChatRequestFixture.agentId,
    })
  })

  test("uses deploymentId from the chat request when provided", () => {
    expect(
      resolveSupportAgentDeploymentScope({
        ...supportAgentChatRequestFixture,
        deploymentId: supportAgentBillingDeploymentId,
      })
    ).toMatchObject({
      deploymentId: supportAgentBillingDeploymentId,
    })
  })
})
