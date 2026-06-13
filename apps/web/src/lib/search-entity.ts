import {
  BookOpen01Icon,
  BubbleChatIcon,
  Folder01Icon,
  Robot01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import type { SearchHit, SearchResponse } from "@workspace/shared"
import { artifactLaunchPath } from "@/lib/api/projects-client"

export type SearchResultGroupKey =
  | "threads"
  | "artifacts"
  | "agents"
  | "projects"

export const SEARCH_RESULT_GROUPS: {
  key: SearchResultGroupKey
  heading: string
}[] = [
  { key: "threads", heading: "Threads" },
  { key: "artifacts", heading: "Library" },
  { key: "agents", heading: "Agents" },
  { key: "projects", heading: "Projects" },
]

const SEARCH_HIT_ICONS: Record<SearchHit["entityType"], typeof BubbleChatIcon> =
  {
    thread: BubbleChatIcon,
    artifact: BookOpen01Icon,
    agent: Robot01Icon,
    project: Folder01Icon,
  }

export function searchHitIcon(hit: SearchHit) {
  return SEARCH_HIT_ICONS[hit.entityType] ?? Search01Icon
}

export function searchHitPath(hit: SearchHit): string | null {
  switch (hit.entityType) {
    case "thread":
      return `/threads/${hit.id}`
    case "agent":
      return `/agents/${hit.id}`
    case "project":
      return `/projects/${hit.id}`
    case "artifact":
      if (!hit.artifactType) {
        return "/library"
      }
      return (
        artifactLaunchPath({ id: hit.id, type: hit.artifactType }) ?? "/library"
      )
    default:
      return null
  }
}

export function hasSearchResults(results: SearchResponse) {
  return SEARCH_RESULT_GROUPS.some((group) => results[group.key].length > 0)
}
