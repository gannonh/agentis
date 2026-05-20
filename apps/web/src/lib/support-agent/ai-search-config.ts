export type SupportAgentAiSearchBindingMode = "namespace" | "instance" | "none"

export type SupportAgentAiSearchConfigInput = {
  bindingMode?: SupportAgentAiSearchBindingMode
  namespace?: string
  instanceName?: string
  hasNamespaceBinding?: boolean
  hasInstanceBinding?: boolean
}

export type SupportAgentAiSearchConfigState = "configured" | "missing" | "invalid"

export type SupportAgentAiSearchConfigErrorCode =
  | "SUPPORT_AGENT_AI_SEARCH_CONFIG_MISSING"
  | "SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID"

export type SupportAgentAiSearchConfigError = {
  code: SupportAgentAiSearchConfigErrorCode
  message: string
  invalidFields?: Array<"bindingMode" | "namespace" | "instanceName">
}

export type SupportAgentAiSearchConfigResolution =
  | {
      state: "configured"
      bindingMode: Exclude<SupportAgentAiSearchBindingMode, "none">
      namespace?: string
      instanceName?: string
    }
  | {
      state: "missing"
      error: SupportAgentAiSearchConfigError
    }
  | {
      state: "invalid"
      error: SupportAgentAiSearchConfigError
    }

export type PublicSupportAgentAiSearchConfigStatus = {
  state: SupportAgentAiSearchConfigState
  bindingMode: SupportAgentAiSearchBindingMode
  runtimeCode?: SupportAgentAiSearchConfigErrorCode
  title: string
  userMessage: string
  maintainerMessage: string
}

export type SupportAgentAiSearchConfigDiagnostic = PublicSupportAgentAiSearchConfigStatus & {
  invalidFields?: Array<"bindingMode" | "namespace" | "instanceName">
}

const PUBLIC_STATUS: Record<
  SupportAgentAiSearchConfigState,
  Pick<
    PublicSupportAgentAiSearchConfigStatus,
    "title" | "userMessage" | "maintainerMessage"
  >
> = {
  configured: {
    title: "AI Search configured",
    userMessage: "Knowledge search is configured for this deployment.",
    maintainerMessage:
      "Run the AI Search configuration check before enabling grounded retrieval in preview.",
  },
  missing: {
    title: "AI Search not configured",
    userMessage: "Knowledge search is not configured for this deployment yet.",
    maintainerMessage:
      "Add the Cloudflare AI Search Worker binding and namespace or instance settings in wrangler.toml, then redeploy or restart local Wrangler dev.",
  },
  invalid: {
    title: "AI Search configuration invalid",
    userMessage: "Knowledge search configuration needs maintainer attention.",
    maintainerMessage:
      "Fix the AI Search binding mode and namespace or instance settings, then rerun the AI Search configuration check.",
  },
}

export function resolveSupportAgentAiSearchConfig(
  input: SupportAgentAiSearchConfigInput = {}
): SupportAgentAiSearchConfigResolution {
  const bindingMode = inferBindingMode(input)
  const namespace = input.namespace?.trim()
  const instanceName = input.instanceName?.trim()

  if (bindingMode === "none") {
    return {
      state: "missing",
      error: {
        code: "SUPPORT_AGENT_AI_SEARCH_CONFIG_MISSING",
        message:
          "Cloudflare AI Search binding is not configured for the support-agent runtime.",
      },
    }
  }

  if (bindingMode === "namespace" && input.hasInstanceBinding) {
    return invalidResolution({
      message:
        "Cloudflare AI Search cannot use namespace and instance bindings together.",
      invalidFields: ["bindingMode"],
    })
  }

  if (bindingMode === "instance" && input.hasNamespaceBinding) {
    return invalidResolution({
      message:
        "Cloudflare AI Search cannot use namespace and instance bindings together.",
      invalidFields: ["bindingMode"],
    })
  }

  if (bindingMode === "namespace") {
    if (!input.hasNamespaceBinding) {
      return invalidResolution({
        message:
          "Cloudflare AI Search namespace binding is required when namespace mode is selected.",
        invalidFields: ["namespace"],
      })
    }

    if (!namespace) {
      return invalidResolution({
        message: "Cloudflare AI Search namespace name is required.",
        invalidFields: ["namespace"],
      })
    }

    return {
      state: "configured",
      bindingMode,
      namespace,
    }
  }

  if (!input.hasInstanceBinding) {
    return invalidResolution({
      message:
        "Cloudflare AI Search instance binding is required when instance mode is selected.",
      invalidFields: ["instanceName"],
    })
  }

  if (!instanceName) {
    return invalidResolution({
      message: "Cloudflare AI Search instance name is required.",
      invalidFields: ["instanceName"],
    })
  }

  return {
    state: "configured",
    bindingMode,
    instanceName,
  }
}

