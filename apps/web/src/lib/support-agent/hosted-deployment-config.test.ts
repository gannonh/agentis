import { describe, expect, test } from "vitest"

import {
  createHostedSupportAgentDeploymentConfig,
  supportAgentChatRequestFixture,
  type HostedSupportAgentDeploymentConfigInput,
} from "./index"

describe("hosted support-agent deployment config", () => {
  test("creates a browser-safe config for the selected support-agent template", () => {
    const config = createHostedSupportAgentDeploymentConfig({
      templateName: "Billing support",
      knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
    })

    expect(config).toEqual({
      template: {
        id: "agent_support_template",
        name: "Billing support",
      },
      runtime: {
        adapter: "flue-support-agent",
        requestContract: "SupportAgentChatRequest",
      },
      knowledge: {
        sourceIds: ["knowledge_product_docs"],
        contextReferences: [
          {
            knowledgeSourceId: "knowledge_product_docs",
            type: "local-documentation",
            path: "docs/knowledge/product-documentation-sample.md",
          },
        ],
      },
      deployment: {
        target: "cloudflare-preview",
        intent: "prepare-hosted-preview",
        credentials: "server-side",
      },
    })
  })

  test("requires at least one knowledge source", () => {
    expect(() =>
      createHostedSupportAgentDeploymentConfig({
        templateName: "Billing support",
        knowledgeSources: [],
      })
    ).toThrow("knowledgeSources must contain at least one entry")
  })

  test("omits provider credentials and deployment secrets from browser-facing config", () => {
    // The unsafeInput cast bypasses TypeScript to verify
    // createHostedSupportAgentDeploymentConfig strips sensitive runtime fields;
    // the string assertions guard the serialized browser-facing handoff.
    const unsafeInput = {
      templateName: "Billing support",
      knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
      provider: "openai",
      model: "gpt-test",
      apiKey: "sk-browser-secret",
      deploymentSecret: "cloudflare-runtime-secret",
    }
    const config = createHostedSupportAgentDeploymentConfig(
      unsafeInput as HostedSupportAgentDeploymentConfigInput
    )

    const serializedConfig = JSON.stringify(config)

    expect(serializedConfig).not.toContain("sk-browser-secret")
    expect(serializedConfig).not.toContain("cloudflare-runtime-secret")
    expect(serializedConfig).not.toContain("apiKey")
    expect(serializedConfig).not.toContain("deploymentSecret")
    expect(serializedConfig).not.toContain("provider")
    expect(serializedConfig).not.toContain("model")
  })
})
