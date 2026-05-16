import { describe, expect, test } from "vitest"

import {
  createHostedSupportAgentDeploymentConfig,
  createSupportAgentCloudflarePreviewDeployPlan,
  supportAgentChatRequestFixture,
  type SupportAgentCloudflarePreviewDeployPlanInput,
} from "./index"

function createInput(
  overrides: Partial<SupportAgentCloudflarePreviewDeployPlanInput> = {}
): SupportAgentCloudflarePreviewDeployPlanInput {
  return {
    config: createHostedSupportAgentDeploymentConfig({
      templateName: "Billing support",
      knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
    }),
    configSource: "support-agent-hosted-config.json",
    deploymentId: "deployment_billing_support_preview",
    publicName: "Billing support preview",
    secretReferences: {
      providerApiKeyBinding: "SUPPORT_AGENT_OPENAI_API_KEY",
      deploymentSecretBinding: "SUPPORT_AGENT_DEPLOYMENT_SECRET",
    },
    ...overrides,
  }
}

describe("support-agent Cloudflare preview deploy plan", () => {
  test("creates a repeatable preview deploy command from hosted config", () => {
    const plan = createSupportAgentCloudflarePreviewDeployPlan(createInput())

    expect(plan).toEqual({
      command: "pnpm --filter web support-agent:deploy:preview -- --config support-agent-hosted-config.json",
      request: {
        command: {
          package: "web",
          script: "support-agent:deploy:preview",
        },
        target: {
          platform: "cloudflare",
          environment: "preview",
        },
        deployment: {
          id: "deployment_billing_support_preview",
          publicName: "Billing support preview",
          templateId: "agent_support_template",
          templateName: "Billing support",
        },
        runtime: {
          adapter: "flue-support-agent",
          requestContract: "SupportAgentChatRequest",
          credentials: "server-side",
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
        secrets: {
          providerApiKeyBinding: "SUPPORT_AGENT_OPENAI_API_KEY",
          deploymentSecretBinding: "SUPPORT_AGENT_DEPLOYMENT_SECRET",
        },
      },
      wrangler: {
        command: "wrangler deploy --env preview",
        requiredSecretBindings: [
          "SUPPORT_AGENT_OPENAI_API_KEY",
          "SUPPORT_AGENT_DEPLOYMENT_SECRET",
        ],
      },
    })
  })

  test("fails before deployment when hosted config is missing", () => {
    expect(() =>
      createSupportAgentCloudflarePreviewDeployPlan(
        createInput({ config: undefined })
      )
    ).toThrow("hosted deployment config is required")
  })

  test("fails before deployment when server-side secret references are missing", () => {
    expect(() =>
      createSupportAgentCloudflarePreviewDeployPlan(
        createInput({
          secretReferences: {
            providerApiKeyBinding: "",
            deploymentSecretBinding: "SUPPORT_AGENT_DEPLOYMENT_SECRET",
          },
        })
      )
    ).toThrow("provider API key secret reference is required")

    expect(() =>
      createSupportAgentCloudflarePreviewDeployPlan(
        createInput({
          secretReferences: {
            providerApiKeyBinding: "SUPPORT_AGENT_OPENAI_API_KEY",
            deploymentSecretBinding: "",
          },
        })
      )
    ).toThrow("deployment secret reference is required")
  })

  test("does not serialize secret values or browser credentials", () => {
    const plan = createSupportAgentCloudflarePreviewDeployPlan({
      ...createInput(),
      apiKey: "sk-server-secret",
      deploymentSecret: "raw-cloudflare-secret",
    } as SupportAgentCloudflarePreviewDeployPlanInput)

    const serializedPlan = JSON.stringify(plan)

    expect(serializedPlan).not.toContain("sk-server-secret")
    expect(serializedPlan).not.toContain("raw-cloudflare-secret")
    expect(serializedPlan).not.toContain("apiKey")
    expect(serializedPlan).not.toContain('"deploymentSecret":"')
  })
})
