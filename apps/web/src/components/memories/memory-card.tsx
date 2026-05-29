import type { KeyboardEvent, ReactElement } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { SavedMemory } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { getCategoryDisplay } from "./memory-category-display"
import { CategoryIcon } from "./memory-category-icon"

function formatMemoryDate(date: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const value = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(date)

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)
}

function getMemorySourceLabel(source: SavedMemory["source"]): string {
  return source === "thread-derived" ? "Agent Thread" : "User"
}

function getMemorySourceDescription(memory: SavedMemory): string {
  if (memory.source === "user-generated") return "User"
  return `Agent Thread: ${memory.sourceThreadTitle ?? memory.provenance}`
}

function getMemoryAssociatedAgents(memory: SavedMemory): string[] {
  if (memory.associatedAgents.length > 0) return memory.associatedAgents
  if (memory.associatedAgent) return [memory.associatedAgent]
  return []
}

type MemoryCardProps = {
  memory: SavedMemory
  categoryName: string
  agentNameById: Map<string, string>
  onEdit: (memory: SavedMemory) => void
}

export function MemoryCard({
  memory,
  categoryName,
  agentNameById,
  onEdit,
}: MemoryCardProps): ReactElement {
  const associatedAgentNames = getMemoryAssociatedAgents(memory).map(
    (agentId) => agentNameById.get(agentId) ?? agentId
  )

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onEdit(memory)
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Edit memory: ${memory.content}`}
      className="min-h-72 cursor-pointer text-left transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
      onClick={() => onEdit(memory)}
      onKeyDown={handleCardKeyDown}
    >
      <CardHeader className="gap-3 text-left">
        <div className="flex items-center gap-3">
          <CategoryIcon category={memory.category} className="size-5" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <HugeiconsIcon
                icon={getCategoryDisplay(memory.category).icon}
                className="size-3"
                strokeWidth={2}
                aria-hidden
              />
              {categoryName}
            </Badge>
            <Badge variant="outline">{memory.importance} importance</Badge>
            <Badge variant="outline">{memory.scope}</Badge>
            <Badge
              variant={
                memory.source === "user-generated" ? "secondary" : "outline"
              }
            >
              {getMemorySourceLabel(memory.source)}
            </Badge>
            {memory.pinnedToContext ? (
              <Badge variant="secondary">Pinned to context</Badge>
            ) : null}
          </div>
        </div>
        <CardTitle className="text-left text-base leading-6">
          {memory.content}
        </CardTitle>
        <CardDescription className="text-left italic">
          {memory.usageGuidance}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {memory.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd>{formatMemoryDate(memory.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Source</dt>
            <dd>{getMemorySourceDescription(memory)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Scope</dt>
            <dd>
              {memory.scope === "global"
                ? "Global"
                : associatedAgentNames.join(", ")}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
