import { describe, expect, test } from "vitest"

import {
  createSupportAgentAiSearchConfigDiagnostic,
  resolveSupportAgentAiSearchConfig,
  resolveSupportAgentAiSearchConfigFromWorkerEnv,
  toPublicSupportAgentAiSearchStatus,
} from "./ai-search-config"

describe("support-agent AI Search config", () => {
  test("reports missing configuration when no binding is present", () => {
    const resolution = resolveSupportAgentAiSearchConfig()

    expect(resolution).toEqual({
      state: "missing",
      error: {
        code: "SUPPORT_AGENT_AI_SEARCH_CONFIG_MISSING",
        message:
          "Cloudflare AI Search binding is not configured for the support-agent runtime.",
      },
    })
  })

  test("reports configured namespace mode when binding and namespace are present", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "namespace",
      hasNamespaceBinding: true,
      namespace: "agentis-support-agent",
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "namespace",
      namespace: "agentis-support-agent",
    })
  })

  test("reports configured instance mode when binding and instance name are present", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "instance",
      hasInstanceBinding: true,
      instanceName: "support-agent-knowledge",
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "instance",
      instanceName: "support-agent-knowledge",
    })
  })

  test("reports invalid configuration when namespace binding is absent", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "namespace",
      namespace: "agentis-support-agent",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.code).toBe("SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID")
      expect(resolution.error.invalidFields).toEqual(["namespace"])
    }
  })

  test("reports invalid configuration when both binding modes are declared", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "namespace",
      hasNamespaceBinding: true,
      hasInstanceBinding: true,
      namespace: "agentis-support-agent",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.invalidFields).toEqual(["bindingMode"])
    }
  })

  test("maps worker env namespace binding to configured state", () => {
    const resolution = resolveSupportAgentAiSearchConfigFromWorkerEnv({
      SUPPORT_AGENT_AI_SEARCH: {},
      SUPPORT_AGENT_AI_SEARCH_NAMESPACE: "agentis-support-agent",
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "namespace",
      namespace: "agentis-support-agent",
    })
  })

  test("maps worker env vars without bindings to invalid state", () => {
    const resolution = resolveSupportAgentAiSearchConfigFromWorkerEnv({
      SUPPORT_AGENT_AI_SEARCH_NAMESPACE: "agentis-support-agent",
    })

    expect(resolution.state).toBe("invalid")
  })

  test("exposes browser-safe public status without secrets or binding internals", () => {
    const status = toPublicSupportAgentAiSearchStatus(
      resolveSupportAgentAiSearchConfig({
        bindingMode: "namespace",
        hasNamespaceBinding: true,
        namespace: "agentis-support-agent",
      })
    )
    const serialized = JSON.stringify(status)

    expect(status).toMatchObject({
      state: "configured",
      bindingMode: "namespace",
      title: "AI Search configured",
    })
    expect(serialized).not.toContain("agentis-support-agent")
    expect(serialized).not.toContain("sk-")
    expect(serialized).not.toContain("SUPPORT_AGENT_AI_SEARCH")
  })

  test("keeps invalid-field diagnostics server-side only", () => {
    const diagnostic = createSupportAgentAiSearchConfigDiagnostic(
      resolveSupportAgentAiSearchConfig({
        bindingMode: "namespace",
        namespace: "agentis-support-agent",
      })
    )
    const publicStatus = toPublicSupportAgentAiSearchStatus(
      resolveSupportAgentAiSearchConfig({
        bindingMode: "namespace",
        namespace: "agentis-support-agent",
      })
    )

    expect(diagnostic.invalidFields).toEqual(["namespace"])
    expect(publicStatus).not.toHaveProperty("invalidFields")
  })
})
