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

  test("reports invalid when instance mode conflicts with namespace binding flag", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "instance",
      hasNamespaceBinding: true,
      hasInstanceBinding: true,
      instanceName: "support-agent-knowledge",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.invalidFields).toEqual(["bindingMode"])
    }
  })

  test("reports invalid when namespace mode has an empty namespace name", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "namespace",
      hasNamespaceBinding: true,
      namespace: "   ",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.invalidFields).toEqual(["namespace"])
    }
  })

  test("reports invalid when instance mode has no instance binding", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "instance",
      instanceName: "support-agent-knowledge",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.invalidFields).toEqual(["instanceName"])
    }
  })

  test("reports invalid when instance mode has an empty instance name", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      bindingMode: "instance",
      hasInstanceBinding: true,
      instanceName: "   ",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.invalidFields).toEqual(["instanceName"])
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

  test("returns configured diagnostics without invalid fields", () => {
    const diagnostic = createSupportAgentAiSearchConfigDiagnostic(
      resolveSupportAgentAiSearchConfig({
        bindingMode: "namespace",
        hasNamespaceBinding: true,
        namespace: "agentis-support-agent",
      })
    )

    expect(diagnostic).toMatchObject({
      state: "configured",
      bindingMode: "namespace",
      title: "AI Search configured",
    })
    expect(diagnostic).not.toHaveProperty("invalidFields")
  })

  test("infers instance binding mode from binding flags alone", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      hasInstanceBinding: true,
      instanceName: "support-agent-knowledge",
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "instance",
      instanceName: "support-agent-knowledge",
    })
  })

  test("infers namespace binding mode from binding flags alone", () => {
    const resolution = resolveSupportAgentAiSearchConfig({
      hasNamespaceBinding: true,
      namespace: "agentis-support-agent",
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "namespace",
      namespace: "agentis-support-agent",
    })
  })

  test("maps worker env instance name hint without binding object to invalid state", () => {
    const resolution = resolveSupportAgentAiSearchConfigFromWorkerEnv({
      SUPPORT_AGENT_AI_SEARCH_INSTANCE: "support-agent-knowledge",
    })

    expect(resolution.state).toBe("invalid")
    if (resolution.state === "invalid") {
      expect(resolution.error.invalidFields).toEqual(["instanceName"])
    }
  })

  test("maps worker env instance binding object to configured state", () => {
    const resolution = resolveSupportAgentAiSearchConfigFromWorkerEnv({
      SUPPORT_AGENT_AI_SEARCH_INSTANCE: {},
      SUPPORT_AGENT_AI_SEARCH_INSTANCE_NAME: "support-agent-knowledge",
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "instance",
      instanceName: "support-agent-knowledge",
    })
  })

  test("uses default namespace label when binding exists without namespace env", () => {
    const resolution = resolveSupportAgentAiSearchConfigFromWorkerEnv({
      SUPPORT_AGENT_AI_SEARCH: {},
    })

    expect(resolution).toMatchObject({
      state: "configured",
      bindingMode: "namespace",
      namespace: "default",
    })
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
