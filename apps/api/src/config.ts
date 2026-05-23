import { DEFAULT_OPENAI_MODEL } from "@workspace/shared"
import { toComposioToolkitSlug } from "./composio/toolkit-slugs.js"
import { FEATURED_TOOLKIT_SLUGS } from "./repositories/integration-seeds.js"

/** Composio toolkit versions for manual tool execution when env is unset. */
export const DEFAULT_COMPOSIO_TOOLKIT_VERSIONS: Record<string, string> = {
  github: "20260501_01",
  slack: "20260519_01",
  gmail: "20260515_00",
  googledrive: "20260519_01",
  airtable: "20260506_00",
}

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
  storageRoot: string
  artifactMaxUploadBytes: number
  artifactPreviewMaxChars: number
  projectGoalsMaxChars: number
  projectMemoryMaxChars: number
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

function resolveComposioToolkitVersions(
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const fromEnv = parseToolkitVersions(env.COMPOSIO_TOOLKIT_VERSIONS)
  const merged: Record<string, string> = { ...DEFAULT_COMPOSIO_TOOLKIT_VERSIONS }
  for (const slug of FEATURED_TOOLKIT_SLUGS) {
    const envKey = `COMPOSIO_TOOLKIT_VERSION_${slug.replace(/-/g, "_").toUpperCase()}`
    const single = env[envKey]
    if (typeof single === "string" && single.trim()) {
      merged[toComposioToolkitSlug(slug)] = single.trim()
    }
  }
  return { ...merged, ...fromEnv }
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
    composioToolkitVersions: resolveComposioToolkitVersions(env),
    mockComposio: env.AGENTIS_MOCK_COMPOSIO === "1",
    webAppOrigin: env.AGENTIS_WEB_ORIGIN ?? "http://localhost:5173",
    storageRoot: env.AGENTIS_STORAGE_ROOT ?? "./data/storage",
    artifactMaxUploadBytes: Number(
      env.AGENTIS_ARTIFACT_MAX_UPLOAD_BYTES ?? 10_485_760
    ),
    artifactPreviewMaxChars: Number(
      env.AGENTIS_ARTIFACT_PREVIEW_MAX_CHARS ?? 2_000
    ),
    projectGoalsMaxChars: Number(env.AGENTIS_PROJECT_GOALS_MAX_CHARS ?? 4_000),
    projectMemoryMaxChars: Number(
      env.AGENTIS_PROJECT_MEMORY_MAX_CHARS ?? 2_000
    ),
  }
}

export function isRuntimeAvailable(config: AppConfig) {
  return Boolean(config.openAiApiKey) || config.mockRuntime
}

export function isComposioAvailable(config: AppConfig) {
  if (config.mockComposio) return true
  if (!config.composioApiKey?.trim()) return false
  if (!config.composioRedirectBaseUrl?.trim()) return false
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
