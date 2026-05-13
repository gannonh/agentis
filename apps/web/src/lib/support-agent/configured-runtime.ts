import { createLocalSupportAgentResponder } from "./local-responder"
import {
  createSupportAgentModelRuntime,
  type SupportAgentTextGenerator,
} from "./model-runtime"
import {
  resolveSupportAgentProviderConfig,
  type SupportAgentProviderConfigInput,
} from "./provider-config"
import {
  SupportAgentRuntimeError,
  type SupportAgentRuntime,
} from "./runtime-boundary"

export type ConfiguredSupportAgentRuntime =
  | {
      mode: "demo"
    }
  | {
      mode: "model"
      provider: SupportAgentProviderConfigInput
      generateText: SupportAgentTextGenerator
    }

export function createConfiguredSupportAgentRuntime(
  config: ConfiguredSupportAgentRuntime
): SupportAgentRuntime {
  if (config.mode === "demo") {
    return createLocalSupportAgentResponder()
  }

  const providerConfig = resolveSupportAgentProviderConfig(config.provider)

  if (!providerConfig.ok) {
    return {
      async respond() {
        throw new SupportAgentRuntimeError({
          code: providerConfig.error.code,
          message: providerConfig.error.message,
        })
      },
    }
  }

  return createSupportAgentModelRuntime({
    config: providerConfig.config,
    generateText: config.generateText,
  })
}