export function toPublicSupportAgentAiSearchStatus(
  resolution: SupportAgentAiSearchConfigResolution
): PublicSupportAgentAiSearchConfigStatus {
  const bindingMode =
    resolution.state === "configured" ? resolution.bindingMode : inferBindingMode({})

  if (resolution.state === "configured") {
    return {
      state: resolution.state,
      bindingMode,
      title: PUBLIC_STATUS.configured.title,
      userMessage: PUBLIC_STATUS.configured.userMessage,
      maintainerMessage: PUBLIC_STATUS.configured.maintainerMessage,
    }
  }

  return {
    state: resolution.state,
    bindingMode,
    runtimeCode: resolution.error.code,
    title: PUBLIC_STATUS[resolution.state].title,
    userMessage: PUBLIC_STATUS[resolution.state].userMessage,
    maintainerMessage: PUBLIC_STATUS[resolution.state].maintainerMessage,
  }
}

export function createSupportAgentAiSearchConfigDiagnostic(
  resolution: SupportAgentAiSearchConfigResolution
): SupportAgentAiSearchConfigDiagnostic {
  const status = toPublicSupportAgentAiSearchStatus(resolution)

  if (resolution.state === "configured") {
    return status
  }

  return {
    ...status,
    invalidFields: resolution.error.invalidFields,
  }
}

export function resolveSupportAgentAiSearchConfigFromWorkerEnv(env: {
  SUPPORT_AGENT_AI_SEARCH?: unknown
  SUPPORT_AGENT_AI_SEARCH_INSTANCE?: unknown
  SUPPORT_AGENT_AI_SEARCH_NAMESPACE?: string
  SUPPORT_AGENT_AI_SEARCH_INSTANCE_NAME?: string
}): SupportAgentAiSearchConfigResolution {
  const hasNamespaceBinding = Boolean(env.SUPPORT_AGENT_AI_SEARCH)
  const hasInstanceBinding =
    typeof env.SUPPORT_AGENT_AI_SEARCH_INSTANCE === "object" &&
    env.SUPPORT_AGENT_AI_SEARCH_INSTANCE !== null
  const namespaceFromEnv = env.SUPPORT_AGENT_AI_SEARCH_NAMESPACE?.trim()
  const instanceNameFromEnv =
    typeof env.SUPPORT_AGENT_AI_SEARCH_INSTANCE === "string"
      ? env.SUPPORT_AGENT_AI_SEARCH_INSTANCE.trim()
      : env.SUPPORT_AGENT_AI_SEARCH_INSTANCE_NAME?.trim()

  if (hasNamespaceBinding) {
    return resolveSupportAgentAiSearchConfig({
      bindingMode: "namespace",
      hasNamespaceBinding: true,
      hasInstanceBinding,
      namespace: namespaceFromEnv ?? "default",
    })
  }

  if (hasInstanceBinding) {
    return resolveSupportAgentAiSearchConfig({
      bindingMode: "instance",
      hasInstanceBinding: true,
      instanceName: instanceNameFromEnv,
    })
  }

  if (namespaceFromEnv || instanceNameFromEnv) {
    return resolveSupportAgentAiSearchConfig({
      bindingMode: namespaceFromEnv ? "namespace" : "instance",
      hasNamespaceBinding: false,
      hasInstanceBinding: false,
      namespace: namespaceFromEnv,
      instanceName: instanceNameFromEnv,
    })
  }

  return resolveSupportAgentAiSearchConfig()
}

function inferBindingMode(
  input: SupportAgentAiSearchConfigInput
): SupportAgentAiSearchBindingMode {
  if (input.bindingMode) {
    return input.bindingMode
  }

  if (input.hasInstanceBinding) {
    return "instance"
  }

  if (input.hasNamespaceBinding) {
    return "namespace"
  }

  return "none"
}

function invalidResolution({
  message,
  invalidFields,
}: {
  message: string
  invalidFields?: SupportAgentAiSearchConfigError["invalidFields"]
}): Extract<SupportAgentAiSearchConfigResolution, { state: "invalid" }> {
  return {
    state: "invalid",
    error: {
      code: "SUPPORT_AGENT_AI_SEARCH_CONFIG_INVALID",
      message,
      invalidFields,
    },
  }
}
