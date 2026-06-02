import { DEFAULT_GATEWAY_MODEL } from "@workspace/shared"
import { toAppToolkitSlug } from "./composio/toolkit-slugs.js"
import { FEATURED_TOOLKIT_SLUGS } from "./repositories/integration-seeds.js"

/** Composio toolkit versions for manual tool execution when env is unset. */
export const DEFAULT_COMPOSIO_TOOLKIT_VERSIONS: Record<string, string> = {
  github: "20260501_01",
  slack: "20260519_01",
  gmail: "20260515_00",
  "google-drive": "20260519_01",
  airtable: "20260506_00",
}

export type AppConfig = {
  port: number
  databaseUrl: string
  nodeEnv: string
  defaultModel: string
  mockRuntime: boolean
  composioApiKey: string | undefined
  composioRedirectBaseUrl: string | undefined
  composioUserId: string
  composioToolkitVersions: Record<string, string>
  mockComposio: boolean
  webAppOrigin: string
  storageRoot: string
  documentMaxUploadBytes: number
  documentPreviewMaxChars: number
  projectGoalsMaxChars: number
  projectMemoryMaxChars: number
  workspaceListLimit: number
  workspaceReadMaxBytes: number
  workspaceSearchLimit: number
  workspaceSearchSnippetChars: number
  workspaceWriteMaxBytes: number
  workspaceWriteDenyPrefixes: string[]
  workspaceReplaceMaxCount: number
  sandboxBackend: "local-process" | "local-container"
  sandboxTimeoutMs: number
  sandboxMaxStdoutBytes: number
  sandboxMaxStderrBytes: number
  sandboxChangedFilesLimit: number
  sandboxCommandDenyPatterns: string[]
  sandboxContainerImage: string
  webSearchProvider: "vercel-gateway" | "mock"
  webSearchBackend: "perplexity" | "parallel"
  webSearchMaxResults: number
  webSearchMaxSnippetChars: number
  aiGatewayApiKey: string | undefined
}

