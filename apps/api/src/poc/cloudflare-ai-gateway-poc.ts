import { generateText, streamText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { SearchWebOutput } from "@workspace/shared"

export type CloudflarePocConfig = {
  apiKey: string
  accountId: string
  gatewayId?: string
}

export type CloudflarePocConfigResult =
  | { ok: true; config: CloudflarePocConfig }
  | { ok: false; missing: string[] }

type SearchPayloadInput = {
  query: string
  provider: string
  payload: unknown
}

type TavilySearchInput = {
  query: string
  payload: unknown
}

type ResultLike = {
  title?: unknown
  url?: unknown
  snippet?: unknown
  excerpt?: unknown
  excerpts?: unknown
  content?: unknown
  publishedAt?: unknown
  publish_date?: unknown
  date?: unknown
  source?: unknown
}

function readEnvValue(
  env: Record<string, string | undefined>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function loadCloudflarePocConfig(
  env: Record<string, string | undefined>
): CloudflarePocConfigResult {
  const apiKey = readEnvValue(env, ["CLOUDFLARE_API_KEY"])
  const accountId = readEnvValue(env, ["CLOUDFLARE_ACCOUNT_ID"])
  const missing = [
    ...(apiKey ? [] : ["CLOUDFLARE_API_KEY"]),
    ...(accountId ? [] : ["CLOUDFLARE_ACCOUNT_ID"]),
  ]

  if (!apiKey || !accountId) return { ok: false, missing }

  return {
    ok: true,
    config: {
      apiKey,
      accountId,
      gatewayId: readEnvValue(env, [
        "CLOUDFLARE_AI_GATEWAY_ID",
        "CLOUDFLARE_GATEWAY_ID",
        "CLOUDFLARE_GATEWAY_NAME",
      ]),
    },
  }
}

export function buildCloudflareAiGatewayBaseUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`
}

export function buildCloudflareAiGatewayHeaders(
  gatewayId: string | undefined
): Record<string, string> | undefined {
  return gatewayId ? { "cf-aig-gateway-id": gatewayId } : undefined
}

export function createCloudflareOpenAiCompatibleProvider(
  config: CloudflarePocConfig
) {
  return createOpenAICompatible({
    name: "cloudflare-ai-gateway-poc",
    apiKey: config.apiKey,
    baseURL: buildCloudflareAiGatewayBaseUrl(config.accountId),
    headers: buildCloudflareAiGatewayHeaders(config.gatewayId),
  })
}

export function assertCloudflareChatStreamResult(result: {
  text: string
  chunks: number
}): void {
  if (result.chunks === 0 || !result.text.trim()) {
    throw new Error("Cloudflare chat stream produced no text")
  }
}

export async function runCloudflareChatStreamPoc(input: {
  config: CloudflarePocConfig
  model: string
  prompt: string
}): Promise<{ text: string; chunks: number }> {
  const cloudflare = createCloudflareOpenAiCompatibleProvider(input.config)
  const result = streamText({
    model: cloudflare(input.model),
    prompt: input.prompt,
    maxOutputTokens: 80,
    maxRetries: 0,
  })

  let text = ""
  let chunks = 0
  for await (const chunk of result.textStream) {
    chunks += 1
    text += chunk
  }

  const output = { text, chunks }
  assertCloudflareChatStreamResult(output)
  return output
}

export function buildCloudflareSearchPrompt(query: string): string {
  return `Search the live web for: ${query}\n\nReturn only JSON with this shape: {"results":[{"title":"source title","url":"https://example.com","snippet":"short relevant excerpt","publishedAt":"optional date"}]}. Include 3-5 current, source-backed results when available.`
}

export async function runCloudflareSearchPoc(input: {
  config: CloudflarePocConfig
  model: string
  query: string
}): Promise<SearchWebOutput> {
  const cloudflare = createCloudflareOpenAiCompatibleProvider(input.config)
  const result = await generateText({
    model: cloudflare(input.model),
    prompt: buildCloudflareSearchPrompt(input.query),
    maxOutputTokens: 800,
    maxRetries: 0,
  })
  return normalizeCloudflareSearchPayload({
    query: input.query,
    provider: `cloudflare:${input.model}`,
    payload: extractJsonObject(result.text),
  })
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const raw = fenced?.[1] ?? trimmed
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Cloudflare search response did not include a JSON object")
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readResults(payload: unknown): ResultLike[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return []
  return payload.results.filter(isRecord)
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeResult(result: ResultLike) {
  const title = readString(result.title)
  const url = readString(result.url)
  if (!title || !url || !/^https?:\/\//.test(url)) return null
  const excerpts = Array.isArray(result.excerpts)
    ? result.excerpts.filter((excerpt): excerpt is string =>
        typeof excerpt === "string"
      )
    : []
  return {
    title,
    url,
    snippet:
      readString(result.snippet) ??
      readString(result.excerpt) ??
      (excerpts.length > 0 ? excerpts.join("\n\n") : undefined) ??
      readString(result.content),
    source: readString(result.source),
    publishedAt:
      readString(result.publishedAt) ??
      readString(result.publish_date) ??
      readString(result.date),
  }
}

export function normalizeCloudflareSearchPayload({
  query,
  provider,
  payload,
}: SearchPayloadInput): SearchWebOutput {
  const results = readResults(payload)
    .map(normalizeResult)
    .filter((result): result is NonNullable<typeof result> => result !== null)

  return {
    query,
    provider,
    results,
    resultCount: results.length,
    truncated: false,
  }
}

export function buildTavilyKeylessHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Tavily-Access-Mode": "keyless",
  }
}

export function normalizeTavilySearchResponse({
  query,
  payload,
}: TavilySearchInput): SearchWebOutput {
  const results = readResults(payload)
    .map(normalizeResult)
    .filter((result): result is NonNullable<typeof result> => result !== null)

  const metadata = isRecord(payload)
    ? {
        requestId: readString(payload.request_id),
        responseTime: readString(payload.response_time),
        credits: isRecord(payload.usage)
          ? readNumber(payload.usage.credits)
          : undefined,
      }
    : undefined

  return {
    query,
    provider: "tavily:keyless",
    results,
    resultCount: results.length,
    truncated: false,
    metadata,
  }
}

export async function runTavilyKeylessSearchPoc(input: {
  query: string
  maxResults?: number
}): Promise<SearchWebOutput> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: buildTavilyKeylessHeaders(),
    body: JSON.stringify({
      query: input.query,
      max_results: input.maxResults ?? 5,
      search_depth: "basic",
    }),
  })

  const payload = (await response.json().catch(async () => ({
    error: await response.text(),
  }))) as unknown

  if (!response.ok) {
    const message = isRecord(payload)
      ? readString(payload.error) ?? readString(payload.message)
      : undefined
    throw new Error(message ?? `Tavily keyless search failed: ${response.status}`)
  }

  return normalizeTavilySearchResponse({ query: input.query, payload })
}
