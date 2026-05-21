import { DEFAULT_OPENAI_MODEL } from "@workspace/shared"

export type AppConfig = {
  port: number
  databaseUrl: string
  openAiApiKey: string | undefined
  defaultModel: string
  mockRuntime: boolean
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3001),
    databaseUrl: env.DATABASE_URL ?? "./data/agentis.db",
    openAiApiKey: env.OPENAI_API_KEY,
    defaultModel: DEFAULT_OPENAI_MODEL,
    mockRuntime: env.AGENTIS_MOCK_RUNTIME === "1",
  }
}

export function isRuntimeAvailable(config: AppConfig) {
  return Boolean(config.openAiApiKey) || config.mockRuntime
}
