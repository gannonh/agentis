import { createLocalSupportAgentResponder } from "./local-responder"
import {
  createSupportAgentModelRuntime,
  type SupportAgentTextGenerator,
} from "./model-runtime"
import type { SupportAgentProviderConfig } from "./provider-config"
import type { SupportAgentRuntime } from "./runtime-boundary"

export type ConfiguredSupportAgentRuntime =
  | {
      mode: "demo"
    }
  | {
      mode: "model"
      provider: SupportAgentProviderConfig
      generateText: SupportAgentTextGenerator
    }

export function createConfiguredSupportAgentRuntime(
  config: ConfiguredSupportAgentRuntime
): SupportAgentRuntime {
  if (config.mode === "demo") {
    return createLocalSupportAgentResponder()
  }

  return createSupportAgentModelRuntime({
    config: config.provider,
    generateText: config.generateText,
  })
}
