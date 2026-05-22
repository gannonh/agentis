import { DEFAULT_OPENAI_MODEL } from "@workspace/shared"

export type AppConfig = {
  port: number
  databaseUrl: string
  openAiApiKey: string | undefined
  defaultModel: string
  mockRuntime: boolean
  composioApiKey: string | undefined
  composioRedirectBaseUrl: string | undefined
  composioUserId: string
  composioToolkitVersions: Record<string, string>
  mockComposio: boolean
  webAppOrigin: string
}

function parseToolkitVersions(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    )
  } catch {
    return {}
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3001),
    databaseUrl: env.DATABASE_URL ?? "./data/agentis.db",
    openAiApiKey: env.OPENAI_API_KEY,
    defaultModel: DEFAULT_OPENAI_MODEL,
    mockRuntime: env.AGENTIS_MOCK_RUNTIME === "1",
    composioApiKey: env.COMPOSIO_API_KEY,
    composioRedirectBaseUrl: env.COMPOSIO_REDIRECT_BASE_URL,
    composioUserId: env.COMPOSIO_USER_ID ?? "agentis-local-user",
    composioToolkitVersions: parseToolkitVersions(env.COMPOSIO_TOOLKIT_VERSIONS),
    mockComposio: env.AGENTIS_MOCK_COMPOSIO === "1",
    webAppOrigin: env.AGENTIS_WEB_ORIGIN ?? "http://localhost:5173",
  }
}

export function isRuntimeAvailable(config: AppConfig) {
  return Boolean(config.openAiApiKey) || config.mockRuntime
}

export function isComposioAvailable(config: AppConfig) {
  if (config.mockComposio) return true
  if (!config.composioApiKey) return false
  if (!config.composioRedirectBaseUrl) return false
  return true
}

export function getComposioUnavailableReason(
  config: AppConfig
): "missing_api_key" | "missing_redirect_base_url" | "mock_enabled" | undefined {
  if (config.mockComposio) return "mock_enabled"
  if (!config.composioApiKey) return "missing_api_key"
  if (!config.composioRedirectBaseUrl) return "missing_redirect_base_url"
  return undefined
}
