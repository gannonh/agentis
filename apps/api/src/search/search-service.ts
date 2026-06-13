import {
  normalizeSearchQuery,
  type ArtifactType,
  type SearchHit,
  type SearchResponse,
} from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"

const SEARCH_LIMITS = {
  threads: 8,
  artifacts: 8,
  agents: 6,
  projects: 6,
} as const

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  document: "Document",
  webpage: "Webpage",
  slides: "Slides",
  app: "App",
  table: "Table",
  image: "Image",
  video: "Video",
  other: "Other",
}

function truncateText(value: string | null | undefined, maxLength = 80) {
  if (!value?.trim()) return undefined
  const trimmed = value.trim().replace(/\s+/g, " ")
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 3)}...`
}

function artifactSubtitle(type: ArtifactType, previewText?: string | null) {
  const typeLabel = ARTIFACT_TYPE_LABELS[type]
  const preview = truncateText(previewText, 60)
  return preview ? `${typeLabel} · ${preview}` : typeLabel
}

export class SearchService {
  constructor(private readonly repos: Repositories) {}

  search(query: string): SearchResponse {
    const normalized = normalizeSearchQuery(query)
    if (normalized.status !== "ready" || normalized.query !== query) {
      throw new Error("SearchService.search requires a normalized search query.")
    }

    const trimmedQuery = normalized.query

    const [threads, artifacts, agents, projects] = [
      this.repos.threads.search(trimmedQuery, SEARCH_LIMITS.threads),
      this.repos.artifacts.search(trimmedQuery, SEARCH_LIMITS.artifacts),
      this.repos.agents.search(trimmedQuery, SEARCH_LIMITS.agents),
      this.repos.projects.search(trimmedQuery, SEARCH_LIMITS.projects),
    ]

    return {
      query: trimmedQuery,
      threads: threads.map(
        (thread): SearchHit => ({
          id: thread.id,
          title: thread.title,
          subtitle: truncateText(thread.agentNameSnapshot) ?? thread.status,
          entityType: "thread",
        })
      ),
      artifacts: artifacts.map(
        (artifact): SearchHit => ({
          id: artifact.id,
          title: artifact.title,
          subtitle: artifactSubtitle(artifact.type, artifact.previewText),
          entityType: "artifact",
          artifactType: artifact.type,
        })
      ),
      agents: agents.map(
        (agent): SearchHit => ({
          id: agent.id,
          title: agent.name,
          subtitle: truncateText(agent.description),
          entityType: "agent",
        })
      ),
      projects: projects.map(
        (project): SearchHit => ({
          id: project.id,
          title: project.name,
          subtitle:
            truncateText(project.description) ?? truncateText(project.goals),
          entityType: "project",
        })
      ),
    }
  }
}
