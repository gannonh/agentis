import { describe, expect, test } from "vitest"

import {
  createHostedSupportAgentDeploymentFailure,
  createHostedSupportAgentDeploymentStatus,
} from "./index"

describe("hosted support-agent deployment status contract", () => {
  test("maps configured, deploying, and deployed states to visible browser-safe status", () => {
    expect(
      createHostedSupportAgentDeploymentStatus({
        state: "configured",
        deployment: {
          id: "deployment_billing_support_preview",
          publicName: "Billing support preview",
        },
      })
    ).toEqual({
      state: "configured",
      title: "Deployment configured",
      userMessage: "The support agent is configured and ready to deploy.",
      maintainerMessage:
        "Run the Cloudflare preview deployment command when server-side bindings are set.",
      retryable: true,
      deployment: {
        id: "deployment_billing_support_preview",
        publicName: "Billing support preview",
      },
    })

    expect(
      createHostedSupportAgentDeploymentStatus({
        state: "deploying",
        deployment: {
          id: "deployment_billing_support_preview",
          publicName: "Billing support preview",
        },
      })
    ).toMatchObject({
      state: "deploying",
      title: "Deployment in progress",
      userMessage: "The hosted support agent is deploying.",
      maintainerMessage:
        "Wait for the Cloudflare preview deploy to finish, then inspect status again.",
      retryable: true,
    })

    expect(
      createHostedSupportAgentDeploymentStatus({
        state: "deployed",
        deployment: {
          id: "deployment_billing_support_preview",
          publicName: "Billing support preview",
          chatUrl: "https://support-agent-preview.example.com/support-agent/chat",
        },
      })
    ).toMatchObject({
      state: "deployed",
      title: "Deployment ready",
      userMessage: "The hosted support agent is ready to chat.",
      maintainerMessage:
        "Open the hosted chat URL and run the hosted acceptance script.",
      retryable: false,
      deployment: {
        chatUrl: "https://support-agent-preview.example.com/support-agent/chat",
      },
    })
  })

  test("maps actionable deployment failures without leaking secrets or runtime internals", () => {
    const failure = createHostedSupportAgentDeploymentFailure({
      code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
      cause:
        "Missing SUPPORT_AGENT_OPENAI_API_KEY with value sk-live-secret from /private/runtime/worker.ts stacktrace",
    })
    const status = createHostedSupportAgentDeploymentStatus({
      state: "failed",
      deployment: {
        id: "deployment_billing_support_preview",
        publicName: "Billing support preview",
      },
      failure,
    })

    expect(status).toEqual({
      state: "failed",
      title: "Deployment failed",
      userMessage: "The hosted support agent could not be deployed.",
      maintainerMessage:
        "Set the required server-side support-agent secret bindings, then rerun the Cloudflare preview deployment command.",
      retryable: false,
      deployment: {
        id: "deployment_billing_support_preview",
        publicName: "Billing support preview",
      },
      failure: {
        code: "HOSTED_DEPLOYMENT_SECRET_MISSING",
        title: "Server-side secret binding missing",
        userMessage: "The hosted support agent could not be deployed.",
        maintainerMessage:
          "Set the required server-side support-agent secret bindings, then rerun the Cloudflare preview deployment command.",
        retryable: false,
      },
    })

    const serialized = JSON.stringify(status)

    expect(serialized).not.toContain("sk-live-secret")
    expect(serialized).not.toContain("/private/runtime")
    expect(serialized).not.toContain("stacktrace")
    expect(serialized).not.toContain("OPENAI_API_KEY")
  })

  test("uses default browser-safe messages when failure details are absent", () => {
    expect(
      createHostedSupportAgentDeploymentStatus({ state: "failed" })
    ).toMatchObject({
      state: "failed",
      title: "Deployment failed",
      userMessage: "The hosted support agent could not be deployed.",
      maintainerMessage:
        "Inspect the Cloudflare preview deployment output, then retry deployment.",
      retryable: true,
      failure: undefined,
    })

    expect(
      createHostedSupportAgentDeploymentStatus({ state: "unavailable" })
    ).toMatchObject({
      state: "unavailable",
      title: "Deployment status unavailable",
      userMessage: "The hosted support agent status could not be inspected.",
      maintainerMessage:
        "Check the hosted status endpoint and Cloudflare preview deployment URL, then retry status inspection.",
      retryable: true,
      failure: undefined,
    })
  })

  test("maps unavailable status inspection to a retryable browser-safe state", () => {
    const status = createHostedSupportAgentDeploymentStatus({
      state: "unavailable",
      failure: createHostedSupportAgentDeploymentFailure({
        code: "HOSTED_DEPLOYMENT_STATUS_UNAVAILABLE",
        cause: "GET /internal/status failed with raw Cloudflare worker stack",
      }),
    })

    expect(status).toEqual({
      state: "unavailable",
      title: "Deployment status unavailable",
      userMessage: "The hosted support agent status could not be inspected.",
      maintainerMessage:
        "Check the hosted status endpoint and Cloudflare preview deployment URL, then retry status inspection.",
      retryable: true,
      failure: {
        code: "HOSTED_DEPLOYMENT_STATUS_UNAVAILABLE",
        title: "Status endpoint unavailable",
        userMessage: "The hosted support agent status could not be inspected.",
        maintainerMessage:
          "Check the hosted status endpoint and Cloudflare preview deployment URL, then retry status inspection.",
        retryable: true,
      },
    })

    expect(JSON.stringify(status)).not.toContain("Cloudflare worker stack")
  })
})