function parseToolkitVersions(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
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
  const merged: Record<string, string> = {
    ...DEFAULT_COMPOSIO_TOOLKIT_VERSIONS,
  }
  for (const slug of FEATURED_TOOLKIT_SLUGS) {
    const envKey = `COMPOSIO_TOOLKIT_VERSION_${slug.replace(/-/g, "_").toUpperCase()}`
    const single = env[envKey]
    if (typeof single === "string" && single.trim()) {
      merged[slug] = single.trim()
    }
  }
  const normalizedFromEnv = Object.fromEntries(
    Object.entries(fromEnv).map(([slug, version]) => [
      toAppToolkitSlug(slug),
      version,
    ])
  )
  return { ...merged, ...normalizedFromEnv }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.AGENTIS_API_PORT ?? env.PORT ?? 3101)
  const nodeEnv = env.NODE_ENV ?? "production"
  const sandboxBackend =
    env.AGENTIS_SANDBOX_BACKEND === "local-process" ||
    env.AGENTIS_SANDBOX_BACKEND === "local-container"
      ? env.AGENTIS_SANDBOX_BACKEND
      : nodeEnv === "production"
        ? "local-container"
        : "local-process"

  return {
    port,
    databaseUrl: env.DATABASE_URL ?? "./data/agentis.db",
    nodeEnv,
    defaultModel: DEFAULT_GATEWAY_MODEL,
    mockRuntime: env.AGENTIS_MOCK_RUNTIME === "1",
    composioApiKey: env.COMPOSIO_API_KEY,
    composioRedirectBaseUrl: env.COMPOSIO_REDIRECT_BASE_URL,
    composioUserId: env.COMPOSIO_USER_ID ?? "agentis-local-user",
    composioToolkitVersions: resolveComposioToolkitVersions(env),
    mockComposio: env.AGENTIS_MOCK_COMPOSIO === "1",
    webAppOrigin: env.AGENTIS_WEB_ORIGIN ?? "http://127.0.0.1:5177",
    storageRoot: env.AGENTIS_STORAGE_ROOT ?? "./data/storage",
    documentMaxUploadBytes: Number(
      env.AGENTIS_DOCUMENT_MAX_UPLOAD_BYTES ??
        env.AGENTIS_ARTIFACT_MAX_UPLOAD_BYTES ??
        10_485_760
    ),
    documentPreviewMaxChars: Number(
      env.AGENTIS_DOCUMENT_PREVIEW_MAX_CHARS ??
        env.AGENTIS_ARTIFACT_PREVIEW_MAX_CHARS ??
        2_000
    ),
    projectGoalsMaxChars: Number(env.AGENTIS_PROJECT_GOALS_MAX_CHARS ?? 4_000),
    projectMemoryMaxChars: Number(
      env.AGENTIS_PROJECT_MEMORY_MAX_CHARS ?? 2_000
    ),
    workspaceListLimit: Number(env.AGENTIS_WORKSPACE_LIST_LIMIT ?? 200),
    workspaceReadMaxBytes: Number(
      env.AGENTIS_WORKSPACE_READ_MAX_BYTES ?? 64_000
    ),
    workspaceSearchLimit: Number(env.AGENTIS_WORKSPACE_SEARCH_LIMIT ?? 50),
    workspaceSearchSnippetChars: Number(
      env.AGENTIS_WORKSPACE_SEARCH_SNIPPET_CHARS ?? 160
    ),
    workspaceWriteMaxBytes: Number(
      env.AGENTIS_WORKSPACE_WRITE_MAX_BYTES ?? 262_144
    ),
    workspaceWriteDenyPrefixes: (
      env.AGENTIS_WORKSPACE_WRITE_DENY_PREFIXES ?? ""
    )
      .split(",")
      .map((prefix) => prefix.trim())
      .filter(Boolean),
    workspaceReplaceMaxCount: Number(
      env.AGENTIS_WORKSPACE_REPLACE_MAX_COUNT ?? 100
    ),
    sandboxBackend,
    sandboxTimeoutMs: Number(env.AGENTIS_SANDBOX_TIMEOUT_MS ?? 30_000),
    sandboxMaxStdoutBytes: Number(
      env.AGENTIS_SANDBOX_MAX_STDOUT_BYTES ?? 65_536
    ),
    sandboxMaxStderrBytes: Number(
      env.AGENTIS_SANDBOX_MAX_STDERR_BYTES ?? 65_536
    ),
    sandboxChangedFilesLimit: Number(
      env.AGENTIS_SANDBOX_CHANGED_FILES_LIMIT ?? 50
    ),
    sandboxCommandDenyPatterns: (
      env.AGENTIS_SANDBOX_COMMAND_DENY_PATTERNS ?? ""
    )
      .split(",")
      .map((pattern) => pattern.trim())
      .filter(Boolean),
    sandboxContainerImage:
      env.AGENTIS_SANDBOX_CONTAINER_IMAGE ?? "agentis-sandbox:local",
    webSearchProvider:
      env.AGENTIS_WEB_SEARCH_PROVIDER === "mock" ? "mock" : "vercel-gateway",
    webSearchBackend:
      env.AGENTIS_WEB_SEARCH_BACKEND === "parallel" ? "parallel" : "perplexity",
    webSearchMaxResults: clampNumber(
      Number(env.AGENTIS_WEB_SEARCH_MAX_RESULTS ?? 5),
      1,
      10
    ),
    webSearchMaxSnippetChars: clampNumber(
      Number(env.AGENTIS_WEB_SEARCH_MAX_SNIPPET_CHARS ?? 500),
      1,
      1000
    ),
    aiGatewayApiKey: env.AI_GATEWAY_API_KEY?.trim() || undefined,
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

export function isRuntimeAvailable(
  config: Pick<AppConfig, "aiGatewayApiKey" | "mockRuntime">
) {
  return Boolean(config.aiGatewayApiKey) || config.mockRuntime
}

export function isDebugSeedsEnabled(config: AppConfig) {
  return config.nodeEnv === "development"
}

export function isRunTimelineDebugEnabled(config: AppConfig) {
  return config.nodeEnv === "development"
}

export function isComposioAvailable(config: AppConfig) {
  if (config.mockComposio) return true
  if (!config.composioApiKey?.trim()) return false
  if (!config.composioRedirectBaseUrl?.trim()) return false
  return true
}

export function resolveWebSearchProviderName(config: AppConfig): string {
  if (config.mockRuntime) return "mock"
  return config.webSearchProvider
}

export function isWebSearchProviderAvailable(config: AppConfig): boolean {
  if (config.mockRuntime) return true
  if (config.webSearchProvider === "mock") return true
  return Boolean(config.aiGatewayApiKey?.trim())
}

export function getComposioUnavailableReason(
  config: AppConfig
):
  | "missing_api_key"
  | "missing_redirect_base_url"
  | "mock_enabled"
  | undefined {
  if (config.mockComposio) return "mock_enabled"
  if (!config.composioApiKey) return "missing_api_key"
  if (!config.composioRedirectBaseUrl) return "missing_redirect_base_url"
  return undefined
}
