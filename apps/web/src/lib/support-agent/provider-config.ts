export type SupportAgentProviderConfigInput = {
  provider?: string
  model?: string
  apiKey?: string
}

export type SupportAgentProviderConfig = {
  provider: string
  model: string
  apiKey: string
}

export type PublicSupportAgentProviderConfig = {
  provider: string
  model: string
  hasApiKey: boolean
}

export type SupportAgentProviderConfigError = {
  code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING"
  message: string
  missingFields: Array<keyof SupportAgentProviderConfig>
}

export type SupportAgentProviderConfigResult =
  | {
      ok: true
      config: SupportAgentProviderConfig
    }
  | {
      ok: false
      error: SupportAgentProviderConfigError
    }

export function resolveSupportAgentProviderConfig(
  input: SupportAgentProviderConfigInput
): SupportAgentProviderConfigResult {
  const provider = input.provider?.trim()
  const model = input.model?.trim()
  const apiKey = input.apiKey?.trim()
  const missingFields: Array<keyof SupportAgentProviderConfig> = []

  if (!provider) {
    missingFields.push("provider")
  }
  if (!model) {
    missingFields.push("model")
  }
  if (!apiKey) {
    missingFields.push("apiKey")
  }

  if (!provider || !model || !apiKey) {
    return {
      ok: false,
      error: {
        code: "SUPPORT_AGENT_PROVIDER_CONFIG_MISSING",
        message: "Support agent provider config requires provider, model, and API key.",
        missingFields,
      },
    }
  }

  return {
    ok: true,
    config: {
      provider,
      model,
      apiKey,
    },
  }
}

export function toPublicSupportAgentProviderConfig(
  config: SupportAgentProviderConfig
): PublicSupportAgentProviderConfig {
  return {
    provider: config.provider,
    model: config.model,
    hasApiKey: Boolean(config.apiKey),
  }
}
