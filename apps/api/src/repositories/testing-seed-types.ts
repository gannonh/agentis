export type DebugDatasetId =
  | "rich-agent-workspace"
  | "rich-agent-workspace-no-integrations"

export type DebugDatasetSummary = {
  id: DebugDatasetId
  name: string
  description: string
}

export type DebugSeedCounts = {
  agents: number
  projects: number
  threads: number
  artifacts: number
  savedMemories: number
  projectMemories: number
  integrationConnections: number
}

export type DebugSeedResult = {
  dataset: DebugDatasetSummary
  counts: DebugSeedCounts
}

export type DebugDataResetResult = {
  counts: DebugSeedCounts
}

export type ResolvedDebugDataset = {
  dataset: DebugDatasetSummary
  includeIntegrations: boolean
}
