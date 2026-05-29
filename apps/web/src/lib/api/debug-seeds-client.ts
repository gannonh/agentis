import { z } from "zod"
import { ApiError } from "@/lib/api/client"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""

const debugDatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
})

const debugSeedCountsSchema = z.object({
  agents: z.number(),
  projects: z.number(),
  threads: z.number(),
  artifacts: z.number(),
  savedMemories: z.number(),
  projectMemories: z.number(),
  integrationConnections: z.number(),
})

const debugDatasetsResponseSchema = z.object({
  datasets: z.array(debugDatasetSchema),
})

const debugSeedResultSchema = z.object({
  dataset: debugDatasetSchema,
  counts: debugSeedCountsSchema,
})

const debugDataResetResultSchema = z.object({
  counts: debugSeedCountsSchema,
})

export type DebugDataset = z.infer<typeof debugDatasetSchema>
export type DebugDatasetsResponse = z.infer<typeof debugDatasetsResponseSchema>
export type DebugSeedCounts = z.infer<typeof debugSeedCountsSchema>
export type DebugSeedResult = z.infer<typeof debugSeedResultSchema>
export type DebugDataResetResult = z.infer<typeof debugDataResetResultSchema>

async function parseJson<T>(
  response: Response,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const data = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : response.statusText
    throw new ApiError(message, response.status)
  }
  return schema.parse(data)
}

export async function listDebugDatasets(): Promise<DebugDatasetsResponse> {
  const response = await fetch(`${API_BASE}/api/debug/datasets`)
  return parseJson(response, debugDatasetsResponseSchema)
}

export async function seedDebugDataset(
  datasetId: string
): Promise<DebugSeedResult> {
  const response = await fetch(
    `${API_BASE}/api/debug/datasets/${encodeURIComponent(datasetId)}`,
    { method: "POST" }
  )
  return parseJson(response, debugSeedResultSchema)
}

export async function deleteDebugDataset(
  datasetId: string
): Promise<DebugSeedResult> {
  const response = await fetch(
    `${API_BASE}/api/debug/datasets/${encodeURIComponent(datasetId)}`,
    { method: "DELETE" }
  )
  return parseJson(response, debugSeedResultSchema)
}

export async function deleteAllDebugData(): Promise<DebugDataResetResult> {
  const response = await fetch(`${API_BASE}/api/debug/data`, {
    method: "DELETE",
  })
  return parseJson(response, debugDataResetResultSchema)
}
