import { describe, expect, test } from "vitest"

import {
  createCloudflarePreviewDeploymentRequest,
  createHostedSupportAgentDeploymentConfig,
  supportAgentChatRequestFixture,
  type CloudflarePreviewDeploymentRequestInput,
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

  test("creates a Cloudflare preview deployment request from public config and server-side secret references", () => {
    const config = createHostedSupportAgentDeploymentConfig({
      templateName: "Billing support",
      knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
    })

    const request = createCloudflarePreviewDeploymentRequest({
      config,
      deploymentId: "deployment_billing_support_preview",
      publicName: "Billing support preview",
      secretReferences: {
        providerApiKeyBinding: "SUPPORT_AGENT_OPENAI_API_KEY",
        deploymentSecretBinding: "SUPPORT_AGENT_DEPLOYMENT_SECRET",
      },
    })

    expect(request).toEqual({
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
    })
  })

  test("keeps secret values and runtime internals out of the deployment request", () => {
    const config = createHostedSupportAgentDeploymentConfig({
      templateName: "Billing support",
      knowledgeSources: supportAgentChatRequestFixture.knowledgeSources,
    })

    const request = createCloudflarePreviewDeploymentRequest({
      config,
      deploymentId: "deployment_billing_support_preview",
      publicName: "Billing support preview",
      secretReferences: {
        providerApiKeyBinding: "SUPPORT_AGENT_OPENAI_API_KEY",
        deploymentSecretBinding: "SUPPORT_AGENT_DEPLOYMENT_SECRET",
      },
      apiKey: "sk-server-secret",
      deploymentSecret: "raw-cloudflare-secret",
      runtimePath: "/tmp/agentis/runtime.ts",
      adapterInternals: { workerSource: "internal" },
    } as CloudflarePreviewDeploymentRequestInput)

    const serializedRequest = JSON.stringify(request)

    expect(serializedRequest).not.toContain("sk-server-secret")
    expect(serializedRequest).not.toContain("raw-cloudflare-secret")
    expect(serializedRequest).not.toContain("runtimePath")
    expect(serializedRequest).not.toContain("adapterInternals")
    expect(serializedRequest).not.toContain("/tmp/agentis/runtime.ts")
  })
})
